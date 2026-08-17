import { PALETTE } from './theme'
// Templates de workflow prontos (catálogo embutido — não vivem no banco).
// Cada um vira um NOVO workflow ao ser usado (clona nodes/edges).
// Os tipos/data dos nós espelham o StudioCanvas: prompt, formato, generate,
// preview, app, imageInput, brandContext.

const POS = (col, row) => ({ x: 40 + col * 250, y: 40 + row * 185 })

const _list = []
function tpl(id, nome, categoria, descricao, builder) {
  const nodes = [], edges = []
  const N = (key, type, col, row, data = {}) => { nodes.push({ id: key, type, position: POS(col, row), data }); return key }
  const E = (a, b) => edges.push({ id: `e-${a}-${b}`, source: a, target: b })
  builder({ N, E })
  _list.push({ id, nome, categoria, descricao, nodes, edges })
}

const BV = { title: 'Visual da marca', desc: 'Paleta, tipografia e estética' }
const BVZ = { title: 'Voz da marca', desc: 'Tom de voz, personalidade e vocabulário' }
const GEN = { status: 'idle', model: 'auto' }

// ── Social ───────────────────────────────────────────────────────────
tpl('post-produto', 'Post de produto', 'Social', 'Foto de produto on-brand para o feed (1:1).', ({ N, E }) => {
  N('p', 'prompt', 0, 0, { text: 'Foto de produto em fundo limpo e minimalista, iluminação de estúdio suave, produto em destaque ao centro, alto detalhe.' })
  N('bv', 'brandContext', 0, 1, BV)
  N('f', 'formato', 0, 2, { formato: '1:1' })
  N('g', 'generate', 1, 1, { ...GEN })
  N('pv', 'preview', 2, 1, { imageUrl: null })
  E('p', 'g'); E('bv', 'g'); E('f', 'g'); E('g', 'pv')
})

tpl('story-social', 'Story para redes', 'Social', 'Composição vertical 9:16 com respiro para texto.', ({ N, E }) => {
  N('p', 'prompt', 0, 0, { text: 'Composição vertical para story, foco central, espaço superior para texto, energia jovem e dinâmica.' })
  N('bv', 'brandContext', 0, 1, BV)
  N('f', 'formato', 0, 2, { formato: '9:16' })
  N('g', 'generate', 1, 1, { ...GEN })
  N('pv', 'preview', 2, 1, { imageUrl: null })
  E('p', 'g'); E('bv', 'g'); E('f', 'g'); E('g', 'pv')
})

tpl('citacao', 'Post de citação', 'Social', 'Tipografia em destaque na paleta da marca.', ({ N, E }) => {
  N('p', 'prompt', 0, 0, { text: 'Post de citação minimalista, tipografia em destaque sobre fundo na paleta da marca, muito respiro.' })
  N('bz', 'brandContext', 0, 1, BVZ)
  N('bv', 'brandContext', 0, 2, BV)
  N('f', 'formato', 0, 3, { formato: '1:1' })
  N('g', 'generate', 1, 1, { ...GEN })
  N('pv', 'preview', 2, 1, { imageUrl: null })
  E('p', 'g'); E('bz', 'g'); E('bv', 'g'); E('f', 'g'); E('g', 'pv')
})

tpl('variacoes', 'Variações de uma peça', 'Social', 'Gera uma peça e cria variações automáticas.', ({ N, E }) => {
  N('p', 'prompt', 0, 0, { text: 'Imagem de marca expressiva e on-brand, composição equilibrada, alto detalhe.' })
  N('bv', 'brandContext', 0, 1, BV)
  N('g', 'generate', 1, 0, { ...GEN })
  N('pv', 'preview', 2, 0, { imageUrl: null })
  N('var', 'app', 2, 1, { op: 'variation', label: 'Variação', status: 'idle' })
  E('p', 'g'); E('bv', 'g'); E('g', 'pv'); E('g', 'var')
})

// ── Advertising ──────────────────────────────────────────────────────
tpl('banner-campanha', 'Banner de campanha', 'Advertising', 'Banner 16:9 com espaço para headline.', ({ N, E }) => {
  N('p', 'prompt', 0, 0, { text: 'Banner promocional horizontal com espaço para headline, composição equilibrada, cores da marca em destaque.' })
  N('bv', 'brandContext', 0, 1, BV)
  N('bz', 'brandContext', 0, 2, BVZ)
  N('f', 'formato', 0, 3, { formato: '16:9' })
  N('g', 'generate', 1, 1, { ...GEN })
  N('pv', 'preview', 2, 1, { imageUrl: null })
  E('p', 'g'); E('bv', 'g'); E('bz', 'g'); E('f', 'g'); E('g', 'pv')
})

tpl('reshoot-produto', 'Reshoot de produto', 'Advertising', 'Recoloca seu produto em uma nova cena e amplia.', ({ N, E }) => {
  N('img', 'imageInput', 0, 0, {})
  N('p', 'prompt', 0, 1, { text: 'Recoloque o produto em uma nova cena premium, mantendo o produto fiel, iluminação editorial.' })
  N('g', 'generate', 1, 0, { ...GEN })
  N('up', 'app', 2, 0, { op: 'upscale', label: 'Ampliar', status: 'idle' })
  E('img', 'g'); E('p', 'g'); E('g', 'up')
})

tpl('hero-adaptacoes', 'Hero + adaptações', 'Advertising', 'Cria uma peça-mãe e adapta para story e banner.', ({ N, E }) => {
  N('p', 'prompt', 0, 1, { text: 'Imagem-hero da campanha, impactante e on-brand, composição central.' })
  N('bv', 'brandContext', 0, 2, BV)
  N('gh', 'generate', 1, 1, { ...GEN })
  N('pvh', 'preview', 2, 0, { imageUrl: null })
  N('ps', 'prompt', 2, 1, { text: 'Adapte a peça para story vertical, mantendo o conceito.' })
  N('fs', 'formato', 2, 2, { formato: '9:16' })
  N('gs', 'generate', 3, 1, { ...GEN })
  N('pvs', 'preview', 4, 1, { imageUrl: null })
  E('p', 'gh'); E('bv', 'gh'); E('gh', 'pvh')
  E('gh', 'gs'); E('ps', 'gs'); E('fs', 'gs'); E('gs', 'pvs')
})

// ── Branding ─────────────────────────────────────────────────────────
tpl('lifestyle-ref', 'Lifestyle com referência', 'Branding', 'Cena lifestyle a partir de uma imagem de referência.', ({ N, E }) => {
  N('img', 'imageInput', 0, 0, {})
  N('p', 'prompt', 0, 1, { text: 'Cena lifestyle autêntica usando a referência, luz natural, clima aspiracional.' })
  N('bv', 'brandContext', 0, 2, BV)
  N('g', 'generate', 1, 1, { ...GEN })
  N('pv', 'preview', 2, 1, { imageUrl: null })
  E('img', 'g'); E('p', 'g'); E('bv', 'g'); E('g', 'pv')
})

tpl('kit-multiformato', 'Kit multi-formato', 'Branding', 'Mesma ideia em feed, story e banner de uma vez.', ({ N, E }) => {
  N('p', 'prompt', 0, 1, { text: 'Peça de marca on-brand, composição limpa, espaço para adaptação de formato.' })
  N('bv', 'brandContext', 0, 2, BV)
  N('f1', 'formato', 1, 0, { formato: '1:1' });  N('g1', 'generate', 2, 0, { ...GEN }); N('v1', 'preview', 3, 0, { imageUrl: null })
  N('f2', 'formato', 1, 1, { formato: '9:16' }); N('g2', 'generate', 2, 1, { ...GEN }); N('v2', 'preview', 3, 1, { imageUrl: null })
  N('f3', 'formato', 1, 2, { formato: '16:9' }); N('g3', 'generate', 2, 2, { ...GEN }); N('v3', 'preview', 3, 2, { imageUrl: null })
  for (const [f, g, v] of [['f1', 'g1', 'v1'], ['f2', 'g2', 'v2'], ['f3', 'g3', 'v3']]) {
    E('p', g); E('bv', g); E(f, g); E(g, v)
  }
})

tpl('citacao-manifesto', 'Manifesto de marca', 'Branding', 'Peça textual com a voz da marca.', ({ N, E }) => {
  N('p', 'prompt', 0, 0, { text: 'Peça de manifesto: frase forte da marca, tipografia editorial, fundo sóbrio na paleta.' })
  N('bz', 'brandContext', 0, 1, BVZ)
  N('bv', 'brandContext', 0, 2, BV)
  N('g', 'generate', 1, 1, { ...GEN })
  N('pv', 'preview', 2, 1, { imageUrl: null })
  E('p', 'g'); E('bz', 'g'); E('bv', 'g'); E('g', 'pv')
})

// ── Mockup / Edição ──────────────────────────────────────────────────
tpl('mockup-produto', 'Mockup de produto', 'Mockup', 'Aplica seu produto em um mockup realista.', ({ N, E }) => {
  N('img', 'imageInput', 0, 0, {})
  N('p', 'prompt', 0, 1, { text: 'Aplique o produto em um mockup realista (embalagem/cena), perspectiva correta e sombras coerentes.' })
  N('g', 'generate', 1, 0, { ...GEN })
  N('pv', 'preview', 2, 0, { imageUrl: null })
  E('img', 'g'); E('p', 'g'); E('g', 'pv')
})

tpl('trocar-fundo', 'Trocar o fundo', 'Mockup', 'Remove o fundo e recoloca a cena nova.', ({ N, E }) => {
  N('img', 'imageInput', 0, 0, {})
  N('rb', 'app', 1, 0, { op: 'removebg', label: 'Remover fundo', status: 'idle' })
  N('p', 'prompt', 0, 1, { text: 'Novo fundo on-brand para o objeto recortado, integrando luz e sombra de forma realista.' })
  N('g', 'generate', 2, 0, { ...GEN })
  N('pv', 'preview', 3, 0, { imageUrl: null })
  E('img', 'rb'); E('rb', 'g'); E('p', 'g'); E('g', 'pv')
})

export const WORKFLOW_TEMPLATES = _list

// Cor por categoria — usada na miniatura dos cards (sem imagem).
export const TEMPLATE_CAT_COLOR = {
  Social: PALETTE.data.positivo,
  Advertising: PALETTE.data.critico,
  Branding: PALETTE.data.neutro,
  Mockup: PALETTE.data.atencao,
}
