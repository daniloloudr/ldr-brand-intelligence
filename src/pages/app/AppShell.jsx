import { Box, CircularProgress }  from '@mui/material'
import { styled }                   from '@mui/material/styles'
import { getRoute }                  from '../../lib/helpers'
import { PLANOS }                    from '../../lib/constants'
import { WorkspaceProvider, useWorkspace } from '../../lib/WorkspaceContext'
import { Home }          from './Home'
import { Diagnostico }   from './Diagnostico'
import { Evolucao }      from './Evolucao'
import { WorkspacePage } from './WorkspacePage'
import { UpgradeGate }   from '../../components/UpgradeGate'
import logoNegativa      from '../../assets/negativa.svg'

/* ─── styled sidebar ────────────────────────────────────────────── */

const NAV_W = 216

const SidebarRoot = styled('aside')(({ theme }) => ({
  width: NAV_W,
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  background: '#08111F',
  borderRight: '1px solid #1E3348',
  position: 'fixed',
  top: 0,
  bottom: 0,
  left: 0,
  zIndex: 20,
  overflowY: 'auto',
}))

const NavItem = styled('button')(({ active }) => ({
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
  color: active ? '#FFFFFF' : '#7A8899',
  letterSpacing: active ? '-0.01em' : 0,
  textAlign: 'left',
  transition: 'all 0.15s',
  '&:hover': {
    color: '#fff',
    background: 'rgba(13,158,122,0.06)',
  },
}))

/* ─── nav config ─────────────────────────────────────────────────── */

const NAV = [
  { route: 'app-home',     hash: '#/app',              label: 'Home',             icon: IcoHome   },
  { route: 'diagnostico',  hash: '#/app/diagnostico',  label: 'Diagnóstico',      icon: IcoDiag   },
  { route: 'evolucao',     hash: '#/app/evolucao',     label: 'Evolução',         icon: IcoEvo    },
  { route: 'listening',    hash: '#/app/listening',    label: 'Social Listening', icon: IcoSocial, pro: true },
  { route: 'concorrentes', hash: '#/app/concorrentes', label: 'Concorrentes',     icon: IcoComp,   pro: true },
  { route: 'workspace',    hash: '#/app/workspace',    label: 'Workspace',        icon: IcoSet    },
]

/* ─── svg icons ──────────────────────────────────────────────────── */

function IcoHome()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> }
function IcoDiag()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> }
function IcoEvo()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg> }
function IcoSocial() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> }
function IcoComp()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 012 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg> }
function IcoSet()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg> }
function IcoLogout() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> }

/* ─── shell inner ─────────────────────────────────────────────────── */

function Shell() {
  const { workspace, loading, user, onLogout } = useWorkspace()
  const route = getRoute()

  if (loading) return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#08111F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress sx={{ color: '#0D9E7A' }} />
    </Box>
  )

  if (!workspace) {
    window.location.hash = '#/onboarding'
    return null
  }

  const plano    = PLANOS[workspace.plano] || PLANOS.trial
  const uso      = workspace.diagnosticos_mes || 0
  const limite   = plano.diagnosticos_mes === Infinity ? null : plano.diagnosticos_mes
  const usoPct   = limite ? Math.min((uso / limite) * 100, 100) : 0
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '?'
  const initial  = userName.charAt(0).toUpperCase()

  function renderPage() {
    if (route === 'app-home')    return <Home />
    if (route === 'diagnostico') return <Diagnostico />
    if (route === 'evolucao')    return <Evolucao />
    if (route === 'workspace')   return <WorkspacePage />
    if (route === 'listening')   return <UpgradeGate planoNecessario="pro" workspace={workspace}><Box sx={{ p: 4, color: '#fff' }}>Social Listening — em breve</Box></UpgradeGate>
    if (route === 'concorrentes') return <UpgradeGate planoNecessario="pro" workspace={workspace}><Box sx={{ p: 4, color: '#fff' }}>Concorrentes — em breve</Box></UpgradeGate>
    return <Home />
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#08111F', fontFamily: "'Cairo', sans-serif" }}>

      {/* ── Sidebar ── */}
      <SidebarRoot>

        {/* Logo */}
        <div style={{ padding: '22px 20px 16px', borderBottom: '1px solid #1E3348' }}>
          <img src={logoNegativa} alt="LOUDR" style={{ height: 26, display: 'block' }} />
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#3D4E60', marginTop: 6 }}>
            Brand Intelligence
          </div>
        </div>

        {/* Workspace name */}
        <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid #1E3348' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#3D4E60', marginBottom: 4 }}>Workspace</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#B0BACB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {workspace.nome}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {NAV.map(({ route: r, hash, label, icon: Icon, pro }) => {
            const active = route === r
            const locked = pro && !['pro', 'enterprise'].includes(workspace.plano)
            return (
              <NavItem key={r} active={active ? 1 : 0} onClick={() => { window.location.hash = hash }} style={{ opacity: locked ? 0.5 : 1 }}>
                <span style={{ opacity: active ? 1 : 0.6, display: 'flex', color: active ? '#0D9E7A' : 'currentColor' }}>
                  <Icon />
                </span>
                <span style={{ flex: 1 }}>{label}</span>
                {pro && !['pro', 'enterprise'].includes(workspace.plano) && (
                  <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', color: '#E8185A', border: '1px solid #E8185A33', padding: '1px 5px', textTransform: 'uppercase' }}>
                    Pro
                  </span>
                )}
              </NavItem>
            )
          })}
        </nav>

        {/* Plano + uso */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #1E3348' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#3D4E60' }}>
              {plano.nome}
            </span>
            {limite && (
              <span style={{ fontSize: 10, fontWeight: 700, color: usoPct >= 100 ? '#E8185A' : '#7A8899' }}>
                {uso}/{limite}
              </span>
            )}
          </div>
          {limite && (
            <div style={{ height: 3, background: '#1E3348', borderRadius: 0 }}>
              <div style={{ height: '100%', width: `${usoPct}%`, background: usoPct >= 100 ? '#E8185A' : '#0D9E7A', transition: 'width 0.6s ease' }} />
            </div>
          )}
          <div style={{ fontSize: 10, color: '#3D4E60', marginTop: 4 }}>diagnósticos / mês</div>
        </div>

        {/* User */}
        <div style={{ padding: '10px 16px 16px', borderTop: '1px solid #1E3348', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, background: '#0D9E7A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
            {initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#B0BACB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
            <div style={{ fontSize: 10, color: '#3D4E60', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          </div>
          <button onClick={onLogout} title="Sair" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3D4E60', display: 'flex', alignItems: 'center', padding: 4, transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#E8185A'}
            onMouseLeave={e => e.currentTarget.style.color = '#3D4E60'}>
            <IcoLogout />
          </button>
        </div>

      </SidebarRoot>

      {/* ── Main content ── */}
      <main style={{ flex: 1, marginLeft: NAV_W, minWidth: 0, overflowY: 'auto', minHeight: '100vh' }}>
        {renderPage()}
      </main>
    </div>
  )
}

export function AppShell({ user, onLogout }) {
  return (
    <WorkspaceProvider user={user} onLogout={onLogout}>
      <Shell />
    </WorkspaceProvider>
  )
}
