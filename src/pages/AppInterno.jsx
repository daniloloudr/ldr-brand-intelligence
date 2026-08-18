import { useState, useEffect, useRef } from "react";
import { ThemeProvider, CssBaseline, Popover, Box, Stack, Typography, Button, Divider, Alert,
         TextField, MenuItem, Card, CardContent, Chip, CircularProgress,
         Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper } from "@mui/material";
import { AppLayout } from "../components/shell/AppLayout";
import { PageHeader } from "../components/shell/PageHeader";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import WorkspacesOutlinedIcon from "@mui/icons-material/WorkspacesOutlined";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined';
import { theme as themeDark, themeLight } from "../lib/theme";
import { supabase } from "../lib/supabase";
import { COOLDOWN_ENTRE_APROVACOES } from "../lib/constants";
import { fmtDate, normalizeSector, calcularScoreLead, MACRO_SETORES, slugify, tenantUrl, navigate, checarTamanhoManual } from "../lib/helpers";
import { creditsForProvider, brlFromCredits, usdFromCredits, modelLabel } from "../lib/studioCosts";
import { RelatorioCompleto } from "../components/RelatorioCompleto";
import { NovoDiagnosticoDialog } from "./NovoManual";
import { DashboardHistorico } from "./DashboardHistorico";
import { PALETTE } from '../lib/theme'
import Link from "@mui/material/Link";

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
function TodosPage({ historico, loadingHist, onOpen, onRetry, retrying, initialSetor = "" }) {
  const [busca, setBusca] = useState("");
  const [setor, setSetor] = useState(initialSetor);
  const [porte, setPorte] = useState("");
  const [ordem, setOrdem] = useState("recente");


  if (loadingHist) return <Box sx={{ padding: "3rem", textAlign: "center", color: 'text.disabled', fontSize: 13 }}>Carregando...</Box>;

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


  return (
    <Box>
      <Box sx={{ display: "flex", gap: '10px', marginBottom: '20px', flexWrap: "wrap", alignItems: "center" }}>
        <TextField size="small" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar empresa..."
          sx={{ flex: 1, minWidth: 180 }} />
        <TextField select size="small" value={setor} onChange={e => setSetor(e.target.value)} sx={{ minWidth: 180 }} SelectProps={{ displayEmpty: true }}>
          <MenuItem value="">Todos os setores</MenuItem>
          {MACRO_SETORES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
        <TextField select size="small" value={porte} onChange={e => setPorte(e.target.value)} sx={{ minWidth: 160 }} SelectProps={{ displayEmpty: true }}>
          <MenuItem value="">Todos os portes</MenuItem>
          {PORTES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
        </TextField>
        <TextField select size="small" value={ordem} onChange={e => setOrdem(e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="recente">Mais recentes</MenuItem>
          <MenuItem value="antigo">Mais antigos</MenuItem>
          <MenuItem value="az">A → Z</MenuItem>
        </TextField>
        {(busca || setor || porte) && (
          <Button size="small" variant="outlined" color="error"
            onClick={() => { setBusca(""); setSetor(""); setPorte(""); }}>
            Limpar
          </Button>
        )}
        <Typography component="span" sx={{ fontSize: 11, color: 'text.disabled', marginLeft: "auto" }}>
          {filtrado.length} de {historico.length} diagnóstico{historico.length !== 1 ? "s" : ""}
        </Typography>
      </Box>

      {filtrado.length === 0 ? (
        <Box sx={{ textAlign: "center", padding: "3rem", color: 'text.disabled', fontSize: 13 }}>Nenhum resultado.</Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: '2px' }}>
          {filtrado.map((d, i) => {
            const status = d.status || "done";
            const isRunning = status === "running";
            const isError   = status === "error";
            const avg = [d.score_singularidade, d.score_consistencia, d.score_posicionamento]
              .filter(Boolean).reduce((a, b, _, arr) => a + b / arr.length, 0);
            const scoreColor = avg >= 7 ? PALETTE.data.positivo : avg >= 4 ? PALETTE.data.atencao : PALETTE.data.critico;
            const isRetrying = retrying === d.id;
            return (
              <Box key={d.id} onClick={() => !isRunning && !isError && onOpen(d)}
                sx={{
                  display: "flex", alignItems: "center", gap: "14px", padding: "11px 14px",
                  cursor: (isRunning || isError) ? "default" : "pointer",
                  bgcolor: i % 2 === 0 ? 'background.default' : 'action.hover',
                  transition: "opacity 0.15s", border: 1, borderColor: 'divider',
                  opacity: isRunning ? 0.85 : 1,
                }}
                onMouseEnter={e => { if (!isRunning && !isError) e.currentTarget.style.opacity = "0.7"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = isRunning ? "0.85" : "1"; }}
              >
                <Box sx={{ width: 32, height: 32,  background: (isError ? PALETTE.data.critico : isRunning ? PALETTE.data.atencao : PALETTE.data.positivo) + "22", color: (isError ? PALETTE.data.critico : isRunning ? PALETTE.data.atencao : PALETTE.data.positivo), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, flexShrink: 0 }}>
                  {isRunning ? (
                    <Box sx={{ width: 14, height: 14, border: `2px solid ${PALETTE.data.atencao}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  ) : (
                    (d.empresa || "?").charAt(0).toUpperCase()
                  )}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: '8px', flexWrap: "wrap" }}>
                    <Box sx={{ fontSize: 13, fontWeight: 800, color: 'text.primary', overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.empresa}</Box>
                    {isRunning && <Chip size="small" label="em andamento" color="warning" variant="outlined" />}
                    {isError && <Chip size="small" label="erro" color="error" variant="outlined" />}
                  </Box>
                  {isError && d.data?.error ? (
                    <Box sx={{ fontSize: 11, color: PALETTE.data.critico, marginTop: '2px', overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.data.error}
                    </Box>
                  ) : (d.setor || d.porte) && (
                    <Box sx={{ fontSize: 11, color: 'text.disabled' }}>
                      {[normalizeSector(d.setor), d.porte].filter(Boolean).join(" · ")}
                    </Box>
                  )}
                </Box>
                <Box sx={{ fontSize: 11, color: 'text.disabled', flexShrink: 0, textAlign: "right" }}>
                  {fmtDate(d.created_at)}
                  {d.user_name && <Box sx={{ fontSize: 10 }}>{d.user_name}</Box>}
                </Box>
                {isError && onRetry && (
                  <Button
                    size="small" variant="contained"
                    onClick={e => { e.stopPropagation(); onRetry(d); }}
                    disabled={isRetrying}
                    sx={{
                      flexShrink: 0,
                    }}>
                    {isRetrying ? "Reiniciando..." : "Tentar novamente"}
                  </Button>
                )}
                {!isError && !isRunning && avg > 0 && (
                  <Box sx={{ width: 34, height: 34,  background: scoreColor + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Typography component="span" sx={{ fontSize: 13, fontWeight: 900, color: scoreColor }}>{avg.toFixed(0)}</Typography>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

/* ─── AppInterno ─────────────────────────────────────────────────── */
export function AppInterno({ user, onLogout, onImpersonate }) {
  const [isDark, setIsDark]                           = useState(() => {
    // Padrão é CLARO (regra do Danilo); o escuro fica disponível para quem preferir.
    const saved = localStorage.getItem("brandcode-admin-theme") ?? localStorage.getItem("loudr-admin-theme");
    return saved !== null ? saved === "dark" : false;
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

  const statusColor = s => ({ pendente: PALETTE.data.atencao, aprovado: PALETTE.data.positivo, concluido: PALETTE.data.positivo, rejeitado: PALETTE.data.critico, erro: PALETTE.data.critico }[s] || PALETTE.neutral[400]);
  const statusBg    = s => ({ pendente: PALETTE.data.atencaoFraco, aprovado: PALETTE.data.positivoFraco, concluido: PALETTE.data.positivoFraco, rejeitado: PALETTE.data.criticoFraco, erro: PALETTE.data.criticoFraco }[s] || PALETTE.neutral[50]);
  const pendentes   = solicitacoes.filter(s => s.status === "pendente").length;
  const userName    = user.user_metadata?.full_name || user.email.split("@")[0];
  const userInitial = userName.charAt(0).toUpperCase();

  const navItems = [
    { id: "historico",    label: "Dashboard",        Icon: InsightsOutlinedIcon },
    { id: "todos",        label: "Diagnósticos",     Icon: ListAltOutlinedIcon },
    { id: "workspaces",   label: "Workspaces",       Icon: WorkspacesOutlinedIcon },
    { id: "custos",       label: "Custos",           Icon: PaidOutlinedIcon },
    { id: "cerebros",     label: "Cérebros",         Icon: PsychologyOutlinedIcon },
    { id: "saude",        label: "Saúde",            Icon: MonitorHeartOutlinedIcon },
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

  // Conteúdo do sino — agora servido pelo AppLayout (um shell só p/ app e admin)
  const bellBody = ({ close: fechar }) => (
    <>
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
                    sx={{ fontSize: 11, textTransform: "none", color: PALETTE.data.critico, borderColor: PALETTE.data.critico + "44", border: "1px solid", "&:hover": { borderColor: PALETTE.data.critico, bgcolor: PALETTE.data.criticoFraco } }}
                  >Rejeitar</Button>
                  <Button
                    onClick={() => { fechar(); aprovarERodar(sol); }}
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
            onClick={() => { fechar(); navigate("solicitacoes"); }}
            size="small"
            sx={{ fontSize: 11, textTransform: "none", fontWeight: 700 }}
          >Ver todas →</Button>
        </Box>
    </>
  );

  const ph = pageHeaders[page];

  return (
    <ThemeProvider theme={isDark ? themeDark : themeLight}>
      <CssBaseline />

      <AppLayout
        onToggleTheme={() => setIsDark(d => { const next = !d; localStorage.setItem("brandcode-admin-theme", next ? "dark" : "light"); return next; })}
        nav={navItems.map(({ id, label, Icon }) => ({
          type: "item", label, icon: Icon, hash: id,
          active: page === id || (page === "gerando" && id === "solicitacoes") || (page === "relatorio" && id === "todos"),
        }))}
        currentRoute={page}
        onNavigate={id => navigate(id)}
        user={user}
        userName={userName}
        onLogout={onLogout}
        onSearch={v => { setSearchVal(v); if (v) navigate("todos"); }}
        searchValue={searchVal}
        bellCount={pendentes}
        bellContent={bellBody}
        topBanner={cooldownAtivo > 0 ? (
          <Alert severity="warning" square>Cooldown ativo — {cooldownAtivo}s restantes</Alert>
        ) : null}
      >

          {ph && (
            <PageHeader
              title={ph.title}
              subtitle={ph.sub}
              action={
                (page === "todos" || page === "historico") ? (
                  <Button variant="contained" onClick={() => setNovoOpen(true)}>+ Novo diagnóstico</Button>
                ) : page === "workspaces" ? (
                  <Button variant="contained" onClick={() => setWsCreateSignal(s => s + 1)}>+ Criar workspace</Button>
                ) : null
              }
            />
          )}


          {error && (
            <Alert severity="error" onClose={() => setError("")} sx={{ mx: 3, mt: 2 }}>{error}</Alert>
          )}


          {/* Page content */}
          <Box sx={{ minWidth: 0 }}>

            {/* ── Solicitações ── */}
            {page === "solicitacoes" && (
              <Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: '10px', marginBottom: '24px' }}>
                  {[
                    { val: solicitacoes.length,                                   lbl: "total de pedidos" },
                    { val: pendentes,                                             lbl: "aguardando aprovação", highlight: pendentes > 0 },
                    { val: solicitacoes.filter(s => s.status === "concluido").length, lbl: "diagnósticos gerados" },
                    { val: solicitacoes.filter(s => s.status === "rejeitado").length, lbl: "rejeitados" },
                  ].map((s, i) => (
                    <Box key={i} sx={{
                      bgcolor: s.highlight ? PALETTE.data.atencaoFraco : 'background.paper',
                      border: s.highlight ? `1px solid ${PALETTE.data.atencao}44` : `1px solid divider`,
                       padding: "14px 18px",
                      boxShadow: `0 1px 4px transparent`,
                    }}>
                      <Box sx={{ fontSize: 26, fontWeight: 900, color: s.highlight ? PALETTE.data.atencao : 'text.primary' }}>{s.val}</Box>
                      <Box sx={{ fontSize: 11, color: 'text.disabled', marginTop: '3px' }}>{s.lbl}</Box>
                    </Box>
                  ))}
                </Box>

                {loadingSol ? (
                  <Box sx={{ textAlign: "center", padding: "3rem", color: 'text.disabled' }}>Carregando...</Box>
                ) : solicitacoes.length === 0 ? (
                  <Box sx={{ textAlign: "center", padding: "4rem", color: 'text.disabled' }}>
                    <Box sx={{ fontSize: 14, marginBottom: '6px' }}>Nenhuma solicitação ainda.</Box>
                    <Box sx={{ fontSize: 12 }}>Compartilhe a página pública para receber pedidos.</Box>
                  </Box>
                ) : (
                  solicitacoes.map(sol => (
                    <Box key={sol.id} sx={{
                      bgcolor: 'background.paper', border: 1, borderColor: 'divider',
                       padding: "16px 20px", marginBottom: '10px',
                      boxShadow: `0 1px 4px transparent`,
                    }}>
                      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: '16px', flexWrap: "wrap" }}>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: '10px', marginBottom: '4px', flexWrap: "wrap" }}>
                            <Typography component="span" sx={{ fontSize: 15, fontWeight: 800, color: 'text.primary' }}>{sol.empresa}</Typography>
                            <Chip size="small" label={sol.status} sx={{ bgcolor: statusBg(sol.status), color: statusColor(sol.status), fontWeight: 700 }} />
                            {sol.setor && <Typography component="span" sx={{ fontSize: 12, color: 'text.disabled' }}>{normalizeSector(sol.setor)} · {sol.porte}</Typography>}
                          </Box>
                          <Box sx={{ fontSize: 12, color: 'text.disabled', marginBottom: '6px', display: "flex", alignItems: "center", gap: '8px', flexWrap: "wrap" }}>
                            {sol.nome} · {sol.email} · {fmtDate(sol.created_at)}
                            {(() => {
                              const s = calcularScoreLead(sol);
                              return (
                                <Typography component="span" sx={{ background: s >= 60 ? PALETTE.data.positivoFraco : s >= 30 ? PALETTE.data.atencaoFraco : PALETTE.data.criticoFraco, color: s >= 60 ? PALETTE.data.positivo : s >= 30 ? PALETTE.data.atencao : PALETTE.data.critico, fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "1px 8px" }}>
                                  Lead {s}%
                                </Typography>
                              );
                            })()}
                          </Box>
                          {sol.site && <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{sol.site}</Box>}
                          {sol.contexto && (
                            <Box sx={{ marginTop: '8px', padding: "8px 12px", background: isDark ? PALETTE.neutral[900] : PALETTE.neutral[50],  fontSize: 12, color: 'text.secondary', lineHeight: 1.55 }}>
                              {sol.contexto}
                            </Box>
                          )}
                        </Box>
                        {sol.status === "pendente" && (
                          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: '6px', flexShrink: 0 }}>
                            <Box sx={{ display: "flex", gap: '8px' }}>
                              <Button size="small" variant="outlined" color="error" onClick={() => rejeitarSolicitacao(sol.id)}>
                                Rejeitar
                              </Button>
                              <Button size="small" variant="contained" onClick={() => aprovarERodar(sol)} disabled={cooldownAtivo > 0}>
                                {cooldownAtivo > 0 ? `Aguarde ${cooldownAtivo}s` : "Aprovar e rodar →"}
                              </Button>
                            </Box>
                          </Box>
                        )}
                        {sol.status === "concluido" && (
                          <Button onClick={() => {
                            const diag = historico.find(h => h.id === sol.diagnostico_id);
                            if (diag) { setSelectedRel({ data: diag.data, meta: diag }); navigate("relatorio"); }
                          }} size="small" variant="outlined" sx={{ flexShrink: 0 }}>
                            Ver relatório →
                          </Button>
                        )}
                      </Box>
                    </Box>
                  ))
                )}
              </Box>
            )}

            {page === "gerando" && (
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "40vh", gap: '20px', textAlign: "center" }}>
                <Box sx={{ width: 48, height: 48, border: `3px solid ${PALETTE.data.positivo}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <Box>
                  <Box sx={{ fontSize: 15, fontWeight: 800, color: 'text.primary', marginBottom: '6px' }}>Gerando diagnóstico</Box>
                  <Box sx={{ fontSize: 13, color: 'text.secondary', minHeight: 20 }}>
                    {["Pesquisando o site e fontes públicas...", "Aplicando framework Smart Branding...", "Calculando scores...", "Mapeando gaps de identidade...", "Identificando oportunidades...", "Finalizando..."][gerandoStep % 6]}
                  </Box>
                </Box>
                <Box sx={{ fontSize: 11, color: 'text.disabled' }}>Pode fechar esta aba — o diagnóstico continuará no servidor</Box>
                    </Box>
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
                <Box sx={{ textAlign: "center", padding: "3rem", color: 'text.disabled' }}>Carregando...</Box>
              ) : historicoDone.length === 0 ? (
                <Box sx={{ textAlign: "center", padding: "4rem", color: 'text.disabled' }}>Nenhum diagnóstico gerado ainda.</Box>
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
                onOpen={d => { setSelectedRel({ data: d.data, meta: d }); navigate("relatorio"); }}
                onRetry={retryDiagnostico}
                retrying={retrying}
              />
            )}

            {page === "workspaces" && (
              <WorkspacesAdmin
                user={user}
                onImpersonate={onImpersonate}
                createSignal={wsCreateSignal}
              />
            )}

            {page === "custos" && <CustosAdmin />}
            {page === "cerebros" && <CerebrosAdmin />}
            {page === "saude" && <SaudeAdmin />}
          </Box>
      </AppLayout>

      <NovoDiagnosticoDialog
        open={novoOpen}
        onClose={() => setNovoOpen(false)}
        user={user}
        onCreate={criadas => {
          setHistorico(prev => [...criadas, ...prev]);
          navigate("todos");
        }}
      />

    </ThemeProvider>
  );
}

/* ─── SaudeAdmin — os alertas que ninguém via ─────────────────────── */
// O watchdog grava em `cron_alerts` desde sempre, manda pro Sentry e tentaria um
// webhook (ALERT_WEBHOOK_URL, ausente). Só que NENHUMA tela mostrava — e havia
// alerta real ali: o cron-monitor morrendo desde 10/08, avisando para o vazio há
// mais de uma semana. Alerta que ninguém lê não é alerta.
function SaudeAdmin() {
  const [alertas, setAlertas] = useState([]);
  const [runs, setRuns]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const desde = new Date(Date.now() - 14 * 86400000).toISOString();
      const [{ data: a }, { data: r }] = await Promise.all([
        supabase.from('cron_alerts').select('*').gte('criado_em', desde).order('criado_em', { ascending: false }).limit(60),
        supabase.from('cron_runs').select('cron, started_at, finished_at, ok').gte('started_at', desde).order('started_at', { ascending: false }).limit(400),
      ]);
      setAlertas(a || []); setRuns(r || []); setLoading(false);
    })();
  }, []);

  // Última batida por cron: é o que responde "está vivo?" sem ler 400 linhas.
  const porCron = {};
  for (const r of runs) {
    if (!porCron[r.cron]) porCron[r.cron] = { ultima: r, total: 0, falhas: 0 };
    porCron[r.cron].total += 1;
    if (r.finished_at && !r.ok) porCron[r.cron].falhas += 1;
  }

  const idade = (iso) => {
    const h = (Date.now() - new Date(iso).getTime()) / 3600000;
    return h < 1 ? `${Math.round(h * 60)} min` : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} d`;
  };

  if (loading) return <Box sx={{ textAlign: 'center', p: 6, color: 'text.disabled' }}>Carregando...</Box>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h6" sx={{ mb: 0.5 }}>Alertas</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Últimos 14 dias. Cada alerta é gravado uma vez por tipo a cada 24h — repetição
          significa que o problema durou, não que avisou de novo.
        </Typography>
        {alertas.length === 0 ? (
          <Alert severity="success" variant="outlined">Nenhum alerta nos últimos 14 dias.</Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Quando</TableCell><TableCell>Origem</TableCell>
                  <TableCell>Tipo</TableCell><TableCell>Motivo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {alertas.map(a => (
                  <TableRow key={a.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 12, color: 'text.secondary' }}>
                      há {idade(a.criado_em)}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>{a.cron}</TableCell>
                    <TableCell>
                      <Chip size="small" label={a.tipo}
                        color={/morte|fora-do-ar|saldo/.test(a.tipo) ? 'error' : 'warning'} variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{a.motivo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Box>
        <Typography variant="h6" sx={{ mb: 0.5 }}>Crons</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Última batida de cada rotina. Cron que sumiu do quadro parou de rodar.
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Cron</TableCell><TableCell>Última batida</TableCell>
                <TableCell>Desfecho</TableCell><TableCell align="right">Batidas / falhas (14d)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(porCron).sort((a, b) => a[0].localeCompare(b[0])).map(([cron, v]) => {
                const inacabada = !v.ultima.finished_at;
                return (
                  <TableRow key={cron} hover>
                    <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>{cron}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>há {idade(v.ultima.started_at)}</TableCell>
                    <TableCell>
                      <Chip size="small" variant="outlined"
                        label={inacabada ? 'não terminou' : v.ultima.ok ? 'ok' : 'falhou'}
                        color={inacabada ? 'error' : v.ultima.ok ? 'success' : 'error'} />
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                      {v.total} / {v.falhas}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}

/* ─── CustosAdmin ────────────────────────────────────────────────── */

function CustosAdmin() {
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

  const card = { bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 12 };

  if (loading) return <Box sx={{ textAlign: "center", padding: "3rem", color: 'text.disabled' }}>Carregando…</Box>;

  const stats = [
    { lbl: "Custo estimado", val: brl(totCred), sub: usd(totCred) },
    { lbl: "Créditos consumidos", val: totCred.toLocaleString("pt-BR"), sub: `${rows.length} gerações` },
    { lbl: "Imagens", val: totImg.toLocaleString("pt-BR"), sub: "1 crédito base" },
    { lbl: "Vídeos", val: totVid.toLocaleString("pt-BR"), sub: "5–108 créditos" },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", gap: '6px', marginBottom: '18px' }}>
        {[{ k: "mes", l: "Mês atual" }, { k: "90d", l: "90 dias" }, { k: "tudo", l: "Tudo" }].map(p => (
          <Button key={p.k} size="small" onClick={() => setPeriodo(p.k)}
            variant={periodo === p.k ? "contained" : "outlined"}>{p.l}</Button>
        ))}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: '12px', marginBottom: '22px' }}>
        {stats.map(s => (
          <Box key={s.lbl} sx={{ ...card, padding: '18px' }}>
            <Box sx={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: 'text.disabled' }}>{s.lbl}</Box>
            <Box sx={{ fontSize: 26, fontWeight: 900, color: 'text.primary', marginTop: '4px', lineHeight: 1 }}>{s.val}</Box>
            <Box sx={{ fontSize: 11, color: 'text.secondary', marginTop: '4px' }}>{s.sub}</Box>
          </Box>
        ))}
      </Box>

      {rows.length === 0 ? (
        <Box sx={{ ...card, padding: '32px', textAlign: "center", color: 'text.disabled' }}>Nenhuma geração no período.</Box>
      ) : (
        <>
          <Box sx={{ ...card, overflow: "hidden", marginBottom: '16px' }}>
            <Box sx={{ padding: "13px 16px", borderBottom: 1, borderColor: 'divider', fontSize: 13, fontWeight: 800, color: 'text.primary' }}>Por modelo</Box>
            <Table size="small">
              <TableHead><TableRow><TableCell>Modelo</TableCell><TableCell align="right">Gerações</TableCell><TableCell align="right">Créditos</TableCell><TableCell align="right">Custo</TableCell></TableRow></TableHead>
              <TableBody>
                {modelos.map(m => (
                  <TableRow key={m.label}>
                    <TableCell><Typography component="span" sx={{ display: "inline-block", width: 7, height: 7, borderRadius: 2, background: m.tipo === "video" ? PALETTE.data.atencao : PALETTE.data.positivo, marginRight: '8px', verticalAlign: "middle" }} />{m.label}</TableCell>
                    <TableCell align="right">{m.n}</TableCell>
                    <TableCell align="right">{m.cred.toLocaleString("pt-BR")}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{brl(m.cred)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          <Box sx={{ ...card, overflow: "hidden" }}>
            <Box sx={{ padding: "13px 16px", borderBottom: 1, borderColor: 'divider', fontSize: 13, fontWeight: 800, color: 'text.primary' }}>Por conta</Box>
            <Table size="small">
              <TableHead><TableRow><TableCell>Conta</TableCell><TableCell align="right">Gerações</TableCell><TableCell align="right">Créditos</TableCell><TableCell align="right">Custo</TableCell><TableCell align="right">Saldo atual</TableCell></TableRow></TableHead>
              <TableBody>
                {contas.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>{c.ws?.nome || c.id.slice(0, 8)}</TableCell>
                    <TableCell align="right">{c.n}</TableCell>
                    <TableCell align="right">{c.cred.toLocaleString("pt-BR")}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{brl(c.cred)}</TableCell>
                    <TableCell align="right" sx={{ color: "text.secondary" }}>{c.ws?.creditos_saldo ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </>
      )}

      <Box sx={{ fontSize: 11, color: 'text.disabled', marginTop: '16px', lineHeight: 1.5 }}>
        Custo estimado a partir do mapa de créditos (créditos ≈ 18 × custo_USD; câmbio R$5,50). A duração de vídeo assume o menor tier. Não inclui a inteligência (diagnóstico, listening, assistant) — fair-use, sem crédito. "Gerações" = 1 imagem = 1 token.
      </Box>
    </Box>
  );
}

/* ─── CerebrosAdmin — todos os cérebros de marca (cross-tenant) ───── */

function CerebrosAdmin() {
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
  const card = { bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 12 };

  if (loading) return <Box sx={{ textAlign: "center", padding: "3rem", color: 'text.disabled' }}>Carregando…</Box>;

  const stats = [
    { lbl: "Cérebros ativos", val: `${globais.comCerebro}/${globais.totalMarcas}`, sub: "marcas com modelo destilado" },
    { lbl: "Confiança média", val: pctFmt(globais.confMedia), sub: "última versão de cada cérebro" },
    { lbl: "Sinais pendentes", val: globais.pendentes.toLocaleString("pt-BR"), sub: "aguardando destilação" },
    { lbl: "Dataset", val: globais.dataset.toLocaleString("pt-BR"), sub: "exemplos julgados (contexto→output→avaliação)" },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", marginBottom: '12px' }}>
        <Button size="small" variant="outlined" onClick={load}>Atualizar</Button>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: '12px', marginBottom: '22px' }}>
        {stats.map(s => (
          <Box key={s.lbl} sx={{ ...card, padding: '18px' }}>
            <Box sx={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: 'text.disabled' }}>{s.lbl}</Box>
            <Box sx={{ fontSize: 26, fontWeight: 900, color: 'text.primary', marginTop: '4px', lineHeight: 1 }}>{s.val}</Box>
            <Box sx={{ fontSize: 11, color: 'text.secondary', marginTop: '4px' }}>{s.sub}</Box>
          </Box>
        ))}
      </Box>

      {rows.length === 0 ? (
        <Box sx={{ ...card, padding: '32px', textAlign: "center", color: 'text.disabled' }}>Nenhuma marca cadastrada.</Box>
      ) : (
        <Box sx={{ ...card, overflow: "hidden" }}>
          <Box sx={{ padding: "13px 16px", borderBottom: 1, borderColor: 'divider', fontSize: 13, fontWeight: 800, color: 'text.primary' }}>Por marca</Box>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>Marca</TableCell><TableCell align="right">Versão</TableCell><TableCell align="right">Confiança</TableCell>
              <TableCell align="right">Sinais (pend.)</TableCell><TableCell align="right">Dataset</TableCell><TableCell align="right">Approval</TableCell>
              <TableCell align="right">Última destilação</TableCell><TableCell align="right"></TableCell>
            </TableRow></TableHead>
            <TableBody>
              {rows.map(m => {
                const st = distilling[m.brand.id];
                return (
                  <TableRow key={m.brand.id}>
                    <TableCell>
                      <Typography component="span" sx={{ fontWeight: 700 }}>{m.ws?.nome || m.brand.nome}</Typography>
                      {m.ws?.plano && <Typography component="span" sx={{ fontSize: 10, fontWeight: 700, color: PLANO_COR[m.ws.plano] || 'text.disabled', marginLeft: '8px', textTransform: "uppercase" }}>{m.ws.plano}</Typography>}
                    </TableCell>
                    <TableCell align="right">{m.atual ? `v${m.atual.versao}` : "—"}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {pctFmt(m.atual?.confianca_media)}
                      {m.confDelta != null && (
                        <Typography component="span" sx={{ fontSize: 11, fontWeight: 700, marginLeft: '6px', color: m.confDelta >= 0 ? PALETTE.data.positivo : PALETTE.data.critico }}>
                          {m.confDelta >= 0 ? "▲" : "▼"}{Math.abs(Math.round(m.confDelta * 100))}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {m.sinais.toLocaleString("pt-BR")}
                      {m.pendentes > 0 && <Typography component="span" sx={{ color: PALETTE.data.atencao, fontWeight: 700 }}> ({m.pendentes})</Typography>}
                    </TableCell>
                    <TableCell align="right">{m.dataset.toLocaleString("pt-BR")}</TableCell>
                    <TableCell align="right">{pctFmt(m.approval)}</TableCell>
                    <TableCell align="right" sx={{ color: "text.secondary" }}>{m.atual ? fmtDate(m.atual.created_at) : "—"}</TableCell>
                    <TableCell align="right">
                      {m.pendentes > 0 && (
                        <Button size="small" variant="outlined" onClick={() => destilar(m.brand.id)}
                          disabled={st === "run" || st === "ok"}
                          color={st === "ok" ? "success" : st === "err" ? "error" : "primary"}>{st === "run" ? "Destilando…" : st === "ok" ? "Disparado ✓" : st === "err" ? "Falhou — tentar de novo" : "Destilar agora"}</Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      )}

      <Box sx={{ fontSize: 11, color: 'text.disabled', marginTop: '16px', lineHeight: 1.5 }}>
        Cada marca tem um cérebro próprio (modelo vivo versionado, destilado dos sinais de uso). "Destilar agora" roda em background (~1 min) — use Atualizar para ver a nova versão. Approval = votos 👍 sobre o total de peças avaliadas no Studio. Dataset = exemplos julgados, insumo do fine-tune por tenant no futuro.
      </Box>
    </Box>
  );
}

/* ─── WorkspacesAdmin ────────────────────────────────────────────── */
const WS_SETORES = ["Tecnologia","Saúde","Educação","Finanças","Varejo","Fashion","Indústria","Serviços","Alimentação","Imóveis","Logística","Mídia","Energia","Agronegócio","Outro"];
const WS_PORTES  = ["Startup","PME","Médio","Grande"];
// País de origem da marca. A lista é curta de propósito: só entra país que o
// _mercado.js sabe tratar (praças de reputação e variante do idioma). Adicionar
// aqui sem adicionar lá faz a marca cair no padrão Brasil em silêncio.
const WS_PAISES  = [
  { cod: 'BR', rotulo: 'Brasil (padrão)' },
  { cod: 'PT', rotulo: 'Portugal' },
];
const PLANO_COR  = { enterprise: PALETTE.data.positivo, pro: PALETTE.data.neutro, starter: PALETTE.data.atencao, trial: null };

// Duas trilhas com relógios diferentes (ver _onboard.js): a inteligência roda
// só com o domínio, em minutos; a marca depende do manual, que pode chegar dias
// depois. Uma não espera a outra.
const ONB_TRILHAS = [
  ['inteligencia', 'Inteligência', 'dispara sozinha com o domínio', [
    ['diagnostico',  'Diagnóstico inicial'],
    ['concorrentes', 'Concorrentes'],
    ['mineracao',    'Mineração · clipping, rivais, tendências, escuta'],
    ['sinteses',     'Sínteses · mercado + insights'],
    ['destilacao',   'Destilação · cérebro'],
  ]],
  ['marca', 'Marca', 'começa quando o manual chegar', [
    ['brand', 'Extração do manual (PDF)'],
  ]],
];
const ONB_STEPS = ONB_TRILHAS.flatMap(([, , , etapas]) => etapas);
// Estados terminais de uma etapa. `expired` e `failed` também encerram — a
// diferença é que NÃO são sucesso. Antes só existia 'done' e o teto de tempo
// empurrava tudo para lá, então o painel carimbava "Ambiente pronto" sobre um
// ambiente vazio.
const ONB_TERMINAL = ['done', 'expired', 'failed'];
// `waiting` não é problema — é o combinado: a marca espera o manual.
const onbTrilhaCompleta = (o, etapas) => o?.steps && etapas.every(([k]) => ONB_TERMINAL.includes(o.steps[k]));
const onbAguardando     = (o) => o?.steps?.brand === 'waiting';
const onbComplete = (o) => o?.steps && ONB_STEPS.every(([k]) => ONB_TERMINAL.includes(o.steps[k]));
const onbOk       = (o) => o?.steps && ONB_STEPS.every(([k]) => o.steps[k] === 'done');
const onbProblemas = (o) => !o?.steps ? [] : ONB_STEPS
  .filter(([k]) => o.steps[k] === 'expired' || o.steps[k] === 'failed')
  .map(([k, label]) => ({ k, label, estado: o.steps[k], motivo: o.notas?.[k] }));

const ONB_VISUAL = {
  done:    { ic: '✅', cor: 'success.main'   },
  running: { ic: '⏳', cor: 'warning.main'   },
  expired: { ic: '⚠️', cor: 'warning.main'   },
  failed:  { ic: '⛔', cor: 'error.main'     },
  waiting: { ic: '📄', cor: 'info.main'      },
  pending: { ic: '◻️', cor: 'text.disabled' },
};

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

function WorkspacesAdmin({ user, onImpersonate, createSignal = 0 }) {
  const [workspaces, setWorkspaces]       = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showCreate, setShowCreate]       = useState(false);
  const [showInvite, setShowInvite]       = useState(null);
  const [creating, setCreating]           = useState(false);
  const [inviting, setInviting]           = useState(false);
  const [error, setError]                 = useState('');
  const [form, setForm]                   = useState({ nome: '', dominio: '', setor: '', porte: '', pais: 'BR', creditos_mes: '', valor: '', slug: '' });
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
  const [onbId, setOnbId]                 = useState(null);   // workspace com painel de preparação aberto
  const [onb, setOnb]                     = useState(null);   // estado do onboarding em andamento
  const [onbBusy, setOnbBusy]             = useState(false);
  const [onbManualPath, setOnbManualPath] = useState(null);  // PDF do manual subido (marca nasce dele)
  const [onbManualName, setOnbManualName] = useState('');    // nome do arquivo (feedback)
  const [onbUploading, setOnbUploading]   = useState(false);

  useEffect(() => { fetchWorkspaces(); }, []);

  useEffect(() => {
    if (createSignal > 0) { setShowCreate(true); setError(''); }
  }, [createSignal]);

  // O painel LÊ o estado; quem avança o pipeline é o onboard-cron, de minuto
  // em minuto. Fechar esta aba não para mais nada — antes o `tick` daqui era
  // o único motor, e a preparação congelava com a página fechada.
  useEffect(() => {
    if (!onbId || !onb || onbComplete(onb)) return;
    const t = setInterval(async () => {
      try {
        const { data } = await supabase.from('workspaces').select('onboarding').eq('id', onbId).single();
        if (data?.onboarding) {
          setOnb(data.onboarding);
          setWorkspaces(list => list.map(w => w.id === onbId ? { ...w, onboarding: data.onboarding } : w));
        }
      } catch { /* silencioso — lê de novo no próximo ciclo */ }
    }, 6000);
    return () => clearInterval(t);
  }, [onbId, onb]);

  // "Avançar agora": empurra uma transição na frente do cron. Útil na frente
  // do cliente; o pipeline não depende disso.
  async function avancarAgora() {
    setOnbBusy(true);
    try {
      const j = await onboardCall(onbId, 'tick');
      if (j.onboarding) {
        setOnb(j.onboarding);
        setWorkspaces(list => list.map(w => w.id === onbId ? { ...w, onboarding: j.onboarding } : w));
      }
    } catch (e) { setError(e.message); }
    finally { setOnbBusy(false); }
  }

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

  async function onboardCall(wsId, action, extra = {}) {
    const token = await getToken();
    const res = await fetch('/.netlify/functions/workspace-onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, workspace_id: wsId, ...extra }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || 'Erro no onboarding');
    return j;
  }

  function openOnb(ws) {
    setError('');
    setOnbManualPath(null); setOnbManualName('');
    setOnbId(prev => prev === ws.id ? null : ws.id);
    setOnb(ws.onboarding || null);
  }

  async function uploadManual(ws, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { setError('Selecione um PDF.'); return; }
    const grande = checarTamanhoManual(file);
    if (grande) { setError(grande); return; }
    setOnbUploading(true); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const path = `${session.user.id}/onboarding/${ws.id}/${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage.from('brand-manuals')
        .upload(path, file, { contentType: 'application/pdf', upsert: true });
      if (upErr) throw new Error(upErr.message);
      setOnbManualPath(path); setOnbManualName(file.name);
    } catch (err) { setError(`Upload falhou: ${err.message}`); }
    setOnbUploading(false);
  }

  async function startOnboard(ws) {
    if (!onbManualPath && !window.confirm(`Preparar o ambiente SEM manual da marca?\n\nSem o PDF, a marca fica só com o nome/slug e o resto NÃO é extraído. Recomendado: subir o manual primeiro.`)) return;
    if (!window.confirm(`Preparar o ambiente completo de "${ws.nome}"?\n\nCria a marca (do manual, se subido) + diagnóstico + mineração + destilação. Leva ~15-30 min (roda em background). Você acompanha o progresso aqui.`)) return;
    setOnbBusy(true); setError('');
    try {
      const j = await onboardCall(ws.id, 'start', { manual_path: onbManualPath });
      setOnbId(ws.id);
      setOnb(j.onboarding);
      setWorkspaces(list => list.map(w => w.id === ws.id ? { ...w, onboarding: j.onboarding } : w));
    } catch (e) { setError(e.message); }
    setOnbBusy(false);
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
        pais: form.pais, slug: form.slug,
        creditos_mes: parseInt(form.creditos_mes, 10) || 0,
        valor_mensal_centavos: reaisToCents(form.valor),
      }),
    });
    const json = await res.json();
    setCreating(false);
    if (!res.ok) { setError(json.error || 'Erro ao criar workspace'); return; }
    setShowCreate(false);
    setForm({ nome: '', dominio: '', setor: '', porte: '', pais: 'BR', creditos_mes: '', valor: '', slug: '' });
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

  const inp      = { fontSize: 13, color: 'text.primary', bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 8, padding: '8px 12px', width: '100%', boxSizing: 'border-box', outline: 'none' };
  const inpSm    = { ...inp, padding: '4px 8px', width: 'auto', fontSize: 11 };
  const btn      = (color = PALETTE.data.positivo) => ({ background: color, border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' });
  const btnGhost = { background: 'none', border: 1, borderColor: 'divider', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: 'text.secondary', cursor: 'pointer' };
  const btnDanger = { background: 'none', border: `1px solid ${PALETTE.data.critico}44`, borderRadius: 6, padding: '4px 10px', fontSize: 11, color: PALETTE.data.critico, cursor: 'pointer' };

  if (loading) return <Box sx={{ padding: '3rem', textAlign: 'center', color: 'text.disabled' }}>Carregando...</Box>;

  return (
    <Box>
      {error && <Box sx={{ marginBottom: '16px', padding: '10px 14px', background: PALETTE.data.criticoFraco, color: PALETTE.data.critico,  fontSize: 13 }}>{error}</Box>}

      <Box sx={{ marginBottom: '20px' }}>
        <Typography component="span" sx={{ fontSize: 13, color: 'text.disabled' }}>{workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}</Typography>
      </Box>

      {workspaces.map(ws => {
        const inativo   = ws.ativo === false;
        const expanded  = expandedId === ws.id;
        const members   = membersMap[ws.id] || [];
        const loadingM  = loadingMembers[ws.id];

        return (
          <Box key={ws.id} sx={{
            bgcolor: 'background.paper', border: `1px solid ${inativo ? 'divider' : 'divider'}`,
             marginBottom: '10px', opacity: inativo ? 0.6 : 1,
            overflow: 'hidden',
          }}>
            {/* ── Linha principal ── */}
            <Box sx={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>

              {/* Info */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <Typography component="span" sx={{ fontSize: 15, fontWeight: 800, color: 'text.primary' }}>{ws.nome}</Typography>
                  {inativo && (
                    <Typography component="span" sx={{ fontSize: 10, fontWeight: 700, color: PALETTE.data.critico, border: `1px solid ${PALETTE.data.critico}55`, borderRadius: 4, padding: '1px 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      inativo
                    </Typography>
                  )}
                </Box>
                <Box sx={{ fontSize: 12, color: 'text.disabled', marginTop: '2px' }}>
                  {ws.dominio && `${ws.dominio} · `}{ws.setor && `${ws.setor} · `}
                  criado {new Date(ws.created_at).toLocaleDateString('pt-BR')}
                </Box>
                {ws.slug && (
                  <Link href={tenantUrl(ws.slug)} target="_blank" rel="noreferrer" variant="caption">
                    {ws.slug}.br4ndcode.com ↗
                  </Link>
                )}
              </Box>

              {/* Cobrança do contrato */}
              <Box sx={{ textAlign: 'right', minWidth: 120 }}>
                <Box sx={{ fontSize: 14, fontWeight: 800, color: 'text.primary' }}>
                  {ws.valor_mensal_centavos != null ? centsToBRL(ws.valor_mensal_centavos) : '—'}
                  <Typography component="span" sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 600 }}> /mês</Typography>
                </Box>
                <Box sx={{ fontSize: 11, color: 'text.disabled', marginTop: '2px' }}>
                  {ws.creditos_mes != null ? `${ws.creditos_mes} cr/mês` : 'sem créditos'}
                  {ws.creditos_saldo != null && ` · saldo ${ws.creditos_saldo}`}
                </Box>
              </Box>

              {/* Ações */}
              <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Button size="small" variant="outlined" onClick={() => openConfig(ws)}>⚙ Configurar</Button>
                <Button size="small" variant="outlined" color={onbOk(ws.onboarding) ? "success" : onbComplete(ws.onboarding) ? "error" : ws.onboarding ? "warning" : "primary"}
                  onClick={() => openOnb(ws)}
                >
                  {onbOk(ws.onboarding) ? '✅ Ambiente pronto'
                    : onbComplete(ws.onboarding) ? '⚠️ Terminou com falhas'
                    : ws.onboarding ? '⏳ Preparação' : '🚀 Preparar ambiente'}
                </Button>
                <Button size="small" variant="outlined" onClick={() => toggleExpanded(ws.id)}>
                  {expanded ? '▲' : '▼'} Membros {expanded && members.length ? `(${members.length})` : ''}
                </Button>
                <Button size="small" variant="outlined" onClick={() => { setShowCreateUser(ws); setUserForm({ nome: '', email: '', password: '', role: 'member' }); setUserOk(''); setError(''); }}>
                  Criar acesso
                </Button>
                <Button size="small" variant="outlined" onClick={() => { setShowInvite(ws); setInviteEmail(''); setError(''); }}>
                  Convidar
                </Button>
                <Button size="small" variant="outlined"
                  onClick={() => toggleAtivo(ws)}
                >
                  {inativo ? 'Reativar' : 'Inativar'}
                </Button>
                <Button size="small" variant="contained" color="secondary" onClick={() => onImpersonate?.({ workspaceId: ws.id, workspaceName: ws.nome })}>
                  Entrar →
                </Button>
              </Box>
            </Box>

            {/* ── Painel de preparação de ambiente (onboarding) ── */}
            {onbId === ws.id && (
              <Box sx={{ borderTop: 1, borderColor: 'divider', background: isDark ? PALETTE.neutral[900] : PALETTE.neutral[0], padding: '14px 20px' }}>
                {!ws.onboarding && !onb ? (
                  <Box>
                    <Box sx={{ fontSize: 12, color: 'text.disabled', marginBottom: '10px', lineHeight: 1.6 }}>
                      A marca nasce do <Box component="strong" sx={{ color: "text.primary" }}>manual (PDF)</Box> — a IA extrai identidade, posicionamento e design. Depois roda diagnóstico → mineração → destilação. O cliente entra num ambiente já populado.
                    </Box>
                    <Box sx={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Button size="small" variant="outlined" component="label" disabled={onbUploading}>
                        {onbUploading ? 'Subindo…' : onbManualName ? `📎 ${onbManualName}` : '📎 Subir manual (PDF)'}
                        <input type="file" accept="application/pdf" style={{ display: 'none' }} disabled={onbUploading}
                          onChange={e => uploadManual(ws, e)} />
                      </Button>
                      {onbManualPath && <Typography component="span" sx={{ fontSize: 11, color: PALETTE.data.positivo, fontWeight: 700 }}>✓ pronto</Typography>}
                    </Box>
                    <Button size="small" variant="contained" disabled={onbBusy || onbUploading} onClick={() => startOnboard(ws)}>
                      {onbBusy ? 'Iniciando…' : '🚀 Preparar ambiente completo'}
                    </Button>
                  </Box>
                ) : (() => {
                  const state     = onb || ws.onboarding;
                  const terminou  = onbComplete(state);
                  const ok        = onbOk(state);
                  const problemas = onbProblemas(state);
                  return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {ONB_TRILHAS.map(([tk, tNome, tSub, etapas]) => {
                        const feita = onbTrilhaCompleta(state, etapas);
                        return (
                          <Box key={tk} sx={{ mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '8px', mb: '4px' }}>
                              <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: feita ? 'success.main' : 'text.secondary' }}>
                                {tNome}
                              </Typography>
                              <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{tSub}</Typography>
                            </Box>
                            {etapas.map(([k, label]) => {
                              const st = state?.steps?.[k] || 'pending';
                              const v  = ONB_VISUAL[st] || ONB_VISUAL.pending;
                              const motivo = state?.notas?.[k];
                              return (
                                <Box key={k} sx={{ fontSize: 12.5, color: 'text.primary' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Typography component="span">{v.ic}</Typography>
                                    <Typography component="span" sx={{ flex: 1 }}>{label}</Typography>
                                    <Typography component="span" sx={{ fontSize: 10, fontWeight: 700, color: v.cor, textTransform: 'uppercase' }}>{st}</Typography>
                                  </Box>
                                  {motivo && st !== 'running' && st !== 'done' && (
                                    <Typography sx={{ fontSize: 11, color: 'text.secondary', pl: '26px' }}>{motivo}</Typography>
                                  )}
                                </Box>
                              );
                            })}
                          </Box>
                        );
                      })}

                      {!terminou && (
                        <Box sx={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <Typography sx={{ fontSize: 12, color: 'text.disabled', flex: 1, minWidth: 220 }}>
                            ⏳ Rodando sozinho — o servidor avança de minuto em minuto. Pode fechar esta aba.
                            A mineração leva ~15-30 min.
                          </Typography>
                          <Button size="small" variant="outlined" onClick={avancarAgora} disabled={onbBusy}>
                            {onbBusy ? 'Avançando…' : 'Avançar agora'}
                          </Button>
                        </Box>
                      )}
                      {terminou && ok && !onbAguardando(state) && (
                        <Alert severity="success" sx={{ mt: 1 }}>
                          Ambiente pronto — todas as etapas produziram saída. Pode liberar o acesso.
                        </Alert>
                      )}
                      {ok && onbAguardando(state) && onbTrilhaCompleta(state, ONB_TRILHAS[0][3]) && (
                        <Alert severity="info" sx={{ mt: 1 }}>
                          Inteligência pronta — pode liberar o acesso. A marca segue aguardando o manual;
                          quando ele chegar, o cérebro destila de novo com a identidade declarada.
                        </Alert>
                      )}
                      {terminou && !ok && (
                        <Alert severity="warning" sx={{ mt: 1 }}>
                          Terminou, mas {problemas.length === 1 ? 'uma etapa não entregou' : `${problemas.length} etapas não entregaram`}:{' '}
                          {problemas.map(p => p.label.split(' · ')[0]).join(', ')}. Revise antes de liberar o acesso —
                          o ambiente pode estar sem conteúdo.
                        </Alert>
                      )}
                    </Box>
                  );
                })()}
              </Box>
            )}

            {/* ── Painel de membros ── */}
            {expanded && (
              <Box sx={{ borderTop: 1, borderColor: 'divider', background: isDark ? PALETTE.neutral[900] : PALETTE.neutral[0], padding: '12px 20px' }}>
                {loadingM ? (
                  <Box sx={{ fontSize: 12, color: 'text.disabled' }}>Carregando membros...</Box>
                ) : members.length === 0 ? (
                  <Box sx={{ fontSize: 12, color: 'text.disabled' }}>Nenhum membro ainda.</Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {members.map(m => (
                      <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', bgcolor: 'background.paper',  border: 1, borderColor: 'divider' }}>
                        <Box sx={{ width: 28, height: 28, borderRadius: '50%', background: PALETTE.data.positivo + '33', color: PALETTE.data.positivo, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>
                          {(m.nome || m.email || '?').charAt(0).toUpperCase()}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          {m.nome && <Box sx={{ fontSize: 12, fontWeight: 700, color: 'text.primary' }}>{m.nome}</Box>}
                          <Box sx={{ fontSize: 11, color: 'text.disabled', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.email || `ID: ${m.user_id?.slice(0, 12)}…`}
                          </Box>
                        </Box>
                        <TextField select size="small" value={m.role}
                          onChange={e => changeMemberRole(ws.id, m.id, e.target.value)}
                          sx={{ width: 110 }}
                        >
                          <MenuItem value="member">member</MenuItem>
                          <MenuItem value="admin">admin</MenuItem>
                        </TextField>
                        <Button size="small" variant="outlined" color="error" onClick={() => removeMember(ws.id, m.id)}>Remover</Button>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        );
      })}

      {workspaces.length === 0 && (
        <Box sx={{ textAlign: 'center', padding: '4rem', color: 'text.disabled' }}>Nenhum workspace criado ainda.</Box>
      )}

      {/* Modal criar workspace */}
      {showCreate && (
        <Box sx={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider',  padding: '28px', width: '100%', maxWidth: 420 }}>
            <Box sx={{ fontSize: 16, fontWeight: 800, color: 'text.primary', marginBottom: '20px' }}>Criar workspace</Box>
            {error && <Box sx={{ marginBottom: '12px', padding: '8px 12px', background: PALETTE.data.criticoFraco, color: PALETTE.data.critico,  fontSize: 12 }}>{error}</Box>}
            <Box component="form" onSubmit={handleCreate} sx={{ display: 'flex', flexDirection: 'column', gap: '12px'}}>
              <TextField size="small"  placeholder="Nome da empresa *" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
              <TextField size="small"  placeholder="Domínio (ex: empresa.com.br)" value={form.dominio} onChange={e => setForm(f => ({ ...f, dominio: e.target.value }))} />
              <TextField select size="small" value={form.setor} onChange={e => setForm(f => ({ ...f, setor: e.target.value }))} SelectProps={{ displayEmpty: true }}>
                <MenuItem value="">Setor</MenuItem>
                {WS_SETORES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              <TextField select size="small" value={form.porte} onChange={e => setForm(f => ({ ...f, porte: e.target.value }))} SelectProps={{ displayEmpty: true }}>
                <MenuItem value="">Porte</MenuItem>
                {WS_PORTES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
              {/* País de origem: define o mercado analisado, as praças de reputação
                  e a variante do idioma. Marca portuguesa procurada no Reclame Aqui
                  volta vazia — e conteúdo em português brasileiro entregue a uma
                  marca de Portugal se denuncia na primeira linha. */}
              <TextField select size="small" value={form.pais}
                helperText="Define o mercado analisado, as praças de reputação e o idioma dos textos"
                onChange={e => setForm(f => ({ ...f, pais: e.target.value }))}>
                {WS_PAISES.map(p => <MenuItem key={p.cod} value={p.cod}>{p.rotulo}</MenuItem>)}
              </TextField>
              <Box sx={{ display: 'flex', gap: '10px' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>Créditos por mês</Typography>
                  <TextField size="small"  type="number" min="0" placeholder="ex: 3000" value={form.creditos_mes} onChange={e => setForm(f => ({ ...f, creditos_mes: e.target.value }))} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>Valor mensal (R$)</Typography>
                  <TextField size="small"  placeholder="ex: 5000" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>Endereço (subdomínio) — opcional, gera do nome</Typography>
                <TextField size="small"  placeholder="nomedamarca" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
                <Box sx={{ fontSize: 11, color: PALETTE.data.positivo, marginTop: '4px' }}>
                  {(slugify(form.slug || form.nome) || 'nomedamarca')}.br4ndcode.com
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <Button type="button" size="small" variant="outlined" onClick={() => { setShowCreate(false); setError(''); }}>Cancelar</Button>
                <Button type="submit" size="small" variant="contained" disabled={creating}>{creating ? 'Criando...' : 'Criar workspace'}</Button>
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* Modal configurar cobrança */}
      {showConfig && (
        <Box sx={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider',  padding: '28px', width: '100%', maxWidth: 420 }}>
            <Box sx={{ fontSize: 16, fontWeight: 800, color: 'text.primary', marginBottom: '6px' }}>Configurar · {showConfig.nome}</Box>
            <Box sx={{ fontSize: 13, color: 'text.disabled', marginBottom: '20px' }}>Define os créditos/mês e o valor do contrato. Salvar recompõe o saldo do mês para o novo pool e reinicia o ciclo.</Box>
            {error && <Box sx={{ marginBottom: '12px', padding: '8px 12px', background: PALETTE.data.criticoFraco, color: PALETTE.data.critico,  fontSize: 12 }}>{error}</Box>}
            <Box component="form" onSubmit={saveConfig} sx={{ display: 'flex', flexDirection: 'column', gap: '12px'}}>
              <Box>
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>Créditos por mês</Typography>
                <TextField size="small"  type="number" min="0" placeholder="ex: 3000" value={configForm.creditos_mes} onChange={e => setConfigForm(f => ({ ...f, creditos_mes: e.target.value }))} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>Valor mensal (R$)</Typography>
                <TextField size="small"  placeholder="ex: 5000" value={configForm.valor} onChange={e => setConfigForm(f => ({ ...f, valor: e.target.value }))} />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>Endereço (subdomínio)</Typography>
                <TextField size="small"  placeholder="nomedamarca" value={configForm.slug} onChange={e => setConfigForm(f => ({ ...f, slug: e.target.value }))} />
                <Box sx={{ fontSize: 11, color: PALETTE.data.positivo, marginTop: '4px' }}>
                  {(slugify(configForm.slug) || '—')}.br4ndcode.com
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <Button type="button" size="small" variant="outlined" onClick={() => { setShowConfig(null); setError(''); }}>Cancelar</Button>
                <Button type="submit" size="small" variant="contained" disabled={savingConfig}>{savingConfig ? 'Salvando...' : 'Salvar'}</Button>
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* Modal convidar cliente */}
      {showInvite && (
        <Box sx={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider',  padding: '28px', width: '100%', maxWidth: 400 }}>
            <Box sx={{ fontSize: 16, fontWeight: 800, color: 'text.primary', marginBottom: '6px' }}>Convidar para {showInvite.nome}</Box>
            <Box sx={{ fontSize: 13, color: 'text.disabled', marginBottom: '20px' }}>O cliente receberá um e-mail com link para definir senha e acessar o workspace.</Box>
            {error && <Box sx={{ marginBottom: '12px', padding: '8px 12px', background: PALETTE.data.criticoFraco, color: PALETTE.data.critico,  fontSize: 12 }}>{error}</Box>}
            <Box component="form" onSubmit={handleInvite} sx={{ display: 'flex', flexDirection: 'column', gap: '12px'}}>
              <TextField size="small"  type="email" placeholder="E-mail do cliente *" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required />
              <Box sx={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <Button type="button" size="small" variant="outlined" onClick={() => { setShowInvite(null); setError(''); }}>Cancelar</Button>
                <Button type="submit" size="small" variant="contained" disabled={inviting}>{inviting ? 'Enviando...' : 'Enviar convite'}</Button>
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* Modal criar acesso (nome + email + senha) */}
      {showCreateUser && (
        <Box sx={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider',  padding: '28px', width: '100%', maxWidth: 420 }}>
            <Box sx={{ fontSize: 16, fontWeight: 800, color: 'text.primary', marginBottom: '6px' }}>Criar acesso · {showCreateUser.nome}</Box>
            <Box sx={{ fontSize: 13, color: 'text.disabled', marginBottom: '20px' }}>Cria o login direto, com senha temporária. Sem email de confirmação — entregue as credenciais ao cliente. No primeiro acesso ele será obrigado a definir a senha pessoal.</Box>
            {error && <Box sx={{ marginBottom: '12px', padding: '8px 12px', background: PALETTE.data.criticoFraco, color: PALETTE.data.critico,  fontSize: 12 }}>{error}</Box>}
            {userOk ? (
              <Box>
                <Box sx={{ marginBottom: '16px', padding: '12px 14px', background: PALETTE.data.positivo + '22', color: PALETTE.data.positivo,  fontSize: 13, fontWeight: 600, wordBreak: 'break-all' }}>{userOk}</Box>
                <Box sx={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <Button type="button" size="small" variant="outlined" onClick={() => { navigator.clipboard?.writeText(userOk); }}>Copiar</Button>
                  <Button type="button" size="small" variant="contained" onClick={() => { setShowCreateUser(null); setUserOk(''); }}>Fechar</Button>
                </Box>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleCreateUser} sx={{ display: 'flex', flexDirection: 'column', gap: '12px'}}>
                <TextField size="small"  placeholder="Nome do usuário" value={userForm.nome} onChange={e => setUserForm(f => ({ ...f, nome: e.target.value }))} />
                <TextField size="small"  type="email" placeholder="E-mail (login) *" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} required />
                <Box sx={{ display: 'flex', gap: '8px' }}>
                  <TextField size="small" sx={{ flex: 1 }} placeholder="Senha (mín. 8) *" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} required />
                  <Button type="button" size="small" variant="outlined" onClick={genPassword}>Gerar</Button>
                </Box>
                <TextField select size="small"  value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}>
                  <MenuItem value="member">member</MenuItem>
                  <MenuItem value="admin">admin</MenuItem>
                </TextField>
                <Box sx={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <Button type="button" size="small" variant="outlined" onClick={() => { setShowCreateUser(null); setError(''); }}>Cancelar</Button>
                  <Button type="submit" size="small" variant="contained" disabled={creatingUser}>{creatingUser ? 'Criando...' : 'Criar acesso'}</Button>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
