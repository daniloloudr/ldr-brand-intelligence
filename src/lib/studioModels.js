// Catálogo curado e segmentado de modelos de imagem do fal (atalho de UX).
// `group` define a seção no seletor; ordem aqui = ordem exibida.
// Os melhores/mais usados da geração de imagem em 2026 (benchmark fal.ai).
export const IMAGE_MODELS = [
  // ── Mais usados ──
  { id: 'fal-ai/nano-banana-pro',                       label: 'Nano Banana Pro (Gemini)', group: 'Mais usados',           refs: true  },
  { id: 'fal-ai/gemini-25-flash-image',                 label: 'Nano Banana (Gemini 2.5)', group: 'Mais usados',           refs: true  },
  { id: 'openai/gpt-image-2',                           label: 'GPT Image 2 (OpenAI)',     group: 'Mais usados',           refs: true  },
  { id: 'bytedance/seedream/v5/pro/text-to-image',      label: 'Seedream 5.0 Pro',         group: 'Mais usados',           refs: true  },
  { id: 'fal-ai/flux-2-pro',                            label: 'FLUX.2 [pro]',             group: 'Mais usados',           refs: true  },
  // ── Fotorrealismo & edição ──
  // ⚠️ o id do Seedream 5 NÃO tem o prefixo `fal-ai/` (o 4.x tem). Copiar o
  // padrão da linha de baixo dá 404.
  { id: 'bytedance/seedream/v5/lite/text-to-image',     label: 'Seedream 5.0 Lite',        group: 'Fotorrealismo & edição', refs: true  },
  { id: 'fal-ai/bytedance/seedream/v4.5/text-to-image', label: 'Seedream 4.5',             group: 'Fotorrealismo & edição', refs: true  },
  { id: 'fal-ai/flux-pro/v1.1-ultra',                   label: 'FLUX Pro 1.1 Ultra',       group: 'Fotorrealismo & edição', refs: false },
  { id: 'fal-ai/flux-pro/v1.1',                         label: 'FLUX Pro 1.1',             group: 'Fotorrealismo & edição', refs: false },
  { id: 'fal-ai/flux-pro/kontext',                      label: 'FLUX.1 Kontext [pro]',     group: 'Fotorrealismo & edição', refs: true  },
  { id: 'fal-ai/bytedance/seedream/v4/text-to-image',   label: 'Seedream 4.0',             group: 'Fotorrealismo & edição', refs: true  },
  // ── Rápidos & open ──
  { id: 'fal-ai/flux/dev',                              label: 'FLUX.1 dev',               group: 'Rápidos & open',         refs: false },
  { id: 'fal-ai/flux/schnell',                          label: 'FLUX.1 schnell (rápido)',  group: 'Rápidos & open',         refs: false },
  { id: 'fal-ai/qwen-image',                            label: 'Qwen Image',               group: 'Rápidos & open',         refs: true  },
  // ── Design & tipografia ──
  { id: 'fal-ai/ideogram/v3',                           label: 'Ideogram v3',              group: 'Design & tipografia',    refs: false },
  { id: 'fal-ai/ideogram/v2',                           label: 'Ideogram v2',              group: 'Design & tipografia',    refs: false },
  { id: 'fal-ai/recraft-v3',                            label: 'Recraft v3',               group: 'Design & tipografia',    refs: false },
  // ── Especializados (moda/produto) ──
  { id: 'fal-ai/flux-pro/v1/vto',                       label: 'FLUX Try-On (troca a peça na foto)', group: 'Especializados', refs: true },
  { id: 'fal-ai/fashn/tryon/v1.6',                      label: 'FASHN Try-On (vestir modelo)', group: 'Especializados', refs: true },
  { id: 'bytedance/seedream/v5/pro/layerize',           label: 'Seedream Layerize (separa a imagem em camadas)', group: 'Especializados', refs: true },
  { id: 'fal-ai/bria/product-shot',                     label: 'Bria Product Shot (produto em cena)', group: 'Especializados', refs: true },
  { id: 'fal-ai/iclight-v2',                            label: 'IC-Light (reiluminar)',        group: 'Especializados', refs: true },
  // ── Automático (usado pelo Workflow) ──
  { id: 'auto',                                         label: 'Auto (BR4NDCODE escolhe)',     group: 'Automático',             refs: true  },
]

// Default da tela de Imagem.
export const DEFAULT_IMAGE_MODEL = 'fal-ai/gemini-25-flash-image'

// Ordem das seções no seletor (sem 'Automático' — só faz sentido no Workflow).
export const IMAGE_MODEL_GROUPS = ['Mais usados', 'Fotorrealismo & edição', 'Rápidos & open', 'Design & tipografia', 'Especializados']

// 'auto' resolve no servidor (DEFAULT_MODEL). Enviamos null para o backend decidir.
export const resolveModel = m => (m && m !== 'auto' ? m : null)

// ── Como cada modelo CONSOME as referências conectadas ───────────────
// Espelho do roteamento de `netlify/functions/_image.js`: o mapa I2I de lá
// escolhe entre `image_url` (SINGULAR — manda só references[0] e descarta o
// resto) e `image_urls` (array — manda todas), e os schemas próprios têm papel
// fixo por posição.
//
// Existe porque, até 31/ago/2026, nada disso aparecia na tela. Duas coisas
// sumiam em silêncio: o excedente de MAX_REFS_CANVAS, e — pior — TODA
// referência além da 1ª num modelo singular. Quem conectava cinco imagens no
// Kontext via a geração acontecer normalmente com uma.
//
// `tests/studio-referencias.test.js` executa o `imageField` do backend e falha
// se este mapa divergir dele. Modelo novo com schema próprio entra aqui junto.
const REFS_POR_MODELO = {
  // Endpoint singular no _image.js: recebe UMA. Conectar mais não dá erro.
  'fal-ai/flux-pro/kontext':             { modo: 'uma' },
  'fal-ai/flux/dev':                     { modo: 'uma' },
  'fal-ai/flux-pro/v1.1':                { modo: 'uma' },
  'fal-ai/flux-pro/v1.1-ultra':          { modo: 'uma' },
  'fal-ai/qwen-image':                   { modo: 'uma' },
  'fal-ai/ideogram/v2':                  { modo: 'uma' },
  'fal-ai/recraft-v3':                   { modo: 'uma' },
  // Schema próprio: a POSIÇÃO tem papel, e trocar a ordem troca o resultado.
  'fal-ai/fashn/tryon/v1.6':             { modo: 'papeis', exatas: 2, papeis: ['modelo (pessoa)', 'peça (roupa)'] },
  'fal-ai/flux-pro/v1/vto':              { modo: 'papeis', exatas: 2, papeis: ['modelo (pessoa)', 'peça (roupa)'] },
  'fal-ai/bria/product-shot':            { modo: 'papeis', max: 2,    papeis: ['produto', 'fundo (opcional)'] },
  'bytedance/seedream/v5/pro/layerize':  { modo: 'uma' },
  'fal-ai/iclight-v2':                   { modo: 'uma' },
}

// Teto do NOSSO canvas. Foi 5 por chute até 31/08/2026, quando o KH6U da Hering
// mostrou o custo: bolsa e calçado com 2 fotos cada davam 7 imagens, e as do
// calçado eram descartadas em silêncio — o modelo inventava um sapato porque
// nunca viu o real.
//
// 10 é o PISO dos grandes, levantado na doc do fal (31/08):
//
//   Seedream v4 · v4.5 · v5 lite · v5 pro ....... 10   ← o piso, e é o que usamos
//   Nano Banana Pro (Gemini 3 Pro Image) ........ 14   (mas só 6 em alta fidelidade de objeto)
//   GPT Image 2 ................................. 16
//   Nano Banana (Gemini 2.5 Flash) .............. não declarado no schema do fal
//
// Decisão do Danilo: um número só, no piso dos grandes, em vez de teto por
// modelo — quem tem limite MENOR já é tratado à parte em REFS_POR_MODELO
// (referência única e os try-on de 2), então nada aqui pode estourar por cima.
//
// ⚠️ Não subir de 10 sem teto por modelo. A família Seedream, passando de 10,
// fica com as ÚLTIMAS 10 — corta pela FRENTE, ao contrário do nosso slice. A
// primeira a cair seria a posição 1, que no processo da Hering é a base de
// casting: a referência mais importante do fluxo.
export const MAX_REFS_CANVAS = 10

export const refsDoModelo = id => REFS_POR_MODELO[id] || { modo: 'varias' }

/**
 * O que vai acontecer com N referências conectadas neste modelo.
 * Responde as três perguntas que o nó precisa mostrar: quantas o modelo usa,
 * quantas somem, e por culpa de quem (o modelo ou o nosso teto).
 */
export function planoDeRefs(modelId, conectadas = 0, teto = MAX_REFS_CANVAS, regra = null) {
  const r = regra || refsDoModelo(modelId)
  const limiteModelo = r.modo === 'uma' ? 1 : (r.exatas || r.max || Infinity)
  const limite = Math.min(teto, limiteModelo)
  const usadas = Math.min(conectadas, limite)
  return {
    ...r,
    limite, usadas,
    ignoradas: Math.max(0, conectadas - usadas),
    // de quem é a culpa do corte — muda a mensagem e o que resolve
    porQue: conectadas <= usadas ? null : (limiteModelo <= teto ? 'modelo' : 'canvas'),
    // schema estrito que exige exatamente N: faltando, o backend recusa
    faltam: r.exatas ? Math.max(0, r.exatas - conectadas) : 0,
  }
}

/**
 * Ordena os nós produtores de imagem pela ordem ESCOLHIDA no painel Entradas.
 * Quem não está na lista salva vai para o fim (sort estável), então conexão
 * nova nasce por último em vez de embaralhar o que o cliente já ordenou.
 * Sem `refOrder`, vale a ordem das conexões — o comportamento de sempre.
 */
export function ordenarPorRefOrder(produtores, refOrder) {
  if (!Array.isArray(refOrder) || !refOrder.length) return produtores
  const pos = id => { const i = refOrder.indexOf(id); return i === -1 ? Infinity : i }
  return [...produtores].sort((a, b) => pos(a.id) - pos(b.id))
}

// O nó Vídeo usa UMA imagem de origem: o dispatcher lê
// `toUrls(outputs[up?.id])[0]` — a primeira URL do primeiro produtor conectado.
// Conectar mais é silêncio, exatamente como no caso das imagens.
export const REGRA_VIDEO = { modo: 'uma', ondeSeUsa: 'origem do vídeo' }

/** Uma frase curta dizendo como este modelo lê as referências. */
export function comoLeAsRefs(modelId, regra = null) {
  const r = regra || refsDoModelo(modelId)
  if (r.ondeSeUsa === 'origem do vídeo')
    return 'Este nó usa só a 1ª imagem conectada como origem do vídeo — as outras são ignoradas.'
  if (r.modo === 'uma')    return 'Este modelo usa só a 1ª referência — as outras são ignoradas.'
  if (r.modo === 'papeis') return `Ordem obrigatória: ${r.papeis.map((p, i) => `${i + 1}ª = ${p}`).join(' · ')}.`
  return 'Este modelo usa todas as referências, na ordem abaixo.'
}

export const FORMATOS = [
  { v: '1:1',  label: 'Feed 1:1',    ar: '1 / 1' },
  { v: '9:16', label: 'Story 9:16',  ar: '9 / 16' },
  { v: '16:9', label: 'Banner 16:9', ar: '16 / 9' },
  { v: '4:5',  label: 'Retrato 4:5', ar: '4 / 5' },
]
export const arOf = f => (FORMATOS.find(x => x.v === f)?.ar) || '1 / 1'

// Templates de cena (a marca é injetada no servidor via brand context).
// ── Base de casting ──────────────────────────────────────────────────
// Não é um preset de estética: é a ETAPA 0 do processo de catálogo fechado no
// piloto Hering (21/08/2026), e cada cláusula dele nasceu de uma rodada perdida.
//
// O problema que ele resolve: o casting aprovado traz a modelo vestindo OUTRA
// peça, e detalhes dela VAZAM para a geração — no KH6V foi a fenda lateral de
// uma regata reaparecendo numa camiseta de barra reta. Nenhuma instrução
// resolveu, porque **modelo de imagem não obedece negação**: escrever "sem
// corte lateral" injeta o conceito. A solução é REMOVER o dado, não negá-lo —
// gerar uma base neutra da mesma pessoa, e usar ESSA como referência de pessoa.
//
// "malha lisa e uniforme, sem ponto, sem relevo, sem trama visível" está aqui
// literalmente porque a primeira base saiu com piquê sutil, e essa frase foi o
// reforço medido que corrigiu.
//
// ⚠️ A base é GERADA, então tem risco de deriva de identidade: confira cada uma
// contra a foto original ANTES de usar — erro aqui contamina tudo a jusante.
export const PROMPT_TEMPLATES = [
  { label: 'Base de casting', formato: '9:16', prompt: 'Modelo de corpo inteiro, de frente, pose neutra e relaxada, braços soltos ao lado do corpo, peso distribuído nos dois pés, olhar para a câmera. Veste peça única lisa e colada ao corpo, caimento de segunda pele, em malha lisa e uniforme, sem ponto, sem relevo, sem trama visível, cor neutra sólida. Fundo de estúdio cinza claro uniforme. Luz difusa e suave, sombras leves, sem sombra dura. Pele natural, traços do rosto e proporções do corpo preservados, alta nitidez. Enquadramento do topo da cabeça aos pés, com respiro acima e abaixo.' },
  { label: 'Foto de produto', formato: '1:1',  prompt: 'Foto de produto em fundo limpo e minimalista, iluminação de estúdio suave, alto detalhe, produto em destaque ao centro.' },
  { label: 'Lifestyle',       formato: '4:5',  prompt: 'Cena lifestyle: pessoa real usando o produto em ambiente cotidiano, luz natural, clima autêntico e aspiracional.' },
  { label: 'Banner',          formato: '16:9', prompt: 'Banner promocional horizontal com espaço para headline, composição equilibrada, cores da marca em destaque.' },
  { label: 'Story',           formato: '9:16', prompt: 'Composição vertical para story, foco central, espaço superior para texto, energia jovem e dinâmica.' },
  { label: 'Citação',         formato: '1:1',  prompt: 'Post de citação minimalista, tipografia em destaque sobre fundo na paleta da marca, muito respiro.' },
  { label: 'Bastidores',      formato: '4:5',  prompt: 'Cena de bastidores autêntica, foto documental, granulado sutil, sensação de processo e verdade.' },
]
