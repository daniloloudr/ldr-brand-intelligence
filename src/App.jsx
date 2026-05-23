import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { DS } from "./lib/constants";
import { getRoute } from "./lib/helpers";
import { GlobalStyle } from "./components/GlobalStyle";
import { PaginaPublica } from "./pages/PaginaPublica";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { OnboardingPage } from "./pages/auth/OnboardingPage";
import { AppInterno } from "./pages/AppInterno";
import { AppShell } from "./pages/app/AppShell";
import { PaginaMetodologia } from "./pages/PaginaMetodologia";
import { RelatorioPublico } from "./pages/RelatorioPublico";

const WORKSPACE_ROUTES = ['app-home', 'diagnostico', 'evolucao', 'listening', 'concorrentes', 'workspace', 'brands-list', 'brands-new', 'brands-detail'];
const ADMIN_ROUTES     = ['admin', 'admin-historico'];

export default function App() {
  const [route, setRoute]             = useState(getRoute());
  const [user, setUser]               = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

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

  if (authLoading) return (
    <div style={{ minHeight: "100vh", background: DS.navy, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <GlobalStyle />
      <div style={{ width: 40, height: 40, border: `3px solid ${DS.navyMid}`, borderTopColor: DS.green, borderRadius: "50%", animation: "spin 0.75s linear infinite" }} />
    </div>
  );

  if (route === "public")           return <PaginaPublica />;
  if (route === "metodologia")      return <PaginaMetodologia />;
  if (route === "relatorio-publico") return <RelatorioPublico />;

  if (route === "login") {
    if (user) { window.location.hash = "#/app"; return null; }
    return <LoginPage onLogin={setUser} />;
  }

  if (route === "register") {
    if (user) { window.location.hash = "#/onboarding"; return null; }
    return <RegisterPage />;
  }

  if (route === "onboarding") {
    if (!user) { window.location.hash = "#/login"; return null; }
    return <OnboardingPage user={user} />;
  }

  if (WORKSPACE_ROUTES.includes(route)) {
    if (!user) { window.location.hash = "#/login"; return null; }
    return (
      <AppShell
        user={user}
        onLogout={async () => {
          await supabase.auth.signOut();
          setUser(null);
          window.location.hash = "";
        }}
      />
    );
  }

  if (ADMIN_ROUTES.includes(route)) {
    if (!user) { window.location.hash = "#/login"; return null; }
    return (
      <AppInterno
        user={user}
        onLogout={async () => {
          await supabase.auth.signOut();
          setUser(null);
          window.location.hash = "";
        }}
      />
    );
  }

  return <PaginaPublica />;
}
