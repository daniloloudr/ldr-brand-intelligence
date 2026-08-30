// ════════════════════════════════════════════════════════════════════
// SESSÃO DE SUPORTE (migration 053) — o bypass do operador com validade.
//
// A RLS é o perímetro, e ela é exercitada em `npm run guarda:rls` (banco
// descartável, 66 asserções). Este arquivo cuida do OUTRO lado: o endpoint que
// abre a sessão, que é onde a proteção pode ser esvaziada sem que a RLS mude
// uma linha.
//
// O handler roda de verdade, com Supabase dublado, e as asserções são sobre o
// EFEITO — o que foi gravado, o que foi recusado. Guarda que só existe é
// teatro; a varredura de mutação reprova, e com razão.
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'

const gravacoes = []
let ehOperador   = true
let usuario      = { id: 'op-1', email: 'danilo@loudr.com.br' }
let workspaceExiste = true

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: usuario }, error: usuario ? null : new Error('sem token') }) },
    from(tabela) {
      const q = {
        select() { return q }, eq() { return q }, is() { return q }, gt() { return q },
        order() { return q }, limit() { return q },
        maybeSingle: async () => ({
          data: tabela === 'platform_admins' ? (ehOperador ? { id: 'pa-1' } : null)
              : tabela === 'workspaces'      ? (workspaceExiste ? { id: 'ws-1', nome: 'Hering' } : null)
              : null,
        }),
        insert(linha) {
          gravacoes.push({ op: 'insert', tabela, linha })
          return { select: () => ({ single: async () => ({ data: { id: 's-1', ...linha }, error: null }) }) }
        },
        update(linha) {
          gravacoes.push({ op: 'update', tabela, linha })
          const enc = { eq: () => enc, is: async () => ({ error: null }), then: (r) => r({ error: null }) }
          return enc
        },
      }
      return q
    },
  }),
}))

const { handler } = await import('../netlify/functions/admin-support-session.js')
const { handler: panoramaHandler } = await import('../netlify/functions/admin-panorama.js')

// aal2 = passou pelo segundo fator. `_mfa.js` lê a claim do payload do JWT.
const jwt = (aal) => `x.${Buffer.from(JSON.stringify({ aal })).toString('base64url')}.y`

const abrir = (corpo, aal = 'aal2') => handler({
  httpMethod: 'POST',
  headers: { authorization: `Bearer ${jwt(aal)}` },
  body: JSON.stringify(corpo),
})

const sessoesAbertas = () => gravacoes.filter(g => g.op === 'insert' && g.tabela === 'platform_admin_sessions')

const panorama = (vista, aal = 'aal2') => panoramaHandler({
  httpMethod: 'GET',
  headers: { authorization: `Bearer ${jwt(aal)}` },
  queryStringParameters: { vista },
})

beforeEach(() => {
  gravacoes.length = 0
  ehOperador = true
  usuario = { id: 'op-1', email: 'danilo@loudr.com.br' }
  workspaceExiste = true
})

describe('o porteiro RECUSA — e nada é gravado', () => {
  it('sem token não abre sessão', async () => {
    const r = await handler({ httpMethod: 'POST', headers: {}, body: '{}' })
    expect(r.statusCode).toBe(401)
    expect(sessoesAbertas()).toEqual([])
  })

  it('quem não opera a plataforma não abre sessão', async () => {
    ehOperador = false
    const r = await abrir({ workspace_id: 'ws-1', motivo: 'quero entrar' })
    expect(r.statusCode).toBe(403)
    expect(sessoesAbertas()).toEqual([])
  })

  it('SEM SEGUNDO FATOR não abre sessão', async () => {
    // Gate de tela não protege contra token roubado: quem tem o token chama a
    // function direto. Se este caso cair, a sessão de suporte vira formalidade
    // que o atacante preenche sozinho antes de ler.
    const r = await abrir({ workspace_id: 'ws-1', motivo: 'suporte' }, 'aal1')
    expect(r.statusCode).toBe(403)
    expect(JSON.parse(r.body).precisa_mfa).toBe(true)
    expect(sessoesAbertas()).toEqual([])
  })

  it('sem motivo não abre sessão — é a trilha, não burocracia', async () => {
    for (const motivo of [undefined, '', '  ', 'ok']) {
      gravacoes.length = 0
      const r = await abrir({ workspace_id: 'ws-1', motivo })
      expect(r.statusCode, `motivo ${JSON.stringify(motivo)} passou`).toBe(400)
      expect(sessoesAbertas()).toEqual([])
    }
  })

  it('workspace inexistente não vira acesso registrado', async () => {
    // Sem isto, um UUID digitado errado grava na trilha um acesso que não houve.
    workspaceExiste = false
    const r = await abrir({ workspace_id: 'ws-fantasma', motivo: 'suporte de rotina' })
    expect(r.statusCode).toBe(404)
    expect(sessoesAbertas()).toEqual([])
  })
})

describe('o que a sessão grava', () => {
  it('abre com motivo, tenant e prazo', async () => {
    const r = await abrir({ workspace_id: 'ws-1', motivo: 'conferir a preparação do ambiente' })
    expect(r.statusCode).toBe(200)

    const [{ linha }] = sessoesAbertas()
    expect(linha.admin_user_id).toBe('op-1')
    expect(linha.workspace_id).toBe('ws-1')
    expect(linha.motivo).toBe('conferir a preparação do ambiente')
    expect(new Date(linha.expira_em).getTime()).toBeGreaterThan(Date.now())
  })

  it('TETO de 8 horas: prazo pedido maior é cortado', async () => {
    // Sessão longa é indistinguível de acesso permanente — que é justamente o
    // que esta release existe para acabar.
    await abrir({ workspace_id: 'ws-1', motivo: 'suporte longo', minutos: 60 * 24 * 30 })
    const [{ linha }] = sessoesAbertas()
    const horas = (new Date(linha.expira_em) - Date.now()) / 3_600_000
    expect(horas).toBeLessThanOrEqual(8.01)
  })

  it('encerra a sessão anterior antes de abrir outra', async () => {
    // Reabrir com a aba já aberta renovaria o prazo em silêncio. A trilha fica
    // com as duas linhas, que é o certo: foram dois acessos declarados.
    await abrir({ workspace_id: 'ws-1', motivo: 'segundo acesso do dia' })
    const encerramentos = gravacoes.filter(g => g.op === 'update' && g.linha?.encerrada_em)
    expect(encerramentos.length).toBeGreaterThanOrEqual(1)
  })
})

describe('migration 053 — o que a sessão promete', () => {
  const sql = readFileSync('supabase/migrations/053_sessao_de_suporte.sql', 'utf8')
  const operadorPode = sql.slice(sql.indexOf('function public.operador_pode'), sql.indexOf('revoke all on function public.operador_pode'))

  // O ensaio de RLS (npm run guarda:rls) exercita o COMPORTAMENTO num Postgres
  // descartável. Estes casos existem porque a varredura de mutação roda só o
  // vitest — sem eles, apagar a validade da sessão passaria despercebido aqui e
  // o defeito chegaria ao deploy pela porta da frente.
  it('a sessão VENCE — sem isso o bypass volta a ser permanente', () => {
    expect(operadorPode).toMatch(/expira_em\s*>\s*now\(\)/)
  })

  it('a sessão ENCERRADA não vale', () => {
    expect(operadorPode).toMatch(/encerrada_em\s+is\s+null/)
  })

  it('a sessão é ESCOPADA por tenant', () => {
    // Sem o escopo, uma sessão aberta na Hering abre a Worten junto — que é
    // exatamente o acesso irrestrito que esta release existe para acabar.
    expect(operadorPode).toMatch(/s\.workspace_id\s*=\s*ws/)
  })

  it('quem saiu de platform_admins perde a sessão que já tinha', () => {
    expect(operadorPode).toMatch(/join\s+platform_admins/)
  })

  it('o browser não escreve na trilha — a policy é só de leitura', () => {
    const policy = sql.slice(sql.indexOf('create policy "operador le as proprias sessoes"'))
      .slice(0, 200)
    expect(policy).toMatch(/for select to authenticated/)
    expect(policy).not.toMatch(/for all/)
  })

  it('AS SEIS DO S0 ganharam o bypass — senão a impersonação abre vazia', () => {
    // Achadas pelo `npm run guarda:isolamento`: só eram visíveis ao operador
    // porque ele era MEMBRO. O S1 tira isso, e sem estas seis linhas as telas
    // de Tendências, Insights, Mercado, Clipping, Diagnósticos de concorrentes
    // e Peças abririam vazias — o pior resultado, porque se lê como perda de
    // dado do cliente.
    //
    // AS DUAS CLÁUSULAS, e não "aparece no bloco": a primeira versão deste
    // teste procurava a expressão nos 400 caracteres seguintes e passava com o
    // bypass removido do `using`, porque a cópia do `with check` continuava
    // ali. A varredura de mutação reprovou — ler só significa que o operador
    // ENXERGA; escrever é o que o suporte precisa para consertar.
    for (const t of ['tendencias', 'consumer_insights', 'market_sinteses',
                     'concorrente_clipping', 'pecas_escritas', 'diagnosticos_concorrentes']) {
      const inicio = sql.indexOf(`on ${t}\n`)
      expect(inicio, `policy de ${t} sumiu da migration`).toBeGreaterThan(-1)
      const bloco = sql.slice(inicio, sql.indexOf(';', inicio))
      const vezes = (bloco.match(/or public\.operador_pode\(workspace_id\)/g) || []).length
      expect(vezes, `${t}: o bypass do operador tem que estar no using E no with check`).toBe(2)
    }
  })

  it('o diagnóstico de LEAD (sem workspace) continua com o operador', () => {
    // 124 das 139 linhas de `diagnosticos` em produção não têm workspace_id —
    // vêm do funil público. Sem tenant não há sessão a que amarrar, e a regra
    // geral as tornaria invisíveis para todo mundo: o Histórico do /admin
    // abriria vazio. Achado na revisão de 27/08, antes de aplicar.
    //
    // DUAS vezes — no `using` e no `with check`. Procurar a expressão "no
    // bloco" passa com ela removida de um dos dois, e foi o que a varredura de
    // mutação acusou: ler o histórico e reprocessar um lead são coisas
    // diferentes, e o retry precisa das duas.
    const inicio = sql.indexOf('on diagnosticos\n')
    const bloco = sql.slice(inicio, sql.indexOf(';', inicio))
    const excecao = (bloco.match(/case when workspace_id is null then is_platform_admin\(\)/g) || []).length
    expect(excecao, 'a exceção do lead tem que estar no using E no with check').toBe(2)
    // E a exceção não pode virar porta: linha COM workspace exige sessão.
    const gated = (bloco.match(/else public\.operador_pode\(workspace_id\) end/g) || []).length
    expect(gated, 'diagnóstico DE CLIENTE tem que exigir sessão nos dois lados').toBe(2)
  })

  it('ai_usage NÃO entrou — ela não tem policy nenhuma, é service key', () => {
    // Estava na lista do backlog por um falso positivo da auditoria de
    // isolamento. Criar bypass ali abriria leitura de custo que hoje não existe
    // para token de usuário nenhum.
    expect(sql).not.toMatch(/on ai_usage/)
  })
})

describe('a tela não contorna o banco', () => {
  const ctx    = readFileSync('src/lib/WorkspaceContext.jsx', 'utf8')
  const admin  = readFileSync('src/pages/AppInterno.jsx', 'utf8')
  const modulo = readFileSync('src/lib/sessaoSuporte.js', 'utf8')

  it('o browser NUNCA insere em platform_admin_sessions', () => {
    // Se inserisse, um token roubado abriria a própria sessão. A tabela não tem
    // policy de INSERT para `authenticated` (053) — este teste segura o outro
    // lado: ninguém tentar e concluir que "não funciona no client".
    for (const [nome, src] of [['WorkspaceContext', ctx], ['AppInterno', admin], ['sessaoSuporte', modulo]]) {
      expect(src, `${nome} escreve direto na tabela de sessões`)
        .not.toMatch(/from\(['"]platform_admin_sessions['"]\)/)
    }
  })

  it('entrar no ambiente do cliente passa por abrir sessão', () => {
    // O botão "Entrar →" não pode voltar a chamar onImpersonate direto: sem a
    // sessão, o /app monta inteiro e VAZIO, e isso se lê como perda de dado do
    // cliente — a forma da falha da Zétona (25/08).
    expect(admin).toMatch(/abrirSessaoSuporte\(/)
    const confirma = admin.slice(admin.indexOf('async function confirmarEntrada'))
      .slice(0, admin.slice(admin.indexOf('async function confirmarEntrada')).indexOf('\n  }'))
    expect(confirma).toMatch(/await abrirSessaoSuporte[\s\S]*?onImpersonate/)
  })

  it('o atalho ?tenant= também declara o acesso', () => {
    expect(ctx).toMatch(/abrirSessaoSuporte\(/)
    expect(ctx).toMatch(/origem: 'tenant-local'/)
  })
})

describe('o /admin não lê conteúdo de cliente pelo browser', () => {
  // O DEFEITO QUE ISTO GUARDA (achado na revisão de 27/08, antes de aplicar):
  // consertei a impersonação e não olhei o /admin, que lê o MESMO dado por
  // outro caminho — fora de qualquer impersonação, logo sem sessão possível.
  // Histórico de diagnósticos, Custos e Cérebros abririam vazios, e o deploy é
  // à noite: ninguém veria até a manhã seguinte.
  //
  // É a terceira vez que o mesmo defeito aparece num arquivo vizinho (v8.4).
  // Por isso o teste não é sobre os dois painéis que consertei: ele VARRE as
  // tabelas que a 053 fecha e fica vermelho se qualquer uma voltar ao browser
  // do operador. Cobertura no lugar de inspeção.
  const admin = readFileSync('src/pages/AppInterno.jsx', 'utf8')

  // Fechadas pela 053. Fora da lista de propósito:
  //  · workspaces / workspace_members — seguem com o bypass por identidade (é
  //    a lista de tenants, e sem ela não há de onde escolher para abrir sessão);
  //  · cron_runs / cron_alerts — infra da plataforma, sem tenant;
  //  · diagnosticos — a linha SEM workspace_id é lead do funil, não cliente, e
  //    continua com o operador (124 das 139 em produção). O /admin lê só essas.
  const FECHADAS = [
    'brands', 'alertas', 'concorrentes', 'listening_events', 'sentiment_snapshots',
    'identity_gap_snapshots', 'brand_books', 'brand_book_history', 'campaigns',
    'conversations', 'messages', 'brand_signals', 'brand_intelligence',
    'brand_dataset', 'credit_transactions', 'studio_workflows', 'studio_generations',
    'studio_campaigns', 'tendencias', 'consumer_insights', 'market_sinteses',
    'concorrente_clipping', 'pecas_escritas', 'diagnosticos_concorrentes',
    // As seis achadas em 29/08 pelo ensaio contra o esquema real: escrevem o
    // bypass à mão (`exists (select 1 from platform_admins …)`) em vez de
    // chamar `is_platform_admin()`, e por isso não apareceram na consulta que
    // montou a lista original.
    'brand_assets', 'brand_book_chunks', 'brand_manual_jobs', 'design_tokens',
    'content_hub_analyses', 'listening_terms',
  ]

  it('nenhuma tabela fechada pela 053 é lida direto do /admin', () => {
    for (const t of FECHADAS) {
      // Aspas simples E duplas: foi exatamente por procurar só as simples que
      // a primeira varredura deste arquivo devolveu "nada a corrigir".
      const achou = new RegExp(`from\\(['"]${t}['"]\\)`).test(admin)
      expect(achou, `/admin lê "${t}" pelo browser — depois da 053 isso volta vazio. Vai pelo admin-panorama.js`).toBe(false)
    }
  })

  it('os painéis cross-tenant passam pelo servidor', () => {
    expect(admin).toMatch(/admin-panorama\?vista=cerebros/)
    expect(admin).toMatch(/admin-panorama\?vista=custos/)
  })

  // O porteiro do panorama roda de verdade. A primeira versão destes casos
  // procurava `exigirSegundoFator` no texto do arquivo e passava com a chamada
  // REMOVIDA — a linha do `import` continuava lá e casava com a busca. A
  // varredura de mutação acusou. É a mesma diferença entre "a guarda existe" e
  // "a guarda bloqueia" que originou o ia-diagnostico-handler.test.js.
  it('SEM segundo fator o panorama não devolve dado de cliente', async () => {
    const r = await panorama('cerebros', 'aal1')
    expect(r.statusCode).toBe(403)
    expect(JSON.parse(r.body).precisa_mfa).toBe(true)
  })

  it('quem não opera a plataforma não lê o panorama', async () => {
    ehOperador = false
    const r = await panorama('cerebros')
    expect(r.statusCode).toBe(403)
    ehOperador = true
  })

  it('sem token o panorama recusa', async () => {
    const r = await panoramaHandler({ httpMethod: 'GET', headers: {}, queryStringParameters: { vista: 'custos' } })
    expect(r.statusCode).toBe(401)
  })

  it('vista desconhecida não devolve nada', async () => {
    const r = await panorama('inventada')
    expect(r.statusCode).toBe(400)
  })
})
