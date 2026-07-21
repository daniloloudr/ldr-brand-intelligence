// workspace-onboard.js — orquestrador do "Preparar ambiente" (onboarding completo).
// Admin dispara e faz POLLING de `tick`; cada tick avança UMA transição (despacha a
// próxima etapa ou marca a atual como concluída ao detectar a saída no banco).
// Pipeline: brand → diagnóstico → concorrentes → mineração → sínteses → destilação.
// As etapas de mineração são jobs de ~15 min (fire-and-forget, padrão dos crons).
import { createClient } from '@supabase/supabase-js'
import { siteBase } from './_studio.js'

const STEPS = ['brand', 'diagnostico', 'concorrentes', 'mineracao', 'sinteses', 'destilacao']

// fallback por tempo: se a detecção por tabela falhar, não trava o pipeline pra sempre
const FALLBACK_MIN = { brand: 6, diagnostico: 8, mineracao: 22, sinteses: 12, destilacao: 10 }

const now = () => new Date().toISOString()
const minsSince = (iso) => iso ? (Date.now() - new Date(iso).getTime()) / 60000 : 0

export const handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers }
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const authHeader = event.headers.authorization || ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return { statusCode: 401, headers }

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return { statusCode: 401, headers }
  const { data: admin } = await supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle()
  if (!admin) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Apenas platform admin' }) }

  let body; try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400, headers } }
  const { action, workspace_id } = body
  if (!workspace_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'workspace_id obrigatório' }) }

  const { data: ws } = await supabase.from('workspaces')
    .select('id, nome, slug, dominio, onboarding').eq('id', workspace_id).single()
  if (!ws) return { statusCode: 404, headers, body: JSON.stringify({ error: 'workspace não encontrado' }) }

  // despacho fire-and-forget de worker de background (não aguarda — job de 15 min)
  const dispatch = (fn, payload) => {
    fetch(`${siteBase()}/.netlify/functions/${fn}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify(payload),
    }).catch(() => {})
  }
  // "tem saída desde o started_at?" — defensivo: erro de schema → null (cai no fallback)
  const hasSince = async (table, since, extra = {}) => {
    try {
      let q = supabase.from(table).select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspace_id).gte('created_at', since)
      for (const [k, v] of Object.entries(extra)) q = q.eq(k, v)
      const { count, error } = await q
      if (error) return null
      return (count || 0) > 0
    } catch { return null }
  }

  const save = async (onb) => {
    await supabase.from('workspaces').update({ onboarding: onb }).eq('id', workspace_id)
    return { statusCode: 200, headers, body: JSON.stringify({ onboarding: onb }) }
  }

  // ── START ──────────────────────────────────────────────────────────
  if (action === 'start') {
    const { manual_path } = body   // PDF do manual (subido pelo admin) → a marca nasce dele
    // cria a brand (se não existir) + brand_book mínimo
    let { data: brand } = await supabase.from('brands').select('id').eq('workspace_id', workspace_id).maybeSingle()
    if (!brand) {
      const { data: nb, error: be } = await supabase.from('brands')
        .insert({ workspace_id, nome: ws.nome, slug: ws.slug || null, status: 'draft' })
        .select('id').single()
      if (be) return { statusCode: 400, headers, body: JSON.stringify({ error: `brand: ${be.message}` }) }
      brand = nb
      await supabase.from('brand_books').insert({
        brand_id: brand.id, identity: {}, positioning: {}, design_system: {}, references: {}, version: 1,
      })
    }

    // Com manual (PDF): cria o job de extração e dispara — a marca é preenchida pela IA.
    // Sem manual: a marca fica só com a identidade básica (brand step já 'done').
    let brandStep = 'done'
    if (manual_path) {
      const { data: job } = await supabase.from('brand_manual_jobs')
        .insert({ brand_id: brand.id, file_path: manual_path, status: 'processing' }).select('id').single()
      if (job?.id) {
        dispatch('brand-manual-extract-background', { brand_id: brand.id, file_path: manual_path, job_id: job.id })
        brandStep = 'running'
      }
    }

    const onb = {
      started_at: now(), brand_id: brand.id, phase_at: now(),
      steps: { brand: brandStep, diagnostico: 'pending', concorrentes: 'pending', mineracao: 'pending', sinteses: 'pending', destilacao: 'pending' },
    }
    return await save(onb)
  }

  // ── TICK (polling) ─────────────────────────────────────────────────
  if (action === 'tick') {
    const onb = ws.onboarding
    if (!onb || !onb.steps) return { statusCode: 200, headers, body: JSON.stringify({ onboarding: null }) }
    const started = onb.started_at
    const step = STEPS.find(s => onb.steps[s] !== 'done')
    if (!step) return { statusCode: 200, headers, body: JSON.stringify({ onboarding: onb, complete: true }) }

    const advance = (next = true) => { onb.steps[step] = 'done'; onb.phase_at = now(); if (!next) return }
    const fellBack = (s) => minsSince(onb.phase_at) >= (FALLBACK_MIN[s] || 999)

    if (step === 'brand') {
      // extração do manual (PDF) em andamento — done/error liberam (marca existe de qualquer forma)
      let done = null
      try {
        const { count } = await supabase.from('brand_manual_jobs')
          .select('id', { count: 'exact', head: true })
          .eq('brand_id', onb.brand_id).in('status', ['done', 'error']).gte('created_at', started)
        done = (count || 0) > 0
      } catch { done = null }
      if (done || fellBack('brand')) advance()
    }

    else if (step === 'diagnostico') {
      if (onb.steps.diagnostico === 'pending') {
        dispatch('diagnostico-gerar-background', { workspace_id })
        onb.steps.diagnostico = 'running'; onb.phase_at = now()
      } else {
        const done = await hasSince('diagnosticos', started, { status: 'done' })
        if (done || fellBack('diagnostico')) advance()
      }
    }

    else if (step === 'concorrentes') {
      // lê os concorrentes sugeridos pelo diagnóstico e cadastra (dedup por nome)
      const { data: diag } = await supabase.from('diagnosticos')
        .select('data').eq('workspace_id', workspace_id).eq('status', 'done')
        .gte('created_at', started).order('created_at', { ascending: false }).limit(1).maybeSingle()
      const sugeridos = (diag?.data?.concorrentes || []).slice(0, 5)
        .map(c => (typeof c === 'string' ? { nome: c } : c)).filter(c => c?.nome)
      if (sugeridos.length) {
        const { data: existentes } = await supabase.from('concorrentes').select('nome').eq('workspace_id', workspace_id)
        const jaTem = new Set((existentes || []).map(c => (c.nome || '').toLowerCase()))
        const novos = sugeridos.filter(c => !jaTem.has(c.nome.toLowerCase()))
          .map(c => ({ workspace_id, nome: c.nome, dominio: c.dominio || null, ativo: true }))
        if (novos.length) await supabase.from('concorrentes').insert(novos)
      }
      advance()  // etapa instantânea (mesmo sem concorrentes, segue)
    }

    else if (step === 'mineracao') {
      if (onb.steps.mineracao === 'pending') {
        dispatch('clipping-workspace-background', { workspace_id, jitter: false })
        dispatch('diagnostico-concorrentes-workspace-background', { workspace_id, jitter: false })
        dispatch('trends-workspace-background', { workspace_id, jitter: false })
        dispatch('listening-coletar-background', { workspace_id })
        onb.steps.mineracao = 'running'; onb.phase_at = now()
      } else {
        const [clip, trend, listen] = await Promise.all([
          hasSince('concorrente_clipping', started),
          hasSince('tendencias', started),
          hasSince('listening_events', started),
        ])
        if ((clip && trend && listen) || fellBack('mineracao')) advance()
      }
    }

    else if (step === 'sinteses') {
      if (onb.steps.sinteses === 'pending') {
        dispatch('market-sintese-background', { workspace_id })
        dispatch('insights-gerar-background', { workspace_id })
        onb.steps.sinteses = 'running'; onb.phase_at = now()
      } else {
        const [market, insights] = await Promise.all([
          hasSince('market_sinteses', started),
          hasSince('consumer_insights', started),
        ])
        if ((market && insights) || fellBack('sinteses')) advance()
      }
    }

    else if (step === 'destilacao') {
      if (onb.steps.destilacao === 'pending') {
        dispatch('brand-distill-background', { brand_id: onb.brand_id })
        onb.steps.destilacao = 'running'; onb.phase_at = now()
      } else {
        // brand_intelligence é por brand_id (não workspace) — checagem própria
        let done = null
        try {
          const { count } = await supabase.from('brand_intelligence')
            .select('id', { count: 'exact', head: true })
            .eq('brand_id', onb.brand_id).gte('created_at', started)
          done = (count || 0) > 0
        } catch { done = null }
        if (done || fellBack('destilacao')) advance()
      }
    }

    return await save(onb)
  }

  return { statusCode: 400, headers, body: JSON.stringify({ error: 'action inválida (start|tick)' }) }
}
