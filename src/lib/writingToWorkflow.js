// Compilador Writing Room → Workflow (Fase 2 do Writing→Mídia).
// Pega a peça escrita (blocos aprovados) + os prompts visuais derivados e
// monta o grafo do canvas: cada slide/variação/cena vira um caminho de
// geração pronto para REVISAR e disparar — nada gera sozinho. A peça inteira
// entra num nó de Contexto (delimita tudo); voz/estética vêm do cérebro
// nos nós de geração, como sempre.
import { videoModelByKey } from './videoModels'

const POS = (col, row) => ({ x: 40 + col * 250, y: 40 + row * 200 })

// "Dance2" (decisão do Danilo): cadeia do Reel usa Seedance 2 — áudio nativo,
// rápido e barato, i2v a partir da imagem gerada da cena.
const REEL_VIDEO_MODEL = 'seedance-2-fast'

const FORMATO = { legenda: '1:1', carrossel: '1:1', anuncio: '1:1', reel: '9:16' }

export function compileWritingWorkflow({ fwKey, fwLabel, titulo, peca, prompts }) {
  const nodes = [], edges = []
  const N = (id, type, col, row, data = {}, style) => {
    nodes.push({ id, type, position: POS(col, row), data, ...(style ? { style } : {}) })
    return id
  }
  const E = (a, b) => edges.push({ id: `e-${a}-${b}`, source: a, target: b })

  // Compartilhados: a peça inteira como Contexto + visual da marca + formato.
  N('ctx', 'context', 0, 0, { text: (peca || '').slice(0, 4000) }, { width: 280, height: 220 })
  N('bv', 'brandContext', 0, 2, { title: 'Visual da marca', desc: 'Paleta, tipografia e estética' })
  N('f', 'formato', 0, 3, { formato: FORMATO[fwKey] || '1:1' })

  const isReel = fwKey === 'reel'
  prompts.forEach((p, i) => {
    const pid = N(`p${i}`, 'prompt', 1, i, { text: p.prompt })
    const gid = N(`g${i}`, 'generate', 2, i, { status: 'idle', model: 'auto' })
    E(pid, gid); E('ctx', gid); E('bv', gid); E('f', gid)
    if (isReel) {
      const vm = videoModelByKey(REEL_VIDEO_MODEL)
      const vid = N(`v${i}`, 'videoGen', 3, i, {
        status: 'idle', model: REEL_VIDEO_MODEL, duration: vm?.defaultDuration || '5',
      })
      E(gid, vid)
    } else {
      const pv = N(`pv${i}`, 'preview', 3, i, { imageUrl: null })
      E(gid, pv)
    }
  })

  return { nome: `${fwLabel}: ${titulo}`.trim().slice(0, 80), nodes, edges }
}

// Instrução de derivação de prompts visuais por formato — quantos e de quê.
export const DERIVE_RULES = {
  legenda:   'Derive EXATAMENTE 1 prompt de imagem: o visual do post que acompanha esta legenda.',
  carrossel: 'Derive 1 prompt de imagem POR SLIDE (na ordem; IGNORE a seção "Legenda do post"). O visual de cada slide serve ao conteúdo daquele slide.',
  reel:      'Derive de 2 a 4 prompts de imagem: as CENAS-CHAVE do roteiro (a imagem de cada cena vira o 1º frame de um vídeo curto).',
  anuncio:   'Derive 1 prompt de imagem POR VARIAÇÃO (A, B e C), fiel ao ângulo de cada uma.',
}
