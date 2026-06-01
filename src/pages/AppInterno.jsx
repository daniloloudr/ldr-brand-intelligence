import { useState, useEffect, useRef } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { theme as themeDark, themeLight } from "../lib/theme";
import logoPositivo from "../assets/logo-positivo-200px.png";
import logoNegativa from "../assets/negativa.svg";
import { supabase } from "../lib/supabase";
import { DS, F, COOLDOWN_ENTRE_APROVACOES } from "../lib/constants";
import { runStream } from "../lib/api";
import { fmtDate, tryParseJSON, normalizeSector, calcularScoreLead, MACRO_SETORES } from "../lib/helpers";
import { GlobalStyle } from "../components/GlobalStyle";
import { Pill } from "../components/Pill";
import { RelatorioCompleto } from "./RelatorioCompleto";
import { StreamingView } from "./StreamingView";
import { NovoManual } from "./NovoManual";
import { DashboardHistorico } from "./DashboardHistorico";

const PORTES  = ["Startup", "PME", "Médio", "Grande"];
const NAV_W   = 220;
const TOP_H   = 56;

/* ─── icons ─────────────────────────────────────────────────────── */
const IcoInbox  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>;
const IcoPlus   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>;
const IcoChart  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IcoList   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const IcoLogout = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const IcoSun    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const IcoMoon   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>;
const IcoBell   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;

/* ─── TodosPage ──────────────────────────────────────────────────── */
function TodosPage({ historico, loadingHist, onOpen, initialSetor = "", isDark }) {
  const [busca, setBusca] = useState("");
  const [setor, setSetor] = useState(initialSetor);
  const [porte, setPorte] = useState("");
  const [ordem, setOrdem] = useState("recente");

  const C = isDark
    ? { bg: "#162840", border: "#2A4A68", text: "#D8E4F0", textSec: "#96AABF", textDis: "#4D6070", row0: "#0D1B2A", row1: "#162840" }
    : { bg: "#FFFFFF", border: "#E2EBE8", text: "#0D1B2A", textSec: "#4A5A6A", textDis: "#8A9AB0", row0: "#F7F9F8", row1: "#FFFFFF" };

  if (loadingHist) return <div style={{ padding: "3rem", textAlign: "center", color: C.textDis, fontSize: 13, fontFamily: F }}>Carregando...</div>;

  const filtrado = historico
    .filter(d => {
      if (busca && !d.empresa?.toLowerCase().includes(busca.toLowerCase())) return false;
      if (setor && normalizeSector(d.setor) !== setor) return false;
      if (porte && d.porte !== porte) return false;
      return true;
    })
    .sort((a, b) => {
      if (ordem === "recente") return new Date(b.created_at) - new Date(a.created_at);
      if (ordem === "antigo")  return new Date(a.created_at) - new Date(b.created_at);
      if (ordem === "az")      return (a.empresa || "").localeCompare(b.empresa || "");
      return 0;
    });

  const inp = {
    fontSize: 12, fontFamily: F, color: C.text,
    background: C.bg, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: "6px 10px", cursor: "pointer", outline: "none",
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar empresa..."
          style={{ ...inp, flex: 1, minWidth: 180, padding: "7px 12px" }} />
        <select value={setor} onChange={e => setSetor(e.target.value)} style={inp}>
          <option value="">Todos os setores</option>
          {MACRO_SETORES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={porte} onChange={e => setPorte(e.target.value)} style={inp}>
          <option value="">Todos os portes</option>
          {PORTES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={ordem} onChange={e => setOrdem(e.target.value)} style={inp}>
          <option value="recente">Mais recentes</option>
          <option value="antigo">Mais antigos</option>
          <option value="az">A → Z</option>
        </select>
        {(busca || setor || porte) && (
          <button onClick={() => { setBusca(""); setSetor(""); setPorte(""); }}
            style={{ ...inp, color: DS.pink, border: `1px solid ${DS.pink}`, background: "none", fontWeight: 700 }}>
            Limpar
          </button>
        )}
        <span style={{ fontSize: 11, color: C.textDis, marginLeft: "auto", fontFamily: F }}>
          {filtrado.length} de {historico.length} diagnóstico{historico.length !== 1 ? "s" : ""}
        </span>
      </div>

      {filtrado.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: C.textDis, fontSize: 13, fontFamily: F }}>Nenhum resultado.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {filtrado.map((d, i) => {
            const avg = [d.score_singularidade, d.score_consistencia, d.score_posicionamento]
              .filter(Boolean).reduce((a, b, _, arr) => a + b / arr.length, 0);
            const scoreColor = avg >= 7 ? DS.green : avg >= 4 ? DS.amber : DS.pink;
            return (
              <div key={d.id} onClick={() => onOpen(d)}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 14px", borderRadius: 8, cursor: "pointer", background: i % 2 === 0 ? C.row0 : C.row1, transition: "opacity 0.15s", border: `1px solid ${C.border}` }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                <div style={{ width: 32, height: 32, borderRadius: 6, background: DS.green + "22", color: DS.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, fontFamily: F, flexShrink: 0 }}>
                  {(d.empresa || "?").charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: F }}>{d.empresa}</div>
                  {(d.setor || d.porte) && (
                    <div style={{ fontSize: 11, color: C.textDis, fontFamily: F }}>
                      {[normalizeSector(d.setor), d.porte].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: C.textDis, flexShrink: 0, textAlign: "right", fontFamily: F }}>
                  {fmtDate(d.created_at)}
                  {d.user_name && <div style={{ fontSize: 10 }}>{d.user_name}</div>}
                </div>
                {avg > 0 && (
                  <div style={{ width: 34, height: 34, borderRadius: 6, background: scoreColor + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: scoreColor }}>{avg.toFixed(0)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── AppInterno ─────────────────────────────────────────────────── */
export function AppInterno({ user, onLogout }) {
  const [isDark, setIsDark]                           = useState(() => {
    const saved = localStorage.getItem("loudr-admin-theme");
    return saved !== null ? saved === "dark" : true;
  });
  const [page, setPage]                               = useState("historico");
  const [solicitacoes, setSolicitacoes]               = useState([]);
  const [loadingSol, setLoadingSol]                   = useState(true);
  const [historico, setHistorico]                     = useState([]);
  const [loadingHist, setLoadingHist]                 = useState(true);
  const [histCount, setHistCount]                     = useState(0);
  const [selectedRel, setSelectedRel]                 = useState(null);
  const [streamSteps, setStreamSteps]                 = useState([]);
  const [partialData, setPartialData]                 = useState(null);
  const [error, setError]                             = useState("");
  const [rodando, setRodando]                         = useState(null);
  const [rateLimitCountdown, setRateLimitCountdown]   = useState(0);
  const [rateLimitAttempt, setRateLimitAttempt]       = useState(0);
  const [cooldownAtivo, setCooldownAtivo]             = useState(0);
  const [filtroSetor, setFiltroSetor]                 = useState("");
  const [searchVal, setSearchVal]                     = useState("");
  const cooldownRef = useRef(null);
  const mainRef     = useRef(null);

  /* color tokens — resolvem light/dark sem depender do MUI theme */
  const C = isDark ? {
    bg:           "#0D1B2A",
    sidebar:      "#0A1525",
    topbar:       "#162840",
    paper:        "#162840",
    border:       "#2A4A68",
    text:         "#D8E4F0",
    textSec:      "#96AABF",
    textDis:      "#4D6070",
    navActiveBg:  "#1B3050",
    navActiveText:"#FFFFFF",
    searchBg:     "#0D1B2A",
    rowAlt:       "#0D1B2A",
    shadow:       "rgba(0,0,0,0.3)",
  } : {
    bg:           "#F0F2F5",
    sidebar:      "#FFFFFF",
    topbar:       "#FFFFFF",
    paper:        "#FFFFFF",
    border:       "#E2EBE8",
    text:         "#0D1B2A",
    textSec:      "#4A5A6A",
    textDis:      "#8A9AB0",
    navActiveBg:  "#E1F5EE",
    navActiveText: DS.green,
    searchBg:     "#F5F7F8",
    rowAlt:       "#F7F9F8",
    shadow:       "rgba(0,0,0,0.06)",
  };

  useEffect(() => {
    fetchSolicitacoes();
    fetchHistorico();
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  function iniciarCooldown() {
    setCooldownAtivo(COOLDOWN_ENTRE_APROVACOES);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldownAtivo(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function fetchSolicitacoes() {
    setLoadingSol(true);
    const { data } = await supabase.from("solicitacoes").select("*").order("created_at", { ascending: false });
    setSolicitacoes(data || []);
    setLoadingSol(false);
  }

  async function fetchHistorico() {
    setLoadingHist(true);
    const { data, count } = await supabase.from("diagnosticos").select("*", { count: "exact" }).order("created_at", { ascending: false });
    setHistorico(data || []);
    setHistCount(count || 0);
    setLoadingHist(false);
  }

  async function aprovarERodar(sol) {
    if (cooldownAtivo > 0) return;
    setRodando(sol.id);
    setStreamSteps([]); setPartialData(null); setError("");
    setRateLimitCountdown(0); setRateLimitAttempt(0);
    setPage("streaming");
    iniciarCooldown();

    await supabase.from("solicitacoes").update({ status: "aprovado" }).eq("id", sol.id);

    const contextoCompleto = [
      sol.setor    && `Setor: ${sol.setor}`,
      sol.porte    && `Porte: ${sol.porte}`,
      sol.site     && `Site: ${sol.site}`,
      sol.contexto,
      `Solicitante: ${sol.nome} (${sol.email})`,
    ].filter(Boolean).join("\n");

    await runStream({
      empresa: sol.empresa,
      contexto: contextoCompleto,
      onSearchStep: (count, query) => {
        setStreamSteps(prev => { const u = [...prev]; u[count - 1] = query || `Busca ${count}`; return u; });
      },
      onText: txt => { const p = tryParseJSON(txt); if (p) setPartialData(p); },
      onRateLimit: (segundos, tentativa) => { setRateLimitCountdown(segundos); setRateLimitAttempt(tentativa); },
      onDone: async parsed => {
        const { data: diag } = await supabase.from("diagnosticos").insert({
          user_id: user.id, user_email: user.email,
          user_name: user.user_metadata?.full_name || user.email.split("@")[0],
          empresa: parsed.empresa, dominio: parsed.dominio,
          setor: normalizeSector(parsed.setor), porte: parsed.porte,
          score_singularidade: parsed.score_singularidade,
          score_consistencia: parsed.score_consistencia,
          score_posicionamento: parsed.score_posicionamento,
          frase_diagnostico: parsed.frase_diagnostico,
          data: parsed,
        }).select().single();

        await supabase.from("solicitacoes").update({ status: "concluido", diagnostico_id: diag?.id }).eq("id", sol.id);
        setRodando(null);
        await fetchSolicitacoes();
        await fetchHistorico();
        setSelectedRel({ data: parsed, meta: { id: diag?.id, created_at: new Date().toISOString(), user_name: user.user_metadata?.full_name || user.email.split("@")[0] } });
        setPage("relatorio");
      },
      onError: async msg => {
        setError(msg);
        await supabase.from("solicitacoes").update({ status: "erro" }).eq("id", sol.id);
        setRodando(null);
        setPage("solicitacoes");
      },
    });
  }

  async function rejeitarSolicitacao(id) {
    await supabase.from("solicitacoes").update({ status: "rejeitado" }).eq("id", id);
    setSolicitacoes(s => s.map(x => x.id === id ? { ...x, status: "rejeitado" } : x));
  }

  function navigate(p) {
    setPage(p);
    setError("");
    if (mainRef.current) mainRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }

  const statusColor = s => ({ pendente: DS.amber, aprovado: DS.green, concluido: DS.green, rejeitado: DS.pink, erro: DS.pink }[s] || DS.gray);
  const statusBg    = s => ({ pendente: DS.amberPale, aprovado: DS.greenPale, concluido: DS.greenPale, rejeitado: DS.pinkPale, erro: DS.pinkPale }[s] || DS.grayLight);
  const pendentes   = solicitacoes.filter(s => s.status === "pendente").length;
  const userName    = user.user_metadata?.full_name || user.email.split("@")[0];
  const userInitial = userName.charAt(0).toUpperCase();

  const navItems = [
    { id: "historico",    label: "Dashboard",        Icon: IcoChart, badge: null },
    { id: "solicitacoes", label: "Solicitações",     Icon: IcoInbox, badge: pendentes > 0 ? pendentes : null },
    { id: "novo",         label: "Novo diagnóstico", Icon: IcoPlus,  badge: null },
    { id: "todos",        label: "Diagnósticos",     Icon: IcoList,  badge: null },
  ];

  const pageHeaders = {
    solicitacoes: { title: "Fila de solicitações",    sub: "Aprove para gerar o diagnóstico ou rejeite a solicitação." },
    novo:         { title: "Novo diagnóstico",        sub: "Gere um diagnóstico manualmente para qualquer empresa." },
    historico:    { title: "Dashboard",               sub: `${histCount} relatório${histCount !== 1 ? "s" : ""} gerado${histCount !== 1 ? "s" : ""} pela equipe LOUDR.` },
    todos:        { title: "Todos os diagnósticos",   sub: `Lista completa — ${histCount} diagnóstico${histCount !== 1 ? "s" : ""}.` },
  };

  const ph = pageHeaders[page];

  return (
    <ThemeProvider theme={isDark ? themeDark : themeLight}>
      <CssBaseline />
      <GlobalStyle />

      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, height: TOP_H,
        background: C.topbar, borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center",
        zIndex: 100, fontFamily: F,
        boxShadow: `0 1px 8px ${C.shadow}`,
      }}>
        {/* Logo area (alinha com sidebar) */}
        <div style={{ width: NAV_W, flexShrink: 0, padding: "0 20px", display: "flex", alignItems: "center", gap: 10, borderRight: `1px solid ${C.border}`, height: "100%" }}>
          <img src={isDark ? logoNegativa : logoPositivo} alt="LOUDR" style={{ height: 22, display: "block" }} />
        </div>

        {/* Search */}
        <div style={{ flex: 1, padding: "0 20px", maxWidth: 380 }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textDis, pointerEvents: "none", fontSize: 13 }}>🔍</span>
            <input
              value={searchVal}
              onChange={e => { setSearchVal(e.target.value); if (e.target.value) navigate("todos"); }}
              placeholder="Buscar empresa..."
              style={{
                width: "100%", padding: "7px 12px 7px 32px",
                background: C.searchBg, border: `1px solid ${C.border}`,
                borderRadius: 8, fontSize: 13, color: C.text, fontFamily: F,
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, paddingRight: 20 }}>
          {/* Dark/light toggle */}
          <button
            onClick={() => setIsDark(d => { const next = !d; localStorage.setItem("loudr-admin-theme", next ? "dark" : "light"); return next; })}
            title={isDark ? "Modo claro" : "Modo escuro"}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 34, height: 34, borderRadius: 8, cursor: "pointer",
              background: "none", border: `1px solid ${C.border}`,
              color: C.textSec, transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = DS.green; e.currentTarget.style.borderColor = DS.green; }}
            onMouseLeave={e => { e.currentTarget.style.color = C.textSec; e.currentTarget.style.borderColor = C.border; }}
          >
            {isDark ? <IcoSun /> : <IcoMoon />}
          </button>

          {/* Bell */}
          <button
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 34, height: 34, borderRadius: 8, cursor: "pointer",
              background: "none", border: `1px solid ${C.border}`,
              color: C.textSec, position: "relative",
            }}
          >
            <IcoBell />
            {pendentes > 0 && (
              <span style={{
                position: "absolute", top: 4, right: 4,
                width: 8, height: 8, borderRadius: "50%",
                background: DS.pink,
              }} />
            )}
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 24, background: C.border, margin: "0 6px" }} />

          {/* Avatar */}
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: DS.green, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 900, fontFamily: F, cursor: "default",
            flexShrink: 0,
          }}>
            {userInitial}
          </div>

          <div style={{ marginLeft: 2 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: F, lineHeight: 1.2 }}>{userName}</div>
            <div style={{ fontSize: 10, color: C.textDis, fontFamily: F }}>LOUDR Admin</div>
          </div>
        </div>
      </header>

      {/* ── Layout body ─────────────────────────────────────────── */}
      <div style={{ display: "flex", minHeight: "100vh", background: C.bg, paddingTop: TOP_H }}>

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside style={{
          width: NAV_W, flexShrink: 0,
          background: C.sidebar,
          borderRight: `1px solid ${C.border}`,
          position: "fixed", top: TOP_H, bottom: 0, left: 0,
          overflowY: "auto",
          display: "flex", flexDirection: "column",
        }}>
          <div style={{ padding: "16px 20px 6px", fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textDis, fontFamily: F }}>
            Menu
          </div>

          <nav style={{ flex: 1, padding: "4px 10px" }}>
            {navItems.map(({ id, label, Icon, badge }) => {
              const active = page === id || (page === "streaming" && id === "solicitacoes") || (page === "relatorio" && id === "todos");
              return (
                <button key={id} onClick={() => navigate(id)} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 8, border: "none",
                  borderLeft: active ? `3px solid ${DS.green}` : "3px solid transparent",
                  background: active ? C.navActiveBg : "transparent",
                  color: active ? C.navActiveText : C.textSec,
                  cursor: "pointer", fontFamily: F, fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  textAlign: "left", width: "100%",
                  transition: "all 0.15s",
                  marginBottom: 2,
                }}>
                  <span style={{ display: "flex", alignItems: "center", opacity: active ? 1 : 0.6 }}>
                    <Icon />
                  </span>
                  <span style={{ flex: 1 }}>{label}</span>
                  {badge && (
                    <span style={{ background: DS.pink, color: "#fff", borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "1px 7px" }}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Cooldown indicator */}
          {cooldownAtivo > 0 && (
            <div style={{ margin: "0 10px 8px", padding: "8px 12px", background: DS.amberPale, borderRadius: 8, border: `1px solid ${DS.amber}44` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: DS.amber, fontFamily: F }}>Cooldown ativo</div>
              <div style={{ fontSize: 12, color: DS.amber, fontFamily: F }}>{cooldownAtivo}s restantes</div>
            </div>
          )}

          {/* User / logout */}
          <div style={{ padding: "10px 10px 16px", borderTop: `1px solid ${C.border}` }}>
            <div style={{ padding: "4px 12px 6px", fontSize: 11, color: C.textDis, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: F }}>
              {user.email}
            </div>
            <button onClick={onLogout} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px", borderRadius: 8, border: "none",
              background: "transparent", color: DS.pink,
              cursor: "pointer", fontFamily: F, fontSize: 12, fontWeight: 600,
              width: "100%", textAlign: "left",
            }}>
              <IcoLogout /> Sair da conta
            </button>
          </div>
        </aside>

        {/* ── Main ─────────────────────────────────────────────── */}
        <main ref={mainRef} style={{
          flex: 1, marginLeft: NAV_W,
          minHeight: `calc(100vh - ${TOP_H}px)`,
          background: C.bg, overflowX: "hidden",
        }}>

          {/* Page header */}
          {ph && (
            <div style={{
              background: C.topbar, borderBottom: `1px solid ${C.border}`,
              padding: "16px 28px", display: "flex", alignItems: "center", gap: 16,
            }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: C.text, letterSpacing: "-0.02em", fontFamily: F }}>{ph.title}</div>
                <div style={{ fontSize: 12, color: C.textSec, marginTop: 1, fontFamily: F }}>{ph.sub}</div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: DS.pinkPale, border: `1px solid #F4C0D1`, borderRadius: 10, padding: "12px 18px", margin: "16px 28px 0" }}>
              <div style={{ fontWeight: 800, color: DS.pink, marginBottom: 4, fontSize: 13, fontFamily: F }}>Erro</div>
              <div style={{ fontSize: 13, color: "#72243E", fontFamily: F }}>{error}</div>
              <button onClick={() => setError("")} style={{ marginTop: 8, fontSize: 12, cursor: "pointer", background: "none", border: `1px solid ${DS.border}`, borderRadius: 6, padding: "3px 10px", color: C.textSec, fontFamily: F }}>Fechar</button>
            </div>
          )}

          {/* Page content */}
          <div style={{ padding: "24px 28px 48px" }}>

            {/* ── Solicitações ── */}
            {page === "solicitacoes" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 24 }}>
                  {[
                    { val: solicitacoes.length,                                   lbl: "total de pedidos" },
                    { val: pendentes,                                             lbl: "aguardando aprovação", highlight: pendentes > 0 },
                    { val: solicitacoes.filter(s => s.status === "concluido").length, lbl: "diagnósticos gerados" },
                    { val: solicitacoes.filter(s => s.status === "rejeitado").length, lbl: "rejeitados" },
                  ].map((s, i) => (
                    <div key={i} style={{
                      background: s.highlight ? DS.amberPale : C.paper,
                      border: s.highlight ? `1px solid ${DS.amber}44` : `1px solid ${C.border}`,
                      borderRadius: 10, padding: "14px 18px",
                      boxShadow: `0 1px 4px ${C.shadow}`,
                    }}>
                      <div style={{ fontSize: 26, fontWeight: 900, color: s.highlight ? DS.amber : C.text, fontFamily: F }}>{s.val}</div>
                      <div style={{ fontSize: 11, color: C.textDis, marginTop: 3, fontFamily: F }}>{s.lbl}</div>
                    </div>
                  ))}
                </div>

                {loadingSol ? (
                  <div style={{ textAlign: "center", padding: "3rem", color: C.textDis, fontFamily: F }}>Carregando...</div>
                ) : solicitacoes.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "4rem", color: C.textDis, fontFamily: F }}>
                    <div style={{ fontSize: 14, marginBottom: 6 }}>Nenhuma solicitação ainda.</div>
                    <div style={{ fontSize: 12 }}>Compartilhe a página pública para receber pedidos.</div>
                  </div>
                ) : (
                  solicitacoes.map(sol => (
                    <div key={sol.id} style={{
                      background: C.paper, border: `1px solid ${C.border}`,
                      borderRadius: 10, padding: "16px 20px", marginBottom: 10,
                      boxShadow: `0 1px 4px ${C.shadow}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 15, fontWeight: 800, color: C.text, fontFamily: F }}>{sol.empresa}</span>
                            <Pill bg={statusBg(sol.status)} color={statusColor(sol.status)}>{sol.status}</Pill>
                            {sol.setor && <span style={{ fontSize: 12, color: C.textDis, fontFamily: F }}>{normalizeSector(sol.setor)} · {sol.porte}</span>}
                          </div>
                          <div style={{ fontSize: 12, color: C.textDis, marginBottom: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontFamily: F }}>
                            {sol.nome} · {sol.email} · {fmtDate(sol.created_at)}
                            {(() => {
                              const s = calcularScoreLead(sol);
                              return (
                                <span style={{ background: s >= 60 ? DS.greenPale : s >= 30 ? DS.amberPale : DS.pinkPale, color: s >= 60 ? DS.green : s >= 30 ? DS.amber : DS.pink, fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "1px 8px" }}>
                                  Lead {s}%
                                </span>
                              );
                            })()}
                          </div>
                          {sol.site && <div style={{ fontSize: 12, color: C.textSec, fontFamily: F }}>{sol.site}</div>}
                          {sol.contexto && (
                            <div style={{ marginTop: 8, padding: "8px 12px", background: isDark ? "#0D1B2A" : DS.grayLight, borderRadius: 8, fontSize: 12, color: C.textSec, lineHeight: 1.55, fontFamily: F }}>
                              {sol.contexto}
                            </div>
                          )}
                        </div>
                        {sol.status === "pendente" && (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={() => rejeitarSolicitacao(sol.id)}
                                style={{ background: "none", border: `1px solid ${DS.pink}44`, borderRadius: 8, padding: "7px 14px", fontSize: 12, color: DS.pink, cursor: "pointer", fontFamily: F }}>
                                Rejeitar
                              </button>
                              <button onClick={() => aprovarERodar(sol)} disabled={cooldownAtivo > 0}
                                style={{ background: cooldownAtivo > 0 ? C.textDis : DS.green, border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 700, color: "#fff", cursor: cooldownAtivo > 0 ? "not-allowed" : "pointer", fontFamily: F }}>
                                {cooldownAtivo > 0 ? `Aguarde ${cooldownAtivo}s` : "Aprovar e rodar →"}
                              </button>
                            </div>
                          </div>
                        )}
                        {sol.status === "concluido" && (
                          <button onClick={() => {
                            const diag = historico.find(h => h.id === sol.diagnostico_id);
                            if (diag) { setSelectedRel({ data: diag.data, meta: diag }); navigate("relatorio"); }
                          }} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 14px", fontSize: 12, color: DS.green, cursor: "pointer", fontFamily: F, flexShrink: 0 }}>
                            Ver relatório →
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {page === "novo" && (
              <NovoManual user={user} onDone={async (parsed, meta) => {
                await fetchHistorico();
                setSelectedRel({ data: parsed, meta });
                navigate("relatorio");
              }} />
            )}

            {page === "streaming" && (
              <StreamingView searchSteps={streamSteps} partialData={partialData} rateLimitCountdown={rateLimitCountdown} rateLimitAttempt={rateLimitAttempt} />
            )}

            {page === "relatorio" && selectedRel && (
              <RelatorioCompleto
                data={selectedRel.data}
                meta={selectedRel.meta}
                onBack={() => navigate("historico")}
                backLabel="← Voltar ao histórico"
              />
            )}

            {page === "historico" && (
              loadingHist ? (
                <div style={{ textAlign: "center", padding: "3rem", color: C.textDis, fontFamily: F }}>Carregando...</div>
              ) : historico.length === 0 ? (
                <div style={{ textAlign: "center", padding: "4rem", color: C.textDis, fontFamily: F }}>Nenhum diagnóstico gerado ainda.</div>
              ) : (
                <DashboardHistorico
                  historico={historico}
                  onVerRelatorio={d => { setSelectedRel({ data: d.data, meta: d }); navigate("relatorio"); }}
                  onVerTodos={() => { setFiltroSetor(""); navigate("todos"); }}
                  onSetorClick={s => { setFiltroSetor(s); navigate("todos"); }}
                />
              )
            )}

            {page === "todos" && (
              <TodosPage
                historico={historico}
                loadingHist={loadingHist}
                initialSetor={filtroSetor}
                isDark={isDark}
                onOpen={d => { setSelectedRel({ data: d.data, meta: d }); navigate("relatorio"); }}
              />
            )}
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
