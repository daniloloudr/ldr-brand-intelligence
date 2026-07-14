import { Component } from 'react'
import Box       from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button     from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'

// Erro clássico de deploy: as páginas são lazy (import dinâmico com hash no nome);
// quando sai versão nova com uma aba antiga aberta, o chunk velho não existe mais
// e o import falha ("Failed to fetch dynamically imported module"). A cura é
// recarregar a página — o index.html novo aponta pros chunks novos.
// (Foi o "errinho para abrir" que o Danilo viu na call com a Hering, 09/07.)
const CHUNK_ERR = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError/i
const isChunkError = e => CHUNK_ERR.test(e?.message || '')

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
    if (isChunkError(error)) {
      // recarrega sozinho, no máximo 1x a cada 30s (guarda anti-loop)
      const ultimo = Number(sessionStorage.getItem('chunk-reload-at') || 0)
      if (Date.now() - ultimo > 30_000) {
        sessionStorage.setItem('chunk-reload-at', String(Date.now()))
        window.location.reload()
      }
    }
  }

  render() {
    if (this.state.error) {
      const chunk = isChunkError(this.state.error)
      return (
        <Box sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '60vh', gap: 2, textAlign: 'center', p: 4,
        }}>
          {chunk ? (
            <>
              <CircularProgress size={28} />
              <Typography variant="h6" fontWeight={900}>Atualizando o app…</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
                Uma versão nova foi publicada — recarregando a página.
              </Typography>
              <Button variant="contained" onClick={() => window.location.reload()}>
                Recarregar agora
              </Button>
            </>
          ) : (
            <>
              <WarningAmberOutlinedIcon sx={{ fontSize: 48, color: 'warning.main' }} />
              <Typography variant="h6" fontWeight={900}>Algo deu errado</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
                {this.state.error?.message || 'Erro inesperado ao renderizar a página.'}
              </Typography>
              <Button
                variant="contained"
                onClick={() => {
                  this.setState({ error: null })
                  if (this.props.onReset) this.props.onReset()
                }}
              >
                Tentar novamente
              </Button>
            </>
          )}
        </Box>
      )
    }
    return this.props.children
  }
}
