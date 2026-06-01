import { useState, useEffect } from 'react'
import { Box, Button, TextField, Typography, CircularProgress, Alert } from '@mui/material'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { theme } from '../../lib/theme'
import { supabase } from '../../lib/supabase'
import logoNegativa from '../../assets/negativa.svg'

export function InvitePage() {
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [workspaceName, setWsName]  = useState('')

  useEffect(() => {
    // Supabase coloca o token na hash: #access_token=...&type=invite
    // Precisamos estabelecer a sessão a partir desse token
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.user_metadata?.workspace_name) {
        setWsName(session.user.user_metadata.workspace_name)
      }
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('A senha deve ter pelo menos 8 caracteres.'); return }
    if (password !== confirm) { setError('As senhas não coincidem.'); return }

    setLoading(true)
    try {
      const { data: { user }, error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      const workspaceId = user?.user_metadata?.workspace_id
      if (workspaceId) {
        const { data: existing } = await supabase
          .from('workspace_members')
          .select('id')
          .eq('user_id', user.id)
          .eq('workspace_id', workspaceId)
          .maybeSingle()

        if (!existing) {
          await supabase.from('workspace_members').insert({
            workspace_id: workspaceId,
            user_id: user.id,
            role: 'member',
          })
        }
      }

      window.location.hash = '#/app'
    } catch (err) {
      setError(err.message || 'Erro ao definir senha.')
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
            <Typography variant="h6" fontWeight={800} gutterBottom>Bem-vindo à LOUDR</Typography>
            {workspaceName && (
              <Typography variant="body2" color="text.secondary">
                Você foi convidado para o workspace <strong>{workspaceName}</strong>.<br />
                Defina sua senha para começar.
              </Typography>
            )}
            {!workspaceName && (
              <Typography variant="body2" color="text.secondary">
                Defina sua senha para acessar o workspace.
              </Typography>
            )}
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nova senha"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Confirmar senha"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              fullWidth
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              fullWidth
              sx={{ mt: 1, bgcolor: '#0D9E7A', '&:hover': { bgcolor: '#0B8567' }, fontWeight: 800 }}
            >
              {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Acessar workspace'}
            </Button>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  )
}
