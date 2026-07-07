// Compila o modelo vivo destilado (Camada de Inteligência) em bloco de contexto
// de prompt. Compartilhado pelas superfícies client-side que consomem o cérebro
// (Brand Assistant, Content Hub). Server-side o equivalente vive em _brain.js.
export function compileIntel(m, versao) {
  if (!m) return ''
  const lines = []
  if (m.posicionamento?.valor) lines.push(`- Posicionamento (aprendido): ${m.posicionamento.valor}`)
  if (m.voz?.valor)            lines.push(`- Voz (aprendida): ${m.voz.valor}`)
  if (m.territorio?.valor)     lines.push(`- Território a reivindicar (aprendido): ${m.territorio.valor}`)
  const pv = m.preferencias_visuais || {}
  const aprov  = (pv.aprovado  || []).map(a => a?.padrao).filter(Boolean)
  const reprov = (pv.reprovado || []).map(a => a?.padrao).filter(Boolean)
  if (aprov.length)  lines.push(`- Visual APROVADO: ${aprov.join('; ')}`)
  if (reprov.length) lines.push(`- Visual REPROVADO (evitar): ${reprov.join('; ')}`)
  if (pv.modelo_preferido?.provider) lines.push(`- Estilo/modelo que mais performa: ${pv.modelo_preferido.provider}`)
  const dos   = (m.do_dont?.do   || []).filter(Boolean)
  const donts = (m.do_dont?.dont || []).filter(Boolean)
  if (dos.length)   lines.push(`- Faça: ${dos.join('; ')}`)
  if (donts.length) lines.push(`- Não faça: ${donts.join('; ')}`)
  const ct = m.conteudo || {}
  if (ct.temas?.length)   lines.push(`- Temas de conteúdo que a marca usa: ${ct.temas.join('; ')}`)
  if (ct.angulos?.length) lines.push(`- Ângulos que funcionam: ${ct.angulos.join('; ')}`)
  const fatos = (m.fatos || []).filter(f => f?.fato && (f.confianca ?? 1) >= 0.5).map(f => f.fato)
  if (fatos.length) lines.push(`- Fatos consolidados: ${fatos.join('; ')}`)
  if (!lines.length) return ''
  return `\n\n## Inteligência da marca (aprendido com o uso — v${versao})\nConhecimento destilado das avaliações reais desta marca (votos, campanhas, diagnósticos). Priorize isto ao responder — é o que a marca demonstrou preferir na prática:\n${lines.join('\n')}`
}
