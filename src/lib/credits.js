// ════════════════════════════════════════════════════════════════════
// credits.js — mapa central de créditos por modelo/operação (FRONTEND)
// Espelha netlify/functions/_credits.js (MANTER OS DOIS EM SINCRONIA).
// Regra: créditos = arredonda↑(18 × custo_USD) → garante ≥50% de margem
// líquida de Stripe no pior caso (Custom R$0,73/cr, câmbio R$6,00).
// Custos reais verificados na fal (jun/2026). Ver .spec/precificacao.md + custos.csv.
// ════════════════════════════════════════════════════════════════════

// Imagem — por id de modelo do fal. Default = 1 crédito (modelos ≤ ~$0,055).
export const IMAGE_CREDITS = {
  'fal-ai/flux-pro/v1.1-ultra': 2,   // ~$0,06
  'fal-ai/ideogram/v2':         2,   // ~$0,08
  'fal-ai/ideogram/v3':         2,   // $0,06 (balanced)
  'fal-ai/nano-banana-pro':     3,   // $0,15
  'fal-ai/flux-pro/v1/vto':     3,   // $0,0375 1º MP + $0,005/MP extra → ~$0,10 com as nossas imagens
  'fal-ai/fashn/tryon/v1.6':    2,   // $0,075 (try-on especializado)
  'fal-ai/iclight-v2':          2,   // ~$0,10/MP (relight de estúdio)
  // Nano Banana 2.5 — $0,039/img (piloto Hering, F0.2). Pela regra da casa
  // (créditos = ⌈18 × custo_USD⌉) daria 1, e é 1 mesmo — mas ESCRITO, não caindo
  // no `?? 1`. Sem a linha, o modelo entrava na conta por acidente e ninguém
  // saberia dizer se o valor era apurado ou o padrão.
  'fal-ai/gemini-25-flash-image': 1,
  'fal-ai/gemini-25-flash-image/edit': 1,
  'bytedance/seedream/v5/pro/text-to-image': 2,  // $0,0675/img acima de 1536² (o nosso 1920×2720 é)
  'bytedance/seedream/v5/pro/layerize':      4,  // $0,0675 POR CAMADA gerada — ~3 camadas no caso típico
  // demais = 1 (Nano Banana, GPT Image 2, Seedream 4.x e 5 Lite $0,035, FLUX dev/schnell/.2/Pro1.1, Recraft, Qwen, Bria product-shot ~$0,04)
}

// Vídeo — por key de modelo (videoModels) e duração (string em segundos).
// Veo com áudio ON; áudio-off é ~⅓ mais barato (tratar quando expor o toggle).
export const VIDEO_CREDITS = {
  'hailuo-02':      { 6: 5, 10: 9 },
  'kling-25-turbo': { 5: 7, 10: 13 },
  'seedance-1-pro': { 5: 14, 10: 27 },
  'seedance-2-fast': { 5: 22, 10: 44 },
  'seedance-2-pro':  { 5: 28, 10: 55 },
  'seedance-2-5':    { 5: 28, 10: 55 },      // 720p ($1,51/5s, fórmula pixel-token); 1080p seria 62/125 — modelo DESATIVADO (stub no fal)
  'veo3-fast':      { 4: 29, 6: 44, 8: 58 },
  'veo3':           { 4: 54, 6: 81, 8: 108 },
  'wan-22':         { default: 4 },          // custo a confirmar
  'wan-25':         { 5: 9, 10: 18 },        // 720p: ~$0,10/s — permissivo com pessoas geradas
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
// Sem gating: todo modelo é acessível a todos os planos — o que varia é a
// quantidade de créditos. O guia mostra só benefício e custo em créditos.
export const PLAN_LABEL = { trial: 'Trial', starter: 'Essencial', pro: 'Pro', enterprise: 'Premium' }

export const IMAGE_GUIDE = [
  { id: 'fal-ai/gemini-25-flash-image',                 label: 'Nano Banana (Gemini 2.5)', beneficio: 'Versátil e rápido, ótimo com referências. Padrão.' },
  { id: 'fal-ai/nano-banana-pro',                       label: 'Nano Banana Pro',          beneficio: 'Máxima qualidade Gemini, edição avançada, até 4K.' },
  { id: 'openai/gpt-image-2',                           label: 'GPT Image 2',              beneficio: 'Forte em coerência, composição e instruções.' },
  { id: 'bytedance/seedream/v5/pro/text-to-image',      label: 'Seedream 5.0 Pro',         beneficio: 'Geração atual da ByteDance, fotorrealismo e fidelidade de referência.' },
  { id: 'bytedance/seedream/v5/lite/text-to-image',     label: 'Seedream 5.0 Lite',        beneficio: 'Mesma família, mais barato e rápido.' },
  { id: 'fal-ai/bytedance/seedream/v4.5/text-to-image', label: 'Seedream 4.5',             beneficio: 'Fotorrealismo de alto nível (geração anterior).' },
  { id: 'bytedance/seedream/v5/pro/layerize',           label: 'Seedream Layerize',        beneficio: 'Separa uma imagem em camadas (sujeito, fundo, elementos).' },
  { id: 'fal-ai/flux-2-pro',                            label: 'FLUX.2 [pro]',             beneficio: 'Flagship FLUX, multi-referência.' },
  { id: 'fal-ai/flux-pro/v1.1-ultra',                   label: 'FLUX Pro 1.1 Ultra',       beneficio: 'Fotorrealismo premium, alta resolução.' },
  { id: 'fal-ai/ideogram/v3',                           label: 'Ideogram v3',              beneficio: 'Tipografia e texto dentro da imagem.' },
  { id: 'fal-ai/recraft-v3',                            label: 'Recraft v3',               beneficio: 'Design, vetor e logotipo.' },
  { id: 'fal-ai/fashn/tryon/v1.6',                      label: 'FASHN Try-On',             beneficio: 'Veste a peça real num modelo (moda/e-commerce).' },
  { id: 'fal-ai/flux/dev',                              label: 'FLUX.1 dev',               beneficio: 'Rápido e econômico.' },
  { id: 'fal-ai/qwen-image',                            label: 'Qwen Image',               beneficio: 'Open, bom em renderizar texto.' },
]

export const VIDEO_GUIDE = [
  { key: 'seedance-1-pro',  label: 'Seedance 1.0 Pro',   beneficio: 'Rápido e econômico, texto e imagem→vídeo.', durations: [5, 10] },
  { key: 'seedance-2-fast', label: 'Seedance 2.0 Fast',  beneficio: 'Seedance 2.0 mais rápido e barato, áudio nativo.', durations: [5, 10] },
  { key: 'seedance-2-pro',  label: 'Seedance 2.0',       beneficio: 'Nova geração ByteDance, áudio nativo, alta qualidade.', durations: [5, 10] },
  // Seedance 2.5 fora do guia até o fal ativar o modelo (hoje o app é stub — ver videoModels.js)
  { key: 'kling-25-turbo',  label: 'Kling 2.5 Turbo Pro', beneficio: 'Imagem→vídeo de alta qualidade, com frame final.', durations: [5, 10] },
  { key: 'hailuo-02',       label: 'Hailuo 02',          beneficio: 'Movimento expressivo, bom custo.', durations: [6, 10] },
  { key: 'wan-22',          label: 'Wan 2.2',            beneficio: 'Open, econômico.', durations: [] },
  { key: 'veo3-fast',       label: 'Veo 3 Fast',         beneficio: 'Veo com áudio nativo, mais rápido e barato.', durations: [4, 6, 8] },
  { key: 'veo3',            label: 'Veo 3',              beneficio: 'Topo de qualidade, áudio nativo.', durations: [4, 6, 8] },
]

export const OP_GUIDE = [
  { op: 'content',  label: 'Geração de conteúdo (Content Hub)' },
  { op: 'campaign', label: 'Campanha (4 formatos)' },
  { op: 'upscale',  label: 'Ampliar · Variação · Remover fundo' },
]
// Fair-use (0 crédito): Brand Intelligence — diagnóstico, social listening e Brand Assistant.
