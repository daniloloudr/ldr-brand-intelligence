// Catálogo curado e segmentado de modelos de imagem do fal (atalho de UX).
// `group` define a seção no seletor; ordem aqui = ordem exibida.
// Os melhores/mais usados da geração de imagem em 2026 (benchmark fal.ai).
export const IMAGE_MODELS = [
  // ── Mais usados ──
  { id: 'fal-ai/nano-banana-pro',                       label: 'Nano Banana Pro (Gemini)', group: 'Mais usados',           refs: true  },
  { id: 'fal-ai/gemini-25-flash-image',                 label: 'Nano Banana (Gemini 2.5)', group: 'Mais usados',           refs: true  },
  { id: 'openai/gpt-image-2',                           label: 'GPT Image 2 (OpenAI)',     group: 'Mais usados',           refs: true  },
  { id: 'fal-ai/bytedance/seedream/v4.5/text-to-image', label: 'Seedream 4.5',             group: 'Mais usados',           refs: true  },
  { id: 'fal-ai/flux-2-pro',                            label: 'FLUX.2 [pro]',             group: 'Mais usados',           refs: true  },
  // ── Fotorrealismo & edição ──
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
  // ── Automático (usado pelo Workflow) ──
  { id: 'auto',                                         label: 'Auto (LOUDR escolhe)',     group: 'Automático',             refs: true  },
]

// Default da tela de Imagem.
export const DEFAULT_IMAGE_MODEL = 'fal-ai/gemini-25-flash-image'

// Ordem das seções no seletor (sem 'Automático' — só faz sentido no Workflow).
export const IMAGE_MODEL_GROUPS = ['Mais usados', 'Fotorrealismo & edição', 'Rápidos & open', 'Design & tipografia']

// 'auto' resolve no servidor (DEFAULT_MODEL). Enviamos null para o backend decidir.
export const resolveModel = m => (m && m !== 'auto' ? m : null)

export const FORMATOS = [
  { v: '1:1',  label: 'Feed 1:1',    ar: '1 / 1' },
  { v: '9:16', label: 'Story 9:16',  ar: '9 / 16' },
  { v: '16:9', label: 'Banner 16:9', ar: '16 / 9' },
  { v: '4:5',  label: 'Retrato 4:5', ar: '4 / 5' },
]
export const arOf = f => (FORMATOS.find(x => x.v === f)?.ar) || '1 / 1'

// Templates de cena (a marca é injetada no servidor via brand context).
export const PROMPT_TEMPLATES = [
  { label: 'Foto de produto', formato: '1:1',  prompt: 'Foto de produto em fundo limpo e minimalista, iluminação de estúdio suave, alto detalhe, produto em destaque ao centro.' },
  { label: 'Lifestyle',       formato: '4:5',  prompt: 'Cena lifestyle: pessoa real usando o produto em ambiente cotidiano, luz natural, clima autêntico e aspiracional.' },
  { label: 'Banner',          formato: '16:9', prompt: 'Banner promocional horizontal com espaço para headline, composição equilibrada, cores da marca em destaque.' },
  { label: 'Story',           formato: '9:16', prompt: 'Composição vertical para story, foco central, espaço superior para texto, energia jovem e dinâmica.' },
  { label: 'Citação',         formato: '1:1',  prompt: 'Post de citação minimalista, tipografia em destaque sobre fundo na paleta da marca, muito respiro.' },
  { label: 'Bastidores',      formato: '4:5',  prompt: 'Cena de bastidores autêntica, foto documental, granulado sutil, sensação de processo e verdade.' },
]
