// _onboard.js — a máquina de estados do "Preparar ambiente", num lugar só.
//
// Dois motores giram esta mesma máquina: o painel do admin (botão "avançar
// agora") e o `onboard-cron`, de minuto em minuto. Por isso a função começa
// reivindicando o avanço — sem isso os dois podem despachar a mesma etapa e
// pagar a mesma chamada de LLM duas vezes.
//
// Cada chamada avança NO MÁXIMO uma transição: despacha a próxima etapa, ou
// detecta a saída no banco e encerra a atual.
import { siteBase } from './_studio.js'

export const STEPS = ['brand', 'diagnostico', 'concorrentes', 'mineracao', 'sinteses', 'destilacao']

// Estados de uma etapa. A distinção entre os três terminais é o ponto:
//   done     produziu a saída esperada no banco
//   expired  estourou o tempo sem produzir nada — seguimos, mas NÃO é sucesso
//   failed   o despacho não saiu ou o job voltou com erro
export const TERMINAL = ['done', 'expired', 'failed']

// teto por etapa: sem saída até aqui, a etapa expira (e fica registrado que expirou)
const FALLBACK_MIN = { brand: 6, diagnostico: 8, mineracao: 22, sinteses: 12, destilacao: 10 }

// Quanto tempo uma reivindicação segura a vez do outro motor. Curto porque
// cada avanço é rápido (algumas queries + um despacho que responde 202).
const CLAIM_S = 45

const now = () => new Date().toISOString()
const minsSince = (iso) => iso ? (Date.now() - new Date(iso).getTime()) / 60000 : 0
const segsSince = (iso) => iso ? (Date.now() - new Date(iso).getTime()) / 1000 : Infinity

export const completo = (onb) => !!onb?.steps && STEPS.every(s => TERMINAL.includes(onb.steps[s]))

// Terminar ≠ dar certo: `ok` só é verdadeiro se TODA etapa concluiu de fato.
export const veredito = (onb) => {
  const problemas = STEPS
    .filter(k => onb.steps[k] !== 'done')
    .map(k => ({ etapa: k, estado: onb.steps[k], motivo: onb.notas?.[k] || null }))
  return { ok: problemas.length === 0, problemas }
}

/**
 * Avança uma transição do onboarding de um workspace.
 * Devolve { onboarding, complete?, ok?, problemas? } ou { pulado: motivo }.
 */
export async function avancarOnboarding(supabase, { workspaceId, authHeader = '' }) {
  const { data: ws } = await supabase.from('workspaces')
    .select('id, onboarding').eq('id', workspaceId).single()
  if (!ws) return { pulado: 'workspace não encontrado' }

  const onb = ws.onboarding
  if (!onb || !onb.steps) return { onboarding: null }

  const started = onb.started_at
  const workspace_id = workspaceId
  const step = STEPS.find(s => !TERMINAL.includes(onb.steps[s]))

  // Nada a avançar: responde sem reivindicar nada (não suja o estado).
  if (!step) return { onboarding: onb, complete: true, ...veredito(onb) }

  // ── Reivindica o avanço ────────────────────────────────────────────────
  // Compare-and-swap na revisão: quem perder a corrida sai sem despachar.
  // O `claimed_at` cobre a janela em que o vencedor ainda está trabalhando —
  // sem ele, o outro motor leria a revisão nova e reivindicaria por cima.
  const rev = Number.isInteger(onb.rev) ? onb.rev : 0
  if (segsSince(onb.claimed_at) < CLAIM_S) {
    return { pulado: 'outro motor está avançando agora', onboarding: onb }
  }
  const claim = supabase.from('workspaces')
    .update({ onboarding: { ...onb, rev: rev + 1, claimed_at: now() } })
    .eq('id', workspaceId)
  const { data: venceu } = await (Number.isInteger(onb.rev)
    ? claim.eq('onboarding->>rev', String(rev))
    : claim.is('onboarding->>rev', null)).select('id')
  if (!venceu?.length) return { pulado: 'outra chamada avançou primeiro', onboarding: onb }
  onb.rev = rev + 1

  const save = async (estado) => {
    estado.claimed_at = null   // libera a vez para o próximo motor
    await supabase.from('workspaces').update({ onboarding: estado }).eq('id', workspaceId)
    return { onboarding: estado, complete: completo(estado), ...veredito(estado) }
  }

  // Despacho de worker de background. O `await` é sobre o ENVIO, não sobre o
  // job (que responde 202 e segue por ~15 min). Sem ele o fetch morre no
  // freeze da Lambda antes de sair — o bug do cron de destilação em julho.
  const dispatch = async (fn, payload) => {
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (authHeader) headers.Authorization = authHeader
      const r = await fetch(`${siteBase()}/.netlify/functions/${fn}`, {
        method: 'POST', headers, body: JSON.stringify(payload),
      })
      return r.ok || r.status === 202
    } catch { return false }
  }

  // "tem saída desde o started_at?" — erro de schema devolve null e a etapa
  // cai no teto de tempo, virando `expired` em vez de falso sucesso.
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

  // Encerra a etapa com um desfecho explícito e guarda o porquê.
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
