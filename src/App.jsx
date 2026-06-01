import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { DS } from "./lib/constants";
import { getRoute } from "./lib/helpers";
import { GlobalStyle } from "./components/GlobalStyle";
import { LoginPage } from "./pages/LoginPage";
import { InvitePage } from "./pages/auth/Invite";
import { AppInterno } from "./pages/AppInterno";
import { AppShell } from "./pages/app/AppShell";
import { PaginaMetodologia } from "./pages/PaginaMetodologia";
import { RelatorioPublico } from "./pages/RelatorioPublico";

const WORKSPACE_ROUTES = [
  'app-home', 'posicionamento', 'listening', 'workspace',
  'brands-list', 'brands-new', 'brands-detail', 'brands-assistant',
  'brands-campaigns', 'brands-campaign-new', 'brands-campaign-detail',
];
const ADMIN_ROUTES = ['admin', 'admin-historico'];

// Captura o hash de forma síncrona antes do Supabase processar e limpar a URL
const _INITIAL_HASH = window.location.hash

export default function App() {
  const [isInviteFlow, setInviteFlow] = useState(
    _INITIAL_HASH.includes('type=invite') || _INITIAL_HASH.includes('type=recovery')
  );
  const [route, setRoute]             = useState(getRoute());
  const [user, setUser]               = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(null); // { workspaceId, workspaceName }

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
    window.addEventListener("hashchange", onHash);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("hashchange", onHash);
      document.head.removeChild(l);
    };
  }, []);

  // Mostra antes do authLoading — o Supabase limpa o hash de forma assíncrona
  // então precisamos capturar o tipo antes que o hash suma
  if (isInviteFlow) return <InvitePage onDone={() => setInviteFlow(false)} />;

  if (authLoading) return (
    <div style={{ minHeight: "100vh", background: DS.navy, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <GlobalStyle />
      <div style={{ width: 40, height: 40, border: `3px solid ${DS.navyMid}`, borderTopColor: DS.green, borderRadius: "50%", animation: "spin 0.75s linear infinite" }} />
    </div>
  );

  if (route === "metodologia")       return <PaginaMetodologia />;
  if (route === "relatorio-publico") return <RelatorioPublico />;

  if (route === "login") {
    if (user) { window.location.hash = "#/app"; return null; }
    return <LoginPage onLogin={setUser} />;
  }

  if (WORKSPACE_ROUTES.includes(route)) {
    if (!user) { window.location.hash = "#/login"; return null; }
    return (
      <AppShell
        user={user}
        impersonating={impersonating}
        onStopImpersonating={() => { setImpersonating(null); window.location.hash = "#/admin"; }}
        onLogout={async () => {
          await supabase.auth.signOut();
          setUser(null);
          setImpersonating(null);
          window.location.hash = "#/login";
        }}
      />
    );
  }

  if (ADMIN_ROUTES.includes(route)) {
    if (!user) { window.location.hash = "#/login"; return null; }
    return (
      <AppInterno
        user={user}
        onImpersonate={(data) => { setImpersonating(data); window.location.hash = "#/app"; }}
        onLogout={async () => {
          await supabase.auth.signOut();
          setUser(null);
          window.location.hash = "#/login";
        }}
      />
    );
  }

  // Fallback: redireciona para login
  window.location.hash = user ? "#/app" : "#/login";
  return null;
}
