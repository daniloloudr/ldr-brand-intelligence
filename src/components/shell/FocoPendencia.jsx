import { useState, useEffect } from 'react'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import { consumirFoco } from '../../lib/pendencias'

// A mensagem que espera quem veio de uma notificação.
//
// Sem ela, clicar em "falta o arquivo do logo" deposita a pessoa numa
// biblioteca genérica com dezenas de cards — e ela esquece por que veio.
//
// Quando a pendência aponta um CAMPO, o alerta não fica só aqui: a página rola
// até o campo e ele ganha o contorno de aviso. Levar para a página certa e
// deixar a pessoa procurando entre trinta campos é quase não levar a lugar
// nenhum.
//
// Alert e AlertTitle do MUI, sem sobrescrever tipografia nem cor: a severidade
// já carrega o ícone e a paleta certos, e `onClose` já rende o X nativo.
//
// Consome ao ler: é para esta chegada, não para as próximas. Quem voltar à
// mesma tela por conta própria não é interrompido de novo.
export function FocoPendencia() {
  const [foco, setFoco] = useState(null)
  const [achou, setAchou] = useState(false)

  useEffect(() => {
    const f = consumirFoco()
    if (!f) return
    setFoco(f)
    if (!f.campo) return

    // A seção pode montar depois deste efeito (dados ainda carregando), então
    // procura por um tempo curto em vez de desistir na primeira tentativa.
    let tentativas = 0
    let alvo = null
    const procurar = setInterval(() => {
      alvo = document.querySelector(`[data-campo="${CSS.escape(f.campo)}"]`)
      if (alvo || ++tentativas > 20) {
        clearInterval(procurar)
        if (!alvo) return
        setAchou(true)
        alvo.classList.add('campo-em-foco')
        alvo.scrollIntoView({ behavior: 'smooth', block: 'center' })
        alvo.querySelector('input, textarea')?.focus({ preventScroll: true })
      }
    }, 150)

    return () => {
      clearInterval(procurar)
      alvo?.classList.remove('campo-em-foco')
    }
  }, [])

  if (!foco) return null

  return (
    <Alert severity="warning" onClose={() => setFoco(null)} sx={{ mb: 3 }}>
      <AlertTitle>{foco.titulo}</AlertTitle>
      {foco.instrucao}
      {foco.campo && !achou && ' Se não encontrar o campo nesta aba, ele pode estar em outra seção do Brand Book.'}
    </Alert>
  )
}
