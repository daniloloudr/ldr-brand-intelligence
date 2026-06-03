import { useState, useEffect } from 'react'
import { ThemeProvider }      from '@mui/material/styles'
import Box                    from '@mui/material/Box'
import Typography             from '@mui/material/Typography'
import Chip                   from '@mui/material/Chip'
import LinearProgress         from '@mui/material/LinearProgress'
import CircularProgress       from '@mui/material/CircularProgress'

import { supabase }          from '../lib/supabase'
import { themeLight }        from '../lib/theme'
import { RelatorioCompleto } from '../components/RelatorioCompleto'
import { GlobalStyle }       from '../components/GlobalStyle'
import { PublicHeader }      from '../components/PublicHeader'
import { PublicFooter }      from '../components/PublicFooter'

const CALENDLY = import.meta.env.VITE_CALENDLY_URL
const NAV_BG   = '#08111F'
const NAV_DIV  = '#1E3348'

function scoreHex(s) {
  if (s >= 7) return '#0D9E7A'
  if (s >= 5) return '#EF9F27'
  return '#E8185A'
}
function scoreLabel(s) {
  if (s >= 7) return 'Sólido'
  if (s >= 5) return 'Em desenvolvimento'
  return 'Crítico'
}


export function RelatorioPublico() {
  const id = window.location.hash.replace(/^#\/relatorio\//, '')
  const [diag, setDiag]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!id) { setError('Link inválido.'); setLoading(false); return }
    supabase.from('diagnosticos').select('*').eq('id', id).single()
      .then(({ data, error: e }) => {
        setLoading(false)
        if (e || !data) { setError('Relatório não encontrado ou acesso negado.'); return }
        setDiag(data)
      })
  }, [id])

  if (loading) return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F5F7F6', display: 'flex', flexDirection: 'column' }}>
      <GlobalStyle />
      <PublicHeader sticky />
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: '#0D9E7A' }} size={32} />
      </Box>
    </Box>
  )

  if (error) return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F5F7F6', display: 'flex', flexDirection: 'column' }}>
      <GlobalStyle />
      <PublicHeader sticky />
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Box sx={{ textAlign: 'center', maxWidth: 360 }}>
          <Box sx={{ width: 52, height: 52, borderRadius: '50%', background: '#FBEAF0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 20, color: '#E8185A' }}>
            ✕
          </Box>
          <Box sx={{ fontSize: 18, fontWeight: 900, color: '#0D1B2A', mb: 1.25, fontFamily: "'Cairo', sans-serif" }}>
            Relatório não encontrado
          </Box>
          <Box sx={{ fontSize: 13, color: '#8A9AB0', lineHeight: 1.7, fontFamily: "'Cairo', sans-serif" }}>{error}</Box>
        </Box>
      </Box>
    </Box>
  )

  const jsonb  = diag.dados || diag.data || {}
  const data   = { ...diag, ...jsonb }
  const scores = [
    { label: 'Singularidade',  key: 'score_singularidade'  },
    { label: 'Consistência',   key: 'score_consistencia'   },
    { label: 'Posicionamento', key: 'score_posicionamento' },
  ]

  return (
    <ThemeProvider theme={themeLight}>
      <GlobalStyle />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <PublicHeader sticky>
          {CALENDLY && (
            <a
              href={CALENDLY} target="_blank" rel="noopener noreferrer"
              style={{
                background: '#0D9E7A', border: 'none',
                padding: '10px 20px', fontSize: 10, fontWeight: 800,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: '#fff', cursor: 'pointer', fontFamily: "'Cairo', sans-serif",
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
              }}
            >
              Agendar apresentação →
            </a>
          )}
          <button
            style={{
              background: 'none', border: `1px solid ${NAV_DIV}`,
              padding: '10px 20px', fontSize: 10, fontWeight: 800,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: '#7A8899', cursor: 'pointer', fontFamily: "'Cairo', sans-serif",
            }}
            onClick={() => { window.location.hash = '#/register' }}
          >
            Criar conta →
          </button>
        </PublicHeader>

        {/* ── Hero band ─────────────────────────────────────── */}
        <Box sx={{ bgcolor: NAV_BG, px: { xs: '24px', md: '52px' }, py: { xs: '48px', md: '60px' } }}>
          <Box>
            <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#0D9E7A', mb: 1.5, fontFamily: "'Cairo', sans-serif" }}>
              — Diagnóstico de Marca · LOUDR
            </Typography>
            <Typography sx={{ fontSize: 'clamp(32px, 4vw, 56px)', fontWeight: 900, letterSpacing: '-0.04em', color: '#fff', lineHeight: 1, mb: 1, fontFamily: "'Cairo', sans-serif" }}>
              {data.empresa}
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#7A8899', mb: 4, fontFamily: "'Cairo', sans-serif" }}>
              {[data.setor, data.porte, data.dominio].filter(Boolean).join(' · ')}
            </Typography>

            {/* Score cards */}
            <Box sx={{ display: 'flex', gap: { xs: 3, md: 5 }, flexWrap: 'wrap', mb: data.frase_diagnostico ? 4 : 0 }}>
              {scores.map(s => {
                const val = data[s.key]
                const hex = scoreHex(val ?? 0)
                const pct = Math.round(((val ?? 0) / 10) * 100)
                return (
                  <Box key={s.key} sx={{ minWidth: 140 }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#3D4E60', textTransform: 'uppercase', letterSpacing: '0.14em', mb: 0.75, fontFamily: "'Cairo', sans-serif" }}>
                      {s.label}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
                      <Typography sx={{ fontSize: 'clamp(36px, 3vw, 48px)', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', color: hex, fontFamily: "'Cairo', sans-serif" }}>
                        {val ?? '—'}
                      </Typography>
                      <Typography sx={{ fontSize: 14, color: '#3D4E60', fontFamily: "'Cairo', sans-serif" }}>/10</Typography>
                    </Box>
                    <Chip
                      label={scoreLabel(val ?? 0)}
                      size="small"
                      sx={{ bgcolor: hex + '18', color: hex, fontWeight: 700, fontSize: '0.6rem', height: 18, mb: 1, borderRadius: '4px' }}
                    />
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{ height: 2, bgcolor: '#1E3348', '& .MuiLinearProgress-bar': { bgcolor: hex } }}
                    />
                  </Box>
                )
              })}
            </Box>

            {data.frase_diagnostico && (
              <Box sx={{ pl: 2, borderLeft: '3px solid #0D9E7A', maxWidth: 600 }}>
                <Typography sx={{ fontSize: 15, fontStyle: 'italic', color: '#B0BACB', lineHeight: 1.7, fontFamily: "'Cairo', sans-serif" }}>
                  "{data.frase_diagnostico}"
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* ── Report body ───────────────────────────────────── */}
        <Box sx={{ px: { xs: '24px', md: '52px' }, py: { xs: '48px', md: '64px' } }}>
          <RelatorioCompleto data={data} meta={diag} onBack={null} hideHero />
        </Box>

        <PublicFooter />
      </Box>
    </ThemeProvider>
  )
}
