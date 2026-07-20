import { useState, useEffect, useRef } from "react";
import { ThemeProvider, CssBaseline, Popover, Box, Stack, Typography, Button, Divider } from "@mui/material";
import { theme as themeDark, themeLight } from "../lib/theme";
import logoPositivo from "../assets/logo-positivo-200px.png";
import logoNegativa from "../assets/negativa.svg";
import { supabase } from "../lib/supabase";
import { DS, F, COOLDOWN_ENTRE_APROVACOES } from "../lib/constants";
import { fmtDate, normalizeSector, calcularScoreLead, MACRO_SETORES, slugify, tenantUrl } from "../lib/helpers";
import { creditsForProvider, brlFromCredits, usdFromCredits, modelLabel } from "../lib/studioCosts";
import { GlobalStyle } from "../components/GlobalStyle";
import { Pill } from "../components/Pill";
import { RelatorioCompleto } from "../components/RelatorioCompleto";
import { NovoDiagnosticoDialog } from "./NovoManual";
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
const IcoCoins  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1110.34 18"/><path d="M7 6h1v4"/><path d="M16.71 13.88l.7.71-2.82 2.82"/></svg>;
const IcoBrain  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-4.96.44 2.5 2.5 0 01-2.96-3.08 3 3 0 01-.34-5.58 2.5 2.5 0 011.32-4.24 2.5 2.5 0 014.44-2.04z"/><path d="M14.5 2A2.5 2.5 0 0012 4.5v15a2.5 2.5 0 004.96.44 2.5 2.5 0 002.96-3.08 3 3 0 00.34-5.58 2.5 2.5 0 00-1.32-4.24 2.5 2.5 0 00-4.44-2.04z"/></svg>;
const IcoSun    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const IcoMoon   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>;
const IcoBell   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;

/* ─── TodosPage ──────────────────────────────────────────────────── */
function TodosPage({ historico, loadingHist, onOpen, onRetry, retrying, initialSetor = "", isDark }) {
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
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          {filtrado.map((d, i) => {
            const status = d.status || "done";
            const isRunning = status === "running";
            const isError   = status === "error";
            const avg = [d.score_singularidade, d.score_consistencia, d.score_posicionamento]
              .filter(Boolean).reduce((a, b, _, arr) => a + b / arr.length, 0);
            const scoreColor = avg >= 7 ? DS.green : avg >= 4 ? DS.amber : DS.pink;
            const isRetrying = retrying === d.id;
            return (
              <div key={d.id} onClick={() => !isRunning && !isError && onOpen(d)}
                style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "11px 14px", borderRadius: 8,
                  cursor: (isRunning || isError) ? "default" : "pointer",
                  background: i % 2 === 0 ? C.row0 : C.row1,
                  transition: "opacity 0.15s", border: `1px solid ${C.border}`,
                  opacity: isRunning ? 0.85 : 1,
                }}
                onMouseEnter={e => { if (!isRunning && !isError) e.currentTarget.style.opacity = "0.7"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = isRunning ? "0.85" : "1"; }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 6, background: (isError ? DS.pink : isRunning ? DS.amber : DS.green) + "22", color: (isError ? DS.pink : isRunning ? DS.amber : DS.green), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, fontFamily: F, flexShrink: 0 }}>
                  {isRunning ? (
                    <div style={{ width: 14, height: 14, border: `2px solid ${DS.amber}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  ) : (
                    (d.empresa || "?").charAt(0).toUpperCase()
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: F }}>{d.empresa}</div>
                    {isRunning && <Pill bg={DS.amberPale} color={DS.amber}>em andamento</Pill>}
                    {isError   && <Pill bg={DS.pinkPale}  color={DS.pink}>erro</Pill>}
                  </div>
                  {isError && d.data?.error ? (
                    <div style={{ fontSize: 11, color: DS.pink, fontFamily: F, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.data.error}
                    </div>
                  ) : (d.setor || d.porte) && (
                    <div style={{ fontSize: 11, color: C.textDis, fontFamily: F }}>
                      {[normalizeSector(d.setor), d.porte].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: C.textDis, flexShrink: 0, textAlign: "right", fontFamily: F }}>
                  {fmtDate(d.created_at)}
                  {d.user_name && <div style={{ fontSize: 10 }}>{d.user_name}</div>}
                </div>
                {isError && onRetry && (
                  <button
                    onClick={e => { e.stopPropagation(); onRetry(d); }}
                    disabled={isRetrying}
                    style={{
                      background: isRetrying ? C.textDis : DS.green, border: "none", borderRadius: 8,
                      padding: "6px 12px", fontSize: 11, fontWeight: 700, color: "#fff",
                      cursor: isRetrying ? "not-allowed" : "pointer", fontFamily: F, flexShrink: 0,
                    }}>
                    {isRetrying ? "Reiniciando..." : "Tentar novamente"}
                  </button>
                )}
                {!isError && !isRunning && avg > 0 && (
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
export function AppInterno({ user, onLogout, onImpersonate }) {
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
  const [selectedRel, setSelectedRel]   = useState(null);
  const [error, setError]               = useState("");
  const [rodando, setRodando]           = useState(null);
  const [retrying, setRetrying]         = useState(null);
  const [novoOpen, setNovoOpen]         = useState(false);
  const [bellAnchor, setBellAnchor]     = useState(null);
  const [wsCreateSignal, setWsCreateSignal] = useState(0);
  const [gerandoStep, setGerandoStep]   = useState(0);
  const [cooldownAtivo, setCooldownAtivo] = useState(0);
  const [filtroSetor, setFiltroSetor]   = useState("");
  const [searchVal, setSearchVal]       = useState("");
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

  useEffect(() => {
    if (page !== "gerando") return;
    const id = setInterval(() => setGerandoStep(s => s + 1), 8000);
    return () => clearInterval(id);
  }, [page]);

  // Polling automático enquanto houver diagnóstico em andamento — sincroniza
  // solicitação quando o diagnóstico termina (concluido/erro).
  useEffect(() => {
    const hasRunning = historico.some(d => d.status === "running");
    if (!hasRunning) return;
    const id = setInterval(async () => {
      const runningIds = historico.filter(d => d.status === "running").map(d => d.id);
      if (runningIds.length === 0) return;
      const { data: rows } = await supabase
        .from("diagnosticos")
        .select("*")
        .in("id", runningIds);
      if (!rows) return;
      const byId = new Map(rows.map(r => [r.id, r]));
      setHistorico(prev => prev.map(d => byId.get(d.id) || d));
      // sincroniza solicitação correspondente
      const settled = rows.filter(r => r.status !== "running");
      if (settled.length === 0) return;
      const { data: sols } = await supabase
        .from("solicitacoes").select("id, diagnostico_id, status")
        .in("diagnostico_id", settled.map(r => r.id));
      if (sols && sols.length) {
        await Promise.all(sols.map(s => {
          const diag = byId.get(s.diagnostico_id);
          if (!diag) return null;
          const next = diag.status === "done" ? "concluido" : diag.status === "error" ? "erro" : s.status;
          if (next === s.status) return null;
          return supabase.from("solicitacoes").update({ status: next }).eq("id", s.id);
        }));
        await fetchSolicitacoes();
      }
    }, 5000);
    return () => clearInterval(id);
  }, [historico]);

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
    setError("");
    iniciarCooldown();

    const contextoCompleto = [
      sol.setor    && `Setor: ${sol.setor}`,
      sol.porte    && `Porte: ${sol.porte}`,
      sol.site     && `Site: ${sol.site}`,
      sol.contexto,
      `Solicitante: ${sol.nome} (${sol.email})`,
    ].filter(Boolean).join("\n");

    const userName = user.user_metadata?.full_name || user.email.split("@")[0];

    try {
      const { data: diagRow, error: insErr } = await supabase
        .from("diagnosticos")
        .insert({
          user_id:    user.id,
          user_email: user.email,
          user_name:  userName,
          empresa:    sol.empresa,
          setor:      sol.setor,
          porte:      sol.porte,
          publico:    false,
          tipo:       "manual",
          status:     "running",
        })
        .select()
        .single();
      if (insErr || !diagRow) throw new Error(insErr?.message || "Não foi possível criar o registro.");

      await supabase.from("solicitacoes")
        .update({ status: "aprovado", diagnostico_id: diagRow.id }).eq("id", sol.id);

      setHistorico(prev => [diagRow, ...prev]);
      await fetchSolicitacoes();
      navigate("todos");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada.");

      const res = await fetch("/.netlify/functions/diagnostico-gerar-background", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body:    JSON.stringify({ empresa: sol.empresa, contexto: contextoCompleto, diagnostico_id: diagRow.id }),
      });
      if (!res.ok && res.status !== 202) throw new Error(`Erro ${res.status}`);
      setRodando(null);
    } catch (e) {
      setError(e.message || "Erro ao gerar diagnóstico.");
      setRodando(null);
    }
  }

  async function retryDiagnostico(d) {
    if (retrying) return;
    setRetrying(d.id);
    setError("");
    try {
      await supabase.from("diagnosticos")
        .update({ status: "running", data: null })
        .eq("id", d.id);
      setHistorico(prev => prev.map(x => x.id === d.id ? { ...x, status: "running", data: null } : x));

      // remonta contexto a partir de uma solicitação ligada, se houver
      const { data: sol } = await supabase
        .from("solicitacoes").select("*").eq("diagnostico_id", d.id).maybeSingle();
      const contextoCompleto = sol ? [
        sol.setor && `Setor: ${sol.setor}`,
        sol.porte && `Porte: ${sol.porte}`,
        sol.site  && `Site: ${sol.site}`,
        sol.contexto,
        `Solicitante: ${sol.nome} (${sol.email})`,
      ].filter(Boolean).join("\n") : null;

      if (sol) await supabase.from("solicitacoes").update({ status: "aprovado" }).eq("id", sol.id);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada.");

      const res = await fetch("/.netlify/functions/diagnostico-gerar-background", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body:    JSON.stringify({ empresa: d.empresa, contexto: contextoCompleto, diagnostico_id: d.id }),
      });
      if (!res.ok && res.status !== 202) throw new Error(`Erro ${res.status}`);
      await fetchSolicitacoes();
    } catch (e) {
      setError(e.message || "Erro ao reiniciar diagnóstico.");
    } finally {
      setRetrying(null);
    }
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
    { id: "todos",        label: "Diagnósticos",     Icon: IcoList,  badge: null },
    { id: "workspaces",   label: "Workspaces",       Icon: IcoList,  badge: null },
    { id: "custos",       label: "Custos",           Icon: IcoCoins, badge: null },
    { id: "cerebros",     label: "Cérebros",         Icon: IcoBrain, badge: null },
  ];

  const pendentesList = solicitacoes.filter(s => s.status === "pendente");

  const historicoDone = historico.filter(d => (d.status || "done") === "done");
  const doneCount     = historicoDone.length;

  const pageHeaders = {
    workspaces:   { title: "Workspaces",              sub: "Gerencie os workspaces dos clientes, convide membros e entre como cliente." },
    solicitacoes: { title: "Fila de solicitações",    sub: "Aprove para gerar o diagnóstico ou rejeite a solicitação." },
    historico:    { title: "Dashboard",               sub: `${doneCount} relatório${doneCount !== 1 ? "s" : ""} gerado${doneCount !== 1 ? "s" : ""} pela equipe LOUDR.` },
    todos:        { title: "Todos os diagnósticos",   sub: `Lista completa — ${historico.length} item${historico.length !== 1 ? "ns" : ""} (${doneCount} concluído${doneCount !== 1 ? "s" : ""}).` },
    custos:       { title: "Custos de geração",       sub: "Consumo e custo estimado da borda (Studio) por modelo e por conta." },
    cerebros:     { title: "Cérebros de marca",       sub: "A inteligência de cada tenant: versão, confiança, sinais, dataset — e destilação sob demanda." },
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
            onClick={e => setBellAnchor(e.currentTarget)}
            title="Solicitações"
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
                position: "absolute", top: 2, right: 2,
                minWidth: 14, height: 14, padding: "0 4px", borderRadius: 99,
                background: DS.pink, color: "#fff", fontSize: 9, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F,
              }}>{pendentes}</span>
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
              const active = page === id || (page === "gerando" && id === "solicitacoes") || (page === "relatorio" && id === "todos");
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
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: C.text, letterSpacing: "-0.02em", fontFamily: F }}>{ph.title}</div>
                <div style={{ fontSize: 12, color: C.textSec, marginTop: 1, fontFamily: F }}>{ph.sub}</div>
              </div>
              {(page === "todos" || page === "historico") && (
                <button onClick={() => setNovoOpen(true)}
                  style={{ background: DS.green, color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 800, fontFamily: F, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Novo diagnóstico
                </button>
              )}
              {page === "workspaces" && (
                <button onClick={() => setWsCreateSignal(s => s + 1)}
                  style={{ background: DS.green, color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 800, fontFamily: F, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Criar workspace
                </button>
              )}
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

            {page === "gerando" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "40vh", gap: 20, textAlign: "center", fontFamily: F }}>
                <div style={{ width: 48, height: 48, border: `3px solid ${DS.green}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 6 }}>Gerando diagnóstico</div>
                  <div style={{ fontSize: 13, color: C.textSec, minHeight: 20 }}>
                    {["Pesquisando o site e fontes públicas...", "Aplicando framework Smart Branding...", "Calculando scores...", "Mapeando gaps de identidade...", "Identificando oportunidades...", "Finalizando..."][gerandoStep % 6]}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: C.textDis }}>Pode fechar esta aba — o diagnóstico continuará no servidor</div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {page === "relatorio" && selectedRel && (
              <RelatorioCompleto
                data={{ ...(selectedRel.meta || {}), ...(selectedRel.data || {}) }}
                meta={selectedRel.meta}
                onBack={() => navigate("historico")}
                backLabel="← Voltar ao histórico"
              />
            )}

            {page === "historico" && (
              loadingHist ? (
                <div style={{ textAlign: "center", padding: "3rem", color: C.textDis, fontFamily: F }}>Carregando...</div>
              ) : historicoDone.length === 0 ? (
                <div style={{ textAlign: "center", padding: "4rem", color: C.textDis, fontFamily: F }}>Nenhum diagnóstico gerado ainda.</div>
              ) : (
                <DashboardHistorico
                  historico={historicoDone}
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
                onRetry={retryDiagnostico}
                retrying={retrying}
              />
            )}

            {page === "workspaces" && (
              <WorkspacesAdmin
                user={user}
                C={C}
                isDark={isDark}
                onImpersonate={onImpersonate}
                createSignal={wsCreateSignal}
              />
            )}

            {page === "custos" && <CustosAdmin C={C} />}
            {page === "cerebros" && <CerebrosAdmin C={C} />}
          </div>
        </main>
      </div>

      <NovoDiagnosticoDialog
        open={novoOpen}
        onClose={() => setNovoOpen(false)}
        user={user}
        onCreate={criadas => {
          setHistorico(prev => [...criadas, ...prev]);
          navigate("todos");
        }}
      />

      <Popover
        open={Boolean(bellAnchor)}
        anchorEl={bellAnchor}
        onClose={() => setBellAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 380, maxHeight: 520, mt: 1, borderRadius: 2, overflow: "hidden" } } }}
      >
        <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider" }}>
          <Typography sx={{ fontWeight: 900, fontSize: 14 }}>Solicitações pendentes</Typography>
          {pendentesList.length > 0 && (
            <Typography sx={{ fontSize: 11, color: "text.secondary", fontWeight: 700 }}>{pendentesList.length}</Typography>
          )}
        </Box>
        {pendentesList.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>Nenhuma solicitação pendente.</Typography>
          </Box>
        ) : (
          <Box sx={{ overflowY: "auto", maxHeight: 380 }}>
            {pendentesList.map((sol, i) => (
              <Box key={sol.id} sx={{ p: 2, borderBottom: i < pendentesList.length - 1 ? 1 : 0, borderColor: "divider" }}>
                <Typography sx={{ fontWeight: 800, fontSize: 13 }}>{sol.empresa}</Typography>
                <Typography sx={{ fontSize: 11, color: "text.secondary", mb: 1 }}>
                  {sol.nome} · {sol.email}
                </Typography>
                {sol.contexto && (
                  <Typography sx={{ fontSize: 11, color: "text.secondary", mb: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {sol.contexto}
                  </Typography>
                )}
                <Stack direction="row" spacing={1}>
                  <Button
                    onClick={() => rejeitarSolicitacao(sol.id)}
                    size="small" color="inherit"
                    sx={{ fontSize: 11, textTransform: "none", color: DS.pink, borderColor: DS.pink + "44", border: "1px solid", "&:hover": { borderColor: DS.pink, bgcolor: DS.pinkPale } }}
                  >Rejeitar</Button>
                  <Button
                    onClick={() => { setBellAnchor(null); aprovarERodar(sol); }}
                    disabled={cooldownAtivo > 0}
                    size="small" variant="contained"
                    sx={{ fontSize: 11, textTransform: "none", fontWeight: 800 }}
                  >
                    {cooldownAtivo > 0 ? `Aguarde ${cooldownAtivo}s` : "Aprovar e rodar"}
                  </Button>
                </Stack>
              </Box>
            ))}
          </Box>
        )}
        <Divider />
        <Box sx={{ p: 1.5, textAlign: "right" }}>
          <Button
            onClick={() => { setBellAnchor(null); navigate("solicitacoes"); }}
            size="small"
            sx={{ fontSize: 11, textTransform: "none", fontWeight: 700 }}
          >Ver todas →</Button>
        </Box>
      </Popover>
    </ThemeProvider>
  );
}

/* ─── CustosAdmin ────────────────────────────────────────────────── */

function CustosAdmin({ C }) {
  const [loading, setLoading] = useState(true);
  const [gens, setGens]       = useState([]);
  const [wsMap, setWsMap]     = useState({});
  const [periodo, setPeriodo] = useState("mes");   // mes | 90d | tudo

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [g, w] = await Promise.all([
        supabase.from("studio_generations").select("workspace_id,provider,media_type,status,created_at").limit(5000),
        supabase.from("workspaces").select("id,nome,plano,creditos_saldo"),
      ]);
      const m = {}; (w.data || []).forEach(x => { m[x.id] = x; });
      setGens(g.data || []); setWsMap(m); setLoading(false);
    })();
  }, []);

  const d0 = new Date();
  const cutoff = periodo === "mes"
    ? new Date(d0.getFullYear(), d0.getMonth(), 1).getTime()
    : periodo === "90d" ? Date.now() - 90 * 864e5 : 0;

  const rows = gens.filter(r => (r.status || "done") === "done" && new Date(r.created_at).getTime() >= cutoff);

  let totCred = 0, totImg = 0, totVid = 0;
  const porModelo = {}, porConta = {};
  rows.forEach(r => {
    const cred = creditsForProvider(r.provider, r.media_type);
    totCred += cred;
    if (r.media_type === "video") totVid++; else totImg++;
    const mk = modelLabel(r.provider);
    if (!porModelo[mk]) porModelo[mk] = { label: mk, tipo: r.media_type || "image", n: 0, cred: 0 };
    porModelo[mk].n++; porModelo[mk].cred += cred;
    const wid = r.workspace_id || "—";
    if (!porConta[wid]) porConta[wid] = { n: 0, cred: 0 };
    porConta[wid].n++; porConta[wid].cred += cred;
  });
  const modelos = Object.values(porModelo).sort((a, b) => b.cred - a.cred);
  const contas  = Object.entries(porConta).map(([id, v]) => ({ id, ...v, ws: wsMap[id] })).sort((a, b) => b.cred - a.cred);

  const brl = n => "R$ " + brlFromCredits(n).toFixed(2).replace(".", ",");
  const usd = n => "US$ " + usdFromCredits(n).toFixed(2);

  const card = { background: C.topbar, border: `1px solid ${C.border}`, borderRadius: 12 };
  const th   = { textAlign: "left", padding: "9px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.textDis, fontFamily: F, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" };
  const td   = { padding: "10px 14px", fontSize: 13, color: C.text, fontFamily: F, borderBottom: `1px solid ${C.border}` };
  const thR  = { ...th, textAlign: "right" };
  const tdR  = { ...td, textAlign: "right" };

  if (loading) return <div style={{ textAlign: "center", padding: "3rem", color: C.textDis, fontFamily: F }}>Carregando…</div>;

  const stats = [
    { lbl: "Custo estimado", val: brl(totCred), sub: usd(totCred) },
    { lbl: "Créditos consumidos", val: totCred.toLocaleString("pt-BR"), sub: `${rows.length} gerações` },
    { lbl: "Imagens", val: totImg.toLocaleString("pt-BR"), sub: "1 crédito base" },
    { lbl: "Vídeos", val: totVid.toLocaleString("pt-BR"), sub: "5–108 créditos" },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {[{ k: "mes", l: "Mês atual" }, { k: "90d", l: "90 dias" }, { k: "tudo", l: "Tudo" }].map(p => (
          <button key={p.k} onClick={() => setPeriodo(p.k)} style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: F, cursor: "pointer",
            border: `1px solid ${periodo === p.k ? DS.green : C.border}`,
            background: periodo === p.k ? DS.green : "transparent",
            color: periodo === p.k ? "#fff" : C.textSec,
          }}>{p.l}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 22 }}>
        {stats.map(s => (
          <div key={s.lbl} style={{ ...card, padding: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.textDis, fontFamily: F }}>{s.lbl}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: C.text, fontFamily: F, marginTop: 4, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 11, color: C.textSec, fontFamily: F, marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div style={{ ...card, padding: 32, textAlign: "center", color: C.textDis, fontFamily: F }}>Nenhuma geração no período.</div>
      ) : (
        <>
          <div style={{ ...card, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "13px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 13, fontWeight: 800, color: C.text, fontFamily: F }}>Por modelo</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Modelo</th><th style={thR}>Gerações</th><th style={thR}>Créditos</th><th style={thR}>Custo</th></tr></thead>
              <tbody>
                {modelos.map(m => (
                  <tr key={m.label}>
                    <td style={td}><span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 2, background: m.tipo === "video" ? DS.amber : DS.green, marginRight: 8, verticalAlign: "middle" }} />{m.label}</td>
                    <td style={tdR}>{m.n}</td>
                    <td style={tdR}>{m.cred.toLocaleString("pt-BR")}</td>
                    <td style={{ ...tdR, fontWeight: 700 }}>{brl(m.cred)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ ...card, overflow: "hidden" }}>
            <div style={{ padding: "13px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 13, fontWeight: 800, color: C.text, fontFamily: F }}>Por conta</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Conta</th><th style={thR}>Gerações</th><th style={thR}>Créditos</th><th style={thR}>Custo</th><th style={thR}>Saldo atual</th></tr></thead>
              <tbody>
                {contas.map(c => (
                  <tr key={c.id}>
                    <td style={td}>{c.ws?.nome || c.id.slice(0, 8)}</td>
                    <td style={tdR}>{c.n}</td>
                    <td style={tdR}>{c.cred.toLocaleString("pt-BR")}</td>
                    <td style={{ ...tdR, fontWeight: 700 }}>{brl(c.cred)}</td>
                    <td style={{ ...tdR, color: C.textSec }}>{c.ws?.creditos_saldo ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div style={{ fontSize: 11, color: C.textDis, fontFamily: F, marginTop: 16, lineHeight: 1.5 }}>
        Custo estimado a partir do mapa de créditos (créditos ≈ 18 × custo_USD; câmbio R$5,50). A duração de vídeo assume o menor tier. Não inclui a inteligência (diagnóstico, listening, assistant) — fair-use, sem crédito. "Gerações" = 1 imagem = 1 token.
      </div>
    </div>
  );
}

/* ─── CerebrosAdmin — todos os cérebros de marca (cross-tenant) ───── */

function CerebrosAdmin({ C }) {
  const [loading, setLoading]     = useState(true);
  const [rows, setRows]           = useState([]);
  const [globais, setGlobais]     = useState({ comCerebro: 0, totalMarcas: 0, confMedia: null, pendentes: 0, dataset: 0 });
  const [distilling, setDistilling] = useState({});   // brand_id → 'run' | 'ok' | 'err'

  async function load() {
    setLoading(true);
    const [b, w, bi, sig, ds, votes] = await Promise.all([
      supabase.from("brands").select("id,nome,workspace_id"),
      supabase.from("workspaces").select("id,nome,plano"),
      supabase.from("brand_intelligence").select("brand_id,versao,confianca_media,created_at").order("versao", { ascending: true }),
      supabase.from("brand_signals").select("brand_id,consumido_em").limit(10000),
      supabase.from("brand_dataset").select("brand_id").limit(10000),
      supabase.from("studio_generations").select("brand_id,feedback").not("feedback", "is", null).limit(10000),
    ]);

    const wsMap = {}; (w.data || []).forEach(x => { wsMap[x.id] = x; });

    const porMarca = {};
    (b.data || []).forEach(x => {
      porMarca[x.id] = { brand: x, ws: wsMap[x.workspace_id], versoes: [], sinais: 0, pendentes: 0, dataset: 0, up: 0, votos: 0 };
    });
    (bi.data  || []).forEach(v => porMarca[v.brand_id]?.versoes.push(v));
    (sig.data || []).forEach(s => { const m = porMarca[s.brand_id]; if (m) { m.sinais++; if (!s.consumido_em) m.pendentes++; } });
    (ds.data  || []).forEach(d => { if (porMarca[d.brand_id]) porMarca[d.brand_id].dataset++; });
    (votes.data || []).forEach(v => { const m = porMarca[v.brand_id]; if (m) { m.votos++; if (v.feedback === "up") m.up++; } });

    const list = Object.values(porMarca).map(m => {
      const atual = m.versoes[m.versoes.length - 1] || null;
      const prev  = m.versoes.length > 1 ? m.versoes[m.versoes.length - 2] : null;
      return {
        ...m,
        atual,
        confDelta: atual?.confianca_media != null && prev?.confianca_media != null
          ? atual.confianca_media - prev.confianca_media : null,
        approval: m.votos ? m.up / m.votos : null,
      };
    }).sort((a, b) => (b.pendentes - a.pendentes) || ((b.atual?.confianca_media || 0) - (a.atual?.confianca_media || 0)));

    const comCerebro = list.filter(m => m.atual).length;
    const confs = list.map(m => m.atual?.confianca_media).filter(x => x != null);
    setGlobais({
      comCerebro, totalMarcas: list.length,
      confMedia: confs.length ? confs.reduce((a, x) => a + x, 0) / confs.length : null,
      pendentes: list.reduce((a, m) => a + m.pendentes, 0),
      dataset:   list.reduce((a, m) => a + m.dataset, 0),
    });
    setRows(list);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Destilação sob demanda: dispara a background function pro cérebro da marca.
  async function destilar(brandId) {
    setDistilling(d => ({ ...d, [brandId]: "run" }));
    try {
      const res = await fetch("/.netlify/functions/brand-distill-background", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_id: brandId }),
      });
      if (!res.ok && res.status !== 202) throw new Error(`Erro ${res.status}`);
      setDistilling(d => ({ ...d, [brandId]: "ok" }));
    } catch {
      setDistilling(d => ({ ...d, [brandId]: "err" }));
    }
  }

  const pctFmt  = n => (n == null ? "—" : `${Math.round(n * 100)}%`);
  const card = { background: C.topbar, border: `1px solid ${C.border}`, borderRadius: 12 };
  const th   = { textAlign: "left", padding: "9px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.textDis, fontFamily: F, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" };
  const td   = { padding: "10px 14px", fontSize: 13, color: C.text, fontFamily: F, borderBottom: `1px solid ${C.border}` };
  const thR  = { ...th, textAlign: "right" };
  const tdR  = { ...td, textAlign: "right" };

  if (loading) return <div style={{ textAlign: "center", padding: "3rem", color: C.textDis, fontFamily: F }}>Carregando…</div>;

  const stats = [
    { lbl: "Cérebros ativos", val: `${globais.comCerebro}/${globais.totalMarcas}`, sub: "marcas com modelo destilado" },
    { lbl: "Confiança média", val: pctFmt(globais.confMedia), sub: "última versão de cada cérebro" },
    { lbl: "Sinais pendentes", val: globais.pendentes.toLocaleString("pt-BR"), sub: "aguardando destilação" },
    { lbl: "Dataset", val: globais.dataset.toLocaleString("pt-BR"), sub: "exemplos julgados (contexto→output→avaliação)" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={load} style={{
          padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: F, cursor: "pointer",
          border: `1px solid ${C.border}`, background: "transparent", color: C.textSec,
        }}>Atualizar</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 22 }}>
        {stats.map(s => (
          <div key={s.lbl} style={{ ...card, padding: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.textDis, fontFamily: F }}>{s.lbl}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: C.text, fontFamily: F, marginTop: 4, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 11, color: C.textSec, fontFamily: F, marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div style={{ ...card, padding: 32, textAlign: "center", color: C.textDis, fontFamily: F }}>Nenhuma marca cadastrada.</div>
      ) : (
        <div style={{ ...card, overflow: "hidden" }}>
          <div style={{ padding: "13px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 13, fontWeight: 800, color: C.text, fontFamily: F }}>Por marca</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>Marca</th><th style={thR}>Versão</th><th style={thR}>Confiança</th>
              <th style={thR}>Sinais (pend.)</th><th style={thR}>Dataset</th><th style={thR}>Approval</th>
              <th style={thR}>Última destilação</th><th style={thR}></th>
            </tr></thead>
            <tbody>
              {rows.map(m => {
                const st = distilling[m.brand.id];
                return (
                  <tr key={m.brand.id}>
                    <td style={td}>
                      <span style={{ fontWeight: 700 }}>{m.ws?.nome || m.brand.nome}</span>
                      {m.ws?.plano && <span style={{ fontSize: 10, fontWeight: 700, color: PLANO_COR[m.ws.plano] || C.textDis, marginLeft: 8, textTransform: "uppercase" }}>{m.ws.plano}</span>}
                    </td>
                    <td style={tdR}>{m.atual ? `v${m.atual.versao}` : "—"}</td>
                    <td style={{ ...tdR, fontWeight: 700 }}>
                      {pctFmt(m.atual?.confianca_media)}
                      {m.confDelta != null && (
                        <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 6, color: m.confDelta >= 0 ? DS.green : DS.pink }}>
                          {m.confDelta >= 0 ? "▲" : "▼"}{Math.abs(Math.round(m.confDelta * 100))}
                        </span>
                      )}
                    </td>
                    <td style={tdR}>
                      {m.sinais.toLocaleString("pt-BR")}
                      {m.pendentes > 0 && <span style={{ color: DS.amber, fontWeight: 700 }}> ({m.pendentes})</span>}
                    </td>
                    <td style={tdR}>{m.dataset.toLocaleString("pt-BR")}</td>
                    <td style={tdR}>{pctFmt(m.approval)}</td>
                    <td style={{ ...tdR, color: C.textSec }}>{m.atual ? fmtDate(m.atual.created_at) : "—"}</td>
                    <td style={tdR}>
                      {m.pendentes > 0 && (
                        <button onClick={() => destilar(m.brand.id)} disabled={st === "run" || st === "ok"} style={{
                          padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 700, fontFamily: F,
                          cursor: st ? "default" : "pointer",
                          border: `1px solid ${st === "ok" ? DS.green : st === "err" ? DS.pink : C.border}`,
                          background: "transparent",
                          color: st === "ok" ? DS.green : st === "err" ? DS.pink : C.textSec,
                        }}>{st === "run" ? "Destilando…" : st === "ok" ? "Disparado ✓" : st === "err" ? "Falhou — tentar de novo" : "Destilar agora"}</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ fontSize: 11, color: C.textDis, fontFamily: F, marginTop: 16, lineHeight: 1.5 }}>
        Cada marca tem um cérebro próprio (modelo vivo versionado, destilado dos sinais de uso). "Destilar agora" roda em background (~1 min) — use Atualizar para ver a nova versão. Approval = votos 👍 sobre o total de peças avaliadas no Studio. Dataset = exemplos julgados, insumo do fine-tune por tenant no futuro.
      </div>
    </div>
  );
}

/* ─── WorkspacesAdmin ────────────────────────────────────────────── */
const WS_SETORES = ["Tecnologia","Saúde","Educação","Finanças","Varejo","Fashion","Indústria","Serviços","Alimentação","Imóveis","Logística","Mídia","Energia","Agronegócio","Outro"];
const WS_PORTES  = ["Startup","PME","Médio","Grande"];
const PLANO_COR  = { enterprise: DS.green, pro: '#9B6DFF', starter: '#EF9F27', trial: null };

// R$ (string do input) ↔ centavos (int no banco). Aceita "1.500,50", "1500,50" e "1500.50".
function reaisToCents(v) {
  if (v == null || v === '') return null;
  let s = String(v).trim();
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); // pt-BR: '.' milhar, ',' decimal
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
function centsToBRL(c) {
  if (c == null) return '—';
  return (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function WorkspacesAdmin({ user, C, isDark, onImpersonate, createSignal = 0 }) {
  const [workspaces, setWorkspaces]       = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showCreate, setShowCreate]       = useState(false);
  const [showInvite, setShowInvite]       = useState(null);
  const [creating, setCreating]           = useState(false);
  const [inviting, setInviting]           = useState(false);
  const [error, setError]                 = useState('');
  const [form, setForm]                   = useState({ nome: '', dominio: '', setor: '', porte: '', creditos_mes: '', valor: '', slug: '' });
  const [showConfig, setShowConfig]       = useState(null);
  const [configForm, setConfigForm]       = useState({ creditos_mes: '', valor: '', slug: '' });
  const [savingConfig, setSavingConfig]   = useState(false);
  const [inviteEmail, setInviteEmail]     = useState('');
  const [showCreateUser, setShowCreateUser] = useState(null);
  const [creatingUser, setCreatingUser]   = useState(false);
  const [userForm, setUserForm]           = useState({ nome: '', email: '', password: '', role: 'member' });
  const [userOk, setUserOk]               = useState('');
  const [expandedId, setExpandedId]       = useState(null);
  const [membersMap, setMembersMap]       = useState({});
  const [loadingMembers, setLoadingMembers] = useState({});

  useEffect(() => { fetchWorkspaces(); }, []);

  useEffect(() => {
    if (createSignal > 0) { setShowCreate(true); setError(''); }
  }, [createSignal]);

  async function fetchWorkspaces() {
    setLoading(true);
    const { data } = await supabase.from('workspaces').select('*').order('created_at', { ascending: false });
    setWorkspaces(data || []);
    setLoading(false);
  }

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }

  function openConfig(ws) {
    setShowConfig(ws);
    setConfigForm({
      creditos_mes: ws.creditos_mes != null ? String(ws.creditos_mes) : '',
      valor: ws.valor_mensal_centavos != null ? String(ws.valor_mensal_centavos / 100).replace('.', ',') : '',
      slug: ws.slug || '',
    });
    setError('');
  }

  async function saveConfig(e) {
    e.preventDefault();
    setError('');
    setSavingConfig(true);
    const pool  = parseInt(configForm.creditos_mes, 10) || 0;
    const cents = reaisToCents(configForm.valor);
    const { data, error } = await supabase.rpc('set_workspace_billing', {
      p_workspace: showConfig.id, p_creditos_mes: pool, p_valor_centavos: cents,
    });
    if (error) { setSavingConfig(false); setError(error.message || 'Erro ao salvar configuração'); return; }

    // slug (subdomínio) — atualiza só se mudou; índice único pode barrar colisão
    const novoSlug = slugify(configForm.slug);
    if (novoSlug && novoSlug !== showConfig.slug) {
      const { error: slugErr } = await supabase.from('workspaces').update({ slug: novoSlug }).eq('id', showConfig.id);
      if (slugErr) { setSavingConfig(false); setError(`Créditos salvos, mas o slug falhou: ${slugErr.message} (já em uso?)`); return; }
    }
    setSavingConfig(false);
    setWorkspaces(list => list.map(w => w.id === showConfig.id
      ? { ...w, creditos_mes: pool, valor_mensal_centavos: cents, creditos_saldo: data, slug: novoSlug || w.slug }
      : w));
    setShowConfig(null);
  }

  async function toggleAtivo(ws) {
    const novoAtivo = ws.ativo === false ? true : false;
    await supabase.from('workspaces').update({ ativo: novoAtivo }).eq('id', ws.id);
    setWorkspaces(list => list.map(w => w.id === ws.id ? { ...w, ativo: novoAtivo } : w));
  }

  async function toggleExpanded(wsId) {
    if (expandedId === wsId) { setExpandedId(null); return; }
    setExpandedId(wsId);
    if (membersMap[wsId]) return;
    setLoadingMembers(l => ({ ...l, [wsId]: true }));
    const token = await getToken();
    const res = await fetch(`/.netlify/functions/admin-list-members?workspace_id=${wsId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const json = await res.json();
    setMembersMap(m => ({ ...m, [wsId]: json.members || [] }));
    setLoadingMembers(l => ({ ...l, [wsId]: false }));
  }

  async function removeMember(wsId, memberId) {
    if (!window.confirm('Remover este membro do workspace?')) return;
    await supabase.from('workspace_members').delete().eq('id', memberId);
    setMembersMap(m => ({ ...m, [wsId]: m[wsId].filter(x => x.id !== memberId) }));
  }

  async function changeMemberRole(wsId, memberId, role) {
    await supabase.from('workspace_members').update({ role }).eq('id', memberId);
    setMembersMap(m => ({ ...m, [wsId]: m[wsId].map(x => x.id === memberId ? { ...x, role } : x) }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    if (!form.nome.trim()) { setError('Nome obrigatório'); return; }
    setCreating(true);
    const token = await getToken();
    const res = await fetch('/.netlify/functions/admin-create-workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        nome: form.nome, dominio: form.dominio, setor: form.setor, porte: form.porte,
        slug: form.slug,
        creditos_mes: parseInt(form.creditos_mes, 10) || 0,
        valor_mensal_centavos: reaisToCents(form.valor),
      }),
    });
    const json = await res.json();
    setCreating(false);
    if (!res.ok) { setError(json.error || 'Erro ao criar workspace'); return; }
    setShowCreate(false);
    setForm({ nome: '', dominio: '', setor: '', porte: '', creditos_mes: '', valor: '', slug: '' });
    fetchWorkspaces();
    // aviso não-bloqueante se o subdomínio não provisionou automático
    if (json.subdomain && !json.subdomain.ok) {
      alert(`Workspace criado, mas o subdomínio não foi provisionado automaticamente (${json.subdomain.reason}). Adicione o alias no Netlify manualmente ou configure NETLIFY_API_TOKEN.`);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    setError('');
    if (!inviteEmail.trim()) { setError('E-mail obrigatório'); return; }
    setInviting(true);
    const token = await getToken();
    const res = await fetch('/.netlify/functions/admin-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ email: inviteEmail, workspace_id: showInvite.id, workspace_name: showInvite.nome }),
    });
    const json = await res.json();
    setInviting(false);
    if (!res.ok) { setError(json.error || 'Erro ao enviar convite'); return; }
    setShowInvite(null);
    setInviteEmail('');
    alert(`Convite enviado para ${inviteEmail}`);
  }

  function genPassword() {
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let p = '';
    for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
    setUserForm(f => ({ ...f, password: p }));
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    setError(''); setUserOk('');
    if (!userForm.email.trim()) { setError('E-mail obrigatório'); return; }
    if (userForm.password.length < 8) { setError('Senha de pelo menos 8 caracteres'); return; }
    setCreatingUser(true);
    const token = await getToken();
    const res = await fetch('/.netlify/functions/admin-create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ ...userForm, workspace_id: showCreateUser.id }),
    });
    const json = await res.json();
    setCreatingUser(false);
    if (!res.ok) { setError(json.error || 'Erro ao criar acesso'); return; }
    setUserOk(`Acesso criado: ${userForm.email} / senha: ${userForm.password}`);
    if (membersMap[showCreateUser.id]) { setMembersMap(m => ({ ...m, [showCreateUser.id]: undefined })); }
  }

  const inp      = { fontSize: 13, fontFamily: F, color: C.text, background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', width: '100%', boxSizing: 'border-box', outline: 'none' };
  const inpSm    = { ...inp, padding: '4px 8px', width: 'auto', fontSize: 11 };
  const btn      = (color = DS.green) => ({ background: color, border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: F });
  const btnGhost = { background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, color: C.textSec, cursor: 'pointer', fontFamily: F };
  const btnDanger = { background: 'none', border: `1px solid ${DS.pink}44`, borderRadius: 6, padding: '4px 10px', fontSize: 11, color: DS.pink, cursor: 'pointer', fontFamily: F };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: C.textDis, fontFamily: F }}>Carregando...</div>;

  return (
    <div>
      {error && <div style={{ marginBottom: 16, padding: '10px 14px', background: DS.pinkPale, color: DS.pink, borderRadius: 8, fontSize: 13, fontFamily: F }}>{error}</div>}

      <div style={{ marginBottom: 20 }}>
        <span style={{ fontSize: 13, color: C.textDis, fontFamily: F }}>{workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}</span>
      </div>

      {workspaces.map(ws => {
        const inativo   = ws.ativo === false;
        const expanded  = expandedId === ws.id;
        const members   = membersMap[ws.id] || [];
        const loadingM  = loadingMembers[ws.id];

        return (
          <div key={ws.id} style={{
            background: C.paper, border: `1px solid ${inativo ? C.border : C.border}`,
            borderRadius: 10, marginBottom: 10, opacity: inativo ? 0.6 : 1,
            overflow: 'hidden',
          }}>
            {/* ── Linha principal ── */}
            <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: C.text, fontFamily: F }}>{ws.nome}</span>
                  {inativo && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: DS.pink, border: `1px solid ${DS.pink}55`, borderRadius: 4, padding: '1px 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      inativo
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: C.textDis, fontFamily: F, marginTop: 2 }}>
                  {ws.dominio && `${ws.dominio} · `}{ws.setor && `${ws.setor} · `}
                  criado {new Date(ws.created_at).toLocaleDateString('pt-BR')}
                </div>
                {ws.slug && (
                  <a href={tenantUrl(ws.slug)} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: DS.green, fontFamily: F, textDecoration: 'none', marginTop: 3, display: 'inline-block' }}>
                    {ws.slug}.s1ngulr.com ↗
                  </a>
                )}
              </div>

              {/* Cobrança do contrato */}
              <div style={{ textAlign: 'right', minWidth: 120 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text, fontFamily: F }}>
                  {ws.valor_mensal_centavos != null ? centsToBRL(ws.valor_mensal_centavos) : '—'}
                  <span style={{ fontSize: 10, color: C.textDis, fontWeight: 600 }}> /mês</span>
                </div>
                <div style={{ fontSize: 11, color: C.textDis, fontFamily: F, marginTop: 2 }}>
                  {ws.creditos_mes != null ? `${ws.creditos_mes} cr/mês` : 'sem créditos'}
                  {ws.creditos_saldo != null && ` · saldo ${ws.creditos_saldo}`}
                </div>
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <button style={btnGhost} onClick={() => openConfig(ws)}>⚙ Configurar</button>
                <button style={btnGhost} onClick={() => toggleExpanded(ws.id)}>
                  {expanded ? '▲' : '▼'} Membros {expanded && members.length ? `(${members.length})` : ''}
                </button>
                <button style={btnGhost} onClick={() => { setShowCreateUser(ws); setUserForm({ nome: '', email: '', password: '', role: 'member' }); setUserOk(''); setError(''); }}>
                  Criar acesso
                </button>
                <button style={btnGhost} onClick={() => { setShowInvite(ws); setInviteEmail(''); setError(''); }}>
                  Convidar
                </button>
                <button
                  style={{ ...btnGhost, color: inativo ? DS.green : DS.amber, borderColor: (inativo ? DS.green : DS.amber) + '55' }}
                  onClick={() => toggleAtivo(ws)}
                >
                  {inativo ? 'Reativar' : 'Inativar'}
                </button>
                <button style={btn('#9B6DFF')} onClick={() => onImpersonate?.({ workspaceId: ws.id, workspaceName: ws.nome })}>
                  Entrar →
                </button>
              </div>
            </div>

            {/* ── Painel de membros ── */}
            {expanded && (
              <div style={{ borderTop: `1px solid ${C.border}`, background: isDark ? '#0A1525' : '#F7F9FB', padding: '12px 20px' }}>
                {loadingM ? (
                  <div style={{ fontSize: 12, color: C.textDis, fontFamily: F }}>Carregando membros...</div>
                ) : members.length === 0 ? (
                  <div style={{ fontSize: 12, color: C.textDis, fontFamily: F }}>Nenhum membro ainda.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {members.map(m => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: C.paper, borderRadius: 8, border: `1px solid ${C.border}` }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: DS.green + '33', color: DS.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, fontFamily: F, flexShrink: 0 }}>
                          {(m.nome || m.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {m.nome && <div style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: F }}>{m.nome}</div>}
                          <div style={{ fontSize: 11, color: C.textDis, fontFamily: F, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.email || `ID: ${m.user_id?.slice(0, 12)}…`}
                          </div>
                        </div>
                        <select
                          value={m.role}
                          onChange={e => changeMemberRole(ws.id, m.id, e.target.value)}
                          style={{ ...inpSm, width: 90 }}
                        >
                          <option value="member">member</option>
                          <option value="admin">admin</option>
                        </select>
                        <button style={btnDanger} onClick={() => removeMember(ws.id, m.id)}>Remover</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {workspaces.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem', color: C.textDis, fontFamily: F }}>Nenhum workspace criado ainda.</div>
      )}

      {/* Modal criar workspace */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, fontFamily: F, marginBottom: 20 }}>Criar workspace</div>
            {error && <div style={{ marginBottom: 12, padding: '8px 12px', background: DS.pinkPale, color: DS.pink, borderRadius: 6, fontSize: 12, fontFamily: F }}>{error}</div>}
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input style={inp} placeholder="Nome da empresa *" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
              <input style={inp} placeholder="Domínio (ex: empresa.com.br)" value={form.dominio} onChange={e => setForm(f => ({ ...f, dominio: e.target.value }))} />
              <select style={inp} value={form.setor} onChange={e => setForm(f => ({ ...f, setor: e.target.value }))}>
                <option value="">Setor</option>
                {WS_SETORES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select style={inp} value={form.porte} onChange={e => setForm(f => ({ ...f, porte: e.target.value }))}>
                <option value="">Porte</option>
                {WS_PORTES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: C.textDis, fontFamily: F, display: 'block', marginBottom: 4 }}>Créditos por mês</label>
                  <input style={inp} type="number" min="0" placeholder="ex: 3000" value={form.creditos_mes} onChange={e => setForm(f => ({ ...f, creditos_mes: e.target.value }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: C.textDis, fontFamily: F, display: 'block', marginBottom: 4 }}>Valor mensal (R$)</label>
                  <input style={inp} placeholder="ex: 5000" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.textDis, fontFamily: F, display: 'block', marginBottom: 4 }}>Endereço (subdomínio) — opcional, gera do nome</label>
                <input style={inp} placeholder="nomedamarca" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
                <div style={{ fontSize: 11, color: DS.green, fontFamily: F, marginTop: 4 }}>
                  {(slugify(form.slug || form.nome) || 'nomedamarca')}.s1ngulr.com
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" style={btnGhost} onClick={() => { setShowCreate(false); setError(''); }}>Cancelar</button>
                <button type="submit" style={btn()} disabled={creating}>{creating ? 'Criando...' : 'Criar workspace'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal configurar cobrança */}
      {showConfig && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, fontFamily: F, marginBottom: 6 }}>Configurar · {showConfig.nome}</div>
            <div style={{ fontSize: 13, color: C.textDis, fontFamily: F, marginBottom: 20 }}>Define os créditos/mês e o valor do contrato. Salvar recompõe o saldo do mês para o novo pool e reinicia o ciclo.</div>
            {error && <div style={{ marginBottom: 12, padding: '8px 12px', background: DS.pinkPale, color: DS.pink, borderRadius: 6, fontSize: 12, fontFamily: F }}>{error}</div>}
            <form onSubmit={saveConfig} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: C.textDis, fontFamily: F, display: 'block', marginBottom: 4 }}>Créditos por mês</label>
                <input style={inp} type="number" min="0" placeholder="ex: 3000" value={configForm.creditos_mes} onChange={e => setConfigForm(f => ({ ...f, creditos_mes: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.textDis, fontFamily: F, display: 'block', marginBottom: 4 }}>Valor mensal (R$)</label>
                <input style={inp} placeholder="ex: 5000" value={configForm.valor} onChange={e => setConfigForm(f => ({ ...f, valor: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.textDis, fontFamily: F, display: 'block', marginBottom: 4 }}>Endereço (subdomínio)</label>
                <input style={inp} placeholder="nomedamarca" value={configForm.slug} onChange={e => setConfigForm(f => ({ ...f, slug: e.target.value }))} />
                <div style={{ fontSize: 11, color: DS.green, fontFamily: F, marginTop: 4 }}>
                  {(slugify(configForm.slug) || '—')}.s1ngulr.com
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" style={btnGhost} onClick={() => { setShowConfig(null); setError(''); }}>Cancelar</button>
                <button type="submit" style={btn()} disabled={savingConfig}>{savingConfig ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal convidar cliente */}
      {showInvite && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, width: '100%', maxWidth: 400 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, fontFamily: F, marginBottom: 6 }}>Convidar para {showInvite.nome}</div>
            <div style={{ fontSize: 13, color: C.textDis, fontFamily: F, marginBottom: 20 }}>O cliente receberá um e-mail com link para definir senha e acessar o workspace.</div>
            {error && <div style={{ marginBottom: 12, padding: '8px 12px', background: DS.pinkPale, color: DS.pink, borderRadius: 6, fontSize: 12, fontFamily: F }}>{error}</div>}
            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input style={inp} type="email" placeholder="E-mail do cliente *" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" style={btnGhost} onClick={() => { setShowInvite(null); setError(''); }}>Cancelar</button>
                <button type="submit" style={btn()} disabled={inviting}>{inviting ? 'Enviando...' : 'Enviar convite'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal criar acesso (nome + email + senha) */}
      {showCreateUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, fontFamily: F, marginBottom: 6 }}>Criar acesso · {showCreateUser.nome}</div>
            <div style={{ fontSize: 13, color: C.textDis, fontFamily: F, marginBottom: 20 }}>Cria o login direto, com senha temporária. Sem email de confirmação — entregue as credenciais ao cliente. No primeiro acesso ele será obrigado a definir a senha pessoal.</div>
            {error && <div style={{ marginBottom: 12, padding: '8px 12px', background: DS.pinkPale, color: DS.pink, borderRadius: 6, fontSize: 12, fontFamily: F }}>{error}</div>}
            {userOk ? (
              <div>
                <div style={{ marginBottom: 16, padding: '12px 14px', background: DS.green + '22', color: DS.green, borderRadius: 8, fontSize: 13, fontFamily: F, fontWeight: 600, wordBreak: 'break-all' }}>{userOk}</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" style={btnGhost} onClick={() => { navigator.clipboard?.writeText(userOk); }}>Copiar</button>
                  <button type="button" style={btn()} onClick={() => { setShowCreateUser(null); setUserOk(''); }}>Fechar</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input style={inp} placeholder="Nome do usuário" value={userForm.nome} onChange={e => setUserForm(f => ({ ...f, nome: e.target.value }))} />
                <input style={inp} type="email" placeholder="E-mail (login) *" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} required />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...inp, flex: 1 }} placeholder="Senha (mín. 8) *" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} required />
                  <button type="button" style={btnGhost} onClick={genPassword}>Gerar</button>
                </div>
                <select style={inp} value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="member">member</option>
                  <option value="admin">admin</option>
                </select>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button type="button" style={btnGhost} onClick={() => { setShowCreateUser(null); setError(''); }}>Cancelar</button>
                  <button type="submit" style={btn()} disabled={creatingUser}>{creatingUser ? 'Criando...' : 'Criar acesso'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
