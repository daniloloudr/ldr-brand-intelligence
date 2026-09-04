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
  { nome: 'lote: a peça principal deixa de ter slot próprio (vira acessório qualquer)',
    arq: 'src/lib/loteExecucao.js',
    de: "                : /still|peca/.test(papel)  ? 'principal'",
    para: "                : false                     ? 'principal'" },

  { nome: 'lote: `processing` volta a ser lido como falha (a peça é dada por perdida gerando)',
    arq: 'src/lib/loteExecucao.js',
    de: "  if (row.status === 'error') return { estado: 'falhou', erro: row.error || 'a geração falhou' }\n  return { estado: 'em_voo' }",
    para: "  return { estado: 'falhou', erro: row.error || 'a geração falhou' }" },

  { nome: 'lote: a contagem volta a sobrescrever a lista de vistas (Rodar não dispara nada)',
    arq: 'src/lib/loteCatalogo.js',
    de: '             vistasPedidas: pedidas,', para: '             saidas: pedidas.length, vistasPedidas: undefined,' },

  { nome: 'lote: acessório do lote ANTERIOR sobrevive no SKU novo',
    arq: 'src/lib/loteExecucao.js',
    de: '  acessorios.forEach((id, i) => { mapa[id] = i === 0 ? acess : [] })',
    para: '  if (acessorios[0] && acess.length) mapa[acessorios[0]] = acess' },

  { nome: 'grafo: a ordem escolhida no painel volta a perder para a das conexões',
    arq: 'src/lib/studioGrafo.js',
    de: '  if (!Array.isArray(refOrder) || !refOrder.length) return produtores',
    para: '  return produtores; if (!Array.isArray(refOrder) || !refOrder.length) return produtores' },

  { nome: 'lote: o addon volta a inventar um §O LOOK e briga com o do nó de contexto',
    arq: 'src/lib/loteCatalogo.js',
    de: "export const montarLook = () => ''",
    para: "export const montarLook = (l) => '═══ O LOOK ═══\\n• PARTE DE CIMA'" },

  { nome: 'grafo: a etapa deixa de puxar as dependências (peça sai SEM base, calada)',
    arq: 'src/lib/studioGrafo.js',
    de: '    for (const dep of dependenciasDeGeracao(nodes, edges, id)) visitar(dep)',
    para: '    for (const dep of []) visitar(dep)' },

  { nome: 'grafo: a referência ignora o que a onda anterior produziu',
    arq: 'src/lib/studioGrafo.js',
    de: '    .flatMap(n => paraUrls(saidas?.[n.id] ?? (dados(n).urls || dados(n).outputUrl || dados(n).imageUrl || dados(n).url)))',
    para: '    .flatMap(n => paraUrls(dados(n).urls || dados(n).outputUrl || dados(n).imageUrl || dados(n).url))' },

  { nome: 'lote: a descrição da PEÇA volta a poluir a base da modelo',
    arq: 'src/lib/loteExecucao.js',
    de: "  const daPeca = etapaDoNo(genId) === ETAPA_DA_BASE ? '' : contextoDaPeca",
    para: '  const daPeca = contextoDaPeca' },

  { nome: 'grafo: a base da modelo (etapa 0) volta a ser vendida como peça de catálogo',
    arq: 'src/lib/studioGrafo.js',
    de: '      deCatalogo: etapa === null ? true : etapa !== ETAPA_DA_BASE,',
    para: '      deCatalogo: true,' },

  { nome: 'lote: o addon volta a montar as referências por conta (perde a ordem do grafo)',
    arq: 'src/lib/loteExecucao.js',
    de: '    references: referenciasDaGeracao(grafo, edges, genId, MAX_REFS_CANVAS),',
    para: '    references: Object.values(entradasDoLote(nodes, linha, resolver)).flat(),' },

  { nome: 'lote: o contexto volta a SUBSTITUIR inteiro e leva a câmera da etapa junto',
    arq: 'src/lib/loteExecucao.js',
    de: '  const contexto = mesclarContexto(inp.context, daPeca)',
    para: '  const contexto = daPeca || inp.context' },

  { nome: 'lote: a seção do usuário deixa de vencer a do fluxo (duas §A PEÇA no prompt)',
    arq: 'src/lib/loteExecucao.js',
    de: '    if (!s.chave || doUsuarioPorChave.has(s.chave)) continue',
    para: '    if (!s.chave) continue' },

  { nome: 'lote: contexto já completo volta a ser embrulhado (cabeçalho em cima de cabeçalho)',
    arq: 'src/lib/loteCatalogo.js',
    de: "  if (/^═+|PRODUÇÃO DE CATÁLOGO/m.test(texto)) return texto",
    para: '  if (false) return texto' },

  { nome: 'grafo: o canvas volta a ter leitura PRÓPRIA do prompt (diverge do addon)',
    arq: 'src/lib/studioGrafo.js',
    de: "  const promptNode  = ins.find(n => n.type === 'prompt')",
    para: '  const promptNode  = null' },

  { nome: 'grafo: o separador de contexto muda e a peça sai diferente do canvas',
    arq: 'src/lib/studioGrafo.js',
    de: '  context ? `${prompt}\n\n[CONTEXTO ADICIONAL]\n${context}` : prompt',
    para: '  context ? `${prompt}\n${context}` : prompt' },

  { nome: 'grafo: o clamp de px some e pedido absurdo chega na fal',
    arq: 'src/lib/studioGrafo.js',
    de: "    ? { width:  Math.min(4096, Math.max(256, fd.width  || 1080)),\n        height: Math.min(4096, Math.max(256, fd.height || 1350)) }",
    para: '    ? { width: fd.width || 1080, height: fd.height || 1350 }' },

  { nome: 'grafo: o modelo volta a vir do primeiro nó, não da geração da vista',
    arq: 'src/lib/studioGrafo.js',
    de: "      model: dados(gen).model === 'custom' ? dados(gen).customModel : (dados(gen).model || null),",
    para: '      model: null,' },

  { nome: 'lote: as vistas voltam a ser lista fixa no código (divergem do fluxo)',
    arq: 'src/lib/loteCatalogo.js',
    de: "    if (n?.type !== 'prompt') continue", para: '    if (false) continue' },

  { nome: 'lote: pedir vista que o fluxo não tem volta a passar calado',
    arq: 'src/lib/loteCatalogo.js',
    de: '      if (orfas.length) p.push({ nivel: GRAVE, campo: \'saidas\',',
    para: '      if (false) p.push({ nivel: GRAVE, campo: \'saidas\',' },

  { nome: 'lote: o teto volta a contar PAPEL em vez de imagem (caso do sapato)',
    arq: 'src/lib/loteCatalogo.js',
    de: '      refs += vs.length                       // IMAGENS, não papéis',
    para: '      refs += 1' },

  { nome: 'lote: contexto vazio volta a passar e a peça sai genérica',
    arq: 'src/lib/loteCatalogo.js',
    de: "if (!ctx) p.push({ nivel: GRAVE, campo: 'contexto', texto: 'sem contexto — a peça sairia genérica' })",
    para: 'if (false) {}' },

  { nome: 'lote: o corte silencioso de referência volta a ser silencioso',
    arq: 'src/lib/loteCatalogo.js',
    de: '    if (plano?.ignoradas) {', para: '    if (false) {' },

  { nome: 'lote: elenco não cadastrado volta a passar no portão',
    arq: 'src/lib/loteCatalogo.js',
    de: "      const ok = papel.doElenco ? nomesElenco.has(v.toLowerCase())\n               : (ehUrl(v) || nomesAcervo.has(v.toLowerCase()))",
    para: '      const ok = true' },

  { nome: 'lote: linha bloqueada volta a entrar na conta de crédito',
    arq: 'src/lib/loteCatalogo.js',
    de: '  const imagens = prontas.reduce((n, l) => n + l.saidas, 0)',
    para: '  const imagens = avaliadas.reduce((n, l) => n + l.saidas, 0)' },

  { nome: 'lote: o separador do Excel pt-BR (;) volta a não ser detectado',
    arq: 'src/lib/loteCatalogo.js',
    de: "  const sep = (primeira.match(/;/g) || []).length > (primeira.match(/,/g) || []).length ? ';' : ','",
    para: "  const sep = ','" },

  { nome: 'o menu volta a mostrar addon que ninguém liberou',
    arq: 'src/lib/addons.js',
    de: "export const estaLigado = (inst) => inst?.estado === 'ativo'",
    para: 'export const estaLigado = (inst) => !!inst' },

  { nome: 'addon de UMA marca volta a aparecer nas outras do workspace',
    arq: 'src/lib/addons.js',
    de: 'export const valeNaMarca = (inst, brandId) => !inst?.brand_id || inst.brand_id === brandId',
    para: 'export const valeNaMarca = () => true' },

  { nome: 'o menu volta a confiar em slug que saiu do catálogo',
    arq: 'src/lib/addons.js',
    de: '    .map((i) => acharAddon(i.addon))\n    .filter(Boolean)',
    para: '    .map((i) => acharAddon(i.addon))' },

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

  // A guarda virou lista-branca em 26/08; o alvo desta mutação mudou junto.
  // Desligar a comparação é a forma mais crua do defeito — o cliente volta a
  // escrever em qualquer coluna de `workspaces`, saldo inclusive.
  { nome: 'o saldo de créditos volta a ser editável pelo cliente',
    arq: 'supabase/migrations/052_papeis_por_tenant.sql',
    de: '  if (to_jsonb(new) - editaveis) is distinct from (to_jsonb(old) - editaveis) then',
    para: '  if false then' },

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

  { nome: 'workspace nasce sem dono e a falha é engolida',
    arq: 'netlify/functions/admin-create-workspace.js',
    de: "  if (vincErr) ({ error: vincErr } = await vincular({ role: 'owner' }))", para: '' },

  // ── O onboarding que não andava sozinho (25/08, Zétona) ───────────
  { nome: 'o cron do onboarding volta a despachar sem se identificar',
    arq: 'netlify/functions/_onboard.js',
    de: '        : internalHeaders()', para: "        : { 'Content-Type': 'application/json' }" },

  { nome: 'o diagnóstico volta a exigir token e mata o cron em silêncio',
    arq: 'netlify/functions/diagnostico-gerar-background.js',
    de: '  const user = porteiro.user',
    para: "  const token = event.headers.authorization?.replace('Bearer ', '')\n  if (!token) return { statusCode: 401 }\n  const user = porteiro.user" },

  { nome: 'checagem de participação roda sem usuário (TypeError no cron)',
    arq: 'netlify/functions/diagnostico-gerar-background.js',
    de: '    if (!porteiro.interno) {', para: '    if (true) {' },

  { nome: 'diagnóstico de servidor volta a inventar autor',
    arq: 'netlify/functions/diagnostico-gerar-background.js',
    de: "    : { tipo: 'onboarding' }", para: "    : { tipo: 'manual' }" },

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
    de: '          <MfaGate obrigatorio onLiberado={() => setMfaOk(true)} onLogout={doLogout} />',
    para: '          <MfaGate onLiberado={() => setMfaOk(true)} onLogout={doLogout} />' },

  { nome: 'o segundo fator vira OBRIGATÓRIO para o cliente',
    arq: 'src/pages/auth/MfaGate.jsx',
    de: '    if (!obrigatorio) return onLiberado()', para: '' },

  { nome: 'quem ligou o MFA deixa de ser verificado (sessão cai em 15 min)',
    arq: 'src/App.jsx',
    de: `    if (!mfaOk) {
      return (
        <Suspense fallback={<PageFallback />}>
          <MfaGate onLiberado={() => setMfaOk(true)} onLogout={doLogout} />
        </Suspense>
      );
    }
    return (
      <AppShell`,
    para: '    return (\n      <AppShell' },

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

  // ── Os dois achados do security gate de 26/08, na véspera do deploy ──
  // Entram aqui pela regra da casa: defeito encontrado vira mutação junto com
  // o teste que o pega. Estes não chegaram ao cliente — foram pegos no portão —
  // mas a classe é a mesma e o custo de esquecer seria a chave da fal.
  { nome: 'a URL do job do fal volta a vir crua do chamador (chave vaza)',
    arq: 'netlify/functions/_image.js',
    de: 'const url = urlDeJobDoFal(statusUrl) ||',
    para: 'const url = statusUrl ||' },

  { nome: 'o poll do Studio volta a aceitar token de usuário qualquer',
    arq: 'netlify/functions/studio-poll-background.js',
    de: `  if (!porteiro.interno) {
    return { statusCode: 403, body: JSON.stringify({ error: 'chamada interna apenas' }) }
  }`,
    para: '' },

  { nome: 'a data do ciclo de crédito entra na lista-branca (refill infinito)',
    arq: 'supabase/migrations/052_papeis_por_tenant.sql',
    de: "array['nome', 'dominio', 'setor', 'porte', 'dados_alertas']",
    para: "array['nome', 'dominio', 'setor', 'porte', 'dados_alertas', 'creditos_ciclo_reset']" },

  // O mesmo defeito do diagnóstico (25/08), dois passos adiante na trilha:
  // sobreviveu ao próprio conserto porque olhamos um arquivo, não a etapa.
  { nome: 'a síntese de mercado volta a recusar o cron em silêncio',
    arq: 'netlify/functions/market-sintese-background.js',
    de: '  if (!porteiro.interno) {',
    para: "  const token = event.headers.authorization?.replace('Bearer ', '')\n  if (!token) return { statusCode: 401 }\n  if (!porteiro.interno) {" },

  { nome: 'os insights voltam a recusar o cron em silêncio',
    arq: 'netlify/functions/insights-gerar-background.js',
    de: '  if (!porteiro.interno) {',
    para: "  const token = event.headers.authorization?.replace('Bearer ', '')\n  if (!token) return { statusCode: 401 }\n  if (!porteiro.interno) {" },

  // O atalho de `?tenant=` do operador. As duas travas, uma mutação cada:
  // sem a de host ele vale em PRODUÇÃO (getTenantSlug aceita ?tenant= em
  // qualquer domínio); sem a de operador, qualquer usuário logado abre
  // qualquer marca — e localhost aponta para o banco de produção.
  { nome: 'o atalho de tenant perde a trava de host (passa a valer em prod)',
    arq: 'src/lib/WorkspaceContext.jsx',
    de: 'const { data: operador } = ehAmbienteLocal()',
    para: 'const { data: operador } = true' },

  { nome: 'o atalho de tenant abre a marca sem conferir se é operador',
    arq: 'src/lib/WorkspaceContext.jsx',
    de: 'const { data: ws } = operador',
    para: 'const { data: ws } = true' },

  // F11 — a extração aprendeu `strategy`. O risco não é a passada nova (que
  // falha visível: campo em branco); é a ESCRITA apagar o que o Copiloto
  // gravou, num reimport, em silêncio.
  { nome: 'a estratégia volta a não ter onde ser gravada',
    arq: 'netlify/functions/brand-manual-extract-background.js',
    de: '    strategy:        strategyMesclada,\n',
    para: '' },

  { nome: 'a mescla vira substituição (apaga o que o Copiloto gravou)',
    arq: 'netlify/functions/brand-manual-extract-background.js',
    de: '  const saida = { ...(atual || {}) }',
    para: '  const saida = { ...(novo || {}) }' },

  { nome: 'o esqueleto vazio do modelo passa a apagar dado bom',
    arq: 'netlify/functions/brand-manual-extract-background.js',
    de: 'if (!vazio(v)) saida[k] = v',
    para: 'saida[k] = v' },

  { nome: 'o cron volta a mandar o objeto cru ao modelo ([object Object])',
    arq: 'netlify/functions/cron-monitor.js',
    de: '${alvoDoDiagnostico(empresa)}',
    para: '${empresa}' },

  // ── Sessão de suporte (release de 27/08 — S0+S3+S4) ───────────────
  // A RLS é exercitada no ensaio (`npm run guarda:rls`, 66 asserções em
  // Postgres descartável), mas esta varredura roda só o vitest. Sem as
  // mutações abaixo, apagar a validade da sessão passa despercebido aqui — e
  // esta varredura é o que roda no pre-commit.
  { nome: 'a sessão de suporte volta a não expirar (bypass permanente)',
    arq: 'supabase/migrations/053_sessao_de_suporte.sql',
    de: '       and s.expira_em > now()', para: '' },

  { nome: 'sessão encerrada volta a dar acesso',
    arq: 'supabase/migrations/053_sessao_de_suporte.sql',
    de: '       and s.encerrada_em is null', para: '' },

  { nome: 'a sessão perde o escopo de tenant (uma abre todas)',
    arq: 'supabase/migrations/053_sessao_de_suporte.sql',
    de: '       and s.workspace_id  = ws', para: '' },

  { nome: 'quem saiu de platform_admins mantém a sessão que tinha',
    arq: 'supabase/migrations/053_sessao_de_suporte.sql',
    de: '      join platform_admins p on p.user_id = s.admin_user_id', para: '' },

  { nome: 'o browser volta a abrir a própria sessão de suporte',
    arq: 'supabase/migrations/053_sessao_de_suporte.sql',
    de: '  for select to authenticated\n  using (admin_user_id = auth.uid());',
    para: '  for all to authenticated\n  using (admin_user_id = auth.uid());' },

  { nome: 'S0: tendencias volta a ficar sem o bypass (tela vazia)',
    arq: 'supabase/migrations/053_sessao_de_suporte.sql',
    de: `create policy "acessa tendencias" on tendencias
  for all
  using      (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()) or public.operador_pode(workspace_id))`,
    para: `create policy "acessa tendencias" on tendencias
  for all
  using      (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()))` },

  { nome: 'abrir sessão deixa de exigir o segundo fator',
    arq: 'netlify/functions/admin-support-session.js',
    de: '  const semFator = exigirSegundoFator(token, cabecalhos)\n  if (semFator) return semFator',
    para: '' },

  { nome: 'a sessão volta a ser aberta sem motivo declarado (sem trilha)',
    arq: 'netlify/functions/admin-support-session.js',
    de: '  if (motivoLimpo.length < 3) return erro(400,',
    para: '  if (false) return erro(400,' },

  { nome: 'o prazo pedido deixa de ter teto (sessão de 30 dias)',
    arq: 'netlify/functions/admin-support-session.js',
    de: 'const duracao = Math.max(5, Math.min(pedidos, MINUTOS_TETO))',
    para: 'const duracao = pedidos' },

  { nome: 'o painel Cérebros volta a ler cliente pelo browser (abre vazio)',
    arq: 'src/pages/AppInterno.jsx',
    de: '    const res = await fetch("/.netlify/functions/admin-panorama?vista=cerebros", {',
    para: '    await supabase.from("brand_intelligence").select("brand_id");\n    const res = await fetch("/.netlify/functions/admin-panorama?vista=cerebros", {' },

  { nome: 'o panorama do /admin deixa de exigir o segundo fator',
    arq: 'netlify/functions/admin-panorama.js',
    de: '  const semFator = exigirSegundoFator(token, cabecalhos)\n  if (semFator) return semFator',
    para: '' },

  { nome: 'o diagnóstico de LEAD deixa de ser exceção (Histórico abre vazio)',
    arq: 'supabase/migrations/053_sessao_de_suporte.sql',
    de: '    case when workspace_id is null then is_platform_admin()\n         else public.operador_pode(workspace_id) end\n  )\n  with check (',
    para: '    public.operador_pode(workspace_id)\n  )\n  with check (' },

  { nome: 'entrar no cliente volta a pular a sessão (o /app abre vazio)',
    arq: 'src/pages/AppInterno.jsx',
    de: '      const sessao = await abrirSessaoSuporte(entrar.ws.id, entrar.motivo, { minutos: entrar.minutos });\n      onImpersonate?.({ workspaceId: entrar.ws.id, workspaceName: entrar.ws.nome, sessao });',
    para: '      onImpersonate?.({ workspaceId: entrar.ws.id, workspaceName: entrar.ws.nome });' },

  // ── Studio: o que entra no nó (reunião Hering, 31/08/2026) ─────────
  // "O sapato não pegou" eram DOIS sumiços silenciosos empilhados — o teto do
  // canvas e os modelos de endpoint singular — e o nó não mostrava nem um nem
  // outro. Chegou ao cliente; por isso está aqui.
  { nome: 'o nó volta a mentir que todo modelo lê várias referências',
    arq: 'src/lib/studioModels.js',
    de: "export const refsDoModelo = id => REFS_POR_MODELO[id] || { modo: 'varias' }",
    para: 'export const refsDoModelo = () => ({ modo: "varias" })' },

  { nome: 'o limite do MODELO some da conta (5 refs no Kontext viram 5 usadas)',
    arq: 'src/lib/studioModels.js',
    de: "const limiteModelo = r.modo === 'uma' ? 1 : (r.exatas || r.max || Infinity)",
    para: 'const limiteModelo = Infinity' },

  { nome: 'o corte de referências volta a ser silencioso (ignoradas = 0)',
    arq: 'src/lib/studioModels.js',
    de: 'ignoradas: Math.max(0, conectadas - usadas),',
    para: 'ignoradas: 0,' },

  { nome: 'a ordem escolhida no painel Entradas para de valer',
    arq: 'src/lib/studioModels.js',
    de: 'if (!Array.isArray(refOrder) || !refOrder.length) return produtores',
    para: 'if (true) return produtores' },

  { nome: 'a conexão volta a só apagar com Backspace (trava a cliente no Windows)',
    arq: 'src/pages/app/StudioCanvas.jsx',
    de: "deleteKeyCode={['Backspace', 'Delete']}",
    para: "deleteKeyCode={['Backspace']}" },

  { nome: 'o painel volta a contar NÓS em vez de imagens (nó com 2 fotos some calado)',
    arq: 'src/pages/app/studioNodes.jsx',
    de: 'planoDeRefs(modelo, totalUrls, MAX_REFS_CANVAS, regra)',
    para: 'planoDeRefs(modelo, refs.length, MAX_REFS_CANVAS, regra)' },

  // ── Atalhos do canvas (31/08/2026) ────────────────────────────────
  { nome: 'o Ctrl+Z do grafo passa a agir dentro do campo de texto (apaga o parágrafo)',
    arq: 'src/pages/app/StudioCanvas.jsx',
    de: "if (k === 'z' && !escrevendo(e.target))",
    para: "if (k === 'z')" },

  { nome: 'o histórico volta a guardar estado de execução (desfazer vira spinner)',
    arq: 'src/pages/app/StudioCanvas.jsx',
    de: 'JSON.stringify({ n: serializableNodes(), e: edges })',
    para: 'JSON.stringify({ n: nodes, e: edges })' },

  { nome: 'a tela da trilha volta a ESCREVER na tabela de sessões (token roubado abre a própria)',
    arq: 'src/pages/AppInterno.jsx',
    de: "from('platform_admin_sessions')\n        .select('id, workspace_id, motivo, criada_em, expira_em, encerrada_em, origem')",
    para: "from('platform_admin_sessions')\n        .insert({ motivo: 'x' })\n        .select('id, workspace_id, motivo, criada_em, expira_em, encerrada_em, origem')" },

  // ── Motor do "Melhorar prompt" (31/08/2026) ───────────────────────
  { nome: 'o teto do prompt volta a ser opcional (Imagem e Vídeo sem limite)',
    arq: 'netlify/functions/studio-prompt.js',
    de: ': LIMITE_PADRAO', para: ': null' },

  { nome: 'o refinador volta a receber ordem de ENRIQUECER (inventa cena)',
    arq: 'netlify/functions/studio-prompt.js',
    de: 'Não acrescente elemento',
    para: 'Enriqueça com detalhe vívido e acrescente elemento' },

  // ── Escopo do aprendizado — §3.5 / migration 058 (02/set/2026) ─────
  // Cada uma destas é irreversível se escapar: aprendizado de campanha que
  // entra no modelo da marca não sai mais de lá. É a mesma forma dos 24 sinais
  // contaminados — quando se descobre, já virou memória.
  { nome: 'a destilação da marca volta a engolir sinal de campanha',
    arq: 'netlify/functions/_brain.js',
    de: "return campanha_id ? q.eq('campanha_id', campanha_id) : q.is('campanha_id', null)",
    para: 'return q' },

  { nome: 'campanha ENCERRADA volta a alimentar peça nova',
    arq: 'netlify/functions/_brain.js',
    de: "return data?.status === 'ativa'",
    para: 'return true' },

  { nome: 'a versão da campanha vira "a última" do modelo da marca',
    arq: 'netlify/functions/_brain.js',
    de: "const q = campanha_id ? base().eq('campanha_id', campanha_id) : base().is('campanha_id', null)",
    para: 'const q = base()' },

  { nome: 'o modelo da campanha reescreve o RAG semântico da MARCA',
    arq: 'netlify/functions/_brain.js',
    de: '  if (!campanha_id) {\n    try {\n      const n = await embedIntelChunks(supabase, brand_id, modelo)',
    para: '  if (true) {\n    try {\n      const n = await embedIntelChunks(supabase, brand_id, modelo)' },

  { nome: 'a versão destilada perde o escopo (tudo vira modelo da marca)',
    arq: 'netlify/functions/_brain.js',
    de: '    ...(campanha_id ? {\n      campanha_id,',
    para: '    ...(false ? {\n      campanha_id,' },

  { nome: 'o destilador de campanha volta a achar que escreve regra de marca',
    arq: 'netlify/functions/_brain.js',
    de: 'sem generalizar para regra de marca',
    para: 'e generalize para regra de marca' },

  // Erro de leitura respondendo 'no_signals' é silêncio idêntico ao de uma
  // marca sem novidade: a destilação pararia para sempre e ninguém veria.
  { nome: 'falha ao ler sinais volta a se passar por "sem sinais novos"',
    arq: 'netlify/functions/_brain.js',
    de: '  if (sigErr) return',
    para: '  if (false) return' },

  // O cron contando por marca depois do escopo = trabalho eterno: os sinais de
  // campanha entram na conta da marca, a destilação da marca não os consome, e
  // amanhã a conta está acima do limiar de novo. Todo dia, gastando LLM à toa.
  { nome: 'o cron volta a contar sinal por MARCA e destila em laço eterno',
    arq: 'netlify/functions/brand-distill-cron.js',
    de: "const chave = `${r.brand_id}|${r.campanha_id || ''}`",
    para: 'const chave = r.brand_id' },
]

let pegos = 0
console.log('mutação'.padEnd(52), 'resultado')
console.log('-'.repeat(72))
// ── Restaurar SEMPRE, inclusive quando a varredura é morta ──────────
//
// 25/08: o hook de pre-commit rodou esta varredura, a chamada estourou o tempo
// e o processo foi morto NO MEIO de uma mutação. O arquivo ficou no disco com o
// defeito reintroduzido — no caso, o buraco que deixava o dono de um tenant
// vincular conta alheia em silêncio, consertado no dia anterior.
//
// A suíte pegaria (é o que a mutação testa), então não é silencioso. Mas
// "confia que alguém vai rodar os testes de novo" não é rede: bastava um
// `--no-verify` para o defeito voltar a produção pela porta da frente.
//
// A ferramenta que reintroduz defeito de propósito é obrigada a desfazer isso
// mesmo morrendo. `emRestauracao` guarda o arquivo em voo; os handlers cobrem
// Ctrl-C, kill e exceção não tratada.
let emRestauracao = null
const restaurar = () => {
  if (!emRestauracao) return
  writeFileSync(emRestauracao.arq, emRestauracao.orig)
  console.error(`\n⚠ varredura interrompida — ${emRestauracao.arq} restaurado`)
  emRestauracao = null
}
for (const sinal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sinal, () => { restaurar(); process.exit(130) })
}
process.on('uncaughtException', (e) => { restaurar(); console.error(e); process.exit(1) })
process.on('exit', restaurar)

for (const m of MUTACOES) {
  const orig = readFileSync(m.arq, 'utf8')
  if (!orig.includes(m.de)) { console.log(m.nome.padEnd(52), '⚠ alvo não encontrado'); continue }
  emRestauracao = { arq: m.arq, orig }
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
  emRestauracao = null          // restaurado no fluxo normal
  if (vermelho) pegos++
  console.log(m.nome.padEnd(52), vermelho ? `✓ PEGA (${quantos} teste(s) vermelho(s))` : '✗ PASSOU DESPERCEBIDA')
}
console.log('-'.repeat(72))
console.log(`${pegos}/${MUTACOES.length} defeitos reintroduzidos foram detectados`)
if (pegos < MUTACOES.length) {
  console.error('\nA suíte NÃO protege contra todos os defeitos conhecidos. Não faça deploy.')
  process.exit(1)
}
