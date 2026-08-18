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
import { sendAlert } from './_watchdog.js'

// Duas trilhas com relógios diferentes, e é por isso que elas são separadas:
// a inteligência só precisa do DOMÍNIO (que já existe no cadastro) e roda em
// minutos; a marca depende do manual em PDF, que pode chegar hoje ou daqui a
// uma semana. Em fila única, a segunda segurava a primeira sem motivo.
export const TRILHAS = {
  inteligencia: ['diagnostico', 'concorrentes', 'mineracao', 'sinteses', 'destilacao'],
  marca:        ['brand'],
}
export const STEPS = [...TRILHAS.marca, ...TRILHAS.inteligencia]
export const trilhaDe = (step) => Object.keys(TRILHAS).find(t => TRILHAS[t].includes(step))

// Estados de uma etapa. A distinção entre os desfechos é o ponto:
//   done     produziu a saída esperada no banco
//   expired  estourou o tempo sem produzir nada — seguimos, mas NÃO é sucesso
//   failed   o despacho não saiu ou o job voltou com erro
//   waiting  esperando insumo externo (o manual). Não é problema: é o combinado.
export const TERMINAL = ['done', 'expired', 'failed']

// teto por etapa: sem saída até aqui, a etapa expira (e fica registrado que expirou)
//
// `brand` era 6 min, número herdado de quando a extração era uma chamada só
// com o PDF em base64. Hoje são duas passadas sobre o documento: no manual da
// PES (313 páginas, 592 mil tokens) só o prefill passa de 2 min. 6 minutos
// expiraria uma extração saudável. 20 dá margem sobre o teto de 15 min da
// própria background function — se ela morrer, a etapa expira logo depois.
const FALLBACK_MIN = { brand: 20, diagnostico: 8, mineracao: 22, sinteses: 12, destilacao: 10 }

// ── Quem espera o quê ────────────────────────────────────────────────
// Clipping e diagnóstico de rivais precisam da lista de CONCORRENTES, que só
// existe depois do diagnóstico. Tendências e escuta não: precisam só do
// domínio, que já está no cadastro desde o primeiro segundo. Mantê-los na
// mineração os fazia esperar o diagnóstico à toa — agora saem junto com ele.
// O ganho é o tempo do diagnóstico (teto de 8 min), não o da mineração
// inteira: a mineração ainda espera clipping e rivais, que dependem mesmo.
const WORKERS_LIVRES = [
  ['trends-workspace-background',   { jitter: false }],
  ['listening-coletar-background',  {}],
]
const WORKERS_DEPENDENTES = [
  ['clipping-workspace-background',                  { jitter: false }],
  ['diagnostico-concorrentes-workspace-background',  { jitter: false }],
]

// Quantas vezes um despacho recusado é reenviado antes de virar `failed`.
// Antes o primeiro "não" era definitivo: um soluço de rede matava a etapa e o
// ambiente terminava com falha por causa de um fetch que uma retentativa
// resolveria. Terminal continua terminal — só não na primeira tentativa.
const TETO_TENTATIVAS = 3

// Quanto tempo uma reivindicação segura a vez do outro motor. Curto porque
// cada avanço é rápido (algumas queries + um despacho que responde 202).
const CLAIM_S = 45

const now = () => new Date().toISOString()
const minsSince = (iso) => iso ? (Date.now() - new Date(iso).getTime()) / 60000 : 0
const segsSince = (iso) => iso ? (Date.now() - new Date(iso).getTime()) / 1000 : Infinity

// Uma trilha terminou quando todas as SUAS etapas chegaram a um terminal.
export const completoTrilha = (onb, trilha) =>
  !!onb?.steps && TRILHAS[trilha].every(s => TERMINAL.includes(onb.steps[s]))

export const completo = (onb) => !!onb?.steps && Object.keys(TRILHAS).every(t => completoTrilha(onb, t))

// Terminar ≠ dar certo. `waiting` fica de fora dos problemas: esperar o manual
// é o combinado, não uma falha.
export const veredito = (onb) => {
  const problemas = STEPS
    .filter(k => onb.steps[k] !== 'done' && onb.steps[k] !== 'waiting')
    .map(k => ({ etapa: k, estado: onb.steps[k], motivo: onb.notas?.[k] || null }))
  return { ok: problemas.length === 0, problemas }
}

// Fase por trilha (registros antigos tinham um `phase_at` só — cai nele).
const faseDe = (onb, trilha) => onb.fases?.[trilha] || onb.phase_at

/**
 * Avança uma transição do onboarding de um workspace.
 * Devolve { onboarding, complete?, ok?, problemas? } ou { pulado: motivo }.
 */
export async function avancarOnboarding(supabase, { workspaceId, authHeader = '' }) {
  const { data: ws } = await supabase.from('workspaces')
    .select('id, nome, onboarding').eq('id', workspaceId).single()
  if (!ws) return { pulado: 'workspace não encontrado' }

  const onb = ws.onboarding
  if (!onb || !onb.steps) return { onboarding: null }

  const started = onb.started_at
  const workspace_id = workspaceId

  // Uma transição por TRILHA a cada chamada — as duas andam no mesmo tick,
  // sem uma esperar a outra.
  const pendentes = Object.keys(TRILHAS)
    .map(t => ({ trilha: t, step: TRILHAS[t].find(s => !TERMINAL.includes(onb.steps[s])) }))
    .filter(x => x.step)

  // Nada a avançar: responde sem reivindicar nada (não suja o estado).
  if (!pendentes.length) return { onboarding: onb, complete: true, ...veredito(onb) }

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

  // Falha de setup era coisa que só aparecia se alguém abrisse o painel do
  // admin e olhasse. Agora ela sai pelo mesmo canal dos crons (Sentry +
  // webhook), com dedup por workspace: o mesmo ambiente não repete o alerta a
  // cada minuto, mas dois ambientes diferentes avisam cada um por si.
  const alertar = async (tipo, motivo) => {
    try { await sendAlert('onboard', `${tipo}:${workspaceId}`, `[${ws.nome}] ${motivo}`) }
    catch (e) { console.error('[onboard] alerta falhou:', e.message) }
  }

  const save = async (estado) => {
    estado.claimed_at = null   // libera a vez para o próximo motor
    await supabase.from('workspaces').update({ onboarding: estado }).eq('id', workspaceId)
    const resultado = { onboarding: estado, complete: completo(estado), ...veredito(estado) }

    for (const f of falhas) await alertar('etapa-falhou', `etapa "${f.etapa}" falhou: ${f.motivo}`)
    // Expirar não dispara sozinho (é lento por natureza e pode ser normal),
    // mas terminar o ambiente com pendência, sim: é o momento em que alguém
    // precisa olhar antes de liberar o acesso ao cliente.
    if (resultado.complete && !resultado.ok && !falhas.length) {
      await alertar('ambiente-com-pendencia',
        `ambiente terminou com pendência em: ${resultado.problemas.map(p => p.etapa).join(', ')}`)
    }
    return resultado
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

  // Encerra a etapa com um desfecho explícito e guarda o porquê. O relógio é
  // por trilha: a marca pode ficar dias parada sem que isso expire nada da
  // inteligência.
  onb.notas = onb.notas || {}
  onb.fases = onb.fases || {}
  let step, trilha
  const marcar = (fase) => { onb.fases[trilha] = fase; onb.phase_at = fase }
  const settle = (desfecho, motivo) => {
    onb.steps[step] = desfecho
    if (motivo) onb.notas[step] = motivo
    marcar(now())
  }
  const advance  = () => settle('done')
  const expire   = (motivo) => settle('expired', motivo || 'estourou o tempo sem produzir saída')
  const falhas   = []
  const fail     = (motivo) => { settle('failed', motivo); falhas.push({ etapa: step, motivo }) }
  const wait     = (motivo) => { onb.steps[step] = 'waiting'; if (motivo) onb.notas[step] = motivo }
  const fellBack = (s) => minsSince(faseDe(onb, trilha)) >= (FALLBACK_MIN[s] || 999)

  // Despacho recusado não é o fim: a etapa fica pendente e o próximo tick do
  // cron tenta de novo, até o teto. Só aí vira falha.
  onb.tentativas = onb.tentativas || {}
  const recusado = (motivo) => {
    const n = (onb.tentativas[step] || 0) + 1
    onb.tentativas[step] = n
    if (n >= TETO_TENTATIVAS) fail(`${motivo} (${n} tentativas)`)
    else onb.notas[step] = `${motivo} — tentativa ${n} de ${TETO_TENTATIVAS}, reenviando`
  }

  const avancarEtapa = async () => {
    if (step === 'brand') {
      // Extração do manual (PDF). Antes `done` e `error` liberavam igual — um
      // PDF que falhou deixava a marca vazia e TODO o resto rodava em cima de
      // um brand book sem conteúdo. Agora os dois desfechos são distintos.
      // Sem `gte(started)`: o manual pode chegar dias depois do início.
      let extraiu = null, falhou = false, jobAtivo = false
      try {
        const { data: jobs } = await supabase.from('brand_manual_jobs')
          .select('status').eq('brand_id', onb.brand_id)
          .order('created_at', { ascending: false }).limit(1)
        const st = jobs?.[0]?.status
        extraiu   = st === 'done'
        falhou    = st === 'error'
        jobAtivo  = !!st && st !== 'done' && st !== 'error'
      } catch { extraiu = null }
      // O relógio da marca começa quando a EXTRAÇÃO começa, não antes.
      // Sem este carimbo, `faseDe('marca')` caía no `phase_at`, que a trilha
      // da inteligência sobrescreve a cada etapa: um manual que chega horas
      // depois nascia com o relógio já estourado e era declarado expirado no
      // primeiro tick, com a extração rodando normalmente.
      if (jobAtivo && !onb.fases.marca) onb.fases.marca = now()

      if (extraiu) {
        advance()
        // ── Convergência das trilhas ──
        // O cérebro já destilou sem o manual (v1). Chegou a identidade
        // declarada, ele precisa aprender de novo — agora com ela.
        if (TERMINAL.includes(onb.steps.destilacao)) {
          onb.steps.destilacao = 'pending'
          onb.notas.destilacao = 'redestilando: o manual chegou depois da primeira versão'
          onb.fases.inteligencia = now()
        }
      }
      else if (falhou) fail('a extração do manual falhou — a marca segue sem conteúdo declarado')
      else if (jobAtivo && fellBack('brand')) expire('a extração do manual não terminou a tempo')
      else if (!jobAtivo) wait('aguardando o manual da marca — pode chegar a qualquer momento')
    }

    else if (step === 'diagnostico') {
      if (onb.steps.diagnostico === 'pending') {
        // Sai junto o que não depende de concorrentes (ver WORKERS_LIVRES):
        // enquanto o diagnóstico roda, tendências e escuta já estão coletando.
        const [ok, ...livres] = await Promise.all([
          dispatch('diagnostico-gerar-background', { workspace_id }),
          ...WORKERS_LIVRES.map(([fn, p]) => dispatch(fn, { workspace_id, ...p })),
        ])
        if (ok) {
          onb.steps.diagnostico = 'running'; onb.phase_at = now()
          // Marca só se TODOS saíram: se algum foi recusado, a mineração
          // reenvia — melhor um despacho duplicado que um sinal que nunca vem.
          onb.livres = livres.every(Boolean)
          if (!onb.livres) onb.notas.diagnostico = 'tendências/escuta não saíram na partida — a mineração reenvia'
        }
        else recusado('não foi possível despachar a geração do diagnóstico')
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
        // Os livres já saíram na partida — só reenvia se lá tiverem sido
        // recusados. Sem isso, a mineração esperaria para sempre um sinal de
        // tendências/escuta que ninguém despachou.
        const workers = [...WORKERS_DEPENDENTES, ...(onb.livres ? [] : WORKERS_LIVRES)]
        const enviados = await Promise.all(workers.map(([fn, p]) => dispatch(fn, { workspace_id, ...p })))
        const recusados = workers.filter((_, i) => !enviados[i]).map(([fn]) => fn)
        if (recusados.length === workers.length) recusado('nenhum worker de mineração aceitou o despacho')
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
        if (!okMkt && !okIns) recusado('não foi possível despachar as sínteses')
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
        else recusado('não foi possível despachar a destilação')
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
  }

  // Cada trilha anda uma transição por chamada. A ordem entre elas não
  // importa — elas não se cruzam, exceto na convergência abaixo.
  for (const p of pendentes) {
    step = p.step
    trilha = p.trilha
    await avancarEtapa()
  }

  return await save(onb)
}
