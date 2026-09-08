import { useState, useEffect } from 'react'
import { navigate } from '../../lib/helpers';
import { Box, Button, TextField, Typography, CircularProgress, Alert } from '@mui/material'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { theme } from '../../lib/theme'
import { supabase } from '../../lib/supabase'
import { Wordmark } from '../../components/Wordmark'
import { PALETTE } from '../../lib/theme'

// ════════════════════════════════════════════════════════════════════
// Duas portas de entrada, e as duas terminam na mesma tela de senha.
//
// 1. `/convite?token_hash=…&type=invite`  ← a atual. O link do e-mail aponta
//    para o domínio DA MARCA e o token é trocado por sessão aqui, com
//    `verifyOtp`. O host do Supabase não aparece em lugar nenhum, e o token só
//    é consumido quando o JavaScript roda: buscar a URL (o que todo scanner de
//    e-mail corporativo faz antes de entregar) devolve só o HTML do app.
//
// 2. `#access_token=…&type=invite`  ← a antiga, do redirect do Supabase. O
//    supabase-js já estabeleceu a sessão sozinho antes deste componente montar.
//    Continua atendida porque convite disparado ANTES da troca ainda pode estar
//    na caixa de alguém — e link que já saiu não se corrige.
// ════════════════════════════════════════════════════════════════════
export function InvitePage({ onDone }) {
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [workspaceName, setWsName]  = useState('')
  // 'trocando' → 'pronto' | 'invalido'. Começa em 'pronto' quando não há
  // token_hash: é o caminho antigo, onde a sessão já veio pelo hash.
  const [estado, setEstado]         = useState(
    new URLSearchParams(window.location.search).get('token_hash') ? 'trocando' : 'pronto'
  )

  useEffect(() => {
    let vivo = true
    const q = new URLSearchParams(window.location.search)
    const tokenHash = q.get('token_hash')

    async function entrar() {
      if (tokenHash) {
        const { error: err } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: q.get('type') || 'invite',
        })
        if (!vivo) return
        if (err) { setEstado('invalido'); return }
        // Tira o token da barra de endereço assim que ele vira sessão: link de
        // uso único não deve sobreviver no histórico do navegador.
        window.history.replaceState({}, '', window.location.pathname)
        setEstado('pronto')
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (!vivo) return
      if (session?.user?.user_metadata?.workspace_name) {
        setWsName(session.user.user_metadata.workspace_name)
      }
    }
    entrar()
    return () => { vivo = false }
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
      navigate('/app')
    } catch (err) {
      setError(err.message || 'Erro ao definir senha.')
    } finally {
      setLoading(false)
    }
  }

  const moldura = (conteudo) => (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Box sx={{ width: '100%', maxWidth: 400 }}>{conteudo}</Box>
      </Box>
    </ThemeProvider>
  )

  if (estado === 'trocando') return moldura(
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{ mb: 3 }}><Wordmark size={24} sx={{ mx: 'auto' }} /></Box>
      <CircularProgress size={26} />
    </Box>
  )

  // Link vencido, já usado, ou adulterado. A mensagem diz o que fazer, porque
  // "token inválido" não é acionável por quem recebeu um convite.
  if (estado === 'invalido') return moldura(
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{ mb: 2 }}><Wordmark size={24} sx={{ mx: 'auto' }} /></Box>
      <Typography variant="h6" fontWeight={800} gutterBottom>Este convite não vale mais</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Convites valem por 24 horas e só podem ser usados uma vez. Se você já definiu
        sua senha antes, entre normalmente. Se não, peça um convite novo a quem te convidou.
      </Typography>
      <Button variant="outlined" onClick={() => navigate('/login')}>Ir para o login</Button>
    </Box>
  )

  return moldura(
    <>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Box sx={{ mb: 2 }}><Wordmark size={24} sx={{ mx: 'auto' }} /></Box>
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
    </>
  )
}
