import { Chip, Tooltip } from '@mui/material'
import { useWorkspace } from '../lib/WorkspaceContext'
import { PLANOS } from '../lib/constants'

// Saldo de créditos do ciclo — fica visível nas telas de geração.
// Lê de WorkspaceContext (creditos_saldo); o pai chama reload() após gerar.
// saldo == null = ainda não inicializado → mostra o pool cheio do plano.
export function CreditBadge() {
  const { workspace } = useWorkspace()
  if (!workspace) return null
  const plano = PLANOS[workspace.plano] || PLANOS.trial
  const pool  = workspace.creditos_mes ?? plano.creditos_mes
  const saldo = workspace.creditos_saldo ?? pool
  const low   = pool ? saldo / pool <= 0.15 : false
  return (
    <Tooltip title="Saldo de créditos do mês">
      <Chip
        size="small"
        label={`${saldo.toLocaleString('pt-BR')} créditos`}
        sx={{ fontWeight: 700, fontSize: 12, ...(low ? { color: '#fff', bgcolor: 'secondary.main' } : { bgcolor: 'action.hover' }) }}
      />
    </Tooltip>
  )
}
