import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { DS } from "./lib/constants";
import { getRoute } from "./lib/helpers";
import { GlobalStyle } from "./components/GlobalStyle";
import { PaginaPublica } from "./pages/PaginaPublica";
import { LoginPage } from "./pages/LoginPage";
import { AppInterno } from "./pages/AppInterno";
import { PaginaMetodologia } from "./pages/PaginaMetodologia";
import { RelatorioPublico } from "./pages/RelatorioPublico";

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

    return () => { subscription.unsubscribe(); window.removeEventListener("hashchange", onHash); document.head.removeChild(l); };
  }, []);

  if (authLoading) return (
    <div style={{ minHeight:"100vh", background:DS.navy, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <GlobalStyle />
      <div style={{ width:40, height:40, border:`3px solid ${DS.navyMid}`, borderTopColor:DS.green, borderRadius:"50%", animation:"spin 0.75s linear infinite" }} />
    </div>
  );

  if (route === "public") return <PaginaPublica />;

  if (route === "login") {
    if (user) { window.location.hash = "#/app"; return null; }
    return <LoginPage onLogin={setUser} />;
  }

  if (route === "app") {
    if (!user) { window.location.hash = "#/login"; return null; }
    return <AppInterno user={user} onLogout={async () => { await supabase.auth.signOut(); setUser(null); window.location.hash = ""; }} />;
  }

  if (route === "relatorio-publico") return <RelatorioPublico />;

  if (route === "metodologia") return <PaginaMetodologia />;

  return <PaginaPublica />;
}
