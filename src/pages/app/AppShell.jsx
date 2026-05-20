import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Chip,
         Avatar, Typography, LinearProgress, Divider, CircularProgress } from '@mui/material'
import HomeIcon          from '@mui/icons-material/HomeOutlined'
import AssessmentIcon    from '@mui/icons-material/AssessmentOutlined'
import TrendingUpIcon    from '@mui/icons-material/TrendingUpOutlined'
import CampaignIcon      from '@mui/icons-material/CampaignOutlined'
import CompareIcon       from '@mui/icons-material/CompareArrowsOutlined'
import SettingsIcon      from '@mui/icons-material/SettingsOutlined'
import LogoutIcon        from '@mui/icons-material/Logout'
import { getRoute }      from '../../lib/helpers'
import { PLANOS }        from '../../lib/constants'
import { WorkspaceProvider, useWorkspace } from '../../lib/WorkspaceContext'
import { Home }          from './Home'
import { Diagnostico }   from './Diagnostico'
import { Evolucao }      from './Evolucao'
import { WorkspacePage } from './WorkspacePage'
import { UpgradeGate }   from '../../components/UpgradeGate'
import logoNegativa      from '../../assets/negativa.svg'

const NAV_WIDTH = 220

const NAV_ITEMS = [
  { route: 'app-home',     hash: '#/app',               label: 'Home',            Icon: HomeIcon,       pro: false },
  { route: 'diagnostico',  hash: '#/app/diagnostico',   label: 'Diagnóstico',     Icon: AssessmentIcon, pro: false },
  { route: 'evolucao',     hash: '#/app/evolucao',      label: 'Evolução',        Icon: TrendingUpIcon, pro: false },
  { route: 'listening',    hash: '#/app/listening',     label: 'Social Listening',Icon: CampaignIcon,   pro: true  },
  { route: 'concorrentes', hash: '#/app/concorrentes',  label: 'Concorrentes',    Icon: CompareIcon,    pro: true  },
  { route: 'workspace',    hash: '#/app/workspace',     label: 'Workspace',       Icon: SettingsIcon,   pro: false },
]

function Shell() {
  const { workspace, loading, user, onLogout } = useWorkspace()
  const route = getRoute()

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress color="primary" />
      </Box>
    )
  }

  if (!workspace) {
    window.location.hash = '#/onboarding'
    return null
  }

  const plano     = PLANOS[workspace.plano] || PLANOS.trial
  const usoPct    = plano.diagnosticos_mes === Infinity ? 0 : Math.min((workspace.diagnosticos_mes / plano.diagnosticos_mes) * 100, 100)
  const userName  = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '?'
  const userInit  = userName.charAt(0).toUpperCase()

  function renderPage() {
    if (route === 'app-home')    return <Home />
    if (route === 'diagnostico') return <Diagnostico />
    if (route === 'evolucao')    return <Evolucao />
    if (route === 'workspace')   return <WorkspacePage />

    if (route === 'listening') return (
      <UpgradeGate planoNecessario="pro" workspace={workspace}>
        <Box sx={{ p: 4 }}><Typography>Social Listening — em breve</Typography></Box>
      </UpgradeGate>
    )

    if (route === 'concorrentes') return (
      <UpgradeGate planoNecessario="pro" workspace={workspace}>
        <Box sx={{ p: 4 }}><Typography>Concorrentes — em breve</Typography></Box>
      </UpgradeGate>
    )

    return <Home />
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* ── Sidebar ── */}
      <Drawer variant="permanent" sx={{
        width: NAV_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: NAV_WIDTH,
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
        },
      }}>
        {/* Logo */}
        <Box sx={{ p: 2.5, pb: 2 }}>
          <img src={logoNegativa} alt="LOUDR" style={{ height: 28 }} />
        </Box>

        <Divider />

        {/* Nav */}
        <List dense sx={{ px: 1, py: 1.5, flex: 1 }}>
          {NAV_ITEMS.map(({ route: r, hash, label, Icon, pro }) => {
            const active = route === r
            const locked = pro && !['pro', 'enterprise'].includes(workspace.plano)
            return (
              <ListItemButton
                key={r}
                selected={active}
                onClick={() => { window.location.hash = hash }}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  opacity: locked ? 0.6 : 1,
                  '&.Mui-selected': { bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' } },
                  '&.Mui-selected .MuiListItemIcon-root': { color: '#fff' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: active ? '#fff' : 'text.secondary' }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={label}
                  primaryTypographyProps={{ fontSize: 13, fontWeight: active ? 800 : 500 }}
                />
                {pro && (
                  <Chip label="Pro" size="small" color="secondary"
                    sx={{ height: 18, fontSize: 9, fontWeight: 800, letterSpacing: '0.05em' }} />
                )}
              </ListItemButton>
            )
          })}
        </List>

        <Divider />

        {/* Plano + uso */}
        <Box sx={{ px: 2, py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing="0.08em">
              {plano.nome}
            </Typography>
            {plano.diagnosticos_mes !== Infinity && (
              <Typography variant="caption" color="text.secondary">
                {workspace.diagnosticos_mes}/{plano.diagnosticos_mes}
              </Typography>
            )}
          </Box>
          {plano.diagnosticos_mes !== Infinity && (
            <LinearProgress
              variant="determinate"
              value={usoPct}
              color={usoPct >= 100 ? 'secondary' : 'primary'}
              sx={{ height: 4, borderRadius: 2, bgcolor: 'divider' }}
            />
          )}
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            diagnósticos este mês
          </Typography>
        </Box>

        <Divider />

        {/* User */}
        <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13, fontWeight: 900 }}>
            {userInit}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography fontSize={12} fontWeight={700} noWrap>{userName}</Typography>
            <Typography fontSize={10} color="text.secondary" noWrap>{user?.email}</Typography>
          </Box>
          <Box
            component="button"
            onClick={onLogout}
            sx={{ background: 'none', border: 'none', cursor: 'pointer', color: 'text.secondary', display: 'flex', alignItems: 'center', '&:hover': { color: 'secondary.main' }, p: 0.5, borderRadius: 1 }}
          >
            <LogoutIcon fontSize="small" />
          </Box>
        </Box>
      </Drawer>

      {/* ── Main ── */}
      <Box component="main" sx={{ flex: 1, minWidth: 0, overflowY: 'auto', bgcolor: 'background.default' }}>
        {renderPage()}
      </Box>
    </Box>
  )
}

export function AppShell({ user, onLogout }) {
  return (
    <WorkspaceProvider user={user} onLogout={onLogout}>
      <Shell />
    </WorkspaceProvider>
  )
}
