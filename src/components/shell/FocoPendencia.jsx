import { useState, useEffect } from 'react'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import { consumirFoco } from '../../lib/pendencias'

// A mensagem que espera quem veio de uma notificação.
//
// Sem ela, clicar em "falta o arquivo do logo" deposita a pessoa numa
// biblioteca genérica com dezenas de cards — e ela esquece por que veio. A
// faixa repete a tarefa no lugar onde ela se cumpre.
//
// Consome ao ler: é para esta chegada, não para as próximas. Quem voltar à
// mesma tela por conta própria não é interrompido de novo.
export function FocoPendencia() {
  const [foco, setFoco] = useState(null)
  useEffect(() => { setFoco(consumirFoco()) }, [])
  if (!foco) return null

  return (
    <Alert severity="info" onClose={() => setFoco(null)} sx={{ mb: 2.5 }}>
      <AlertTitle sx={{ fontWeight: 700, fontSize: 14 }}>{foco.titulo}</AlertTitle>
      {foco.instrucao}
    </Alert>
  )
}
