// ════════════════════════════════════════════════════════════════════
// auditoria-isolamento.mjs — C7: o dado de um cliente não vaza para outro.
//
// SOMENTE LEITURA. Lê o catálogo do Postgres (pg_policy), não os dados.
//
// POR QUE LER O CATÁLOGO E NÃO AS MIGRATIONS
// As migrations dizem o que foi PEDIDO; o catálogo diz o que ESTÁ VALENDO. As
// duas coisas divergem no dia em que alguém roda SQL no console, ou quando uma
// migration falha no meio. Due diligence pergunta pelo segundo.
//
// O PERÍMETRO REAL É A RLS, NÃO O SUBDOMÍNIO
// `nomedamarca.br4ndcode.com` é só resolução de qual workspace carregar — quem
// impede a marca A de ler a marca B é a policy. Por isso a checagem é sobre a
// EXPRESSÃO de cada policy, e não sobre a existência dela: policy que existe e
// não escopa é pior que policy nenhuma, porque parece proteção.
//
// O QUE REPROVA
//  · tabela com workspace_id e RLS desligada;
//  · policy cuja expressão não amarra em workspace_id + workspace_members, e
//    que também não é o bypass declarado do operador da plataforma;
//  · policy de INSERT/UPDATE com WITH CHECK frouxo — foi exatamente esse o furo
//    de `workspace_members` (`with check (user_id = auth.uid())`, sem
//    workspace_id): qualquer conta entrava em qualquer tenant. USING protege a
//    leitura; sem WITH CHECK, a escrita passa por baixo.
//
// O QUE NÃO REPROVA, mas aparece no relatório
//  · tabela com RLS ligada e ZERO policies = nega tudo por RLS (só service key
//    entra). É fail-closed, então é seguro — mas precisa ser deliberado.
// ════════════════════════════════════════════════════════════════════
import { execFileSync } from 'node:child_process'

const CONN = process.env.SUPABASE_DB_URL
if (!CONN) {
  console.error('✖ Falta SUPABASE_DB_URL no ambiente.')
  process.exit(1)
}

const SEP = '~|~'
const consulta = (sql) =>
  execFileSync('psql', [CONN, '-At', '-F', SEP, '-c', sql], { encoding: 'utf8' })
    .split('\n').filter(Boolean).map(l => l.split(SEP))

// Tabelas do domínio do cliente = as que carregam workspace_id.
const tabelas = consulta(`
  select c.relname, c.relrowsecurity
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relkind='r'
     and exists (select 1 from information_schema.columns col
                  where col.table_schema='public' and col.table_name=c.relname
                    and col.column_name='workspace_id')
   order by 1`)

const policies = consulta(`
  select c.relname, p.polname,
         case p.polcmd when 'r' then 'SELECT' when 'a' then 'INSERT'
                       when 'w' then 'UPDATE' when 'd' then 'DELETE' else 'ALL' end,
         coalesce(replace(pg_get_expr(p.polqual, p.polrelid), E'\\n', ' '), ''),
         coalesce(replace(pg_get_expr(p.polwithcheck, p.polrelid), E'\\n', ' '), '')
    from pg_policy p join pg_class c on c.oid=p.polrelid
    join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public'
     and exists (select 1 from information_schema.columns col
                  where col.table_schema='public' and col.table_name=c.relname
                    and col.column_name='workspace_id')
   order by 1,2`)

// ── Helpers de escopo ────────────────────────────────────────────────
// Produção não usa a subquery literal em todo lugar: `workspace_members` escopa
// por `get_my_workspace_ids()`. Descoberto por esta guarda na estreia — a
// migration 005 mostra a subquery inline, o catálogo mostra a função. É a razão
// de ler o catálogo e não o arquivo.
//
// Aceitar helper pelo NOME seria trocar uma verificação por um voto de
// confiança: uma função de escopo mal escrita é o buraco, não a solução. Então
// cada helper referenciado em policy é verificado aqui: precisa ser SECURITY
// DEFINER (senão a RLS se aplica dentro dela e o resultado vira recursão ou
// vazio), com search_path fixo (senão dá para sequestrar por schema) e filtrar
// por auth.uid() (senão devolve o workspace de todo mundo).
const funcoes = consulta(`
  select p.proname, p.prosecdef, coalesce(array_to_string(p.proconfig, ','), ''),
         replace(pg_get_functiondef(p.oid), E'\\n', ' ')
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.prokind='f'`)

const helpersSeguros = new Set()
const helpersReprovados = []
for (const [nome, secdef, config, corpo] of funcoes) {
  if (!/auth\.uid\(\)/.test(corpo)) continue        // não é helper de escopo
  const problemas = []
  if (secdef !== 't') problemas.push('não é SECURITY DEFINER')
  if (!/search_path/.test(config)) problemas.push('sem search_path fixo')
  if (problemas.length) helpersReprovados.push(`${nome}(): ${problemas.join(', ')}`)
  else helpersSeguros.add(nome)
}

const usaHelperSeguro = (e) =>
  [...helpersSeguros].some(h => new RegExp(`\\b${h}\\s*\\(`).test(e))

/** Amarra em participação no workspace? */
const escopaPorWorkspace = (e) =>
  (/workspace_id/i.test(e) && /workspace_members/i.test(e)) ||
  (/workspace_id/i.test(e) && usaHelperSeguro(e))

/** É o bypass declarado do operador (007) — deliberado, não descuido. */
const ehBypassOperador = (e) =>
  /is_platform_admin\(\)/i.test(e) || /platform_admins/i.test(e)

const aceitavel = (e) => escopaPorWorkspace(e) || ehBypassOperador(e)

const falhas = []
const avisos = []

// Helper de escopo mal formado é buraco, não detalhe: ele decide o que cada
// cliente enxerga.
for (const r of helpersReprovados) falhas.push(`helper de escopo inseguro — ${r}`)

for (const [tabela, rls] of tabelas) {
  if (rls !== 't') falhas.push(`${tabela}: tem workspace_id e está com RLS DESLIGADA — leitura livre`)
  const daTabela = policies.filter(p => p[0] === tabela)
  if (!daTabela.length) avisos.push(`${tabela}: RLS ligada e nenhuma policy — nega tudo (só service key). Confirme que é deliberado`)
}

for (const [tabela, nome, cmd, using, check] of policies) {
  if (using && !aceitavel(using)) {
    falhas.push(`${tabela} · "${nome}" (${cmd}) — USING não amarra em workspace: ${using.slice(0, 90)}`)
  }
  // WITH CHECK vazio em comando que escreve = a escrita não é verificada.
  if (['INSERT', 'UPDATE', 'ALL'].includes(cmd)) {
    if (!check && !using) {
      falhas.push(`${tabela} · "${nome}" (${cmd}) — sem USING e sem WITH CHECK: escrita sem verificação`)
    } else if (check && !aceitavel(check)) {
      falhas.push(`${tabela} · "${nome}" (${cmd}) — WITH CHECK frouxo: ${check.slice(0, 90)}`)
    }
  }
}

console.log('\nISOLAMENTO ENTRE TENANTS — o que está valendo no banco agora\n')
console.log(`${tabelas.length} tabelas com workspace_id · ${policies.length} policies examinadas`)

if (avisos.length) {
  console.log('\nAvisos (não reprovam):')
  for (const a of avisos) console.log(`  · ${a}`)
}

if (falhas.length) {
  console.error('\n✖ ISOLAMENTO NÃO PROVADO:\n')
  for (const f of falhas) console.error(`  · ${f}`)
  console.error('\nUm cliente pode alcançar o dado de outro. Não faça deploy.\n')
  process.exit(1)
}

console.log('\n✓ Toda policy sobre tabela de cliente amarra em participação no workspace')
console.log('  (ou é o bypass declarado do operador da plataforma).')
console.log('\nEste relatório é material de due diligence — ele responde "como vocês')
console.log('garantem que a Worten não vê o dado da Hering?" com o catálogo, não com prosa.\n')
