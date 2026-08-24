// ════════════════════════════════════════════════════════════════════
// MfaGate — o /admin não abre sem segundo fator.
//
// Fica ENTRE a rota de admin e o painel: enquanto a sessão não estiver em aal2,
// nada do AppInterno é montado. Não é um aviso que dá para fechar — a conta que
// atravessa a RLS de 15 tabelas não devia depender só de uma senha.
//
// Duas telas, escolhidas pelo estado da conta:
//   · sem fator inscrito → QR para escanear (primeira vez)
//   · fator inscrito, sessão em aal1 → só o campo do código
//
// A porta de emergência é o console do Supabase: se algo aqui travar, dá para
// remover o fator por lá. Está dito na tela de propósito — trava sem saída é
// como se perde o acesso à própria plataforma.
// ════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react'
import { Box, Button, TextField, Typography, CircularProgress, Alert } from '@mui/material'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { themeLight } from '../../lib/theme'
import { Wordmark } from '../../components/Wordmark'
import { NIVEL, situacao, inscrever, confirmar, abortarInscricao } from '../../lib/mfa'

/**
 * `obrigatorio` separa duas coisas que não podem se confundir:
 *
 *  · true  (só o operador) — sem fator inscrito, o gate INSCREVE. A conta que
 *    atravessa a RLS de 15 tabelas não devia depender só de uma senha.
 *  · false (todo o resto)  — sem fator inscrito, passa direto. MFA é OPCIONAL
 *    para o cliente: ele liga em "Minha conta" se quiser.
 *
 * A VERIFICAÇÃO, essa vale para os dois. Quem ligou o segundo fator precisa
 * apresentá-lo — e não é rigor nosso: o Supabase está com "Limit duration of
 * AAL1 sessions" ligado, então a sessão de quem TEM fator e não verifica é
 * encerrada em 15 minutos. Um app que não pede o código transformaria a escolha
 * do cliente em queda de sessão a cada quarto de hora.
 */
export function MfaGate({ onLiberado, onLogout, obrigatorio = false }) {
  const [estado, setEstado]   = useState('carregando')  // carregando | inscrever | verificar | erro
  const [qr, setQr]           = useState(null)
  const [segredo, setSegredo] = useState(null)
  const [factorId, setFactorId] = useState(null)
  const [codigo, setCodigo]   = useState('')
  const [erro, setErro]       = useState('')
  const [enviando, setEnviando] = useState(false)

  const avaliar = useCallback(async () => {
    const s = await situacao()
    if (s.nivel === NIVEL.OK) return onLiberado()
    if (s.nivel === NIVEL.FALTA_VERIFICAR) return setEstado('verificar')
    if (s.nivel === NIVEL.ERRO) { setErro(s.erro); return setEstado('erro') }

    // Sem fator inscrito e não obrigatório: o cliente segue a vida. Ligar o
    // segundo fator é escolha dele, em "Minha conta".
    if (!obrigatorio) return onLiberado()

    const r = await inscrever()
    if (r.erro) { setErro(r.erro); return setEstado('erro') }
    setFactorId(r.factorId); setQr(r.qr); setSegredo(r.segredo)
    setEstado('inscrever')
  }, [onLiberado, obrigatorio])

  useEffect(() => { avaliar() }, [avaliar])

  async function enviar(e) {
    e.preventDefault()
    setErro(''); setEnviando(true)
    // No modo "verificar" o fator já existe: pega o id da lista.
    let alvo = factorId
    if (!alvo) {
      const { fatores } = await import('../../lib/mfa')
      alvo = (await fatores())[0]?.id
    }
    const r = await confirmar(alvo, codigo)
    setEnviando(false)
    if (r.erro) { setCodigo(''); return setErro(r.erro) }
    onLiberado()
  }

  const Moldura = ({ children }) => (
    <ThemeProvider theme={themeLight}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Box sx={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <Box sx={{ mb: 3 }}><Wordmark size={24} /></Box>
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  )

  if (estado === 'carregando') {
    return <Moldura><CircularProgress size={24} /></Moldura>
  }

  if (estado === 'erro') {
    return (
      <Moldura>
        <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>{erro}</Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Se o problema persistir, remova o fator pelo console do Supabase
          (Authentication → Users) e entre de novo.
        </Typography>
        <Button variant="outlined" onClick={onLogout}>Sair</Button>
      </Moldura>
    )
  }

  return (
    <Moldura>
      <Typography variant="h6" fontWeight={800} gutterBottom>
        {estado === 'inscrever' ? 'Proteja o acesso de operador' : 'Verificação em duas etapas'}
      </Typography>

      {estado === 'inscrever' && (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Esta conta enxerga o dado de todos os clientes. Escaneie o código no seu
            app autenticador e digite os 6 dígitos para concluir.
          </Typography>
          {qr && (
            <Box component="img" src={qr} alt="QR code do segundo fator"
              sx={{ width: 200, height: 200, mx: 'auto', display: 'block', mb: 1 }} />
          )}
          {segredo && (
            <Typography variant="caption" color="text.disabled"
              sx={{ display: 'block', mb: 2, wordBreak: 'break-all' }}>
              Não consegue escanear? Use o código: <strong>{segredo}</strong>
            </Typography>
          )}
        </>
      )}

      {estado === 'verificar' && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Digite o código de 6 dígitos do seu app autenticador.
        </Typography>
      )}

      {erro && <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>{erro}</Alert>}

      <Box component="form" onSubmit={enviar} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Código de 6 dígitos" value={codigo}
          onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputProps={{ inputMode: 'numeric', autoComplete: 'one-time-code', maxLength: 6 }}
          autoFocus fullWidth
        />
        <Button type="submit" variant="contained" size="large" fullWidth
          disabled={enviando || codigo.length < 6} sx={{ fontWeight: 800 }}>
          {enviando ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Confirmar'}
        </Button>
        <Button size="small" color="inherit"
          onClick={async () => { if (estado === 'inscrever') await abortarInscricao(factorId); onLogout() }}>
          Sair
        </Button>
      </Box>
    </Moldura>
  )
}
