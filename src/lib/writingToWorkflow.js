// Compilador Writing Room → Workflow (Fase 2 do Writing→Mídia).
// Pega a peça escrita (blocos aprovados) + os prompts visuais derivados e
// monta o grafo do canvas: cada slide/variação/cena vira um caminho de
// geração pronto para REVISAR e disparar — nada gera sozinho. A peça inteira
// entra num nó de Contexto (delimita tudo); voz/estética vêm do cérebro
// nos nós de geração, como sempre.
import { videoModelByKey } from './videoModels'

// Nós têm 250×250px (contexto 280×220) — passo de 340×310 dá ~80px de respiro
// entre colunas e ~60px entre linhas, sem sobreposição.
const POS = (col, row) => ({ x: 40 + col * 340, y: 40 + row * 310 })

// "Dance2" (decisão do Danilo): cadeia do Reel usa Seedance 2 — áudio nativo,
// rápido e barato, i2v a partir da imagem gerada da cena.
const REEL_VIDEO_MODEL = 'seedance-2-fast'

const FORMATO = { legenda: '1:1', carrossel: '1:1', anuncio: '1:1', reel: '9:16', blog: '16:9', 'post-social': '4:5' }

// Regra do produto: imagem SEMPRE limpa — texto é outra camada (pós-produção).
// A copy da peça NÃO entra no contexto de geração (é o que faz o modelo
// renderizar palavras corrompidas na imagem); só a direção visual entra.
const NO_TEXT_GUARD = 'IMPORTANTE: NENHUM texto, letra, número, logotipo ou tipografia na imagem — o texto da peça será aplicado na pós-produção pelo time criativo; deixe espaço negativo para ele. Use a paleta e a estética da marca como base das cores da cena.'

// Extrai da peça só as seções de direção visual (Sugestão de imagem etc.).
const visualSections = peca => ((peca || '').match(/^## (?:Sugestão de imagem|Direção visual)[^\n]*\n[\s\S]*?(?=\n## |$)/gim) || []).join('\n\n')

export function compileWritingWorkflow({ fwKey, fwLabel, titulo, peca, prompts }) {
  const nodes = [], edges = []
  const N = (id, type, col, row, data = {}, style) => {
    nodes.push({ id, type, position: POS(col, row), data, ...(style ? { style } : {}) })
    return id
  }
  const E = (a, b) => edges.push({ id: `e-${a}-${b}`, source: a, target: b })

  // Compartilhados: Contexto = tema + guarda de imagem limpa + direção visual
  // da peça (NUNCA a copy — texto entra na pós). + visual da marca + formato.
  // Coluna da esquerda com posições explícitas (alturas diferentes entre si).
  const ctxText = [`Tema da peça: ${titulo}`, NO_TEXT_GUARD, visualSections(peca)].filter(Boolean).join('\n\n')
  nodes.push({ id: 'ctx', type: 'context', position: { x: 40, y: 40 },  data: { text: ctxText.slice(0, 4000) }, style: { width: 280, height: 220 } })
  nodes.push({ id: 'bv',  type: 'brandContext', position: { x: 40, y: 330 }, data: { title: 'Visual da marca', desc: 'Paleta, tipografia e estética' } })
  nodes.push({ id: 'f',   type: 'formato', position: { x: 40, y: 650 }, data: { formato: FORMATO[fwKey] || '1:1' } })

  const isReel = fwKey === 'reel'
  prompts.forEach((p, i) => {
    const pid = N(`p${i}`, 'prompt', 1, i, { text: `${p.prompt} Sem nenhum texto ou tipografia na imagem.` })
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
  blog:          'Derive EXATAMENTE 1 prompt de imagem: a CAPA do artigo (hero image), com espaço negativo para o título entrar na pós-produção.',
  'post-social': 'Derive EXATAMENTE 1 prompt de imagem: a arte do post (use a "Sugestão de imagem" da peça como base).',
}
