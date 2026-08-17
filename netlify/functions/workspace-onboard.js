// workspace-onboard.js — orquestrador do "Preparar ambiente" (onboarding completo).
// Admin dispara e faz POLLING de `tick`; cada tick avança UMA transição (despacha a
// próxima etapa ou marca a atual como concluída ao detectar a saída no banco).
// Pipeline: brand → diagnóstico → concorrentes → mineração → sínteses → destilação.
// As etapas de mineração são jobs de ~15 min (fire-and-forget, padrão dos crons).
import { createClient } from '@supabase/supabase-js'
import { siteBase } from './_studio.js'

const STEPS = ['brand', 'diagnostico', 'concorrentes', 'mineracao', 'sinteses', 'destilacao']

// Estados de uma etapa. A distinção entre os três terminais é o ponto:
//   done     produziu a saída esperada no banco
//   expired  estourou o tempo sem produzir nada — seguimos, mas NÃO é sucesso
//   failed   o despacho não saiu ou o job voltou com erro
// Antes só existia `done`, e o teto de tempo empurrava tudo para lá: o
// ambiente dizia "pronto" com o conteúdo vazio e ninguém ficava sabendo.
const TERMINAL = ['done', 'expired', 'failed']

// teto por etapa: sem saída até aqui, a etapa expira (e fica registrado que expirou)
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

  // ── TICK (polling) ─────────────────────────────────────────────────
  if (action === 'tick') {
    const onb = ws.onboarding
    if (!onb || !onb.steps) return { statusCode: 200, headers, body: JSON.stringify({ onboarding: null }) }
    const started = onb.started_at
    const step = STEPS.find(s => !TERMINAL.includes(onb.steps[s]))
    if (!step) {
      // Terminou ≠ deu certo. `ok` só é verdadeiro se TODA etapa concluiu de
      // fato; senão devolvemos o que expirou ou falhou, para o painel poder
      // dizer a verdade em vez de carimbar "Ambiente pronto".
      const problemas = STEPS
        .filter(k => onb.steps[k] !== 'done')
        .map(k => ({ etapa: k, estado: onb.steps[k], motivo: onb.notas?.[k] || null }))
      return { statusCode: 200, headers, body: JSON.stringify({
        onboarding: onb, complete: true, ok: problemas.length === 0, problemas,
      }) }
    }

    // Encerra a etapa com um desfecho explícito e guarda o porquê, para o
    // painel poder mostrar o que de fato aconteceu.
    onb.notas = onb.notas || {}
    const settle = (desfecho, motivo) => {
      onb.steps[step] = desfecho
      if (motivo) onb.notas[step] = motivo
      onb.phase_at = now()
    }
    const advance  = () => settle('done')
    const expire   = (motivo) => settle('expired', motivo || 'estourou o tempo sem produzir saída')
    const fail     = (motivo) => settle('failed', motivo)
    const fellBack = (s) => minsSince(onb.phase_at) >= (FALLBACK_MIN[s] || 999)

    if (step === 'brand') {
      // Extração do manual (PDF). Antes `done` e `error` liberavam igual — um
      // PDF que falhou deixava a marca vazia e TODO o resto rodava em cima de
      // um brand book sem conteúdo. Agora os dois desfechos são distintos.
      let extraiu = null, falhou = false
      try {
        const { data: jobs } = await supabase.from('brand_manual_jobs')
          .select('status').eq('brand_id', onb.brand_id)
          .gte('created_at', started).order('created_at', { ascending: false }).limit(1)
        const st = jobs?.[0]?.status
        extraiu = st === 'done'
        falhou  = st === 'error'
      } catch { extraiu = null }
      if (extraiu) advance()
      else if (falhou) fail('a extração do manual falhou — a marca segue sem conteúdo declarado')
      else if (fellBack('brand')) expire('a extração do manual não terminou a tempo')
    }

    else if (step === 'diagnostico') {
      if (onb.steps.diagnostico === 'pending') {
        const ok = await dispatch('diagnostico-gerar-background', { workspace_id })
        if (ok) { onb.steps.diagnostico = 'running'; onb.phase_at = now() }
        else fail('não foi possível despachar a geração do diagnóstico')
      } else {
        const done = await hasSince('diagnosticos', started, { status: 'done' })
        if (done) advance()
        else if (fellBack('diagnostico')) expire('nenhum diagnóstico concluído no período')
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
      // Etapa instantânea, mas o resultado importa: sem concorrentes o clipping
      // e o diagnóstico de rivais não têm o que minerar. Concluir em silêncio
      // aqui é o que fazia a mineração "terminar" sem produzir nada.
      const { count: totalConc } = await supabase.from('concorrentes')
        .select('id', { count: 'exact', head: true }).eq('workspace_id', workspace_id)
      if (totalConc > 0) advance()
      else expire('o diagnóstico não sugeriu concorrentes — clipping e rivais não terão o que minerar')
    }

    else if (step === 'mineracao') {
      if (onb.steps.mineracao === 'pending') {
        const workers = [
          ['clipping-workspace-background', { workspace_id, jitter: false }],
          ['diagnostico-concorrentes-workspace-background', { workspace_id, jitter: false }],
          ['trends-workspace-background', { workspace_id, jitter: false }],
          ['listening-coletar-background', { workspace_id }],
        ]
        const enviados = await Promise.all(workers.map(([fn, p]) => dispatch(fn, p)))
        const recusados = workers.filter((_, i) => !enviados[i]).map(([fn]) => fn)
        if (recusados.length === workers.length) fail('nenhum worker de mineração aceitou o despacho')
        else {
          onb.steps.mineracao = 'running'; onb.phase_at = now()
          if (recusados.length) onb.notas.mineracao = `não despachou: ${recusados.join(', ')}`
        }
      } else {
        const [clip, trend, listen] = await Promise.all([
          hasSince('concorrente_clipping', started),
          hasSince('tendencias', started),
          hasSince('listening_events', started),
        ])
        if (clip && trend && listen) advance()
        else if (fellBack('mineracao')) {
          const faltou = [!clip && 'clipping', !trend && 'tendências', !listen && 'escuta'].filter(Boolean)
          expire(`sem saída de: ${faltou.join(', ')}`)
        }
      }
    }

    else if (step === 'sinteses') {
      if (onb.steps.sinteses === 'pending') {
        const [okMkt, okIns] = await Promise.all([
          dispatch('market-sintese-background', { workspace_id }),
          dispatch('insights-gerar-background', { workspace_id }),
        ])
        if (!okMkt && !okIns) fail('não foi possível despachar as sínteses')
        else {
          onb.steps.sinteses = 'running'; onb.phase_at = now()
          if (!okMkt || !okIns) onb.notas.sinteses = `não despachou: ${!okMkt ? 'mercado' : 'insights'}`
        }
      } else {
        const [market, insights] = await Promise.all([
          hasSince('market_sinteses', started),
          hasSince('consumer_insights', started),
        ])
        if (market && insights) advance()
        else if (fellBack('sinteses')) {
          const faltou = [!market && 'mercado', !insights && 'insights'].filter(Boolean)
          expire(`sem saída de: ${faltou.join(', ')}`)
        }
      }
    }

    else if (step === 'destilacao') {
      if (onb.steps.destilacao === 'pending') {
        const ok = await dispatch('brand-distill-background', { brand_id: onb.brand_id })
        if (ok) { onb.steps.destilacao = 'running'; onb.phase_at = now() }
        else fail('não foi possível despachar a destilação')
      } else {
        // brand_intelligence é por brand_id (não workspace) — checagem própria
        let done = null
        try {
          const { count } = await supabase.from('brand_intelligence')
            .select('id', { count: 'exact', head: true })
            .eq('brand_id', onb.brand_id).gte('created_at', started)
          done = (count || 0) > 0
        } catch { done = null }
        if (done) advance()
        else if (fellBack('destilacao')) expire('o cérebro não produziu versão nova no período')
      }
    }

    return await save(onb)
  }

  return { statusCode: 400, headers, body: JSON.stringify({ error: 'action inválida (start|tick)' }) }
}
