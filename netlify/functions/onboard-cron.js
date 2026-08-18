// onboard-cron.js — Scheduled (netlify.toml, de minuto em minuto).
//
// É este cron que tira o setup de marca da dependência da aba do admin. Antes
// o pipeline só andava enquanto o painel fazia polling: fechar a página
// congelava o processo por até uma hora. Agora o painel é espectador — ele
// mostra o estado, não o empurra.
//
// Diferente dos irmãos (clipping, trends, diagnosticar), este NÃO faz fan-out
// para workers: cada avanço é leve — algumas queries e um despacho que
// responde 202 — então roda inline. O que protege o teto síncrono do
// scheduled é o TETO por rodada abaixo, não o fan-out.
import { createClient } from '@supabase/supabase-js'
import { withHeartbeat } from './_watchdog.js'
import { avancarOnboarding, STEPS, TERMINAL } from './_onboard.js'

// Quantos workspaces avançam por rodada. Onboarding é raro e curto — não se
// prepara 30 ambientes ao mesmo tempo — mas o teto existe para o scheduled
// nunca esbarrar no limite síncrono. Se ele for atingido, o log diz: cap
// silencioso é o que faz parecer que cobrimos tudo quando não cobrimos.
const TETO_POR_RODADA = 8

const run = async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  // Onboarding é jsonb: "incompleto" não se expressa bem em SQL, e são poucas
  // linhas com o campo preenchido. Filtra em memória.
  const { data: comOnboarding } = await supabase
    .from('workspaces').select('id, nome, onboarding').not('onboarding', 'is', null)

  // Tem o que avançar = alguma etapa fora dos terminais E fora de `waiting`.
  // `waiting` é a marca esperando o manual, e isso pode durar dias: se o cron
  // reivindicasse esses workspaces, seriam duas escritas por minuto, para
  // sempre, sem nada a fazer. Quem destrava essa trilha é o upload do manual
  // (ação `manual` do workspace-onboard), que é push e não polling.
  const temTrabalho = (onb) => STEPS.some(s => {
    const st = onb.steps[s]
    return !TERMINAL.includes(st) && st !== 'waiting'
  })
  const pendentes = (comOnboarding || []).filter(w => w.onboarding?.steps && temTrabalho(w.onboarding))
  const fila = pendentes.slice(0, TETO_POR_RODADA)
  const sobraram = pendentes.length - fila.length

  const resultados = []
  for (const ws of fila) {
    try {
      const r = await avancarOnboarding(supabase, { workspaceId: ws.id })
      resultados.push({ workspace: ws.nome, pulado: r.pulado || null, completo: !!r.complete, ok: r.ok })
    } catch (e) {
      console.error(`[onboard-cron] ${ws.nome}: ${e.message}`)
      resultados.push({ workspace: ws.nome, erro: e.message })
    }
  }

  const avancados = resultados.filter(r => !r.pulado && !r.erro).length
  const concluidos = resultados.filter(r => r.completo)
  if (sobraram) console.warn(`[onboard-cron] teto da rodada: ${sobraram} workspace(s) ficaram para a próxima`)
  for (const c of concluidos) {
    console.log(`[onboard-cron] ${c.workspace}: pipeline terminou ${c.ok ? 'sem pendências' : 'COM falhas — revisar antes de liberar'}`)
  }
  console.log(`[onboard-cron] ${pendentes.length} em andamento · ${avancados} avançado(s) nesta rodada`)

  return {
    statusCode: 200,
    body: JSON.stringify({ em_andamento: pendentes.length, avancados, sobraram, resultados }),
  }
}

export const handler = withHeartbeat('onboard-cron', run)
