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
  if (!admin) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Apenas platform admin' }) }

  let body; try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400, headers } }
  const { action, workspace_id } = body
  if (!workspace_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'workspace_id obrigatório' }) }

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

    // Com manual (PDF): cria o job de extração e dispara — a marca é preenchida pela IA.
    // Sem manual: a marca fica só com a identidade básica (brand step já 'done').
    let brandStep = 'done'
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
      notas.brand = 'sem manual — a marca fica só com a identidade básica'
    }

    const onb = {
      started_at: now(), brand_id: brand.id, phase_at: now(), notas,
      steps: { brand: brandStep, diagnostico: 'pending', concorrentes: 'pending', mineracao: 'pending', sinteses: 'pending', destilacao: 'pending' },
    }
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

  return { statusCode: 400, headers, body: JSON.stringify({ error: 'action inválida (start|tick)' }) }
}
