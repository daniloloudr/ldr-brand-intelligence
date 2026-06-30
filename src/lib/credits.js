// ════════════════════════════════════════════════════════════════════
// credits.js — mapa central de créditos por modelo/operação (FRONTEND)
// Espelha netlify/functions/_credits.js (MANTER OS DOIS EM SINCRONIA).
// Regra: créditos = arredonda↑(18 × custo_USD) → garante ≥50% de margem
// líquida de Stripe no pior caso (Custom R$0,73/cr, câmbio R$6,00).
// Custos reais verificados na fal (jun/2026). Ver specs/planos.md + custos.csv.
// ════════════════════════════════════════════════════════════════════

// Imagem — por id de modelo do fal. Default = 1 crédito (modelos ≤ ~$0,055).
export const IMAGE_CREDITS = {
  'fal-ai/flux-pro/v1.1-ultra': 2,   // ~$0,06
  'fal-ai/ideogram/v2':         2,   // ~$0,08
  'fal-ai/ideogram/v3':         2,   // $0,06 (balanced)
  'fal-ai/nano-banana-pro':     3,   // $0,15
  // demais = 1 (Nano Banana, GPT Image 2, Seedream, FLUX dev/schnell/.2/Pro1.1, Recraft, Qwen)
}

// Vídeo — por key de modelo (videoModels) e duração (string em segundos).
// Veo com áudio ON; áudio-off é ~⅓ mais barato (tratar quando expor o toggle).
export const VIDEO_CREDITS = {
  'hailuo-02':      { 6: 5, 10: 9 },
  'kling-25-turbo': { 5: 7, 10: 13 },
  'seedance-1-pro': { 5: 14, 10: 27 },
  'veo3-fast':      { 4: 29, 6: 44, 8: 58 },
  'veo3':           { 4: 54, 6: 81, 8: 108 },
  'wan-22':         { default: 4 },          // custo a confirmar
}

// Operações não-Studio. assistant/diagnostico/listening = Brand Intelligence
// (fair-use, não consome crédito). Studio/Content/Campanha consomem.
export const OP_CREDITS = {
  image: 1, upscale: 1, removebg: 1, variation: 1,
  content: 2,
  campaign: 4,
  assistant: 0,     // decisão: não cobrar (Haiku é barato; absorvemos)
  diagnostico: 0,   // Brand Intelligence — fair-use
  listening: 0,     // Brand Intelligence — fair-use
}

export const creditsForImage = model => IMAGE_CREDITS[model] ?? 1
export const creditsForVideo = (key, duration) =>
  VIDEO_CREDITS[key]?.[Number(duration)] ?? VIDEO_CREDITS[key]?.default ?? 8
export const creditsForOp = op => OP_CREDITS[op] ?? 1

// ── Guia de exibição (página Planos & Créditos) ──────────────────────
// minPlano = chave do plano que libera o modelo (starter=Essencial · pro · enterprise=Premium)
export const PLAN_LABEL = { trial: 'Trial', starter: 'Essencial', pro: 'Pro', enterprise: 'Premium' }
export const PLAN_ORDER = ['trial', 'starter', 'pro', 'enterprise']
export const planoLiberado = (planoWorkspace, minPlano) =>
  PLAN_ORDER.indexOf(planoWorkspace) >= PLAN_ORDER.indexOf(minPlano)

export const IMAGE_GUIDE = [
  { id: 'fal-ai/gemini-25-flash-image',                 label: 'Nano Banana (Gemini 2.5)', beneficio: 'Versátil e rápido, ótimo com referências. Padrão.', minPlano: 'starter' },
  { id: 'fal-ai/nano-banana-pro',                       label: 'Nano Banana Pro',          beneficio: 'Máxima qualidade Gemini, edição avançada, até 4K.', minPlano: 'pro' },
  { id: 'openai/gpt-image-2',                           label: 'GPT Image 2',              beneficio: 'Forte em coerência, composição e instruções.', minPlano: 'starter' },
  { id: 'fal-ai/bytedance/seedream/v4.5/text-to-image', label: 'Seedream 4.5',             beneficio: 'Fotorrealismo de alto nível.', minPlano: 'starter' },
  { id: 'fal-ai/flux-2-pro',                            label: 'FLUX.2 [pro]',             beneficio: 'Flagship FLUX, multi-referência.', minPlano: 'starter' },
  { id: 'fal-ai/flux-pro/v1.1-ultra',                   label: 'FLUX Pro 1.1 Ultra',       beneficio: 'Fotorrealismo premium, alta resolução.', minPlano: 'starter' },
  { id: 'fal-ai/ideogram/v3',                           label: 'Ideogram v3',              beneficio: 'Tipografia e texto dentro da imagem.', minPlano: 'starter' },
  { id: 'fal-ai/recraft-v3',                            label: 'Recraft v3',               beneficio: 'Design, vetor e logotipo.', minPlano: 'starter' },
  { id: 'fal-ai/flux/dev',                              label: 'FLUX.1 dev',               beneficio: 'Rápido e econômico.', minPlano: 'starter' },
  { id: 'fal-ai/qwen-image',                            label: 'Qwen Image',               beneficio: 'Open, bom em renderizar texto.', minPlano: 'starter' },
]

export const VIDEO_GUIDE = [
  { key: 'seedance-1-pro',  label: 'Seedance 1.0 Pro',   beneficio: 'Rápido e econômico, texto e imagem→vídeo.', durations: [5, 10], minPlano: 'starter' },
  { key: 'kling-25-turbo',  label: 'Kling 2.5 Turbo Pro', beneficio: 'Imagem→vídeo de alta qualidade, com frame final.', durations: [5, 10], minPlano: 'starter' },
  { key: 'hailuo-02',       label: 'Hailuo 02',          beneficio: 'Movimento expressivo, bom custo.', durations: [6, 10], minPlano: 'starter' },
  { key: 'wan-22',          label: 'Wan 2.2',            beneficio: 'Open, econômico.', durations: [], minPlano: 'starter' },
  { key: 'veo3-fast',       label: 'Veo 3 Fast',         beneficio: 'Veo com áudio nativo, mais rápido e barato.', durations: [4, 6, 8], minPlano: 'pro' },
  { key: 'veo3',            label: 'Veo 3',              beneficio: 'Topo de qualidade, áudio nativo.', durations: [4, 6, 8], minPlano: 'enterprise' },
]

export const OP_GUIDE = [
  { op: 'content',  label: 'Geração de conteúdo (Content Hub)' },
  { op: 'campaign', label: 'Campanha (4 formatos)' },
  { op: 'upscale',  label: 'Ampliar · Variação · Remover fundo' },
]
// Fair-use (0 crédito): Brand Intelligence — diagnóstico, social listening e Brand Assistant.
