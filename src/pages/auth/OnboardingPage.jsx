import { useState, useEffect } from 'react'
import {
  Box, Button, TextField, Typography, MenuItem, Stepper, Step, StepLabel,
  Card, CardContent, Chip, CircularProgress, Alert,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { supabase } from '../../lib/supabase'
import { PLANOS } from '../../lib/constants'
import { redirectToCheckout } from '../../lib/stripe'
import logoNegativa from '../../assets/negativa.svg'

const SETORES = ["Tecnologia","Saúde","Educação","Finanças","Varejo","Fashion","Indústria","Serviços","Alimentação","Imóveis","Logística","Mídia","Energia","Agronegócio","Outro"]
const PORTES  = ["Startup","PME","Médio porte","Grande empresa"]
const STEPS   = ['Sua empresa', 'Escolha o plano', 'Pronto!']

const planoCards = [
  { key: 'starter',    destaque: false },
  { key: 'pro',        destaque: true  },
  { key: 'enterprise', destaque: false },
]

export function OnboardingPage({ user, onHasWorkspace }) {
  const [step, setStep]     = useState(0)
  const [empresa, setEmpresa] = useState({ nome: '', dominio: '', setor: '', porte: '' })
  const [planoSel, setPlano]  = useState('trial')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [wsId, setWsId]       = useState(null)

  useEffect(() => {
    supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()
      .then(({ data }) => { if (data) onHasWorkspace?.() })
  }, [user.id])

  const setE = k => e => setEmpresa(f => ({ ...f, [k]: e.target.value }))

  async function handleEmpresa(e) {
    e.preventDefault()
    if (!empresa.nome) { setError('Nome da empresa é obrigatório.'); return }
    setError(''); setStep(1)
  }

  async function handlePlano(plano) {
    setPlano(plano); setLoading(true); setError('')
    try {
      const { data: ws, error: wsErr } = await supabase.from('workspaces').insert({
        nome: empresa.nome,
        dominio: empresa.dominio || null,
        setor: empresa.setor || null,
        porte: empresa.porte || null,
        plano: 'trial',
      }).select().single()

      if (wsErr) throw wsErr

      const { error: memberErr } = await supabase.from('workspace_members').insert({
        workspace_id: ws.id,
        user_id: user.id,
        role: 'admin',
      })
      if (memberErr) throw memberErr

      setWsId(ws.id)

      if (plano !== 'trial') {
        // Redireciona para Stripe — o webhook atualiza workspace.plano após pagamento
        await redirectToCheckout(ws.id, plano)
        return
      }

      setStep(2)
    } catch (err) {
      setError(err.message || 'Erro ao criar workspace.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{
      minHeight: '100vh', bgcolor: 'background.default',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', p: 3,
    }}>
      <img src={logoNegativa} alt="LOUDR" style={{ height: 46, marginBottom: 40 }} />

      <Box sx={{ width: '100%', maxWidth: step === 1 ? 860 : 520 }}>
        <Stepper activeStep={step} sx={{ mb: 5 }}>
          {STEPS.map(label => (
            <Step key={label}>
              <StepLabel sx={{ '& .MuiStepLabel-label': { fontFamily: "'Cairo', sans-serif", fontWeight: 700 } }}>
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

        {/* Passo 1 — Empresa */}
        {step === 0 && (
          <Box component="form" onSubmit={handleEmpresa} sx={{
            bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
            borderRadius: 3, p: 4,
          }}>
            <Typography variant="h6" fontWeight={900} mb={3} letterSpacing="-0.01em">
              Conta sobre sua empresa
            </Typography>
            <TextField fullWidth label="Nome da empresa *" value={empresa.nome} onChange={setE('nome')} required sx={{ mb: 2 }} autoFocus />
            <TextField fullWidth label="Domínio" value={empresa.dominio} onChange={setE('dominio')} placeholder="www.suaempresa.com.br" sx={{ mb: 2 }} />
            <TextField fullWidth select label="Setor" value={empresa.setor} onChange={setE('setor')} sx={{ mb: 2 }}>
              <MenuItem value="">Selecione...</MenuItem>
              {SETORES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <TextField fullWidth select label="Porte" value={empresa.porte} onChange={setE('porte')} sx={{ mb: 3 }}>
              <MenuItem value="">Selecione...</MenuItem>
              {PORTES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </TextField>
            <Button fullWidth type="submit" variant="contained" color="secondary" size="large"
              sx={{ fontWeight: 900, py: 1.5, letterSpacing: '0.08em' }}>
              Continuar →
            </Button>
          </Box>
        )}

        {/* Passo 2 — Plano */}
        {step === 1 && (
          <Box>
            <Typography variant="h6" fontWeight={900} textAlign="center" mb={1} letterSpacing="-0.01em">
              Escolha como começar
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" mb={4}>
              Comece com o trial grátis ou assine agora e tenha acesso completo.
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
              {planoCards.map(({ key, destaque }) => {
                const p = PLANOS[key]
                return (
                  <Card key={key} sx={{
                    border: '2px solid', position: 'relative',
                    borderColor: destaque ? 'secondary.main' : 'divider',
                    borderRadius: 3, transition: 'border-color 0.2s',
                    '&:hover': { borderColor: destaque ? 'secondary.main' : 'primary.main' },
                  }}>
                    {destaque && (
                      <Chip label="Mais popular" color="secondary" size="small"
                        sx={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', fontWeight: 700, fontSize: 10 }} />
                    )}
                    <CardContent sx={{ p: 3 }}>
                      <Typography fontWeight={900} fontSize={14} textTransform="uppercase" letterSpacing="0.1em" mb={0.5}>{p.nome}</Typography>
                      <Typography fontWeight={900} fontSize={28} letterSpacing="-0.02em" mb={0.5}>
                        {p.preco === 0 ? 'Grátis' : `R$${p.preco.toLocaleString('pt-BR')}`}
                        {p.preco > 0 && <Typography component="span" fontSize={12} color="text.secondary" fontWeight={500}>/mês</Typography>}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" mb={0.5}>{p.diagnosticos_mes === Infinity ? 'Ilimitados' : `${p.diagnosticos_mes} diagnóstico${p.diagnosticos_mes > 1 ? 's' : ''}`}/mês</Typography>
                      <Typography variant="body2" color="text.secondary" mb={2}>{p.social_listening ? 'Social listening incluso' : 'Sem social listening'}</Typography>
                      <Button fullWidth variant={destaque ? 'contained' : 'outlined'} color={destaque ? 'secondary' : 'primary'}
                        onClick={() => handlePlano(key)} disabled={loading}
                        sx={{ fontWeight: 800, fontSize: 12, py: 1.2 }}>
                        {loading ? <CircularProgress size={16} color="inherit" /> : key === 'trial' ? 'Trial grátis' : 'Assinar agora'}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </Box>
            <Box textAlign="center">
              <Button variant="text" color="primary" onClick={() => handlePlano('trial')} disabled={loading}
                sx={{ fontWeight: 700, fontSize: 12 }}>
                Começar com trial grátis de 14 dias →
              </Button>
            </Box>
          </Box>
        )}

        {/* Passo 3 — Confirmação */}
        {step === 2 && (
          <Box sx={{
            bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
            borderRadius: 3, p: 5, textAlign: 'center',
          }}>
            <CheckCircleIcon sx={{ fontSize: 56, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" fontWeight={900} letterSpacing="-0.02em" mb={1}>
              Workspace criado!
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={4}>
              Seu workspace <strong style={{ color: '#fff' }}>{empresa.nome}</strong> está pronto.
              Você tem 14 dias de trial com acesso completo.
            </Typography>
            <Button variant="contained" color="primary" size="large"
              onClick={() => { window.location.hash = '#/app' }}
              sx={{ fontWeight: 900, px: 4, py: 1.5, letterSpacing: '0.08em' }}>
              Acessar o workspace →
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  )
}
