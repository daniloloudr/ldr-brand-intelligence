import { useState, useEffect } from 'react'
import { navigate } from '../../lib/helpers';
import { Box, Button, TextField, Typography, CircularProgress, Alert } from '@mui/material'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { theme } from '../../lib/theme'
import { supabase } from '../../lib/supabase'
import { Wordmark } from '../../components/Wordmark'
import { PALETTE } from '../../lib/theme'

export function InvitePage({ onDone }) {
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
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      // Entrar no workspace deixou de ser coisa que o browser faz. Antes esta
      // tela inseria a própria participação, apoiada numa policy que checava só
      // `user_id = auth.uid()` — sem workspace_id nenhum. Qualquer conta com o
      // UUID de um cliente entrava nele. Agora quem decide é o servidor, lendo
      // o convite de app_metadata (que o usuário não consegue reescrever).
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/workspace-join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
      })

      // 403 = sem convite pendente. Não é caminho de erro fatal: a senha já foi
      // trocada, e uma conta que já é membro (reconvite, segundo acesso) segue
      // para o app normalmente. Travar aqui deixaria a pessoa sem porta.
      if (!res.ok && res.status !== 403) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Não foi possível concluir o acesso ao workspace.')
      }

      onDone?.()
      navigate('#/app')
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
            <Box sx={{ mb: 2 }}><Wordmark size={24} /></Box>
            <Typography variant="h6" fontWeight={800} gutterBottom>Boas-vindas</Typography>
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
              sx={{ mt: 1, bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, fontWeight: 800 }}
            >
              {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Acessar workspace'}
            </Button>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  )
}
