import { Box, Typography, Button } from '@mui/material'
import LockIcon from '@mui/icons-material/Lock'
import { PLANOS } from '../lib/constants'

export function UpgradeGate({ planoNecessario = 'pro', children, workspace }) {
  const ordem = ['trial', 'starter', 'pro', 'enterprise']
  const idxAtual = ordem.indexOf(workspace?.plano || 'trial')
  const idxNec   = ordem.indexOf(planoNecessario)

  if (idxAtual >= idxNec) return children

  const p = PLANOS[planoNecessario]

  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 320, textAlign: 'center', p: 4,
      bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3,
    }}>
      <Box sx={{
        width: 56, height: 56, borderRadius: 2, bgcolor: 'secondary.light',
        display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2,
      }}>
        <LockIcon sx={{ color: 'secondary.main', fontSize: 28 }} />
      </Box>
      <Typography variant="h6" fontWeight={900} letterSpacing="-0.01em" mb={1}>
        Disponível no plano {p.nome}
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3} maxWidth={360}>
        Esta funcionalidade requer o plano {p.nome} ou superior.
        Faça upgrade para desbloquear.
      </Typography>
      <Button
        variant="contained" color="secondary"
        onClick={() => { window.location.hash = '#/app/workspace' }}
        sx={{ fontWeight: 800, px: 3, py: 1.2, letterSpacing: '0.06em' }}
      >
        Fazer upgrade para {p.nome} →
      </Button>
    </Box>
  )
}
