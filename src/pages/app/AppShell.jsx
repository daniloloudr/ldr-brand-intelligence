import { useState, useEffect, lazy, Suspense } from 'react'
import { Box, CircularProgress, Typography, Button, Stack, Divider } from '@mui/material'
import { ThemeProvider, CssBaseline } from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { theme as themeDark, themeLight } from '../../lib/theme'
import { getRoute, getBrandId, getCampaignId, getWorkflowId, getBrandSection, fmtDate } from '../../lib/helpers'
import { t } from '../../lib/i18n'
import { supabase } from '../../lib/supabase'
import { PLANOS } from '../../lib/constants'
import { WorkspaceProvider, useWorkspace } from '../../lib/WorkspaceContext'
import { useBrandManualJobs } from '../../lib/useBrandManualJobs'
import { AppLayout } from '../../components/shell/AppLayout'
// Páginas carregadas sob demanda (code-splitting por rota) — cada uma vira um chunk
// separado, fora do bundle principal. Named exports → mapeados p/ default no lazy.
const Home            = lazy(() => import('./Home').then(m => ({ default: m.Home })))
const Posicionamento  = lazy(() => import('./Posicionamento').then(m => ({ default: m.Posicionamento })))
const SocialListening = lazy(() => import('./SocialListening').then(m => ({ default: m.SocialListening })))
const BrandList       = lazy(() => import('./BrandList').then(m => ({ default: m.BrandList })))
const BrandOnboarding = lazy(() => import('./BrandOnboarding').then(m => ({ default: m.BrandOnboarding })))
const BrandBook       = lazy(() => import('./BrandBook').then(m => ({ default: m.BrandBook })))
const BrandAssistant  = lazy(() => import('./BrandAssistant').then(m => ({ default: m.BrandAssistant })))
const BrandIntelligence = lazy(() => import('./BrandIntelligence').then(m => ({ default: m.BrandIntelligence })))
const Campaigns       = lazy(() => import('./Campaigns').then(m => ({ default: m.Campaigns })))
const CampaignNew     = lazy(() => import('./CampaignNew').then(m => ({ default: m.CampaignNew })))
const CampaignDetail  = lazy(() => import('./CampaignDetail').then(m => ({ default: m.CampaignDetail })))
const WorkspacePage   = lazy(() => import('./WorkspacePage').then(m => ({ default: m.WorkspacePage })))
const ContaPage       = lazy(() => import('./WorkspacePage').then(m => ({ default: m.ContaPage })))
const TimePage        = lazy(() => import('./WorkspacePage').then(m => ({ default: m.TimePage })))
const AlertasPage     = lazy(() => import('./WorkspacePage').then(m => ({ default: m.AlertasPage })))
const ContentHub      = lazy(() => import('./ContentHub').then(m => ({ default: m.ContentHub })))
const StudioImage     = lazy(() => import('./StudioImage').then(m => ({ default: m.StudioImage })))
const StudioWorkflows = lazy(() => import('./StudioWorkflows').then(m => ({ default: m.StudioWorkflows })))
const StudioCanvas    = lazy(() => import('./StudioCanvas').then(m => ({ default: m.StudioCanvas })))
const StudioCampaigns = lazy(() => import('./StudioCampaigns').then(m => ({ default: m.StudioCampaigns })))
const StudioVideo     = lazy(() => import('./StudioVideo').then(m => ({ default: m.StudioVideo })))
const StudioWriting   = lazy(() => import('./StudioWriting').then(m => ({ default: m.StudioWriting })))
const StudioLibrary   = lazy(() => import('./StudioLibrary').then(m => ({ default: m.StudioLibrary })))
const StudioAssets    = lazy(() => import('./StudioAssets').then(m => ({ default: m.StudioAssets })))
const StudioApprovals = lazy(() => import('./StudioApprovals').then(m => ({ default: m.StudioApprovals })))
const MarketIntelligence = lazy(() => import('./IntelligencePages').then(m => ({ default: m.MarketIntelligence })))
const CompetitorsPage = lazy(() => import('./IntelligencePages').then(m => ({ default: m.CompetitorsPage })))
const ConsumerInsights = lazy(() => import('./IntelligencePages').then(m => ({ default: m.ConsumerInsights })))
const TrendsPage      = lazy(() => import('./IntelligencePages').then(m => ({ default: m.TrendsPage })))
const ReportsPage     = lazy(() => import('./IntelligencePages').then(m => ({ default: m.ReportsPage })))
import { ErrorBoundary } from '../../components/ErrorBoundary'
import logoNegativa from '../../assets/negativa.svg'
import logoPositivo from '../../assets/logo-positivo-200px.png'

/* ─── icons ──────────────────────────────────────────────────────── */
const IcoHome    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
const IcoDiag    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
const IcoSocial  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
const IcoContent = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
const IcoBrand   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
const IcoStudio  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>
const IcoAssist  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 4.6L18.5 9l-4.6 1.4L12 15l-1.9-4.6L5.5 9l4.6-1.4z"/></svg>

const USER_MENU = [
  { label: 'Configurações da conta', hash: '#/app/conta' },
  { label: 'Planos & Créditos',      hash: '#/app/workspace' },
  { label: 'Gestão de time',         hash: '#/app/time' },
  { label: 'Alertas',                hash: '#/app/alertas' },
  { label: 'Inteligência s1ngulr',   hash: '#/app/ia-loudr' },
]

function Shell({ isDark, onToggleTheme, impersonating, onStopImpersonating }) {
  const { workspace, loading, user, onLogout } = useWorkspace()

  // Lockup do produto: MARCA.s1ngulr — logo escolhido nos Ativos (metadata.header)
  // ou o primeiro logo; senão o nome. Ouve 'brand-lockup-refresh' p/ troca ao vivo.
  const [brandLockup, setBrandLockup] = useState(null)
  useEffect(() => {
    if (!workspace?.id) return
    let on = true
    async function loadLockup() {
      const { data: b } = await supabase.from('brands').select('id, nome').eq('workspace_id', workspace.id)
        .order('created_at', { ascending: true }).limit(1).maybeSingle()
      let logoUrl = null, logoSvg = null
      if (b?.id) {
        const { data: logos } = await supabase.from('brand_assets').select('valor, mime_type, metadata')
          .eq('brand_id', b.id).eq('tipo', 'logo').order('created_at', { ascending: true })
        const logo = (logos || []).find(l => l.metadata?.header) || (logos || [])[0]
        if (logo?.valor?.includes('<svg')) logoSvg = logo.valor.slice(logo.valor.indexOf('<svg'))
        else if (/^https?:\/\//.test(logo?.valor || '')) logoUrl = logo.valor
      }
      if (!on) return
      const nome = b?.nome || workspace?.nome || null
      setBrandLockup({ nome, logoUrl, logoSvg })
      if (nome) document.title = `${nome}.s1ngulr`
    }
    loadLockup()
    const refresh = () => loadLockup()
    window.addEventListener('brand-lockup-refresh', refresh)
    return () => { on = false; window.removeEventListener('brand-lockup-refresh', refresh) }
  }, [workspace?.id])
  const [route, setRoute] = useState(getRoute)
  const [, setHashTick] = useState(0)   // força re-render mesmo quando a rota-id não muda (ex. seções do Brand Book)
  const { jobs, processing } = useBrandManualJobs(workspace?.id)

  useEffect(() => {
    const onHash = () => { setRoute(getRoute()); setHashTick(t => t + 1) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Um acesso = uma marca → resolve a marca única do workspace para a nav
  const [brandId, setBrandId] = useState(null)
  useEffect(() => {
    if (!workspace?.id) return
    supabase.from('brands').select('id').eq('workspace_id', workspace.id)
      .order('created_at', { ascending: true }).limit(1).maybeSingle()
      .then(({ data }) => setBrandId(data?.id || null))
  }, [workspace?.id])

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

  function handleNavigate(hash) {
    if (!hash) return
    // Frequência de uso por destino — alimenta os atalhos adaptativos da Home
    try {
      const freq = JSON.parse(localStorage.getItem('s1ngulr-nav-freq') || '{}')
      const key = hash.replace(/#\/app\/brands\/[^/]+/, '#brand')   // normaliza por marca
      freq[key] = (freq[key] || 0) + 1
      localStorage.setItem('s1ngulr-nav-freq', JSON.stringify(freq))
    } catch { /* localStorage indisponível não bloqueia navegação */ }
    window.location.hash = hash
  }

  const brandPath = brandId ? `#/app/brands/${brandId}` : '#/app/brands'
  const section   = getBrandSection()

  const nav = [
    // Nova arquitetura (2026-07-10): Strategy · Intelligence · Studio · Copilot
    // Onda 1 = só navegação (rotas e schema intactos). Rótulos via i18n (pt/en/es).
    { type: 'item', label: t('nav.home'), icon: IcoHome, hash: '#/app', active: route === 'app-home' },
    { type: 'group', label: t('nav.strategy'), icon: IcoBrand, active: route === 'brands-detail', children: [
      { type: 'sub', label: t('nav.sub.culture') },
      { label: t('nav.strategy.essencia'),      hash: `${brandPath}/essencia`,      active: route === 'brands-detail' && section === 'essencia' },
      { type: 'sub', label: t('nav.sub.business') },
      { label: t('nav.strategy.negocio'),       hash: `${brandPath}/negocio`,       active: route === 'brands-detail' && section === 'negocio' },
      { label: t('nav.strategy.experiencia'),   hash: `${brandPath}/experiencia`,   active: route === 'brands-detail' && section === 'experiencia' },
      { type: 'sub', label: t('nav.sub.communication') },
      { label: t('nav.strategy.personalidade'), hash: `${brandPath}/personalidade`, active: route === 'brands-detail' && section === 'personalidade' },
      { label: t('nav.strategy.expression'),    hash: `${brandPath}/expression`,    active: route === 'brands-detail' && section === 'expression' },
    ] },
    { type: 'group', label: t('nav.intelligence'), icon: IcoDiag, children: [
      { label: t('nav.intelligence.market'),    hash: '#/app/market-intel', active: route === 'market-intel' },
      // Escuta → Insights lado a lado: coleta bruta e leitura são complementares (decisão 2026-07-10)
      { label: t('nav.intelligence.listening'), hash: '#/app/listening',   active: route === 'listening' },
      { label: t('nav.intelligence.insights'),  hash: '#/app/insights',     active: route === 'insights' },
      { label: t('nav.intelligence.competitors'), hash: '#/app/competitors', active: route === 'competitors' },
      { label: t('nav.intelligence.trends'),    hash: '#/app/trends',      active: route === 'trends' },
      // Reports = a medição da marca (ressignificação da antiga página Posicionamento — decisão Q3)
      { label: t('nav.intelligence.reports'),   hash: '#/app/reports',     active: route === 'reports' || route === 'posicionamento' },
      { label: t('nav.intelligence.content'),   hash: '#/app/content-hub', active: route === 'content-hub' },
    ] },
    { type: 'group', label: t('nav.studio'), icon: IcoStudio, children: [
      { label: t('nav.studio.assets'),   hash: `${brandPath}/studio/assets`,   active: route === 'brands-studio-assets' },
      { label: t('nav.studio.image'),    hash: `${brandPath}/studio`,          active: route === 'brands-studio' },
      { label: t('nav.studio.video'),    hash: `${brandPath}/studio/video`,    active: route === 'brands-studio-video' },
      { label: t('nav.studio.writing'),  hash: `${brandPath}/studio/writing`,  active: route === 'brands-studio-writing' },
      { label: t('nav.studio.workflow'), hash: `${brandPath}/studio/workflow`, active: route === 'brands-studio-workflow' },
      { label: t('nav.studio.library'),  hash: `${brandPath}/studio/biblioteca`, active: route === 'brands-studio-biblioteca' },
    ] },
    // Copilot enxuto (decisão 2026-07-10): só o Chat — modos viraram sugestões
    // na lateral do chat; Agents & Automações entram quando existirem de verdade.
    { type: 'item', label: t('nav.copilot'), icon: IcoAssist, hash: `${brandPath}/assistant`, active: route === 'brands-assistant' },
  ]

  function renderPage() {
    if (route === 'app-home')              return <Home />
    if (route === 'posicionamento')        return <Posicionamento />
    if (route === 'workspace')             return <WorkspacePage />
    if (route === 'conta')                 return <ContaPage />
    if (route === 'time')                  return <TimePage />
    // Plano e cobrança: customer-facing escondido (venda sob demanda). Créditos/PLANOS/Stripe seguem por baixo.
    if (route === 'plano')                 { window.location.hash = '#/app'; return null }
    if (route === 'alertas')               return <AlertasPage />
    if (route === 'listening')             return <SocialListening />
    if (route === 'content-hub')           return <ContentHub />
    if (route === 'brands-list')           return <BrandList />
    if (route === 'brands-new')            return <BrandOnboarding />
    if (route === 'brands-assistant')      return <BrandAssistant brandId={getBrandId()} />
    if (route === 'ia-loudr')              return <BrandIntelligence />
    if (route === 'brands-campaigns')      return <Campaigns brandId={getBrandId()} />
    if (route === 'brands-campaign-new')   return <CampaignNew brandId={getBrandId()} />
    if (route === 'brands-campaign-detail') return <CampaignDetail brandId={getBrandId()} campaignId={getCampaignId()} />
    if (route === 'brands-studio')         return <StudioImage brandId={getBrandId()} />
    if (route === 'brands-studio-workflow') {
      const wf = getWorkflowId()
      return wf ? <StudioCanvas brandId={getBrandId()} workflowId={wf} /> : <StudioWorkflows brandId={getBrandId()} />
    }
    if (route === 'brands-studio-video')   return <StudioVideo brandId={getBrandId()} />
    if (route === 'brands-studio-writing') return <StudioWriting brandId={getBrandId()} />
    if (route === 'brands-studio-biblioteca') return <StudioLibrary brandId={getBrandId()} />
    if (route === 'brands-studio-assets')  return <StudioAssets brandId={getBrandId()} />
    if (route === 'brands-studio-approvals') return <StudioApprovals brandId={getBrandId()} />
    if (route === 'market-intel')          return <MarketIntelligence />
    if (route === 'insights')              return <ConsumerInsights />
    if (route === 'competitors')           return <CompetitorsPage />
    if (route === 'trends')                return <TrendsPage />
    if (route === 'reports')               return <Posicionamento />   // ressignificado: a medição da marca vive em Intelligence
    if (route === 'brands-studio-campaigns') return <StudioCampaigns brandId={getBrandId()} />
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
      nav={nav}
      currentRoute={route}
      onNavigate={handleNavigate}
      user={user}
      userName={userName}
      workspace={workspace}
      brandLockup={brandLockup}
      planoLabel={plano.nome}
      planoUsoText={limite ? `${uso}/${limite} diagn./mês` : null}
      onLogout={onLogout}
      userMenu={USER_MENU}
      topBanner={topBanner}
      bellCount={processing}
      bellContent={({ close }) => renderBellContent(jobs, close)}
    >
      <ErrorBoundary key={route}>
        <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><CircularProgress /></Box>}>
          {renderPage()}
        </Suspense>
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
