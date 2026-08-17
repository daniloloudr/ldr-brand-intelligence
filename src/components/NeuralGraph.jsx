// NeuralGraph — a rede viva da Inteligência da Marca (painel Inteligência brandcode).
// Três camadas: EVIDÊNCIAS capturadas (com contagem real) → FACETAS do
// aprendizado (acesas quando a marca já aprendeu) → onde o brandcode APLICA.
// SVG puro, animado (fluxo nas conexões ativas), dados 100% reais.
// Copy didática — nunca revela o mecanismo interno.
import { Box, Typography } from '@mui/material'

const TEAL = '#0D9E7A', PURPLE = '#7F77DD', GRAY = '#8A9AB0'

const INPUTS = [
  { k: 'image_vote',           label: 'Avaliações de peças' },
  { k: 'image_regen',          label: 'Regenerações' },
  { k: 'campaign_verdict',     label: 'Campanhas' },
  { k: 'content_used',         label: 'Conteúdos adotados' },
  { k: 'writing_edit',         label: 'Copy reescrita' },
  { k: 'assistant_correction', label: 'Ensinamentos' },
  { k: 'brandbook_edit',       label: 'Brand book' },
  { k: 'diagnostic',           label: 'Diagnósticos' },
  { k: 'competitive',          label: 'Mercado & concorrência' },
  { k: 'listening_sentiment',  label: 'Sentimento do público' },
]

const FACETS = [
  { k: 'posicionamento', label: 'Posicionamento' },
  { k: 'voz',            label: 'Voz' },
  { k: 'territorio',     label: 'Território' },
  { k: 'visual',         label: 'Preferências visuais' },
  { k: 'conteudo',       label: 'Conteúdo' },
  { k: 'fatos',          label: 'Fatos' },
]

const OUTPUTS = [
  { k: 'imagem',    label: 'Studio · Imagem' },
  { k: 'video',     label: 'Studio · Vídeos' },
  { k: 'writing',   label: 'Writing Room' },
  { k: 'campanhas', label: 'Campanhas' },
  { k: 'assistant', label: 'Brand Assistant' },
  { k: 'content',   label: 'Content Hub' },
]

// Que evidência fortalece que faceta / que faceta guia que superfície
const IN_TO_FACET = {
  image_vote: ['visual'], image_regen: ['visual'], campaign_verdict: ['visual', 'conteudo'],
  content_used: ['conteudo', 'voz'], writing_edit: ['voz', 'conteudo'], assistant_correction: ['voz', 'fatos'],
  brandbook_edit: ['voz', 'posicionamento'], diagnostic: ['posicionamento', 'territorio'],
  competitive: ['territorio', 'fatos'], listening_sentiment: ['fatos'],
}
const FACET_TO_OUT = {
  posicionamento: ['writing', 'assistant', 'content'],
  voz: ['writing', 'assistant', 'content'],
  territorio: ['writing', 'content'],
  visual: ['imagem', 'video', 'campanhas'],
  conteudo: ['writing', 'content', 'campanhas'],
  fatos: ['assistant'],
}

const curve = (x1, y1, x2, y2) => {
  const mx = (x1 + x2) / 2
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
}

export function NeuralGraph({ signalStats = {}, model, versao }) {
  const W = 940, H = 470
  const inX = 190, faX = 470, outX = 760
  const inY  = i => 36 + i * 45
  const faY  = i => 66 + i * 74
  const outY = i => 66 + i * 74

  const learned = {
    posicionamento: !!model?.posicionamento?.valor,
    voz:            !!model?.voz?.valor,
    territorio:     !!model?.territorio?.valor,
    visual:         ((model?.preferencias_visuais?.aprovado?.length || 0) + (model?.preferencias_visuais?.reprovado?.length || 0)) > 0,
    conteudo:       ((model?.conteudo?.temas?.length || 0) + (model?.conteudo?.angulos?.length || 0)) > 0,
    fatos:          (model?.fatos?.length || 0) > 0,
  }
  const idxF = Object.fromEntries(FACETS.map((f, i) => [f.k, i]))
  const idxO = Object.fromEntries(OUTPUTS.map((o, i) => [o.k, i]))
  const maxCount = Math.max(1, ...INPUTS.map(s => signalStats[s.k] || 0))

  return (
    <Box sx={{
      color: 'text.primary',
      '& .flow': { strokeDasharray: '7 5', animation: 'nnflow 1.4s linear infinite' },
      '@keyframes nnflow': { to: { strokeDashoffset: -24 } },
      '& .pulse': { animation: 'nnpulse 2.4s ease-in-out infinite' },
      '@keyframes nnpulse': { '0%, 100%': { opacity: 0.55 }, '50%': { opacity: 1 } },
    }}>
      <Box component="svg" viewBox={`0 0 ${W} ${H}`} sx={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* Rótulos das camadas */}
        <text x={inX} y={16} textAnchor="middle" fontSize="10" fontWeight="800" letterSpacing="1.5" fill={GRAY}>O QUE A MARCA VIVE</text>
        <text x={faX} y={16} textAnchor="middle" fontSize="10" fontWeight="800" letterSpacing="1.5" fill={PURPLE}>O QUE ELA APRENDE{versao ? ` (v${versao})` : ''}</text>
        <text x={outX + 60} y={16} textAnchor="middle" fontSize="10" fontWeight="800" letterSpacing="1.5" fill={TEAL}>ONDE ELA APLICA</text>

        {/* Conexões evidência → faceta (espessura/fluxo ∝ volume real) */}
        {INPUTS.map((s, i) => (IN_TO_FACET[s.k] || []).map(fk => {
          const n = signalStats[s.k] || 0
          const on = n > 0
          return (
            <path key={`${s.k}-${fk}`} d={curve(inX + 10, inY(i), faX - 12, faY(idxF[fk]))}
              fill="none" stroke={on ? PURPLE : GRAY}
              strokeWidth={on ? 1 + Math.min(3.5, (n / maxCount) * 3.5) : 0.75}
              opacity={on ? 0.55 : 0.12} className={on ? 'flow' : undefined} />
          )
        }))}

        {/* Conexões faceta → superfície (ativas quando a faceta foi aprendida) */}
        {FACETS.map(f => (FACET_TO_OUT[f.k] || []).map(ok => {
          const on = learned[f.k]
          return (
            <path key={`${f.k}-${ok}`} d={curve(faX + 12, faY(idxF[f.k]), outX - 10, outY(idxO[ok]))}
              fill="none" stroke={on ? TEAL : GRAY} strokeWidth={on ? 1.6 : 0.75}
              opacity={on ? 0.5 : 0.12} className={on ? 'flow' : undefined} />
          )
        }))}

        {/* Camada 1 — evidências */}
        {INPUTS.map((s, i) => {
          const n = signalStats[s.k] || 0
          const on = n > 0
          const r = on ? 5 + Math.min(7, (n / maxCount) * 7) : 4
          return (
            <g key={s.k} opacity={on ? 1 : 0.4}>
              <circle cx={inX} cy={inY(i)} r={r} fill={on ? PURPLE : 'none'} stroke={on ? PURPLE : GRAY} strokeWidth="1.5"
                className={on ? 'pulse' : undefined} />
              <text x={inX - r - 8} y={inY(i) + 3.5} textAnchor="end" fontSize="11.5" fill="currentColor" fontWeight={on ? 700 : 400}>
                {s.label}
              </text>
              {on && <text x={inX + r + 7} y={inY(i) + 3.5} fontSize="10" fontWeight="800" fill={PURPLE}>{n}</text>}
            </g>
          )
        })}

        {/* Camada 2 — facetas do aprendizado */}
        {FACETS.map((f, i) => {
          const on = learned[f.k]
          return (
            <g key={f.k} opacity={on ? 1 : 0.4}>
              {on && <circle cx={faX} cy={faY(i)} r={13} fill={PURPLE} opacity="0.18" className="pulse" />}
              <circle cx={faX} cy={faY(i)} r={8} fill={on ? PURPLE : 'none'} stroke={on ? PURPLE : GRAY} strokeWidth="1.5" />
              <text x={faX} y={faY(i) + 22} textAnchor="middle" fontSize="11" fill="currentColor" fontWeight={on ? 800 : 400}>
                {f.label}
              </text>
            </g>
          )
        })}

        {/* Camada 3 — superfícies */}
        {OUTPUTS.map((o, i) => (
          <g key={o.k}>
            <circle cx={outX} cy={outY(i)} r={6.5} fill={TEAL} />
            <text x={outX + 13} y={outY(i) + 3.5} fontSize="11.5" fill="currentColor" fontWeight={700}>{o.label}</text>
          </g>
        ))}
      </Box>
      <Typography fontSize={11} color="text.secondary" mt={0.5}>
        Cada uso vira evidência · cada evidência fortalece uma faceta do aprendizado · cada faceta guia o que o brandcode cria.
        Nós apagados ainda não têm evidência — são os próximos a acender.
      </Typography>
    </Box>
  )
}
