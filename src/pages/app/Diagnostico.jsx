import { useState, useEffect, useCallback } from 'react'
import {
  Box, Typography, Button, Paper, Chip, CircularProgress,
  TextField, Alert, IconButton, Tooltip, Divider,
} from '@mui/material'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import AddIcon                from '@mui/icons-material/Add'
import ShareIcon              from '@mui/icons-material/Share'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import BusinessOutlinedIcon   from '@mui/icons-material/BusinessOutlined'
import ArrowForwardIcon       from '@mui/icons-material/ArrowForward'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'

import { useWorkspace }     from '../../lib/WorkspaceContext'
import { supabase }         from '../../lib/supabase'
import { PLANOS }           from '../../lib/constants'
import { fmtDate, sc, tryParseJSON } from '../../lib/helpers'
import { runStream }        from '../../lib/api'
import { RelatorioCompleto } from '../RelatorioCompleto'
import { StreamingView }    from '../StreamingView'

// ── Score chip ────────────────────────────────────────────────────────────────

function ScoreChip({ label, value }) {
  const color = sc(value)
  return (
    <Chip
      label={`${label} ${value}/10`}
      size="small"
      sx={{
        fontWeight: 700,
        fontSize: 11,
        color,
        bgcolor: `${color}18`,
        border: `1px solid ${color}44`,
      }}
    />
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onGerar }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 10,
        gap: 2,
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          bgcolor: 'primary.main',
          opacity: 0.12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 1,
        }}
      >
        <AssessmentOutlinedIcon sx={{ fontSize: 36, color: 'primary.main', opacity: 1 }} />
      </Box>
      <Typography variant="h6" fontWeight={900} color="text.primary">
        Nenhum diagnóstico ainda
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
        Gere o primeiro diagnóstico de marca do seu workspace e receba uma análise
        completa baseada no framework Smart Branding da LOUDR.
      </Typography>
      <Button
        variant="contained"
        color="primary"
        endIcon={<ArrowForwardIcon />}
        onClick={onGerar}
        sx={{ mt: 1 }}
      >
        Gerar primeiro diagnóstico
      </Button>
    </Box>
  )
}

// ── Diagnóstico card (histórico) ──────────────────────────────────────────────

function DiagCard({ diag, onClick }) {
  return (
    <Paper
      onClick={onClick}
      sx={{
        p: 2,
        cursor: 'pointer',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        transition: 'border-color 0.18s, background 0.18s',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: 'rgba(13,158,122,0.04)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <BusinessOutlinedIcon sx={{ fontSize: 15, color: 'text.secondary', flexShrink: 0 }} />
          <Typography
            fontWeight={800}
            fontSize={14}
            noWrap
            sx={{ color: 'text.primary' }}
          >
            {diag.empresa}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          <CalendarTodayOutlinedIcon sx={{ fontSize: 11, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {fmtDate(diag.created_at)}
          </Typography>
        </Box>
      </Box>

      {diag.setor && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          {[diag.setor, diag.porte].filter(Boolean).join(' · ')}
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
        {diag.score_singularidade != null && (
          <ScoreChip label="Singularidade" value={diag.score_singularidade} />
        )}
        {diag.score_consistencia != null && (
          <ScoreChip label="Consistência" value={diag.score_consistencia} />
        )}
        {diag.score_posicionamento != null && (
          <ScoreChip label="Posicionamento" value={diag.score_posicionamento} />
        )}
      </Box>
    </Paper>
  )
}

// ── Formulário ─────────────────────────────────────────────────────────────────

function FormEstado({ onCancel, onStart }) {
  const [empresa, setEmpresa]   = useState('')
  const [contexto, setContexto] = useState('')
  const [err, setErr]           = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!empresa.trim()) { setErr('Informe a empresa ou domínio.'); return }
    onStart(empresa.trim(), contexto.trim())
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        px: 2,
      }}
    >
      <Paper
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 500,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
        }}
      >
        <Typography variant="h6" fontWeight={900} sx={{ mb: 0.5 }}>
          Novo diagnóstico
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Informe a empresa que deseja analisar. O agent pesquisará até 5 fontes e aplicará o
          framework Smart Branding da LOUDR.
        </Typography>

        {err && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {err}
          </Alert>
        )}

        <TextField
          label="Empresa ou domínio"
          placeholder="Ex: nubank.com ou Magazine Luiza"
          fullWidth
          required
          value={empresa}
          onChange={e => { setEmpresa(e.target.value); setErr('') }}
          sx={{ mb: 2 }}
        />

        <TextField
          label="Contexto adicional (opcional)"
          placeholder="Ex: startup B2B de logística, principal concorrente é a Loggi"
          fullWidth
          multiline
          rows={3}
          value={contexto}
          onChange={e => setContexto(e.target.value)}
          sx={{ mb: 3 }}
        />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            endIcon={<ArrowForwardIcon />}
            size="large"
            fullWidth
          >
            Gerar diagnóstico
          </Button>
          <Button
            variant="text"
            color="inherit"
            onClick={onCancel}
            sx={{ color: 'text.secondary' }}
          >
            Cancelar
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

export function Diagnostico() {
  const { workspace, user } = useWorkspace()

  const [estado, setEstado]           = useState('lista')   // 'lista' | 'form' | 'streaming' | 'relatorio'
  const [diagnosticos, setDiagnosticos] = useState([])
  const [loadingList, setLoadingList]   = useState(true)
  const [selectedDiag, setSelectedDiag] = useState(null)
  const [error, setError]               = useState('')
  const [copied, setCopied]             = useState(false)
  const [pdfLoading, setPdfLoading]     = useState(false)

  // streaming states
  const [searchSteps, setSearchSteps]           = useState([])
  const [partialData, setPartialData]           = useState(null)
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0)
  const [rateLimitAttempt, setRateLimitAttempt]   = useState(0)

  // ── fetch ─────────────────────────────────────────────────────────────────

  const fetchDiagnosticos = useCallback(async () => {
    if (!workspace?.id) return
    setLoadingList(true)
    const { data } = await supabase
      .from('diagnosticos')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })
    setDiagnosticos(data || [])
    setLoadingList(false)
  }, [workspace?.id])

  useEffect(() => { fetchDiagnosticos() }, [fetchDiagnosticos])

  // ── limite de plano ────────────────────────────────────────────────────────

  const plano       = workspace ? (PLANOS[workspace.plano] || PLANOS.trial) : PLANOS.trial
  const limiteAtingido = workspace
    ? workspace.diagnosticos_mes >= plano.diagnosticos_mes
    : false

  // ── runStream ──────────────────────────────────────────────────────────────

  function iniciarStream(empresa, contexto) {
    setSearchSteps([])
    setPartialData(null)
    setRateLimitCountdown(0)
    setRateLimitAttempt(0)
    setEstado('streaming')

    runStream({
      empresa,
      contexto,
      onSearchStep: (_count, query) => {
        setSearchSteps(prev => [...prev, query])
      },
      onText: (txt) => {
        const p = tryParseJSON(txt)
        if (p) setPartialData(p)
      },
      onRateLimit: (s, t) => {
        setRateLimitCountdown(s)
        setRateLimitAttempt(t)
      },
      onDone: async (parsed) => {
        const { data: diag } = await supabase
          .from('diagnosticos')
          .insert({
            workspace_id:          workspace.id,
            user_id:               user.id,
            user_email:            user.email,
            user_name:             user.user_metadata?.full_name || user.email.split('@')[0],
            empresa:               parsed.empresa,
            dominio:               parsed.dominio,
            setor:                 parsed.setor,
            porte:                 parsed.porte,
            score_singularidade:   parsed.score_singularidade,
            score_consistencia:    parsed.score_consistencia,
            score_posicionamento:  parsed.score_posicionamento,
            frase_diagnostico:     parsed.frase_diagnostico,
            data:                  parsed,
            publico:               true,
            tipo:                  'manual',
          })
          .select()
          .single()

        await supabase
          .from('workspaces')
          .update({ diagnosticos_mes: workspace.diagnosticos_mes + 1 })
          .eq('id', workspace.id)

        await fetchDiagnosticos()
        setSelectedDiag({ ...diag, data: parsed })
        setEstado('relatorio')
      },
      onError: (msg) => {
        setError(msg)
        setEstado('lista')
      },
    })
  }

  // ── ações do último diagnóstico ────────────────────────────────────────────

  async function handleShare(diag) {
    const url = window.location.origin + '/#/relatorio/' + diag.id
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handlePDF(diag) {
    setPdfLoading(true)
    try {
      const { gerarPDF } = await import('../../lib/pdf')
      await gerarPDF(diag.data)
    } finally {
      setPdfLoading(false)
    }
  }

  // ── renderização por estado ────────────────────────────────────────────────

  if (estado === 'relatorio' && selectedDiag) {
    return (
      <RelatorioCompleto
        data={{ ...selectedDiag, ...(selectedDiag.data || {}) }}
        meta={selectedDiag}
        onBack={() => setEstado('lista')}
        backLabel="← Voltar aos diagnósticos"
      />
    )
  }

  if (estado === 'streaming') {
    return (
      <Box sx={{ maxWidth: 760, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
        <StreamingView
          searchSteps={searchSteps}
          partialData={partialData}
          rateLimitCountdown={rateLimitCountdown}
          rateLimitAttempt={rateLimitAttempt}
        />
      </Box>
    )
  }

  if (estado === 'form') {
    return (
      <FormEstado
        onCancel={() => setEstado('lista')}
        onStart={iniciarStream}
      />
    )
  }

  // ── estado 'lista' ─────────────────────────────────────────────────────────

  const ultimo   = diagnosticos[0] || null
  const restante = diagnosticos.slice(1)

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>

      {/* ── Header ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          mb: 4,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>
            Diagnósticos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {plano.diagnosticos_mes === Infinity
              ? `${workspace?.diagnosticos_mes ?? 0} diagnósticos gerados este mês · ilimitado`
              : `${workspace?.diagnosticos_mes ?? 0} de ${plano.diagnosticos_mes} usados este mês · plano ${plano.nome}`}
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          endIcon={<ArrowForwardIcon />}
          onClick={() => {
            if (limiteAtingido) {
              setError('Limite do plano atingido. Faça upgrade para continuar gerando diagnósticos.')
              return
            }
            setError('')
            setEstado('form')
          }}
        >
          Gerar novo diagnóstico
        </Button>
      </Box>

      {/* ── Erro / limite ── */}
      {error && (
        <Alert
          severity="warning"
          icon={<WarningAmberOutlinedIcon fontSize="small" />}
          onClose={() => setError('')}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* ── Loading ── */}
      {loadingList && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress color="primary" size={32} />
        </Box>
      )}

      {/* ── Conteúdo ── */}
      {!loadingList && (
        <>
          {/* Empty state */}
          {!ultimo && (
            <EmptyState
              onGerar={() => {
                if (limiteAtingido) {
                  setError('Limite do plano atingido.')
                  return
                }
                setError('')
                setEstado('form')
              }}
            />
          )}

          {/* Último diagnóstico em destaque */}
          {ultimo && (
            <Paper
              sx={{
                p: 3,
                mb: 4,
                border: '1px solid',
                borderColor: 'primary.main',
                borderRadius: 3,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  bgcolor: 'primary.main',
                  borderRadius: '3px 3px 0 0',
                },
              }}
            >
              {/* Label */}
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'primary.main',
                  display: 'block',
                  mb: 1.5,
                }}
              >
                Último diagnóstico
              </Typography>

              {/* Empresa + meta */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                <Typography variant="h6" fontWeight={900} sx={{ lineHeight: 1.2 }}>
                  {ultimo.empresa}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, mt: 0.25 }}>
                  <CalendarTodayOutlinedIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    {fmtDate(ultimo.created_at)}
                  </Typography>
                </Box>
              </Box>

              {(ultimo.setor || ultimo.porte) && (
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                  {[ultimo.setor, ultimo.porte].filter(Boolean).join(' · ')}
                </Typography>
              )}

              {ultimo.frase_diagnostico && (
                <Box
                  sx={{
                    borderLeft: '3px solid',
                    borderColor: 'primary.main',
                    pl: 1.5,
                    mb: 2,
                    fontStyle: 'italic',
                    color: 'text.secondary',
                    fontSize: 13,
                    lineHeight: 1.65,
                  }}
                >
                  "{ultimo.frase_diagnostico}"
                </Box>
              )}

              {/* Scores */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2.5 }}>
                {ultimo.score_singularidade != null && (
                  <ScoreChip label="Singularidade" value={ultimo.score_singularidade} />
                )}
                {ultimo.score_consistencia != null && (
                  <ScoreChip label="Consistência" value={ultimo.score_consistencia} />
                )}
                {ultimo.score_posicionamento != null && (
                  <ScoreChip label="Posicionamento" value={ultimo.score_posicionamento} />
                )}
              </Box>

              <Divider sx={{ mb: 2 }} />

              {/* Actions */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={() => {
                    setSelectedDiag(ultimo)
                    setEstado('relatorio')
                  }}
                >
                  Ver relatório completo
                </Button>

                <Button
                  variant="outlined"
                  color="inherit"
                  size="small"
                  startIcon={
                    pdfLoading
                      ? <CircularProgress size={12} color="inherit" />
                      : <PictureAsPdfOutlinedIcon fontSize="small" />
                  }
                  disabled={pdfLoading}
                  onClick={() => handlePDF(ultimo)}
                  sx={{ borderColor: 'divider', color: 'text.secondary' }}
                >
                  Baixar PDF
                </Button>

                <Tooltip title={copied ? 'Link copiado!' : 'Copiar link público'}>
                  <IconButton
                    size="small"
                    onClick={() => handleShare(ultimo)}
                    sx={{
                      color: copied ? 'primary.main' : 'text.secondary',
                      border: '1px solid',
                      borderColor: copied ? 'primary.main' : 'divider',
                      borderRadius: 1.5,
                      transition: 'all 0.18s',
                    }}
                  >
                    <ShareIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Paper>
          )}

          {/* Histórico */}
          {restante.length > 0 && (
            <>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                  display: 'block',
                  mb: 1.5,
                }}
              >
                Histórico
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {restante.map(diag => (
                  <DiagCard
                    key={diag.id}
                    diag={diag}
                    onClick={() => {
                      setSelectedDiag(diag)
                      setEstado('relatorio')
                    }}
                  />
                ))}
              </Box>
            </>
          )}
        </>
      )}
    </Box>
  )
}
