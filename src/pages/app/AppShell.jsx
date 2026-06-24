import { useState, useEffect } from 'react'
import { Box, CircularProgress, Typography, Button, Stack, Divider } from '@mui/material'
import { ThemeProvider, CssBaseline } from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { theme as themeDark, themeLight } from '../../lib/theme'
import { getRoute, getBrandId, getCampaignId, getWorkflowId, fmtDate } from '../../lib/helpers'
import { PLANOS } from '../../lib/constants'
import { WorkspaceProvider, useWorkspace } from '../../lib/WorkspaceContext'
import { useBrandManualJobs } from '../../lib/useBrandManualJobs'
import { AppLayout } from '../../components/shell/AppLayout'
import { Home } from './Home'
import { Posicionamento } from './Posicionamento'
import { SocialListening } from './SocialListening'
import { BrandList } from './BrandList'
import { BrandOnboarding } from './BrandOnboarding'
import { BrandBook } from './BrandBook'
import { BrandAssistant } from './BrandAssistant'
import { Campaigns } from './Campaigns'
import { CampaignNew } from './CampaignNew'
import { CampaignDetail } from './CampaignDetail'
import { WorkspacePage, ContaPage, TimePage, PlanoPage, AlertasPage } from './WorkspacePage'
import { ContentHub } from './ContentHub'
import { StudioCanvas } from './StudioCanvas'
import { StudioCampaigns } from './StudioCampaigns'
import { UpgradeGate } from '../../components/UpgradeGate'
import { ErrorBoundary } from '../../components/ErrorBoundary'
import logoNegativa from '../../assets/negativa.svg'
import logoPositivo from '../../assets/logo-positivo-200px.png'

/* ─── icons ──────────────────────────────────────────────────────── */
const IcoHome    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
const IcoDiag    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
const IcoSocial  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
const IcoContent = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
const IcoBrand   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>

const NAV = [
  { id: 'app-home',       hash: '#/app',                label: 'Home',             icon: IcoHome },
  { id: 'posicionamento', hash: '#/app/posicionamento', label: 'Posicionamento',   icon: IcoDiag },
  { id: 'listening',      hash: '#/app/listening',      label: 'Social Listening', icon: IcoSocial,  pro: true },
  { id: 'content-hub',    hash: '#/app/content-hub',    label: 'Content Hub',      icon: IcoContent, pro: true },
  { id: 'brands-list',    hash: '#/app/brands',         label: 'Brand OS',         icon: IcoBrand },
]

const USER_MENU = [
  { label: 'Configurações da conta', hash: '#/app/conta' },
  { label: 'Gestão de time',         hash: '#/app/time' },
  { label: 'Plano e cobrança',       hash: '#/app/plano' },
  { label: 'Alertas',                hash: '#/app/alertas' },
]

function Shell({ isDark, onToggleTheme, impersonating, onStopImpersonating }) {
  const { workspace, loading, user, onLogout } = useWorkspace()
  const [route, setRoute] = useState(getRoute)
  const { jobs, processing } = useBrandManualJobs(workspace?.id)

  useEffect(() => {
    const onHash = () => setRoute(getRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (loading) return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress sx={{ color: '#0D9E7A' }} />
    </Box>
  )

  if (!workspace) {
    window.location.hash = '#/login'
    return null
  }

  if (workspace.ativo === false) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 4 }}>
        <Box component="img" src={isDark ? logoNegativa : logoPositivo} alt="LOUDR" sx={{ height: 28, mb: 1 }} />
        <Typography variant="h6" fontWeight={900} letterSpacing="-0.02em">Workspace inativo</Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={380}>
          Este workspace está temporariamente inativo. Entre em contato com o suporte para reativar o acesso.
        </Typography>
        <Button variant="outlined" size="small" onClick={onLogout} sx={{ mt: 1, fontWeight: 700 }}>Sair</Button>
      </Box>
    )
  }

  const plano    = PLANOS[workspace.plano] || PLANOS.trial
  const uso      = workspace.diagnosticos_mes || 0
  const limite   = plano.diagnosticos_mes === Infinity ? null : plano.diagnosticos_mes
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '?'

  const planoBlocked = id => {
    const item = NAV.find(n => n.id === id)
    return item?.pro && !['pro', 'enterprise'].includes(workspace.plano)
  }

  function handleNavigate(id) {
    if (planoBlocked(id)) return
    const item = NAV.find(n => n.id === id)
    if (item) window.location.hash = item.hash
  }

  const navItems = NAV.map(({ id, label, icon, pro }) => ({
    id, label, icon, badge: null,
    locked: pro && !['pro', 'enterprise'].includes(workspace.plano),
    isActive: r => r === id || (id === 'brands-list' && ['brands-list', 'brands-new', 'brands-detail'].includes(r)),
  }))

  function renderPage() {
    if (route === 'app-home')              return <Home />
    if (route === 'posicionamento')        return <Posicionamento />
    if (route === 'workspace')             return <WorkspacePage />
    if (route === 'conta')                 return <ContaPage />
    if (route === 'time')                  return <TimePage />
    if (route === 'plano')                 return <PlanoPage />
    if (route === 'alertas')               return <AlertasPage />
    if (route === 'listening')             return <UpgradeGate planoNecessario="pro" workspace={workspace}><SocialListening /></UpgradeGate>
    if (route === 'content-hub')           return <UpgradeGate planoNecessario="pro" workspace={workspace}><ContentHub /></UpgradeGate>
    if (route === 'brands-list')           return <BrandList />
    if (route === 'brands-new')            return <BrandOnboarding />
    if (route === 'brands-assistant')      return <BrandAssistant brandId={getBrandId()} />
    if (route === 'brands-campaigns')      return <UpgradeGate planoNecessario="pro" workspace={workspace}><Campaigns brandId={getBrandId()} /></UpgradeGate>
    if (route === 'brands-campaign-new')   return <UpgradeGate planoNecessario="pro" workspace={workspace}><CampaignNew brandId={getBrandId()} /></UpgradeGate>
    if (route === 'brands-campaign-detail') return <CampaignDetail brandId={getBrandId()} campaignId={getCampaignId()} />
    if (route === 'brands-studio')         return <UpgradeGate planoNecessario="pro" workspace={workspace}><StudioCanvas brandId={getBrandId()} workflowId={getWorkflowId()} /></UpgradeGate>
    if (route === 'brands-studio-campaigns') return <UpgradeGate planoNecessario="pro" workspace={workspace}><StudioCampaigns brandId={getBrandId()} /></UpgradeGate>
    if (route === 'brands-detail')         return <BrandBook brandId={getBrandId()} />
    return <Home />
  }

  const topBanner = impersonating ? (
    <Box sx={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      bgcolor: '#EF9F27', color: '#0D1B2A',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
      px: 2, py: 1, fontSize: 13, fontWeight: 700,
    }}>
      <span>Você está no ambiente de <strong>{impersonating.workspaceName}</strong></span>
      <Box component="button" onClick={onStopImpersonating} sx={{
        bgcolor: '#0D1B2A', color: '#EF9F27', border: 'none', borderRadius: 0.5,
        px: 1.5, py: 0.5, fontWeight: 800, fontSize: 12, cursor: 'pointer',
      }}>Sair</Box>
    </Box>
  ) : null

  return (
    <AppLayout
      isDark={isDark}
      onToggleTheme={onToggleTheme}
      nav={navItems}
      currentRoute={route}
      onNavigate={handleNavigate}
      user={user}
      userName={userName}
      workspace={workspace}
      planoLabel={plano.nome}
      planoUsoText={limite ? `${uso}/${limite} diagn./mês` : null}
      onLogout={onLogout}
      userMenu={USER_MENU}
      topBanner={topBanner}
      bellCount={processing}
      bellContent={({ close }) => renderBellContent(jobs, close)}
    >
      <ErrorBoundary key={route}>
        {renderPage()}
      </ErrorBoundary>
    </AppLayout>
  )
}

function renderBellContent(jobs, close) {
  return (
    <Box>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ fontWeight: 900, fontSize: 14 }}>Notificações</Typography>
        {jobs.length > 0 && (
          <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 700 }}>{jobs.length}</Typography>
        )}
      </Box>
      {jobs.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Sem notificações.</Typography>
        </Box>
      ) : (
        <Box sx={{ overflowY: 'auto', maxHeight: 420 }}>
          {jobs.map((j, i) => {
            const isProcessing = j.status === 'processing'
            const isDone       = j.status === 'done'
            const isError      = j.status === 'error'
            const color = isError ? '#E8185A' : isDone ? '#0D9E7A' : '#EF9F27'
            const Icon  = isError ? ErrorOutlineIcon : isDone ? CheckCircleOutlineIcon : AutoAwesomeIcon
            const titulo = isProcessing ? 'Analisando manual de marca…'
                         : isDone       ? 'Manual de marca analisado'
                         : 'Falha ao analisar manual'
            const sub = j.brand_nome ? `Marca: ${j.brand_nome}` : null
            return (
              <Box key={j.id}
                onClick={() => {
                  if (isDone && j.brand_id) {
                    window.location.hash = `#/app/brands/${j.brand_id}`
                    close()
                  }
                }}
                sx={{
                  p: 2, borderBottom: i < jobs.length - 1 ? 1 : 0, borderColor: 'divider',
                  cursor: isDone ? 'pointer' : 'default',
                  '&:hover': isDone ? { bgcolor: 'action.hover' } : {},
                  display: 'flex', alignItems: 'flex-start', gap: 1.5,
                }}>
                {isProcessing ? (
                  <CircularProgress size={18} thickness={5} sx={{ color, mt: 0.25 }} />
                ) : (
                  <Icon sx={{ color, fontSize: 20, mt: 0.25 }} />
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{titulo}</Typography>
                  {sub && (
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{sub}</Typography>
                  )}
                  {isError && j.error && (
                    <Typography sx={{ fontSize: 11, color: 'error.main', mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {j.error}
                    </Typography>
                  )}
                  <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 0.5 }}>
                    {fmtDate(j.created_at)}
                  </Typography>
                </Box>
              </Box>
            )
          })}
        </Box>
      )}
    </Box>
  )
}

export function AppShell({ user, onLogout, impersonating, onStopImpersonating }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('loudr-workspace-theme')
    return saved !== null ? saved === 'dark' : true
  })

  function handleToggle() {
    setIsDark(d => {
      const next = !d
      localStorage.setItem('loudr-workspace-theme', next ? 'dark' : 'light')
      return next
    })
  }

  return (
    <ThemeProvider theme={isDark ? themeDark : themeLight}>
      <CssBaseline />
      <WorkspaceProvider user={user} onLogout={onLogout} overrideWorkspaceId={impersonating?.workspaceId}>
        <Shell isDark={isDark} onToggleTheme={handleToggle} impersonating={impersonating} onStopImpersonating={onStopImpersonating} />
      </WorkspaceProvider>
    </ThemeProvider>
  )
}
