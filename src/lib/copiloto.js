// ════════════════════════════════════════════════════════════════════
// copiloto.js — de que lugar o Copiloto foi chamado, e o que ele sabe ali.
//
// A decisão que este arquivo materializa (estudio.md v2, §9): o Copiloto deixa
// de ser página e vira CAMADA. A diferença entre chatbot e "a marca
// respondendo" não é o modelo — é o contexto do lugar onde foi invocado.
//
// Por que uma função pura, separada da UI: o contexto é o que entra no system
// prompt. Se ele se decidir dentro do componente, ninguém consegue afirmar o
// que o Copiloto sabia quando respondeu — e essa é exatamente a pergunta que
// se faz depois que ele responde errado.
//
// NÍVEL DO CONTEXTO (§9.3, "contexto declarado e editável"):
//   'lugar' — o padrão: marca + o que a tela em foco carrega
//   'marca' — o usuário REDUZIU: só a marca, ignorando onde está
// ════════════════════════════════════════════════════════════════════

// Cada lugar declara o que sabe. Espelha a tabela do §9.2 da spec — quando um
// lugar ganhar dado novo, ele entra aqui, não espalhado pelo componente.
const LUGARES = {
  'brands-studio':            { nome: 'Criar',        sabe: ['escopo', 'formato', 'referências em tela'] },
  'brands-studio-video':      { nome: 'Criar · vídeo', sabe: ['escopo', 'formato', 'referência de origem'] },
  'brands-studio-writing':    { nome: 'Criar · texto', sabe: ['escopo', 'framework em uso'] },
  'brands-studio-workflow':   { nome: 'Fluxos',       sabe: ['a receita do fluxo', 'o histórico dele'] },
  'brands-studio-campaigns':  { nome: 'Campanhas',    sabe: ['objetivo', 'vigência', 'direcional'] },
  'brands-campaign-detail':   { nome: 'Campanha',     sabe: ['objetivo', 'vigência', 'direcional', 'peças da campanha'] },
  'brands-studio-biblioteca': { nome: 'Biblioteca',   sabe: ['o acervo', 'as execuções'] },
  'brands-studio-assets':     { nome: 'Ativos',       sabe: ['os ativos da marca'] },
  'brands-detail':            { nome: 'Estratégia',   sabe: ['o brand book', 'a seção aberta'] },
  'reports':                  { nome: 'Relatórios',   sabe: ['a medição da marca'] },
  'competitors':              { nome: 'Concorrentes', sabe: ['os dossiês de concorrente'] },
  'market-intel':             { nome: 'Mercado',      sabe: ['a síntese do ciclo', 'o clipping'] },
  'listening':                { nome: 'Escuta',       sabe: ['as menções coletadas'] },
  'insights':                 { nome: 'Insights',     sabe: ['os insights do consumidor'] },
  'trends':                   { nome: 'Tendências',   sabe: ['o radar do setor'] },
  'content-hub':              { nome: 'Conteúdo',     sabe: ['palavras-chave', 'oportunidades', 'ideias'] },
  'app-home':                 { nome: 'Início',       sabe: ['a recomendação do dia'] },
}

/**
 * O contexto declarado do lugar onde o Copiloto foi invocado.
 * Devolve o que o PAINEL mostra e o que o system prompt recebe — os dois saem
 * daqui, de propósito: o que se mostra tem que ser o que se manda.
 */
export function contextoDoLugar({ route, section, brandNome, campaignId, workflowId, nivel = 'lugar' } = {}) {
  const marca = (brandNome || '').trim()

  // Reduzido pelo usuário: fala só da marca, ignora onde está.
  if (nivel === 'marca') {
    return { nivel: 'marca', lugar: null, rotulo: marca || 'Marca', sabe: ['o brand book', 'a inteligência aprendida'] }
  }

  const l = LUGARES[route]
  if (!l) return { nivel: 'marca', lugar: null, rotulo: marca || 'Marca', sabe: ['o brand book', 'a inteligência aprendida'] }

  // O rótulo é o que aparece no painel: "Hering · Campanha · #a1b2c3d4".
  // Só entra o que existe — rótulo com campo vazio vira "· ·" e parece defeito.
  const partes = [marca, l.nome]
  const sec = route === 'brands-detail' && section ? section : null
  if (sec) partes.push(sec)
  if (campaignId) partes.push(`#${String(campaignId).slice(0, 8)}`)
  if (workflowId) partes.push(`#${String(workflowId).slice(0, 8)}`)

  return { nivel: 'lugar', lugar: route, rotulo: partes.filter(Boolean).join(' · '), sabe: l.sabe }
}

/**
 * O bloco que entra no system prompt. Fica ao lado da derivação de propósito:
 * o texto que o modelo lê é derivado do MESMO objeto que o painel mostra, então
 * não existe estado em que a tela diz uma coisa e o modelo recebe outra.
 *
 * Nível 'marca' devolve string vazia — sem bloco de lugar, o Copiloto responde
 * pela marca, que é o comportamento de antes desta camada existir.
 */
export function blocoDeContexto(ctx) {
  if (!ctx || ctx.nivel !== 'lugar') return ''
  return [
    '[ONDE VOCÊ FOI CHAMADO]',
    ctx.rotulo,
    `O que você tem em mãos aqui: ${ctx.sabe.join(', ')}.`,
    'Responda ao que está em foco neste lugar. Se o usuário perguntar algo de outro lugar do produto, responda mesmo assim — mas diga que está saindo do contexto em foco.',
  ].join('\n')
}
