import { useState } from 'react'
import {
  Box, Button, TextField, Typography, Alert, CircularProgress, Link,
} from '@mui/material'
import { supabase } from '../../lib/supabase'
import logoNegativa from '../../assets/negativa.svg'

export function RegisterPage() {
  const [form, setForm] = useState({ nome: '', email: '', senha: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome || !form.email || !form.senha) { setError('Preencha todos os campos.'); return }
    if (form.senha.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signUp({
      email: form.email,
      password: form.senha,
      options: { data: { full_name: form.nome } },
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    window.location.hash = '#/onboarding'
  }

  return (
    <Box sx={{
      minHeight: '100vh', background: 'background.default',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: 'background.default', p: 3,
    }}>
      <Box sx={{ width: '100%', maxWidth: 440 }}>
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <img src={logoNegativa} alt="LOUDR" style={{ height: 46, marginBottom: 24 }} />
          <Typography variant="h5" fontWeight={900} color="text.primary" letterSpacing="-0.02em">
            Crie sua conta
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Comece seu trial grátis de 14 dias
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit} sx={{
          bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
          borderRadius: 3, p: 4,
        }}>
          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

          <TextField
            fullWidth label="Nome completo" value={form.nome} onChange={set('nome')}
            required sx={{ mb: 2 }} autoFocus
          />
          <TextField
            fullWidth label="E-mail corporativo" type="email" value={form.email} onChange={set('email')}
            required sx={{ mb: 2 }}
          />
          <TextField
            fullWidth label="Senha" type="password" value={form.senha} onChange={set('senha')}
            required sx={{ mb: 3 }} helperText="Mínimo 6 caracteres"
          />

          <Button
            fullWidth type="submit" variant="contained" color="secondary" size="large"
            disabled={loading} sx={{ fontWeight: 900, py: 1.5, fontSize: 13, letterSpacing: '0.1em' }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Criar conta grátis →'}
          </Button>

          <Typography variant="body2" color="text.secondary" textAlign="center" mt={2.5}>
            Já tem conta?{' '}
            <Link
              component="button" type="button" color="primary"
              onClick={() => { window.location.hash = '#/login' }}
              sx={{ fontWeight: 700 }}
            >
              Fazer login
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
