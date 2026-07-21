import { useState } from 'react'
import { navigate } from '../../lib/helpers';
import { Box, Button, TextField, Typography, CircularProgress, Alert } from '@mui/material'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { theme } from '../../lib/theme'
import { supabase } from '../../lib/supabase'
import logoNegativa from '../../assets/negativa.svg'

export function ForcePasswordPage({ onDone, onLogout }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('A senha deve ter pelo menos 8 caracteres.'); return }
    if (password !== confirm) { setError('As senhas não coincidem.'); return }

    setLoading(true)
    try {
      const { data: { user }, error: updateError } = await supabase.auth.updateUser({
        password,
        data: { must_change_password: false },
      })
      if (updateError) throw updateError
      onDone?.(user)
      navigate('#/app')
    } catch (err) {
      setError(err.message || 'Erro ao definir a senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <img src={logoNegativa} alt="LOUDR" style={{ height: 28, marginBottom: 16 }} />
            <Typography variant="h6" fontWeight={800} gutterBottom>Defina sua senha pessoal</Typography>
            <Typography variant="body2" color="text.secondary">
              Este é seu primeiro acesso. Por segurança, escolha uma nova senha antes de continuar.
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Nova senha" type="password" value={password} onChange={e => setPassword(e.target.value)} required fullWidth />
            <TextField label="Confirmar senha" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required fullWidth />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              fullWidth
              sx={{ mt: 1, bgcolor: '#0D9E7A', '&:hover': { bgcolor: '#0B8567' }, fontWeight: 800 }}
            >
              {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Salvar e acessar'}
            </Button>
            <Button variant="text" size="small" onClick={onLogout} sx={{ color: 'text.secondary' }}>
              Sair
            </Button>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  )
}
