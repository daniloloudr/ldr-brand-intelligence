// workspace-onboard.js — orquestrador do "Preparar ambiente" (onboarding completo).
// Admin dispara e faz POLLING de `tick`; cada tick avança UMA transição (despacha a
// próxima etapa ou marca a atual como concluída ao detectar a saída no banco).
// Pipeline: brand → diagnóstico → concorrentes → mineração → sínteses → destilação.
// As etapas de mineração são jobs de ~15 min (fire-and-forget, padrão dos crons).
import { createClient } from '@supabase/supabase-js'
import { siteBase } from './_studio.js'
import { avancarOnboarding } from './_onboard.js'


const now = () => new Date().toISOString()

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

  let body; try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400, headers } }
  const { action, workspace_id } = body
  if (!workspace_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'workspace_id obrigatório' }) }

  // Preparar e avançar ambiente é do admin. Avisar que o manual chegou é do
  // CLIENTE também — é ele quem sobe o arquivo, pela tela da marca, e pode
  // fazer isso dias depois. Membro do próprio workspace basta.
  if (!admin) {
    if (action !== 'manual') {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Apenas platform admin' }) }
    }
    const { data: membro } = await supabase.from('workspace_members')
      .select('id').eq('user_id', user.id).eq('workspace_id', workspace_id).maybeSingle()
    if (!membro) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem acesso a este workspace' }) }
  }

  const { data: ws } = await supabase.from('workspaces')
    .select('id, nome, slug, dominio, onboarding').eq('id', workspace_id).single()
  if (!ws) return { statusCode: 404, headers, body: JSON.stringify({ error: 'workspace não encontrado' }) }

  // Despacho de worker de background. O `await` é sobre o ENVIO, não sobre o
  // job (que leva ~15 min e responde 202 na hora). Sem ele o fetch morre no
  // freeze da Lambda antes de sair — foi o bug que derrubou o cron de
  // destilação em julho. Os crons já despacham assim; o onboard tinha ficado
  // de fora. Devolve se o worker aceitou, para a etapa poder falhar na hora.
  const dispatch = async (fn, payload) => {
    try {
      const r = await fetch(`${siteBase()}/.netlify/functions/${fn}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify(payload),
      })
      return r.ok || r.status === 202
    } catch {
      return false
    }
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

    // Com manual (PDF): cria o job de extração e dispara.
    // SEM manual: a trilha da marca fica AGUARDANDO — não é sucesso nem falha,
    // é o combinado. Ela destrava sozinha quando o arquivo chegar, hoje ou
    // daqui a uma semana, sem segurar a trilha da inteligência.
    let brandStep = 'waiting'
    const notas = {}
    if (manual_path) {
      const { data: job } = await supabase.from('brand_manual_jobs')
        .insert({ brand_id: brand.id, file_path: manual_path, status: 'processing' }).select('id').single()
      if (!job?.id) {
        brandStep = 'failed'; notas.brand = 'não foi possível criar o job de extração'
      } else {
        const ok = await dispatch('brand-manual-extract-background', { brand_id: brand.id, file_path: manual_path, job_id: job.id })
        if (ok) brandStep = 'running'
        else { brandStep = 'failed'; notas.brand = 'não foi possível despachar a extração do manual' }
      }
    } else {
      notas.brand = 'aguardando o manual da marca — a inteligência já está rodando'
    }

    const agora = now()
    const onb = {
      started_at: agora, brand_id: brand.id, phase_at: agora, rev: 0, notas,
      // O relógio da marca só corre se a extração começou. Sem manual ela fica
      // esperando — e esperar não conta tempo, senão um PDF que chega dias
      // depois nasce com o teto estourado. Quando ele chega, a ação `manual`
      // carimba o relógio; se vier pelo cron, _onboard.js carimba.
      fases: brandStep === 'running' ? { inteligencia: agora, marca: agora }
                                     : { inteligencia: agora },
      steps: { brand: brandStep, diagnostico: 'pending', concorrentes: 'pending', mineracao: 'pending', sinteses: 'pending', destilacao: 'pending' },
    }
    return await save(onb)
  }

  // ── MANUAL ─────────────────────────────────────────────────────────
  // O manual chegou — no mesmo dia ou dias depois. Reabre a trilha da marca
  // sem tocar na inteligência, que a esta altura já rodou (ou está rodando).
  if (action === 'manual') {
    // `job_id` vem quando quem chamou JÁ criou o job e despachou a extração
    // (é o caso da tela da marca). Sem ele, criamos aqui. Sem essa distinção
    // a mesma extração rodaria duas vezes — e ela é paga.
    const { manual_path, job_id } = body
    if (!manual_path && !job_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'manual_path ou job_id obrigatório' }) }

    const onb = ws.onboarding
    if (!onb?.steps) return { statusCode: 400, headers, body: JSON.stringify({ error: 'workspace ainda não tem ambiente preparado' }) }

    const { data: brand } = await supabase.from('brands').select('id')
      .eq('workspace_id', workspace_id).limit(1).maybeSingle()
    const brandId = onb.brand_id || brand?.id
    if (!brandId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'marca não encontrada' }) }

    let ok = true
    if (!job_id) {
      const { data: job } = await supabase.from('brand_manual_jobs')
        .insert({ brand_id: brandId, file_path: manual_path, status: 'processing' }).select('id').single()
      if (!job?.id) return { statusCode: 500, headers, body: JSON.stringify({ error: 'não foi possível criar o job de extração' }) }
      ok = await dispatch('brand-manual-extract-background', { brand_id: brandId, file_path: manual_path, job_id: job.id })
    }
    const agora = now()
    onb.brand_id = brandId
    onb.steps.brand = ok ? 'running' : 'failed'
    onb.notas = onb.notas || {}
    onb.notas.brand = ok ? null : 'não foi possível despachar a extração do manual'
    onb.fases = { ...(onb.fases || {}), marca: agora }
    onb.phase_at = agora
    return await save(onb)
  }

  // ── TICK ───────────────────────────────────────────────────────────
  // A máquina de estados vive em _onboard.js, porque o cron gira a mesma.
  // Aqui é só o "avançar agora" do painel — útil para empurrar na frente do
  // cliente; o pipeline anda sozinho mesmo com esta aba fechada.
  if (action === 'tick') {
    const r = await avancarOnboarding(supabase, { workspaceId: workspace_id, authHeader })
    return { statusCode: 200, headers, body: JSON.stringify(r) }
  }

  return { statusCode: 400, headers, body: JSON.stringify({ error: 'action inválida (start|manual|tick)' }) }
}
