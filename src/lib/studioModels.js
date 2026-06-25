// Catálogo curado de modelos de imagem do fal (só atalho de UX).
// Qualquer id do fal funciona via "ID custom" no seletor.
export const IMAGE_MODELS = [
  { id: 'auto',                          label: 'Auto (LOUDR escolhe)', refs: true  },
  { id: 'fal-ai/gemini-25-flash-image',  label: 'Nano Banana (Gemini)', refs: true  },
  { id: 'fal-ai/flux/dev',               label: 'Flux dev',             refs: false },
  { id: 'fal-ai/flux-pro/v1.1',          label: 'Flux Pro 1.1',         refs: false },
  { id: 'fal-ai/ideogram/v2',            label: 'Ideogram v2 (texto)',  refs: false },
  { id: 'fal-ai/recraft-v3',             label: 'Recraft v3 (design)',  refs: false },
]

// 'auto' resolve no servidor (DEFAULT_MODEL). Enviamos null para o backend decidir.
export const resolveModel = m => (m && m !== 'auto' ? m : null)

export const FORMATOS = [
  { v: '1:1',  label: 'Feed 1:1',    ar: '1 / 1' },
  { v: '9:16', label: 'Story 9:16',  ar: '9 / 16' },
  { v: '16:9', label: 'Banner 16:9', ar: '16 / 9' },
  { v: '4:5',  label: 'Retrato 4:5', ar: '4 / 5' },
]
export const arOf = f => (FORMATOS.find(x => x.v === f)?.ar) || '1 / 1'
