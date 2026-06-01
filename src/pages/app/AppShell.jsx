import { useState }                   from 'react'
import { Box, CircularProgress }       from '@mui/material'
import { styled, useTheme }            from '@mui/material/styles'
import { ThemeProvider, CssBaseline }  from '@mui/material'
import { theme as themeDark, themeLight } from '../../lib/theme'
import { getRoute }                    from '../../lib/helpers'
import { PLANOS }                      from '../../lib/constants'
import { WorkspaceProvider, useWorkspace } from '../../lib/WorkspaceContext'
import { Home }             from './Home'
import { Diagnostico }      from './Diagnostico'
import { Evolucao }         from './Evolucao'
import { SocialListening }  from './SocialListening'
import { Concorrentes }     from './Concorrentes'
import { BrandList }        from './BrandList'
import { BrandOnboarding }  from './BrandOnboarding'
import { BrandBook }        from './BrandBook'
import { BrandAssistant }   from './BrandAssistant'
import { Campaigns }        from './Campaigns'
import { CampaignNew }      from './CampaignNew'
import { CampaignDetail }   from './CampaignDetail'
import { WorkspacePage }    from './WorkspacePage'
import { UpgradeGate }      from '../../components/UpgradeGate'
import { getBrandId, getCampaignId } from '../../lib/helpers'
import logoNegativa      from '../../assets/negativa.svg'
import logoPositivo      from '../../assets/logo-positivo-200px.png'

/* ─── styled sidebar ────────────────────────────────────────────── */

const NAV_W = 216

const SidebarRoot = styled('aside')(({ theme }) => ({
  width: NAV_W,
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  background: theme.palette.background.paper,
  borderRight: `1px solid ${theme.palette.divider}`,
  position: 'fixed',
  top: 0,
  bottom: 0,
  left: 0,
  zIndex: 20,
  overflowY: 'auto',
}))

const NavItem = styled('button')(({ active, theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  padding: '9px 16px',
  background: 'none',
  border: 'none',
  borderLeft: active ? '3px solid #0D9E7A' : '3px solid transparent',
  cursor: 'pointer',
  fontFamily: "'Cairo', sans-serif",
  fontSize: 13,
  fontWeight: active ? 800 : 500,
  color: active ? theme.palette.text.primary : theme.palette.text.secondary,
  letterSpacing: active ? '-0.01em' : 0,
  textAlign: 'left',
  transition: 'all 0.15s',
  '&:hover': {
    color: theme.palette.text.primary,
    background: theme.palette.action?.hover || 'rgba(13,158,122,0.06)',
  },
}))

/* ─── nav config ─────────────────────────────────────────────────── */

const NAV = [
  { route: 'app-home',      hash: '#/app',              label: 'Home',             icon: IcoHome,   group: 'intelligence' },
  { route: 'diagnostico',   hash: '#/app/diagnostico',  label: 'Diagnóstico',      icon: IcoDiag,   group: 'intelligence' },
  { route: 'evolucao',      hash: '#/app/evolucao',     label: 'Evolução',         icon: IcoEvo,    group: 'intelligence' },
  { route: 'listening',     hash: '#/app/listening',    label: 'Social Listening', icon: IcoSocial, group: 'intelligence', pro: true },
  { route: 'concorrentes',  hash: '#/app/concorrentes', label: 'Concorrentes',     icon: IcoComp,   group: 'intelligence', pro: true },
  { route: 'brands-list',   hash: '#/app/brands',       label: 'Brand OS',         icon: IcoBrand,  group: 'brandos' },
  { route: 'workspace',     hash: '#/app/workspace',    label: 'Workspace',        icon: IcoSet,    group: 'settings' },
]

/* ─── svg icons ──────────────────────────────────────────────────── */

function IcoHome()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> }
function IcoDiag()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> }
function IcoEvo()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg> }
function IcoSocial() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> }
function IcoComp()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 012 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg> }
function IcoSet()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg> }
function IcoBrand()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg> }
function IcoLogout() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> }
function IcoSun()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> }
function IcoMoon()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg> }

/* ─── shell inner ─────────────────────────────────────────────────── */

function Shell({ isDark, onToggleTheme, impersonating, onStopImpersonating }) {
  const { workspace, loading, user, onLogout } = useWorkspace()
  const muiTheme = useTheme()
  const route = getRoute()

  if (loading) return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress sx={{ color: '#0D9E7A' }} />
    </Box>
  )

  if (!workspace) {
    window.location.hash = '#/login'
    return null
  }

  const plano    = PLANOS[workspace.plano] || PLANOS.trial
  const uso      = workspace.diagnosticos_mes || 0
  const limite   = plano.diagnosticos_mes === Infinity ? null : plano.diagnosticos_mes
  const usoPct   = limite ? Math.min((uso / limite) * 100, 100) : 0
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '?'
  const initial  = userName.charAt(0).toUpperCase()

  const textPri  = muiTheme.palette.text.primary
  const textSec  = muiTheme.palette.text.secondary
  const textDis  = muiTheme.palette.text.disabled
  const divider  = muiTheme.palette.divider
  const bgDef    = muiTheme.palette.background.default
  const teal     = '#0D9E7A'
  const pink     = '#E8185A'

  function renderPage() {
    if (route === 'app-home')    return <Home />
    if (route === 'diagnostico') return <Diagnostico />
    if (route === 'evolucao')    return <Evolucao />
    if (route === 'workspace')   return <WorkspacePage />
    if (route === 'listening')    return <UpgradeGate planoNecessario="pro" workspace={workspace}><SocialListening /></UpgradeGate>
    if (route === 'concorrentes') return <UpgradeGate planoNecessario="pro" workspace={workspace}><Concorrentes /></UpgradeGate>
    if (route === 'brands-list')           return <BrandList />
    if (route === 'brands-new')            return <BrandOnboarding />
    if (route === 'brands-assistant')      return <BrandAssistant brandId={getBrandId()} />
    if (route === 'brands-campaigns')      return <UpgradeGate planoNecessario="pro" workspace={workspace}><Campaigns brandId={getBrandId()} /></UpgradeGate>
    if (route === 'brands-campaign-new')   return <UpgradeGate planoNecessario="pro" workspace={workspace}><CampaignNew brandId={getBrandId()} /></UpgradeGate>
    if (route === 'brands-campaign-detail') return <CampaignDetail brandId={getBrandId()} campaignId={getCampaignId()} />
    if (route === 'brands-detail')         return <BrandBook brandId={getBrandId()} />
    return <Home />
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: bgDef, fontFamily: "'Cairo', sans-serif" }}>

      {/* ── Banner de impersonation ── */}
      {impersonating && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: '#EF9F27', color: '#0D1B2A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '8px 16px', fontSize: 13, fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>
          <span>Você está no ambiente de <strong>{impersonating.workspaceName}</strong></span>
          <button onClick={onStopImpersonating} style={{ background: '#0D1B2A', color: '#EF9F27', border: 'none', borderRadius: 4, padding: '4px 12px', fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: "'Cairo', sans-serif" }}>
            Sair
          </button>
        </div>
      )}

      {/* ── Sidebar ── */}
      <SidebarRoot style={impersonating ? { top: 37 } : {}}>

        {/* Logo */}
        <div style={{ padding: '22px 20px 16px', borderBottom: `1px solid ${divider}` }}>
          <img src={isDark ? logoNegativa : logoPositivo} alt="LOUDR" style={{ height: 26, display: 'block' }} />
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: textDis, marginTop: 6, fontFamily: "'Cairo', sans-serif" }}>
            Brand Intelligence
          </div>
        </div>

        {/* Workspace name */}
        <div style={{ padding: '12px 16px 8px', borderBottom: `1px solid ${divider}` }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: textDis, marginBottom: 4, fontFamily: "'Cairo', sans-serif" }}>Workspace</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Cairo', sans-serif" }}>
            {workspace.nome}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {NAV.map(({ route: r, hash, label, icon: Icon, pro }) => {
            const active = route === r || (r === 'brands-list' && ['brands-list','brands-new','brands-detail'].includes(route))
            const locked = pro && !['pro', 'enterprise'].includes(workspace.plano)
            return (
              <NavItem key={r} active={active ? 1 : 0} onClick={() => { window.location.hash = hash }} style={{ opacity: locked ? 0.5 : 1 }}>
                <span style={{ opacity: active ? 1 : 0.6, display: 'flex', color: active ? teal : 'currentColor' }}>
                  <Icon />
                </span>
                <span style={{ flex: 1 }}>{label}</span>
                {pro && !['pro', 'enterprise'].includes(workspace.plano) && (
                  <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', color: pink, border: `1px solid ${pink}33`, padding: '1px 5px', textTransform: 'uppercase', fontFamily: "'Cairo', sans-serif" }}>
                    Pro
                  </span>
                )}
              </NavItem>
            )
          })}
        </nav>

        {/* Plano + uso */}
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${divider}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: textDis, fontFamily: "'Cairo', sans-serif" }}>
              {plano.nome}
            </span>
            {limite && (
              <span style={{ fontSize: 10, fontWeight: 700, color: usoPct >= 100 ? pink : textSec, fontFamily: "'Cairo', sans-serif" }}>
                {uso}/{limite}
              </span>
            )}
          </div>
          {limite && (
            <div style={{ height: 3, background: divider, borderRadius: 0 }}>
              <div style={{ height: '100%', width: `${usoPct}%`, background: usoPct >= 100 ? pink : teal, transition: 'width 0.6s ease' }} />
            </div>
          )}
          <div style={{ fontSize: 10, color: textDis, marginTop: 4, fontFamily: "'Cairo', sans-serif" }}>diagnósticos / mês</div>
        </div>

        {/* User + theme toggle + logout */}
        <div style={{ padding: '10px 16px 16px', borderTop: `1px solid ${divider}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, background: teal, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
            {initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Cairo', sans-serif" }}>{userName}</div>
            <div style={{ fontSize: 10, color: textDis, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Cairo', sans-serif" }}>{user?.email}</div>
          </div>
          <button
            onClick={onToggleTheme}
            title={isDark ? 'Modo claro' : 'Modo escuro'}
            style={{ background: 'none', border: `1px solid ${divider}`, borderRadius: 6, cursor: 'pointer', color: textSec, display: 'flex', alignItems: 'center', padding: 5, transition: 'color 0.15s', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.color = teal; e.currentTarget.style.borderColor = teal; }}
            onMouseLeave={e => { e.currentTarget.style.color = textSec; e.currentTarget.style.borderColor = divider; }}
          >
            {isDark ? <IcoSun /> : <IcoMoon />}
          </button>
          <button onClick={onLogout} title="Sair" style={{ background: 'none', border: 'none', cursor: 'pointer', color: textDis, display: 'flex', alignItems: 'center', padding: 4, transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = pink}
            onMouseLeave={e => e.currentTarget.style.color = textDis}>
            <IcoLogout />
          </button>
        </div>

      </SidebarRoot>

      {/* ── Main content ── */}
      <main style={{ flex: 1, marginLeft: NAV_W, minWidth: 0, overflowY: 'auto', minHeight: '100vh', marginTop: impersonating ? 37 : 0 }}>
        {renderPage()}
      </main>
    </div>
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
