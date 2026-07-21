// ════════════════════════════════════════════════════════════════════
// _credits.js — mapa central de créditos por modelo/operação (BACKEND)
// Fonte autoritativa do DÉBITO. Espelha src/lib/credits.js (SINCRONIZAR).
// Regra: créditos = arredonda↑(18 × custo_USD) → ≥50% margem líq. de Stripe.
// ════════════════════════════════════════════════════════════════════

export const IMAGE_CREDITS = {
  'fal-ai/flux-pro/v1.1-ultra': 2,
  'fal-ai/ideogram/v2':         2,
  'fal-ai/ideogram/v3':         2,
  'fal-ai/nano-banana-pro':     3,
  'fal-ai/fashn/tryon/v1.6':    2,   // $0,075 (try-on especializado) — espelha o front
}

export const VIDEO_CREDITS = {
  'hailuo-02':      { 6: 5, 10: 9 },
  'kling-25-turbo': { 5: 7, 10: 13 },
  'seedance-1-pro': { 5: 14, 10: 27 },
  'seedance-2-fast': { 5: 22, 10: 44 },
  'seedance-2-pro':  { 5: 28, 10: 55 },
  'veo3-fast':      { 4: 29, 6: 44, 8: 58 },
  'veo3':           { 4: 54, 6: 81, 8: 108 },
  'wan-22':         { default: 4 },
}

export const OP_CREDITS = {
  image: 1, upscale: 1, removebg: 1, variation: 1,
  content: 2,
  campaign: 4,
  assistant: 0,
  diagnostico: 0,
  listening: 0,
}

export const creditsForImage = model => IMAGE_CREDITS[model] ?? 1
export const creditsForVideo = (key, duration) =>
  VIDEO_CREDITS[key]?.[Number(duration)] ?? VIDEO_CREDITS[key]?.default ?? 8
export const creditsForOp = op => OP_CREDITS[op] ?? 1

// Sem gating por plano: TODO modelo é acessível a todos os planos.
// O que difere entre planos é a QUANTIDADE de créditos, não o acesso.

// ── Débito / estorno via RPC atômica (migration 023) ─────────────────
// Retorna { ok, saldo } | { ok:false, insufficient } | { ok:false, error }
export async function debitCredits(supabase, { workspace_id, amount, operacao, tipo = 'debit', modelo = null, generation_id = null, user_id = null }) {
  if (!amount || amount <= 0) return { ok: true, saldo: null }   // fair-use (0) — não debita
  const { data, error } = await supabase.rpc('debit_credits', {
    p_workspace: workspace_id, p_amount: amount, p_tipo: tipo, p_operacao: operacao,
    p_modelo: modelo, p_generation: generation_id, p_user: user_id,
  })
  if (error) return { ok: false, error: error.message }
  if (data === -1) return { ok: false, insufficient: true }
  return { ok: true, saldo: data }
}

export async function refundCredits(supabase, { workspace_id, amount, operacao, generation_id = null }) {
  if (!amount || amount <= 0) return
  await supabase.rpc('refund_credits', {
    p_workspace: workspace_id, p_amount: amount, p_operacao: operacao, p_generation: generation_id,
  }).catch(() => {})
}
