import { useState } from 'react'
import { navigate } from '../../lib/helpers';
import {
  Box, Typography, Button, Stepper, Step, StepLabel,
  TextField, Chip, CircularProgress, Paper, Alert,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CheckIcon from '@mui/icons-material/Check'
import { useWorkspace } from '../../lib/WorkspaceContext'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/shell/PageHeader'

const STEPS = ['Identidade básica', 'Missão & valores', 'Design inicial']

const ARQUETIPOS = [
  'Herói', 'Criador', 'Explorador', 'Sábio', 'Inocente',
  'Fora-da-lei', 'Mago', 'Governante', 'Prestativo', 'Amante', 'Bobo', 'Cara comum',
]

const VALORES_SUGESTOES = [
  'Inovação', 'Transparência', 'Qualidade', 'Sustentabilidade', 'Simplicidade',
  'Confiança', 'Impacto', 'Diversidade', 'Excelência', 'Agilidade',
]

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function Step1({ data, onChange }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant="body2" color="text.secondary" mb={1}>
        As informações básicas da marca que serão usadas em toda a plataforma.
      </Typography>
      <TextField
        label="Nome da marca *"
        value={data.nome}
        onChange={e => onChange({ ...data, nome: e.target.value, slug: slugify(e.target.value) })}
        fullWidth
        autoFocus
      />
      <TextField
        label="Slug (identificador único)"
        value={data.slug}
        onChange={e => onChange({ ...data, slug: slugify(e.target.value) })}
        fullWidth
        helperText="Gerado automaticamente a partir do nome"
      />
      <TextField
        label="Setor"
        value={data.setor}
        onChange={e => onChange({ ...data, setor: e.target.value })}
        fullWidth
        placeholder="Ex: Tecnologia, Varejo, Saúde…"
      />
      <TextField
        label="Público-alvo"
        value={data.publicoAlvo}
        onChange={e => onChange({ ...data, publicoAlvo: e.target.value })}
        fullWidth
        multiline
        minRows={2}
        placeholder="Descreva o público-alvo da marca"
      />
    </Box>
  )
}

function Step2({ data, onChange }) {
  function toggleValor(v) {
    const atual = data.valores || []
    const novo = atual.includes(v) ? atual.filter(x => x !== v) : [...atual, v]
    onChange({ ...data, valores: novo })
  }

  function toggleArquetipo(a) {
    onChange({ ...data, arquetipo: data.arquetipo === a ? '' : a })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <TextField
        label="Missão"
        value={data.missao}
        onChange={e => onChange({ ...data, missao: e.target.value })}
        fullWidth
        multiline
        minRows={2}
        placeholder="Por que a marca existe? Qual é seu propósito?"
      />
      <TextField
        label="Visão"
        value={data.visao}
        onChange={e => onChange({ ...data, visao: e.target.value })}
        fullWidth
        multiline
        minRows={2}
        placeholder="Onde a marca quer chegar em 5-10 anos?"
      />

      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={700}
          textTransform="uppercase" letterSpacing="0.08em" display="block" mb={1}>
          Valores (selecione ou adicione)
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
          {VALORES_SUGESTOES.map(v => (
            <Chip
              key={v}
              label={v}
              size="small"
              onClick={() => toggleValor(v)}
              sx={{
                cursor: 'pointer',
                bgcolor: (data.valores || []).includes(v) ? 'primary.main' : 'rgba(13,158,122,0.08)',
                color:   (data.valores || []).includes(v) ? '#fff'         : 'primary.main',
                fontWeight: 700,
                '&:hover': { bgcolor: (data.valores || []).includes(v) ? 'primary.dark' : 'rgba(13,158,122,0.15)' },
              }}
            />
          ))}
        </Box>
        <TextField
          size="small"
          placeholder="Adicionar valor personalizado…"
          onKeyDown={e => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              toggleValor(e.target.value.trim())
              e.target.value = ''
            }
          }}
          sx={{ width: 260 }}
        />
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={700}
          textTransform="uppercase" letterSpacing="0.08em" display="block" mb={1}>
          Arquétipo de marca
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {ARQUETIPOS.map(a => (
            <Chip
              key={a}
              label={a}
              size="small"
              onClick={() => toggleArquetipo(a)}
              sx={{
                cursor: 'pointer',
                bgcolor: data.arquetipo === a ? 'info.main' : 'rgba(127,119,221,0.08)',
                color:   data.arquetipo === a ? '#fff'      : '#7F77DD',
                fontWeight: 700,
                '&:hover': { bgcolor: data.arquetipo === a ? '#6B63CC' : 'rgba(127,119,221,0.15)' },
              }}
            />
          ))}
        </Box>
      </Box>

      <TextField
        label="Tom de voz"
        value={data.tomVoz}
        onChange={e => onChange({ ...data, tomVoz: e.target.value })}
        fullWidth
        placeholder="Ex: Direto, sofisticado, próximo, técnico sem ser frio…"
      />
    </Box>
  )
}

function Step3({ data, onChange }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant="body2" color="text.secondary" mb={1}>
        Defina as cores e tipografia principais. Você poderá refinar isso no brand book depois.
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={700}
            textTransform="uppercase" letterSpacing="0.08em" display="block" mb={1}>
            Cor primária
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              component="input"
              type="color"
              value={data.corPrimaria || '#0D9E7A'}
              onChange={e => onChange({ ...data, corPrimaria: e.target.value })}
              sx={{ width: 44, height: 36, border: '1px solid', borderColor: 'divider', borderRadius: 1, cursor: 'pointer', p: 0.5, bgcolor: 'background.paper' }}
            />
            <TextField
              size="small"
              value={data.corPrimaria || '#0D9E7A'}
              onChange={e => onChange({ ...data, corPrimaria: e.target.value })}
              sx={{ flex: 1 }}
            />
          </Box>
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={700}
            textTransform="uppercase" letterSpacing="0.08em" display="block" mb={1}>
            Cor secundária
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              component="input"
              type="color"
              value={data.corSecundaria || '#E8185A'}
              onChange={e => onChange({ ...data, corSecundaria: e.target.value })}
              sx={{ width: 44, height: 36, border: '1px solid', borderColor: 'divider', borderRadius: 1, cursor: 'pointer', p: 0.5, bgcolor: 'background.paper' }}
            />
            <TextField
              size="small"
              value={data.corSecundaria || '#E8185A'}
              onChange={e => onChange({ ...data, corSecundaria: e.target.value })}
              sx={{ flex: 1 }}
            />
          </Box>
        </Box>
      </Box>

      <TextField
        label="Tipografia principal"
        value={data.fontePrimaria}
        onChange={e => onChange({ ...data, fontePrimaria: e.target.value })}
        fullWidth
        placeholder="Ex: Inter, Cairo, Montserrat, Playfair Display…"
        helperText="Nome da fonte Google Fonts"
      />

      <TextField
        label="Tipografia secundária (opcional)"
        value={data.fonteSecundaria}
        onChange={e => onChange({ ...data, fonteSecundaria: e.target.value })}
        fullWidth
        placeholder="Ex: Georgia, Lora, Source Sans Pro…"
      />

      <TextField
        label="Posicionamento (frase de diferenciação)"
        value={data.posicionamento}
        onChange={e => onChange({ ...data, posicionamento: e.target.value })}
        fullWidth
        multiline
        minRows={2}
        placeholder="O que torna essa marca única no mercado?"
      />
    </Box>
  )
}

export function BrandOnboarding() {
  const { workspace } = useWorkspace()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const [data, setData] = useState({
    nome: '', slug: '', setor: '', publicoAlvo: '',
    missao: '', visao: '', valores: [], arquetipo: '', tomVoz: '',
    corPrimaria: '#0D9E7A', corSecundaria: '#E8185A',
    fontePrimaria: '', fonteSecundaria: '', posicionamento: '',
  })

  function canNext() {
    if (step === 0) return data.nome.trim().length > 0 && data.slug.trim().length > 0
    if (step === 1) return true
    return true
  }

  async function finish() {
    if (!workspace?.id) return
    setSaving(true)
    setError('')

    try {
      const { data: brand, error: brandErr } = await supabase
        .from('brands')
        .insert({
          workspace_id: workspace.id,
          nome: data.nome.trim(),
          slug: data.slug.trim(),
          status: 'draft',
        })
        .select()
        .single()

      if (brandErr) throw brandErr

      const identity = {
        missao: data.missao,
        visao: data.visao,
        valores: data.valores,
        arquetipo: data.arquetipo,
        tom_voz: data.tomVoz,
        publico_alvo: data.publicoAlvo,
        setor: data.setor,
        positioning_clarity: 5,
        tone_clarity: data.tomVoz ? 7 : 5,
      }

      const positioning = {
        posicionamento: data.posicionamento,
        differentiation_score: data.posicionamento ? 6 : 3,
      }

      const design_system = {
        colors: {
          primary:   { main: data.corPrimaria   },
          secondary: { main: data.corSecundaria },
        },
        typography: {
          font_primary:   data.fontePrimaria   || 'Inter',
          font_secondary: data.fonteSecundaria || '',
        },
        spacing: { base: '8px' },
        border_radius: { sm: '8px', md: '12px', lg: '16px' },
      }

      await supabase.from('brand_books').insert({
        brand_id:     brand.id,
        identity,
        positioning,
        design_system,
        references:   {},
        version:      1,
      })

      navigate(`#/app/brands/${brand.id}`)
    } catch (err) {
      setError(err.message || 'Erro ao criar a marca. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      <PageHeader
        title="Nova marca"
        subtitle={`Passo ${step + 1} de ${STEPS.length}`}
        action={
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => step === 0 ? (navigate('#/app/brands')) : setStep(s => s - 1)}
            sx={{ color: 'text.secondary', fontWeight: 700 }}
          >
            {step === 0 ? 'Marcas' : 'Voltar'}
          </Button>
        }
      />
      <Box sx={{ p: 4, maxWidth: 680, mx: 'auto' }}>

      {/* Stepper */}
      <Stepper activeStep={step} sx={{ mb: 4 }}>
        {STEPS.map((label, i) => (
          <Step key={label} completed={i < step}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Conteúdo */}
      <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
        {step === 0 && <Step1 data={data} onChange={setData} />}
        {step === 1 && <Step2 data={data} onChange={setData} />}
        {step === 2 && <Step3 data={data} onChange={setData} />}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {/* Navegação */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          onClick={() => step === 0 ? (navigate('#/app/brands')) : setStep(s => s - 1)}
          sx={{ color: 'text.secondary', borderColor: 'divider' }}
        >
          {step === 0 ? 'Cancelar' : 'Anterior'}
        </Button>

        {step < STEPS.length - 1 ? (
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext()}
          >
            Próximo
          </Button>
        ) : (
          <Button
            variant="contained"
            endIcon={saving ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}
            onClick={finish}
            disabled={saving || !canNext()}
          >
            {saving ? 'Criando…' : 'Criar marca'}
          </Button>
        )}
      </Box>
      </Box>
    </Box>
  )
}
