import { useState, useEffect, lazy, Suspense } from 'react'
import { Box, CircularProgress, Typography, Button, Stack, Divider } from '@mui/material'
import { ThemeProvider, CssBaseline } from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined'
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { theme as themeDark, themeLight } from '../../lib/theme'
import { getRoute, getBrandId, getCampaignId, getWorkflowId, getBrandSection, fmtDate, navigate } from '../../lib/helpers'
import { t } from '../../lib/i18n'
import { supabase } from '../../lib/supabase'
import { PLANOS } from '../../lib/constants'
import { WorkspaceProvider, useWorkspace } from '../../lib/WorkspaceContext'
import { useBrandManualJobs } from '../../lib/useBrandManualJobs'
import { usePendencias } from '../../lib/usePendencias'
import { marcarFoco } from '../../lib/pendencias'
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
const PlanoPage       = lazy(() => import('./WorkspacePage').then(m => ({ default: m.PlanoPage })))
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
import { Wordmark } from '../../components/Wordmark'
import { PALETTE } from '../../lib/theme'


const USER_MENU = [
  { label: 'Configurações da conta', hash: '#/app/conta' },
  { label: 'Créditos & Consumo',     hash: '#/app/plano' },
  { label: 'Gestão de time',         hash: '#/app/time' },
  { label: 'Alertas',                hash: '#/app/alertas' },
  { label: 'Inteligência BR4NDCODE',   hash: '#/app/inteligencia' },
]

function Shell({ isDark, onToggleTheme, impersonating, onStopImpersonating }) {
  const { workspace, loading, denied, user, onLogout } = useWorkspace()

  // Lockup do produto: MARCA.BR4NDCODE — logo escolhido nos Ativos (metadata.header)
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
        // header pode ser qualquer imagem marcada (estrela na Biblioteca >
        // Referências da marca); fallback: primeiro logo (comportamento antigo)
        const { data: logos } = await supabase.from('brand_assets').select('valor, mime_type, metadata, tipo')
          .eq('brand_id', b.id).in('tipo', ['logo', 'icone', 'padrao', 'foto'])
          .order('created_at', { ascending: true })
        const logo = (logos || []).find(l => l.metadata?.header) || (logos || []).find(l => l.tipo === 'logo')
        if (logo?.valor?.includes('<svg')) logoSvg = logo.valor.slice(logo.valor.indexOf('<svg'))
        else if (/^https?:\/\//.test(logo?.valor || '')) logoUrl = logo.valor
      }
      if (!on) return
      const nome = b?.nome || workspace?.nome || null
      setBrandLockup({ nome, logoUrl, logoSvg })
      if (nome) document.title = `${nome}.BR4NDCODE`
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
    window.addEventListener('popstate', onHash)
    return () => window.removeEventListener('popstate', onHash)
  }, [])

  // Um acesso = uma marca → resolve a marca única do workspace para a nav.
  // brandResolved distingue "ainda carregando" de "sem marca" — sem isso, o menu
  // mandava pro wizard "Nova marca" durante o carregamento (a marca EXISTE, só não
  // resolveu ainda).
  const [brandId, setBrandId] = useState(null)
  const [brandResolved, setBrandResolved] = useState(false)
  // O que falta na marca também é notificação — a pessoa olha o sininho, não a
  // pasta de referências.
  const pendentes = usePendencias(brandId)
  useEffect(() => {
    if (!workspace?.id) return
    setBrandResolved(false)
    supabase.from('brands').select('id').eq('workspace_id', workspace.id)
      .order('created_at', { ascending: true }).limit(1).maybeSingle()
      .then(({ data }) => { setBrandId(data?.id || null); setBrandResolved(true) })
  }, [workspace?.id])

  if (loading) return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress sx={{ color: PALETTE.data.positivo }} />
    </Box>
  )

  if (denied) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 4 }}>
        <Wordmark size={22} sx={{ mb: 1 }} />
        <Typography variant="h6" fontWeight={900} letterSpacing="-0.02em">Sem acesso a esta marca</Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={380}>
          Sua conta não tem acesso a este espaço. Confira o endereço ou entre com a conta correta desta marca.
        </Typography>
        <Button variant="outlined" size="small" onClick={onLogout} sx={{ mt: 1, fontWeight: 700 }}>Sair</Button>
      </Box>
    )
  }

  if (!workspace) {
    navigate('#/login')
    return null
  }

  if (workspace.ativo === false) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 4 }}>
        <Wordmark size={22} sx={{ mb: 1 }} />
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
      const freq = JSON.parse(localStorage.getItem('brandcode-nav-freq') || '{}')
      const key = hash.replace(/#\/app\/brands\/[^/]+/, '#brand')   // normaliza por marca
      freq[key] = (freq[key] || 0) + 1
      localStorage.setItem('brandcode-nav-freq', JSON.stringify(freq))
    } catch { /* localStorage indisponível não bloqueia navegação */ }
    navigate(hash)
  }

  // Links de seção da marca. Sem marca no workspace → leva a CRIAR a marca
  // (onboarding), em vez de gerar URL quebrada que cai em "Marca não encontrada".
  // Enquanto a marca não resolveu, não manda pro wizard (evita o conflito transiente).
  const brandLink = (suffix = '') =>
    brandId ? `#/app/brands/${brandId}${suffix}`
    : !brandResolved ? '#/app'
    : '#/app/brands/new'
  const section   = getBrandSection()

  const nav = [
    // Nova arquitetura (2026-07-10): Strategy · Intelligence · Studio · Copilot
    // Onda 1 = só navegação (rotas e schema intactos). Rótulos via i18n (pt/en/es).
    { type: 'item', label: t('nav.home'), icon: HomeOutlinedIcon, hash: '#/app', active: route === 'app-home' },
    { type: 'group', label: t('nav.strategy'), icon: MenuBookOutlinedIcon, active: route === 'brands-detail', children: [
      { type: 'sub', label: t('nav.sub.culture') },
      { label: t('nav.strategy.essencia'),      hash: brandLink('/essencia'),      active: route === 'brands-detail' && section === 'essencia' },
      { type: 'sub', label: t('nav.sub.business') },
      { label: t('nav.strategy.negocio'),       hash: brandLink('/negocio'),       active: route === 'brands-detail' && section === 'negocio' },
      { label: t('nav.strategy.experiencia'),   hash: brandLink('/experiencia'),   active: route === 'brands-detail' && section === 'experiencia' },
      { type: 'sub', label: t('nav.sub.communication') },
      { label: t('nav.strategy.personalidade'), hash: brandLink('/personalidade'), active: route === 'brands-detail' && section === 'personalidade' },
      { label: t('nav.strategy.expression'),    hash: brandLink('/expression'),    active: route === 'brands-detail' && section === 'expression' },
    ] },
    { type: 'group', label: t('nav.intelligence'), icon: InsightsOutlinedIcon, children: [
      // Ordem definida pelo Danilo (2026-08-02): Relatórios → Concorrentes →
      // Mercado → Escuta → Insights → Tendências → Palavras-Chave
      // Reports = a medição da marca (ressignificação da antiga página Posicionamento — decisão Q3)
      { label: t('nav.intelligence.reports'),   hash: '#/app/reports',     active: route === 'reports' || route === 'posicionamento' },
      { label: t('nav.intelligence.competitors'), hash: '#/app/competitors', active: route === 'competitors' },
      { label: t('nav.intelligence.market'),    hash: '#/app/market-intel', active: route === 'market-intel' },
      // Escuta → Insights lado a lado: coleta bruta e leitura são complementares (decisão 2026-07-10)
      { label: t('nav.intelligence.listening'), hash: '#/app/listening',   active: route === 'listening' },
      { label: t('nav.intelligence.insights'),  hash: '#/app/insights',     active: route === 'insights' },
      { label: t('nav.intelligence.trends'),    hash: '#/app/trends',      active: route === 'trends' },
      { label: t('nav.intelligence.content'),   hash: '#/app/content-hub', active: route === 'content-hub' },
    ] },
    { type: 'group', label: t('nav.studio'), icon: PhotoLibraryOutlinedIcon, children: [
      // Ativos saiu do menu (2026-07-14): a casa é a Biblioteca > Referências da
      // marca; a rota /studio/assets segue viva p/ links antigos
      { label: t('nav.studio.image'),    hash: brandLink('/studio'),          active: route === 'brands-studio' },
      { label: t('nav.studio.video'),    hash: brandLink('/studio/video'),    active: route === 'brands-studio-video' },
      { label: t('nav.studio.writing'),  hash: brandLink('/studio/writing'),  active: route === 'brands-studio-writing' },
      { label: t('nav.studio.workflow'), hash: brandLink('/studio/workflow'), active: route === 'brands-studio-workflow' },
      { label: t('nav.studio.campaigns'), hash: brandLink('/studio/campanhas'), active: route === 'brands-studio-campaigns' },
      { label: t('nav.studio.library'),  hash: brandLink('/studio/biblioteca'), active: route === 'brands-studio-biblioteca' },
    ] },
    // Copilot enxuto (decisão 2026-07-10): só o Chat — modos viraram sugestões
    // na lateral do chat; Agents & Automações entram quando existirem de verdade.
    { type: 'item', label: t('nav.copilot'), icon: AutoAwesomeOutlinedIcon, hash: brandLink('/assistant'), active: route === 'brands-assistant' },
  ]

  function renderPage() {
    if (route === 'app-home')              return <Home />
    if (route === 'posicionamento')        return <Posicionamento />
    if (route === 'workspace')             return <WorkspacePage />
    if (route === 'conta')                 return <ContaPage />
    if (route === 'plano')                 return <PlanoPage />
    if (route === 'time')                  return <TimePage />
    // Plano e cobrança: customer-facing escondido (venda sob demanda). Créditos/PLANOS/Stripe seguem por baixo.
    if (route === 'plano')                 { navigate('#/app'); return null }
    if (route === 'alertas')               return <AlertasPage />
    if (route === 'listening')             return <SocialListening />
    if (route === 'content-hub')           return <ContentHub />
    if (route === 'brands-list')           return <BrandList />
    if (route === 'brands-new')            return <BrandOnboarding />
    if (route === 'brands-assistant')      return <BrandAssistant brandId={getBrandId()} />
    if (route === 'inteligencia')              return <BrandIntelligence />
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
      bgcolor: PALETTE.data.atencao, color: PALETTE.neutral[900],
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
      px: 2, py: 1, fontSize: 13, fontWeight: 700,
    }}>
      <Typography component="span">Você está no ambiente de <strong>{impersonating.workspaceName}</strong></Typography>
      <Box component="button" onClick={onStopImpersonating} sx={{
        bgcolor: PALETTE.neutral[900], color: PALETTE.data.atencao, border: 'none', borderRadius: 0.5,
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
      bellCount={processing + pendentes.length}
      bellContent={({ close }) => renderBellContent(jobs, pendentes, brandId, close)}
    >
      <ErrorBoundary key={route}>
        <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><CircularProgress /></Box>}>
          {renderPage()}
        </Suspense>
      </ErrorBoundary>
    </AppLayout>
  )
}

function renderBellContent(jobs, pendentes, brandId, close) {
  // Mesmas cores das severidades do Alert (error/warning/info): a lista do
  // sininho e o alerta da tela de destino falam do mesmo item — cor diferente
  // faria parecer coisa diferente.
  const COR_SEV = { alta: 'error.main', media: 'warning.main', baixa: 'info.main' }
  const total = jobs.length + pendentes.length
  return (
    <Box>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ fontWeight: 900, fontSize: 14 }}>Notificações</Typography>
        {total > 0 && (
          <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 700 }}>{total}</Typography>
        )}
      </Box>

      {/* O que falta na marca. Fica ACIMA do andamento: andamento passa
          sozinho, pendência só sai quando alguém age. */}
      {pendentes.length > 0 && (
        <Box sx={{ borderBottom: jobs.length ? 1 : 0, borderColor: 'divider' }}>
          {pendentes.map(p => (
            <Box key={p.id}
              onClick={() => {
                // A instrução viaja junto: quem chega precisa reencontrar o
                // motivo de ter vindo.
                marcarFoco(p)
                if (p.destino.bibliotecaRoot) sessionStorage.setItem('biblioteca_root', p.destino.bibliotecaRoot)
                close?.()
                navigate(`/app/brands/${brandId}/${p.destino.secao}`)
              }}
              sx={{ px: 2, py: 1.5, display: 'flex', gap: 1.25, alignItems: 'flex-start',
                cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: COR_SEV[p.severidade], mt: 0.9, flexShrink: 0 }} />
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{p.titulo}</Typography>
                <Typography sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.5, mt: 0.25 }}>{p.porque}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {total === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Nada pendente — a marca está completa.</Typography>
        </Box>
      ) : jobs.length === 0 ? null : (
        <Box sx={{ overflowY: 'auto', maxHeight: 420 }}>
          {jobs.map((j, i) => {
            const isProcessing = j.status === 'processing'
            const isDone       = j.status === 'done'
            const isError      = j.status === 'error'
            const color = isError ? PALETTE.data.critico : isDone ? PALETTE.data.positivo : PALETTE.data.atencao
            const Icon  = isError ? ErrorOutlineIcon : isDone ? CheckCircleOutlineIcon : AutoAwesomeIcon
            const titulo = isProcessing ? 'Analisando manual de marca…'
                         : isDone       ? 'Manual de marca analisado'
                         : 'Falha ao analisar manual'
            const sub = j.brand_nome ? `Marca: ${j.brand_nome}` : null
            return (
              <Box key={j.id}
                onClick={() => {
                  if (isDone && j.brand_id) {
                    navigate(`#/app/brands/${j.brand_id}`)
                    close()
                  }
                }}
                sx={{
                  p: 2, borderBottom: i < jobs.length - 1 ? 1 : 0, borderColor: 'divider',
                  cursor: isDone ? 'pointer' : 'default',
                  '&:hover': isDone ? { bgcolor: 'action.hover' } : {},
                  display: 'flex', alignItems: 'flex-start', gap: '1.5px',
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
    // Padrão é CLARO (regra do Danilo); o escuro segue disponível no toggle.
    const saved = localStorage.getItem('brandcode-theme') ?? localStorage.getItem('loudr-workspace-theme')
    return saved !== null ? saved === 'dark' : false
  })

  function handleToggle() {
    setIsDark(d => {
      const next = !d
      localStorage.setItem('brandcode-theme', next ? 'dark' : 'light')
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
