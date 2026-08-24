// tests/guarda/mutacao.mjs — a prova de que a suíte não é teatro.
//
// Roda com `npm run guarda`. Reintroduz, um a um, defeitos que DE FATO
// chegaram ao cliente e verifica se a suíte fica vermelha. Teste que continua
// verde com o bug de volta não protege ninguém.
//
// Foi assim que descobri que meu próprio teste da guarda de identidade era
// teatro: trocando `if (!conferencia.ok)` por `if (false)`, tudo passava. O
// teste verificava que a guarda existia, não que ela bloqueia. Virou
// tests/ia-diagnostico-handler.test.js, que roda o handler e afere o EFEITO.
//
// REGRA: todo defeito que escapar para produção entra aqui como mutação, junto
// com o teste que o pega. A lista só cresce.
//
// Saída: 8/8 é o piso. Qualquer "PASSOU DESPERCEBIDA" bloqueia o deploy.

import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

// Cada mutação reintroduz UM defeito real que chegou ao cliente.
// Teste que não fica vermelho aqui é teatro.
const MUTACOES = [
  { nome: 'volta a mandar só o nome ao modelo (caso Pixel)',
    arq: 'netlify/functions/diagnostico-gerar-background.js',
    de: 'alvoDoDiagnostico(alvo)', para: 'alvo.nome' },

  { nome: 'volta a gravar a empresa que o modelo devolveu',
    arq: 'netlify/functions/diagnostico-gerar-background.js',
    de: '...identidadeParaGravar(alvo, parsed),',
    para: 'empresa: parsed.empresa,\n    dominio: parsed.dominio,' },

  { nome: 'remove a guarda de identidade do diagnóstico',
    arq: 'netlify/functions/diagnostico-gerar-background.js',
    de: 'if (!conferencia.ok) {', para: 'if (false) {' },

  { nome: 'volta a ler só o primeiro bloco de texto',
    arq: 'netlify/functions/_ai.js',
    de: "const text = blocos.filter(b => b.type === 'text').map(b => b.text || '').join('')",
    para: "const text = data.content?.find(b => b.type === 'text')?.text || ''" },

  { nome: 'devolve a busca web ao classificador da escuta',
    arq: 'netlify/functions/listening-coletar-background.js',
    de: 'tools: undefined,', para: '' },

  { nome: 'busca que falhou vira snapshot zerado',
    arq: 'netlify/functions/listening-coletar-background.js',
    de: 'if (falhas.length && !resultados.length) {', para: 'if (false) {' },

  { nome: 'volta a ler a prosa em vez dos blocos da busca',
    arq: 'netlify/functions/_busca.js',
    de: "b.type === 'web_search_tool_result'", para: "b.type === 'nunca'" },

  { nome: 'guarda ingênua: .com.br com dois rótulos',
    arq: 'netlify/functions/_identidade.js',
    de: "const n = (p.length >= 3 && SLD.has(p[p.length - 2])) ? 3 : 2", para: 'const n = 2' },

  { nome: 'reserva de modelo implementada mas não ligada',
    arq: 'netlify/functions/diagnostico-gerar-background.js',
    de: 'model, modeloReserva, tools, maxTokens,', para: 'model, tools, maxTokens,' },

  { nome: 'reserva dispara em erro que ela não resolve (400)',
    arq: 'netlify/functions/_ai.js',
    de: 'export const valeTentarReserva = (status) => [429, 500, 502, 503, 504, 529, 408].includes(Number(status))',
    para: 'export const valeTentarReserva = () => true' },

  { nome: 'volta ao sonnet-5 como principal (2,6x o custo)',
    arq: 'netlify/functions/_ai.js',
    de: "  smart:  'claude-sonnet-4-6',", para: "  smart:  'claude-sonnet-5'," },

  { nome: 'e-mail do operador volta a vazar para o cliente',
    arq: 'netlify/functions/workspace-members.js',
    de: '.filter(m => vendoComoOperador || !ehOperador.has(m.user_id))', para: '.filter(() => true)' },

  { nome: 'relatório público volta a pedir tudo (select *)',
    arq: 'src/pages/RelatorioPublico.jsx',
    de: `    supabase.from('diagnosticos')
      .select('id, workspace_id, empresa, dominio, setor, porte, created_at, publico, status, tipo, '
            + 'score_singularidade, score_consistencia, score_posicionamento, frase_diagnostico, data')
      .eq('id', id).single()`,
    para: "    supabase.from('diagnosticos').select('*').eq('id', id).single()" },

  { nome: 'reabre a leitura anônima de diagnósticos',
    arq: 'supabase/migrations/049_diagnosticos_sem_leitura_anonima.sql',
    de: 'drop policy if exists "leitura publica diagnosticos" on diagnosticos;',
    para: '-- removido' },

  { nome: 'concorrente desativado volta a contar na síntese',
    arq: 'netlify/functions/_market.js',
    de: ".in('concorrente_id', ativos.map(c => c.id))", para: '' },

  { nome: 'a tela volta a mostrar movimento de desativado',
    arq: 'src/pages/app/IntelligencePages.jsx',
    de: ".eq('workspace_id', workspace.id).eq('ativo', true)",
    para: ".eq('workspace_id', workspace.id)" },

  { nome: 'modal volta a ficar transparente (token em CSS cru)',
    arq: 'src/pages/AppInterno.jsx',
    de: "bgcolor: 'background.paper', border: 1", para: "background: 'background.paper', border: 1" },

  { nome: 'componente JSX usado sem import (tela branca)',
    arq: 'src/pages/AppInterno.jsx',
    de: 'TableCell, TableContainer, Paper } from "@mui/material";',
    para: 'TableCell } from "@mui/material";' },

  // 21/08: clicar em "Membros" no admin apagava a tela, no meio da criação dos
  // acessos da Hering. `WorkspacesAdmin` lia o `isDark` que é estado do
  // `AppInterno` — outro componente. O jsx-imports não pegava (só olha nome de
  // componente em JSX); quem pega é o jsx-escopo, que pergunta ao parser.
  { nome: 'tema lido da closure de outro componente (tela branca)',
    arq: 'src/pages/AppInterno.jsx',
    de: '  const isDark = useTheme().palette.mode === "dark";\n', para: '' },

  { nome: 'filtro de select volta a ficar em branco',
    arq: 'src/pages/AppInterno.jsx',
    de: "sx={{ minWidth: 180 }} SelectProps={{ displayEmpty: true }}>", para: "sx={{ minWidth: 180 }}>" },

  { nome: 'token de tema dentro de ternário em background',
    arq: 'src/pages/AppInterno.jsx',
    de: "bgcolor: i % 2 === 0 ? 'background.default' : 'action.hover'",
    para: "background: i % 2 === 0 ? 'background.default' : 'action.hover'" },

  { nome: 'admin volta a jogar o domínio fora (caso Cost Clarity)',
    arq: 'netlify/functions/diagnostico-gerar-background.js',
    de: 'const separado = separarAlvo(empresaParam)', para: 'const separado = { nome: empresaParam, dominio: null }' },

  { nome: 'diagnóstico perde a leitura de site (volta a só buscar)',
    arq: 'netlify/functions/_ai.js',
    de: 'tools:      [TOOLS.webSearch, TOOLS.webFetch],', para: 'tools:      [TOOLS.webSearch],' },

  { nome: 'guarda aprova qualquer coisa',
    arq: 'netlify/functions/_identidade.js',
    de: "  if (recebidos.some(d => d === esperado)) return { ok: true, verificado: true }",
    para: '  return { ok: true, verificado: true }' },

  // 19/08: o scanner do Netlify barrou o merge para produção por causa da URL
  // do projeto escrita em três scripts arquivados. Build barrado = correção que
  // não chega ao cliente — e o log do build não é acessível pela API, então a
  // causa levou meia hora para aparecer.
  // O crédito é debitado no dispatch. Um Parar que só desliga o poll deixa a
  // cascata enviar e cobrar a fila inteira mostrando "Parado" na tela.
  { nome: 'Parar deixa a cascata disparar (e cobrar) mesmo assim',
    arq: 'src/pages/app/StudioCanvas.jsx',
    de: '      if (abortRef.current) return\n      // Portões primeiro',
    para: '      // Portões primeiro' },

  { nome: 'Parar só vale para o próximo lote, não para a fila atual',
    arq: 'src/pages/app/StudioCanvas.jsx',
    de: 'for (const g of genNodes) { if (abortRef.current) break; if (genReady(g))',
    para: 'for (const g of genNodes) { if (genReady(g))' },

  // O buraco que passou batido na 1ª tentativa (20/08): a bandeira estava certa,
  // mas `running` só ligava no pollEngine — depois de todos os dispatches. O
  // botão dizia "Gerar" durante a janela em que cada envio debita. Bandeira sem
  // botão = mesmo efeito de não ter botão nenhum.
  // C1 — as background functions eram endpoints públicos rodando com a service
  // key. Quem soubesse o caminho disparava trabalho pago no nosso provedor.
  { nome: 'background function volta a aceitar chamada anônima',
    arq: 'netlify/functions/studio-poll-background.js',
    de: '  const porteiro = await autorizarBackground(event)\n  if (porteiro.erro) return porteiro.erro\n',
    para: '' },

  // Pior que não checar: checar e seguir mesmo assim. Parece protegido em
  // revisão de código e não está.
  { nome: 'background chama o porteiro e ignora o veredito',
    arq: 'netlify/functions/content-hub-gerar-background.js',
    de: '  if (porteiro.erro) return porteiro.erro',
    para: '  if (false) return porteiro.erro' },

  // O outro lado: cron que para de se identificar leva 401 e o trabalho
  // agendado simplesmente deixa de acontecer, sem ninguém perceber.
  { nome: 'cron volta a disparar background sem se identificar',
    arq: 'netlify/functions/trends-cron.js',
    de: "headers: internalHeaders(),", para: "headers: { 'Content-Type': 'application/json' }," },

  // C2 — o webhook do Studio aceitava POST anônimo. A proteção estava escrita
  // nos dois lados e desligada nos dois: `if (secret && ...)` com a variável
  // nunca definida, e a URL registrada no fal sem o `?s=`. Quem alcança esse
  // endpoint escreve no nosso banco.
  { nome: 'webhook do Studio volta a aceitar POST anônimo',
    arq: 'netlify/functions/studio-webhook.js',
    de: '  if (!secret) return { statusCode: 500, body: \'webhook sem segredo\' }\n  if (event.queryStringParameters?.s !== secret)',
    para: '  if (secret && event.queryStringParameters?.s !== secret)' },

  // A outra metade do mesmo defeito: sem o `?s=` na URL, configurar o segredo
  // faria o webhook recusar TODAS as conclusões — e em produção não há poll,
  // então a geração morreria no timeout de 10 min do canvas.
  { nome: 'a URL do webhook volta a ir sem o segredo',
    arq: 'netlify/functions/_studio.js',
    de: '  const webhookUrl = studioWebhookUrl()',
    para: '  const webhookUrl = isDev() ? null : `${siteBase()}/.netlify/functions/studio-webhook`' },

  // 21/08: a tela branca do dev. O `_redirects` na raiz faz o Netlify Dev
  // devolver /index.html para /src/main.jsx — HTML onde o browser espera JS.
  // O build verde não denuncia nada; só o console, com 3 erros de parse.
  { nome: 'o dev volta a servir o dist velho (tela branca ou app congelado)',
    arq: 'package.json',
    de: '"dev": "rm -rf dist && vite"', para: '"dev": "vite"' },

  { nome: 'o dist volta a depender de um cp solto no fim do build',
    arq: 'package.json',
    de: '"build": "vite build && node tests/guarda/dist.mjs"',
    para: '"build": "vite build && cp _redirects dist/_redirects"' },

  { nome: 'o botão Parar só aparece depois de tudo já ter sido cobrado',
    arq: 'src/pages/app/StudioCanvas.jsx',
    de: '    setRunning(true)\n\n    const auth = await authHeaders()',
    para: '\n    const auth = await authHeaders()' },

  // ── Papéis por tenant (release de 24/08) ──────────────────────────
  // Os três primeiros são os buracos que a 052 fecha; os outros são as
  // promessas que as functions passaram a fazer.
  { nome: 'workspace_members volta a ser `for all` (todos mandam em todos)',
    arq: 'supabase/migrations/052_papeis_por_tenant.sql',
    de: 'for select using (public.eh_membro(workspace_id))',
    para: 'for all using (public.eh_membro(workspace_id))' },

  { nome: 'volta a auto-inserção em qualquer tenant (bypass)',
    arq: 'supabase/migrations/052_papeis_por_tenant.sql',
    de: 'drop policy if exists "autenticado adiciona membro"     on workspace_members;',
    para: '' },

  { nome: 'o saldo de créditos volta a ser editável pelo cliente',
    arq: 'supabase/migrations/052_papeis_por_tenant.sql',
    de: '  if new.creditos_saldo        is distinct from old.creditos_saldo\n',
    para: '  if false\n' },

  { nome: 'a migration rebaixa quem já era admin',
    arq: 'supabase/migrations/052_papeis_por_tenant.sql',
    de: "update workspace_members set role = 'owner'  where role = 'admin';",
    para: '' },

  { nome: 'o último dono volta a poder sair (workspace ingovernável)',
    arq: 'supabase/migrations/052_papeis_por_tenant.sql',
    de: 'create trigger trg_protege_ultimo_owner', para: 'create trigger trg_desligado' },

  { nome: 'member_id sozinho volta a atravessar tenant',
    arq: 'netlify/functions/workspace-member.js',
    de: ".eq('id', member_id).eq('workspace_id', workspace_id)",
    para: ".eq('id', member_id)" },

  { nome: 'dono do tenant volta a vincular conta alheia em silêncio',
    arq: 'netlify/functions/workspace-create-user.js',
    de: "    return erro(409, 'Não foi possível criar este acesso com esse e-mail. Fale com o suporte do brandcode para vincular a pessoa a este workspace.')",
    para: '    userId = existente.id' },

  { nome: 'a resposta volta a dizer se o e-mail já tem conta (enumeração)',
    arq: 'netlify/functions/workspace-create-user.js',
    de: '  return ok({ email: emailNorm })',
    para: '  return ok({ email: emailNorm, user_id: userId, ja_existia: false })' },

  // A janela do deploy: código novo + banco velho. Sem fallback, NENHUM tenant
  // carrega até a migration rodar — e a ordem passa a ser crítica às 22h.
  { nome: 'o login do tenant deixa de aguentar o banco pré-052',
    arq: 'src/lib/WorkspaceContext.jsx',
    de: "      if (error) ({ data } = await buscar('role, workspaces!inner(*)'))",
    para: '' },

  { nome: 'a lista do time deixa de aguentar o banco pré-052',
    arq: 'netlify/functions/workspace-members.js',
    de: "  if (listErr) ({ data: members } = await listar('id, user_id, role, created_at'))",
    para: '' },

  // ── Segundo fator no operador (24/08) ─────────────────────────────
  { nome: 'endpoint de operador aceita token sem segundo fator',
    arq: 'netlify/functions/admin-reset-password.js',
    de: '  if (semFator) return semFator', para: '' },

  { nome: 'token ilegível passa a valer aal2 (falha ABERTA)',
    arq: 'netlify/functions/_mfa.js',
    de: "    return JSON.parse(json).aal || 'aal1'", para: "    return JSON.parse(json).aal || 'aal2'" },

  { nome: 'comparação frouxa do nível (AAL2, aal3 entram)',
    arq: 'netlify/functions/_mfa.js',
    de: "export const temSegundoFator = (token) => nivelDoToken(token) === 'aal2'",
    para: "export const temSegundoFator = (token) => /aal/i.test(String(nivelDoToken(token)))" },

  { nome: 'o /admin monta sem o segundo fator',
    arq: 'src/App.jsx',
    de: '    if (!mfaOk) {', para: '    if (false) {' },

  // ── Redefinir senha (24/08) ───────────────────────────────────────
  { nome: 'redefinir senha volta a aceitar quem não é operador',
    arq: 'netlify/functions/admin-reset-password.js',
    de: '  if (!operador) return erro(403, \'Acesso negado\')', para: '' },

  { nome: 'um operador redefine a senha do outro (takeover lateral)',
    arq: 'netlify/functions/admin-reset-password.js',
    de: '  if (user_id !== quemChama.id) {', para: '  if (false) {' },

  { nome: 'senha redefinida deixa de ser transitória',
    arq: 'netlify/functions/admin-reset-password.js',
    de: 'must_change_password: true', para: 'must_change_password: false' },

  { nome: 'gerador de senha volta ao Math.random (previsível)',
    arq: 'src/lib/helpers.js',
    de: "  crypto.getRandomValues(bytes);\n  return Array.from(bytes, b => chars[b % chars.length]).join('');",
    para: "  return Array.from(bytes, () => chars[Math.floor(Math.random() * chars.length)]).join('');" },

  { nome: 'papel cru chega à tela e o dropdown fica em branco',
    arq: 'netlify/functions/admin-list-members.js',
    de: '  const result = members.map(derivarCapacidades).map(m => ({',
    para: '  const result = members.map(m => ({' },

  { nome: 'o porteiro deixa de aguentar o banco pré-052',
    arq: 'netlify/functions/_papeis.js',
    de: "  const { data: velho } = await consulta('id, role')",
    para: '  const velho = null' },

  { nome: 'o convite volta a sair de user_metadata (que o usuário reescreve)',
    arq: 'netlify/functions/workspace-join.js',
    de: 'user.app_metadata?.convite_workspace_id',
    para: 'user.user_metadata?.workspace_id' },

  { nome: 'dono sem as capacidades (estado que a tela não representa)',
    arq: 'netlify/functions/_papeis.js',
    de: "    ...(role === 'owner' ? { pode_aprovar_pecas: true, pode_aprovar_aprendizado: true } : {}),",
    para: '' },

  { nome: 'a tela volta a escrever direto em workspace_members',
    arq: 'src/pages/app/WorkspacePage.jsx',
    de: `      await chamar('/.netlify/functions/workspace-member', {
        method: 'PATCH',`,
    para: `      await supabase.from('workspace_members').update(papelDoPreset(editPreset)).eq('id', editing.id)
      await chamar('/.netlify/functions/nada', {
        method: 'PATCH',` },

  // Duas armadilhas aqui, as duas descobertas do jeito caro em 19/08:
  // 1. a URL é FICTÍCIA — escrever a real reintroduz o defeito dentro da
  //    própria guarda (foi o que barrou o build na primeira tentativa);
  // 2. e vai CONCATENADA — mesmo fictícia, o literal contíguo faria a guarda
  //    acusar este arquivo. O valor só existe quando a mutação é aplicada.
  { nome: 'URL do Supabase volta a ser escrita no código',
    arq: '.spec/arquivo/hering-bakeoff.mjs',
    de: '${process.env.SUPABASE_URL}',
    para: 'https://projetoficticio' + 'detestes.supabase' + '.co' },
]

let pegos = 0
console.log('mutação'.padEnd(52), 'resultado')
console.log('-'.repeat(72))
for (const m of MUTACOES) {
  const orig = readFileSync(m.arq, 'utf8')
  if (!orig.includes(m.de)) { console.log(m.nome.padEnd(52), '⚠ alvo não encontrado'); continue }
  writeFileSync(m.arq, orig.replace(m.de, m.para))
  let vermelho = false, quantos = 0
  try {
    execSync('npx vitest run --reporter=json --outputFile=node_modules/.mut.json', { stdio: 'pipe' })
  } catch { vermelho = true }
  try {
    const r = JSON.parse(readFileSync('node_modules/.mut.json', 'utf8'))
    quantos = r.numFailedTests || 0
    if (quantos > 0) vermelho = true
  } catch { /* json pode faltar se o vitest morreu */ }
  writeFileSync(m.arq, orig)
  if (vermelho) pegos++
  console.log(m.nome.padEnd(52), vermelho ? `✓ PEGA (${quantos} teste(s) vermelho(s))` : '✗ PASSOU DESPERCEBIDA')
}
console.log('-'.repeat(72))
console.log(`${pegos}/${MUTACOES.length} defeitos reintroduzidos foram detectados`)
if (pegos < MUTACOES.length) {
  console.error('\nA suíte NÃO protege contra todos os defeitos conhecidos. Não faça deploy.')
  process.exit(1)
}
