// designMd — compila o DESIGN.MD da marca (padrão de mercado) a partir do que
// a plataforma JÁ SABE: identidade visual, design tokens, logos e princípios
// de experiência. Decisão 2026-07-10: Design System deixa de ser formulário
// repetitivo e vira ARTEFATO GERADO (vive dentro do Experience).
// Fonte futura adicional: link do Storybook (importação via IA — Onda 3).

const arr = x => Array.isArray(x) ? x.filter(Boolean) : (x ? [x] : [])
const txt = x => typeof x === 'object' ? (x?.hex || x?.valor || x?.nome || '') : (x || '')

export function buildDesignMd({ brandNome, visual = {}, strategy = {}, tokens = [], assets = [] }) {
  const L = []
  const push = s => L.push(s)

  push(`# Design System — ${brandNome || 'Marca'}`)
  push(`> Gerado pelo BR4NDCODE a partir da identidade viva da marca · ${new Date().toLocaleDateString('pt-BR')}`)
  push('')

  // ── Cores ──
  const paleta = arr(visual.paleta).map(p => ({ nome: p?.nome || '', hex: txt(p) })).filter(p => p.hex)
  const tokenCores = (tokens || []).filter(t => t.categoria === 'color' || /^color/i.test(t.nome || ''))
  if (paleta.length || tokenCores.length) {
    push('## Colors')
    for (const p of paleta) push(`- ${p.hex}${p.nome ? ` — ${p.nome}` : ''}`)
    for (const t of tokenCores) push(`- \`${t.nome}\`: ${t.valor}`)
    push('')
  }

  // ── Tipografia ──
  const tipos = [
    visual.tipo_principal_nome && `- **Primary:** ${visual.tipo_principal_nome}`,
    visual.tipo_secundario_nome && `- **Secondary:** ${visual.tipo_secundario_nome}`,
    visual.tipo_display && `- **Display:** ${visual.tipo_display}`,
  ].filter(Boolean)
  if (tipos.length) { push('## Typography'); L.push(...tipos); push('') }

  // ── Logos ──
  const logos = (assets || []).filter(a => a.tipo === 'logo')
  if (logos.length) {
    push('## Logos')
    for (const lg of logos) push(`- **${lg.nome}**${lg.descricao ? ` — ${lg.descricao}` : ''}${/^https?:/.test(lg.valor || '') ? ` · ${lg.valor}` : ''}`)
    push('')
  }

  // ── Tokens (demais categorias) ──
  const outros = (tokens || []).filter(t => !(t.categoria === 'color' || /^color/i.test(t.nome || '')))
  if (outros.length) {
    push('## Tokens')
    const porCat = {}
    for (const t of outros) (porCat[t.categoria || 'geral'] ||= []).push(t)
    for (const [cat, list] of Object.entries(porCat)) {
      push(`### ${cat}`)
      for (const t of list) push(`- \`${t.nome}\`: ${t.valor}`)
    }
    push('')
  }

  // ── Estética / fotografia ──
  const estetica = [
    visual.foto_mood && `- **Mood:** ${visual.foto_mood}`,
    visual.foto_luz_edicao && `- **Luz & edição:** ${visual.foto_luz_edicao}`,
    visual.foto_enquadramento && `- **Enquadramento:** ${visual.foto_enquadramento}`,
    visual.ilustracao_estilo && `- **Ilustração:** ${visual.ilustracao_estilo}`,
    visual.icone_estilo && `- **Ícones:** ${visual.icone_estilo}`,
  ].filter(Boolean)
  if (estetica.length) { push('## Visual style'); L.push(...estetica); push('') }

  // ── Princípios de experiência (Strategy → Experience) ──
  const principios = [
    strategy.ux && `- **UX:** ${strategy.ux}`,
    strategy.ui && `- **UI:** ${strategy.ui}`,
  ].filter(Boolean)
  if (principios.length) { push('## Experience principles'); L.push(...principios); push('') }

  // ── Do / Don't ──
  const donts = [...arr(visual.usos_proibidos), ...arr(visual.foto_dont)].map(txt).filter(Boolean)
  if (donts.length) {
    push("## Don'ts")
    for (const d of donts) push(`- ${d}`)
    push('')
  }

  // ── Fontes externas / notas ──
  if (strategy.storybook_url) { push('## Storybook'); push(`- ${strategy.storybook_url}`); push('') }
  if (strategy.design_notes) { push('## Notes'); push(strategy.design_notes); push('') }

  return L.join('\n')
}
