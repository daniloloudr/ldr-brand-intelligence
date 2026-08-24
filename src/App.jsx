import { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "./lib/supabase";
import {} from "./lib/constants";
import { getRoute, navigate, getTenantSlug, tenantUrl, ROOT_DOMAIN } from "./lib/helpers";
import { LoginPage } from "./pages/LoginPage";
import { InvitePage } from "./pages/auth/Invite";
import { ForcePasswordPage } from "./pages/auth/ForcePassword";
import { AppShell } from "./pages/app/AppShell";
import { PALETTE } from './lib/theme'
import { Box } from "@mui/material";
import Button from "@mui/material/Button";
// Carregados sob demanda: admin (grande, raro) e páginas públicas (fora do fluxo logado)
const AppInterno       = lazy(() => import("./pages/AppInterno").then(m => ({ default: m.AppInterno })));
const PaginaMetodologia = lazy(() => import("./pages/PaginaMetodologia").then(m => ({ default: m.PaginaMetodologia })));
const RelatorioPublico = lazy(() => import("./pages/RelatorioPublico").then(m => ({ default: m.RelatorioPublico })));

// Fallback simples enquanto o chunk carrega (mesmo visual do loader de auth)
const PageFallback = () => (
  <Box sx={{ minHeight: "100vh", background: PALETTE.neutral[900], display: "flex", alignItems: "center", justifyContent: "center" }}>
    <Box sx={{ width: 40, height: 40, border: `3px solid ${PALETTE.neutral[700]}`, borderTopColor: PALETTE.data.positivo, borderRadius: "50%", animation: "spin 0.75s linear infinite" }} />
  </Box>
);

const WORKSPACE_ROUTES = [
  'app-home', 'posicionamento', 'listening', 'content-hub',
  'workspace', 'conta', 'time', 'plano', 'alertas', 'inteligencia',
  'brands-list', 'brands-new', 'brands-detail', 'brands-assistant',
  'brands-campaigns', 'brands-campaign-new', 'brands-campaign-detail',
  'brands-studio', 'brands-studio-campaigns', 'brands-studio-workflow', 'brands-studio-video',
  'brands-studio-writing', 'brands-studio-biblioteca', 'brands-studio-assets', 'brands-studio-approvals',
  'market-intel', 'insights', 'competitors', 'trends', 'reports',
];
const ADMIN_ROUTES = ['admin', 'admin-historico'];
const MfaGate = lazy(() => import('./pages/auth/MfaGate').then(m => ({ default: m.MfaGate })));

// Captura o hash de forma síncrona antes do Supabase processar e limpar a URL
const _INITIAL_HASH = window.location.hash

// Shim de compatibilidade: URL antiga com #/rota → URL limpa equivalente.
// Só converte hash de ROTA (#/...) — nunca o hash de auth do Supabase
// (#access_token=...&type=invite), que precisa continuar intacto.
if (_INITIAL_HASH.startsWith('#/')) {
  const cleaned = _INITIAL_HASH.slice(1)
  const url = cleaned.includes('?') ? cleaned : cleaned + window.location.search
  window.history.replaceState({}, '', url)
}

export default function App() {
  const [isInviteFlow, setInviteFlow] = useState(
    _INITIAL_HASH.includes('type=invite') || _INITIAL_HASH.includes('type=recovery')
  );
  const [route, setRoute]             = useState(getRoute());
  const [user, setUser]               = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(null); // { workspaceId, workspaceName }
  const [isAdmin, setIsAdmin]   = useState(null);      // null = ainda resolvendo (platform_admins)
  // Sessão já em aal2? Volta a false a cada troca de usuário — segundo fator não
  // se herda de quem estava logado antes.
  const [mfaOk, setMfaOk]       = useState(false);
  const [homeSlug, setHomeSlug] = useState(undefined); // slug da marca do NÃO-admin (p/ redirect ao subdomínio); undefined = resolvendo

  useEffect(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap";
    document.head.appendChild(l);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    const onHash = () => setRoute(getRoute());
    window.addEventListener("popstate", onHash);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("popstate", onHash);
      document.head.removeChild(l);
    };
  }, []);

  // Resolve o papel do usuário: é platform_admin? (RLS deixa ler o próprio registro)
  // Se NÃO for admin, guarda o slug da marca dele — no domínio de sistema ele é
  // mandado pro próprio subdomínio, já que app.br4ndcode.com é exclusivo do admin.
  useEffect(() => {
    if (!user?.id) { setIsAdmin(null); setHomeSlug(undefined); setMfaOk(false); return; }
    let on = true;
    (async () => {
      const { data: adm } = await supabase
        .from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle();
      if (!on) return;
      const admin = !!adm;
      setIsAdmin(admin);
      if (admin) { setHomeSlug(null); return; }
      const { data: m } = await supabase
        .from('workspace_members').select('workspaces(slug)')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (on) setHomeSlug(m?.workspaces?.slug || null);
    })();
    return () => { on = false; };
  }, [user?.id]);

  // Domínio de sistema (app.br4ndcode.com / localhost): SEM tenant no host. É o
  // ambiente do admin — nenhum workspace é carregado por associação aqui.
  const systemDomain = !getTenantSlug();
  const hostIsProd   = typeof window !== 'undefined' && window.location.hostname.endsWith(ROOT_DOMAIN);

  const doLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setImpersonating(null);
    navigate('/login');
  };

  // Para onde vai um usuário logado que caiu numa rota "casa" (login / fallback /
  // workspace sem impersonação no domínio de sistema).
  function homeForLoggedIn() {
    if (!systemDomain) { navigate('/app'); return null; }   // subdomínio da marca: fluxo normal
    if (isAdmin === null) return <PageFallback />;           // aguarda resolver o papel
    if (isAdmin) { navigate('/admin'); return null; }        // admin → painel (impersona daqui)
    // não-admin no domínio de sistema → manda pro subdomínio da própria marca
    if (homeSlug === undefined) return <PageFallback />;
    if (homeSlug && hostIsProd) { window.location.replace(`${tenantUrl(homeSlug)}/app`); return <PageFallback />; }
    return <RestritoSistema onLogout={doLogout} />;          // sem marca / dev: acesso restrito
  }

  // Mostra antes do authLoading — o Supabase limpa o hash de forma assíncrona
  // então precisamos capturar o tipo antes que o hash suma
  if (isInviteFlow) return <InvitePage onDone={() => setInviteFlow(false)} />;

  if (authLoading) return (
    <Box sx={{ minHeight: "100vh", background: PALETTE.neutral[900], display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Box sx={{ width: 40, height: 40, border: `3px solid ${PALETTE.neutral[700]}`, borderTopColor: PALETTE.data.positivo, borderRadius: "50%", animation: "spin 0.75s linear infinite" }} />
    </Box>
  );

  if (route === "metodologia")       return <Suspense fallback={<PageFallback />}><PaginaMetodologia /></Suspense>;
  if (route === "relatorio-publico") return <Suspense fallback={<PageFallback />}><RelatorioPublico /></Suspense>;

  // Primeiro acesso: força troca de senha antes de liberar qualquer rota autenticada
  if (user && user.user_metadata?.must_change_password) {
    return (
      <ForcePasswordPage
        onDone={setUser}
        onLogout={async () => {
          await supabase.auth.signOut();
          setUser(null);
          navigate('/login');
        }}
      />
    );
  }

  if (route === "login") {
    if (user) return homeForLoggedIn();
    return <LoginPage onLogin={setUser} />;
  }

  if (WORKSPACE_ROUTES.includes(route)) {
    if (!user) { navigate('/login'); return null; }
    // No domínio de sistema, workspace só existe via impersonação do admin —
    // nunca por associação. Sem impersonar, manda pra casa (admin→/admin).
    if (systemDomain && !impersonating) return homeForLoggedIn();

    // MFA aqui é OPCIONAL: quem não ligou passa direto (o gate devolve na hora,
    // porque `obrigatorio` é false). O que ele faz é PEDIR O CÓDIGO de quem
    // ligou — e isso não é rigor nosso: com "Limit duration of AAL1 sessions"
    // ativo no Supabase, a sessão de quem TEM fator e não verifica é encerrada
    // em 15 minutos. Sem esta tela, ligar o segundo fator viraria queda de
    // sessão a cada quarto de hora, e o cliente concluiria que o app é instável.
    if (!mfaOk) {
      return (
        <Suspense fallback={<PageFallback />}>
          <MfaGate onLiberado={() => setMfaOk(true)} onLogout={doLogout} />
        </Suspense>
      );
    }
    return (
      <AppShell
        user={user}
        impersonating={impersonating}
        onStopImpersonating={() => { setImpersonating(null); navigate('/admin'); }}
        onLogout={async () => {
          await supabase.auth.signOut();
          setUser(null);
          setImpersonating(null);
          navigate('/login');
        }}
      />
    );
  }

  if (ADMIN_ROUTES.includes(route)) {
    if (!user) { navigate('/login'); return null; }
    if (isAdmin === null) return <PageFallback />;          // aguarda resolver o papel
    if (!isAdmin) { navigate('/app'); return null; }        // /admin é exclusivo do platform_admin

    // Segundo fator antes do painel. A conta de operador atravessa a RLS de 15
    // tabelas — ela lê e escreve o dado de TODOS os clientes com a sessão
    // normal. Enquanto a sessão não estiver em aal2, o AppInterno nem monta.
    //
    // Isto é a tela. Os endpoints de admin conferem o `aal` do token por conta
    // própria (ver `_mfa.js`), porque quem tem um token roubado não passa por
    // aqui — chama a function direto.
    if (!mfaOk) {
      return (
        <Suspense fallback={<PageFallback />}>
          {/* obrigatorio: aqui o gate INSCREVE quem ainda não tem fator. É a
              única conta do produto em que o segundo fator não é opcional. */}
          <MfaGate obrigatorio onLiberado={() => setMfaOk(true)} onLogout={doLogout} />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<PageFallback />}>
        <AppInterno
          user={user}
          onImpersonate={(data) => { setImpersonating(data); navigate('/app'); }}
          onLogout={async () => {
            await supabase.auth.signOut();
            setUser(null);
            navigate('/login');
          }}
        />
      </Suspense>
    );
  }

  // Fallback: usuário logado vai pra casa (respeita o domínio de sistema); senão login
  if (user) return homeForLoggedIn();
  navigate('/login');
  return null;
}

// Não-admin que caiu em app.br4ndcode.com sem uma marca pra onde ir. O domínio de
// sistema é exclusivo do admin; aqui só resta sair e entrar pelo endereço da marca.
function RestritoSistema({ onLogout }) {
  return (
    <Box sx={{ minHeight: "100vh", background: PALETTE.neutral[0], display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: '12px', padding: '32px', textAlign: "center" }}>
      <Box sx={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", color: PALETTE.neutral[900] }}>Acesso restrito</Box>
      <Box sx={{ fontSize: 14, color: "#666", maxWidth: 380, lineHeight: 1.5 }}>
        Este endereço é do painel administrativo. Entre pelo endereço da sua marca
        (<strong>marca.br4ndcode.com</strong>).
      </Box>
      <Button variant="outlined" size="small" onClick={onLogout}>Sair</Button>
    </Box>
  );
}
