import { Component } from 'react'
import Box       from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button     from '@mui/material/Button'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'

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
  }

  render() {
    if (this.state.error) {
      return (
        <Box sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '60vh', gap: 2, textAlign: 'center', p: 4,
        }}>
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
        </Box>
      )
    }
    return this.props.children
  }
}
