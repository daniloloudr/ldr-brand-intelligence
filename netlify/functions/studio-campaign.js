// ════════════════════════════════════════════════════════════════════
// studio-campaign.js — FAN-OUT: 1 conceito → N peças coerentes
// Cria a campanha e enfileira N jobs independentes (mesmo brand context),
// um por formato. Cada peça conclui sozinha (webhook/poll). NÃO faz loop
// bloqueante. Spec: specs/features/studio.md §2 (Arquitetura de Escala)
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { falConfigured } from './_image.js'
import { resolveBrandIntelligence, submitGeneration } from './_studio.js'
import { creditsForImage, debitCredits, refundCredits, minPlanoModelo, planoPermite, PLAN_LABEL } from './_credits.js'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const MAX_FORMATOS  = 8

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers }
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers }

  if (!falConfigured()) return { statusCode: 503, headers, body: JSON.stringify({ error: 'FAL_KEY não configurada' }) }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Não autorizado' }) }
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Token inválido' }) }

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body inválido' }) } }

  const { brand_id, conceito, workflow_id = null, nome, model, extra } = body
  const mode = body.mode === 'adapt' ? 'adapt' : 'independent'
  const useBrand = body.use_brand !== false   // marca opcional — default ligada
  const formatos = [...new Set((body.formatos || []).filter(Boolean))].slice(0, MAX_FORMATOS)
  if (!brand_id)        return { statusCode: 400, headers, body: JSON.stringify({ error: 'brand_id obrigatório' }) }
  if (!conceito)        return { statusCode: 400, headers, body: JSON.stringify({ error: 'conceito obrigatório' }) }
  if (!formatos.length) return { statusCode: 400, headers, body: JSON.stringify({ error: 'selecione ao menos um formato' }) }

  // Brand → workspace
  const { data: brand } = await supabase.from('brands').select('id, nome, workspace_id').eq('id', brand_id).single()
  if (!brand) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Marca não encontrada' }) }
  const workspace_id = brand.workspace_id

  // Acesso
  const [{ data: member }, { data: platformAdmin }] = await Promise.all([
    supabase.from('workspace_members').select('role').eq('workspace_id', workspace_id).eq('user_id', user.id).maybeSingle(),
    supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle(),
  ])
  if (!member && !platformAdmin) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem acesso ao workspace' }) }

  // Gating + débito = nº de formatos × crédito/imagem do modelo. Admin bypassa.
  const amount = formatos.length * creditsForImage(model)
  if (!platformAdmin) {
    const { data: ws } = await supabase.from('workspaces').select('plano').eq('id', workspace_id).single()
    const minP = minPlanoModelo(model)
    if (!planoPermite(ws?.plano, minP)) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: `Este modelo requer o plano ${PLAN_LABEL[minP]} ou superior.`, minPlano: minP }) }
    }
    const r = await debitCredits(supabase, { workspace_id, amount, operacao: 'campaign', modelo: model || 'auto', user_id: user.id })
    if (r.insufficient) return { statusCode: 402, headers, body: JSON.stringify({ error: 'Créditos insuficientes para esta campanha.', need: amount }) }
    if (!r.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: r.error || 'Falha ao debitar créditos' }) }
  }

  // Brand context único (opcional) — coerência da campanha vem daqui
  let snapshot = null, prefix = ''
  if (useBrand) ({ prefix, snapshot } = await resolveBrandIntelligence(supabase, brand_id, brand.nome))

  // Cria a campanha (status gerando)
  const { data: campaign, error: campErr } = await supabase.from('studio_campaigns').insert({
    workspace_id, brand_id, workflow_id,
    nome:     nome || conceito.slice(0, 60),
    conceito,
    formatos,
    mode,
    status:   'gerando',
  }).select().single()
  if (campErr) return { statusCode: 500, headers, body: JSON.stringify({ error: campErr.message }) }

  // independent: fan-out de todos os formatos de uma vez.
  // adapt: submete só o hero (1º formato); as adaptações disparam quando ele
  //        concluir (em _studio.js), usando o hero como imagem de referência.
  const formatosToSubmit = mode === 'adapt' ? formatos.slice(0, 1) : formatos

  const generations = []
  for (const formato of formatosToSubmit) {
    const promptFinal = useBrand
      ? `${prefix}\n\n[CONCEITO DA CAMPANHA]\n${conceito}\n\n[FORMATO]\n${formato}`
      : `${conceito}\n\n[FORMATO]\n${formato}`
    const { gen, error } = await submitGeneration(supabase, {
      workspace_id, brand_id, workflow_id, campaign_id: campaign.id,
      promptFinal, snapshot, formato, model, extra,
    })
    if (gen) generations.push({ id: gen.id, formato })
    else     console.error(`[campaign ${campaign.id}] formato ${formato} falhou:`, error)
  }

  // adapt: registra o hero para o fan-out posterior
  if (mode === 'adapt' && generations.length) {
    await supabase.from('studio_campaigns').update({ hero_generation_id: generations[0].id }).eq('id', campaign.id)
  }

  // Nenhuma peça submetida → estorna o crédito e marca a campanha como erro
  if (!generations.length) {
    if (!platformAdmin) await refundCredits(supabase, { workspace_id, amount, operacao: 'campaign' })
    await supabase.from('studio_campaigns').update({ status: 'rascunho' }).eq('id', campaign.id)
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'Falha ao submeter as peças no fal' }) }
  }

  return { statusCode: 200, headers, body: JSON.stringify({ campaign_id: campaign.id, generations, status: 'gerando' }) }
}
