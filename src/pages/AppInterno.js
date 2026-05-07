import { useState, useEffect, useRef } from "react";
import logoPositivo from "../assets/logo-positivo-200px.png";
import { supabase } from "../lib/supabase";
import { DS, F, COOLDOWN_ENTRE_APROVACOES } from "../lib/constants";
import { runStream } from "../lib/api";
import { fmtDate, scBg, scTxt, tryParseJSON, normalizeSector, MACRO_SETORES } from "../lib/helpers";
import { GlobalStyle } from "../components/GlobalStyle";
import { Pill } from "../components/Pill";
import { RelatorioCompleto } from "./RelatorioCompleto";
import { StreamingView } from "./StreamingView";
import { NovoManual } from "./NovoManual";
import { DashboardHistorico } from "./DashboardHistorico";

const PORTES = ["Startup", "PME", "Médio", "Grande"];

function TodosPage({ historico, loadingHist, onOpen, initialSetor = "" }) {
  const [busca, setBusca]     = useState("");
  const [setor, setSetor]     = useState(initialSetor);
  const [porte, setPorte]     = useState("");
  const [ordem, setOrdem]     = useState("recente");

  if (loadingHist) return <div style={{ padding:"3rem", textAlign:"center", color:DS.textLight, fontSize:13 }}>Carregando...</div>;

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

  const selectStyle = {
    fontSize:12, fontFamily:F, color:DS.textMid,
    background:DS.white, border:`1px solid ${DS.border}`,
    borderRadius:8, padding:"6px 10px", cursor:"pointer", outline:"none",
  };

  return (
    <div style={{ padding:"28px 28px 40px" }}>
      {/* Filtros */}
      <div style={{ display:"flex", gap:10, marginBottom:24, flexWrap:"wrap", alignItems:"center" }}>
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar empresa..."
          style={{ ...selectStyle, flex:1, minWidth:180, padding:"6px 12px" }}
        />
        <select value={setor} onChange={e => setSetor(e.target.value)} style={selectStyle}>
          <option value="">Todos os setores</option>
          {MACRO_SETORES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={porte} onChange={e => setPorte(e.target.value)} style={selectStyle}>
          <option value="">Todos os portes</option>
          {PORTES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={ordem} onChange={e => setOrdem(e.target.value)} style={selectStyle}>
          <option value="recente">Mais recentes</option>
          <option value="antigo">Mais antigos</option>
          <option value="az">A → Z</option>
        </select>
        {(busca || setor || porte) && (
          <button onClick={() => { setBusca(""); setSetor(""); setPorte(""); }}
            style={{ ...selectStyle, color:DS.pink, border:`1px solid ${DS.pink}`, background:"none", fontWeight:700 }}>
            Limpar
          </button>
        )}
        <span style={{ fontSize:11, color:DS.textLight, marginLeft:"auto" }}>
          {filtrado.length} de {historico.length} diagnóstico{historico.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Lista */}
      {filtrado.length === 0 ? (
        <div style={{ textAlign:"center", padding:"3rem", color:DS.textLight, fontSize:13 }}>Nenhum resultado encontrado.</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
          {filtrado.map((d, i) => {
            const avg = [d.score_singularidade, d.score_consistencia, d.score_posicionamento]
              .filter(Boolean).reduce((a, b, _, arr) => a + b / arr.length, 0);
            const scoreColor = avg >= 7 ? DS.green : avg >= 4 ? DS.amber : DS.pink;
            return (
              <div key={d.id}
                onClick={() => onOpen(d)}
                style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 14px", borderRadius:10, cursor:"pointer", background: i % 2 === 0 ? DS.grayLight : DS.white, transition:"opacity 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                <div style={{ width:34, height:34, borderRadius:8, background:DS.navy, color:DS.white, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:900, fontFamily:F, flexShrink:0 }}>
                  {(d.empresa || "?").charAt(0).toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:DS.navy, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.empresa}</div>
                  {(d.setor || d.porte) && (
                    <div style={{ fontSize:11, color:DS.textLight }}>
                      {[normalizeSector(d.setor), d.porte].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
                <div style={{ fontSize:11, color:DS.textLight, flexShrink:0, textAlign:"right" }}>
                  {fmtDate(d.created_at)}
                  {d.user_name && <div style={{ fontSize:10 }}>{d.user_name}</div>}
                </div>
                {avg > 0 && (
                  <div style={{ width:36, height:36, borderRadius:8, background:scoreColor + "22", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontSize:13, fontWeight:900, color:scoreColor }}>{avg.toFixed(0)}</span>
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

const IcoInbox = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
    <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
  </svg>
);

const IcoPlus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="16"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
  </svg>
);

const IcoChart = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const IcoList = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

const IcoLogout = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

export function AppInterno({ user, onLogout }) {
  const [page, setPage]                             = useState("historico");
  const [solicitacoes, setSolicitacoes]             = useState([]);
  const [loadingSol, setLoadingSol]                 = useState(true);
  const [historico, setHistorico]                   = useState([]);
  const [loadingHist, setLoadingHist]               = useState(true);
  const [histCount, setHistCount]                   = useState(0);
  const [selectedRel, setSelectedRel]               = useState(null);
  const [streamSteps, setStreamSteps]               = useState([]);
  const [partialData, setPartialData]               = useState(null);
  const [error, setError]                           = useState("");
  const [rodando, setRodando]                       = useState(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const [rateLimitAttempt, setRateLimitAttempt]     = useState(0);
  const [cooldownAtivo, setCooldownAtivo]           = useState(0);
  const [filtroSetor, setFiltroSetor]               = useState("");
  const cooldownRef = useRef(null);
  const mainRef     = useRef(null);

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
    const { data, count } = await supabase.from("diagnosticos").select("*", { count:"exact" }).order("created_at", { ascending: false });
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

    await supabase.from("solicitacoes").update({ status:"aprovado" }).eq("id", sol.id);

    const contextoCompleto = [
      sol.setor && `Setor: ${sol.setor}`,
      sol.porte && `Porte: ${sol.porte}`,
      sol.site  && `Site: ${sol.site}`,
      sol.contexto,
      `Solicitante: ${sol.nome} (${sol.email})`,
    ].filter(Boolean).join("\n");

    await runStream({
      empresa: sol.empresa,
      contexto: contextoCompleto,
      onSearchStep: (count, query) => {
        setStreamSteps(prev => { const u = [...prev]; u[count-1] = query || `Busca ${count}`; return u; });
      },
      onText: (txt) => {
        const p = tryParseJSON(txt);
        if (p) setPartialData(p);
      },
      onRateLimit: (segundos, tentativa) => {
        setRateLimitCountdown(segundos);
        setRateLimitAttempt(tentativa);
      },
      onDone: async (parsed) => {
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

        await supabase.from("solicitacoes").update({
          status: "concluido",
          diagnostico_id: diag?.id,
        }).eq("id", sol.id);

        setRodando(null);
        await fetchSolicitacoes();
        await fetchHistorico();
        setSelectedRel({ data: parsed, meta: { id: diag?.id, created_at: new Date().toISOString(), user_name: user.user_metadata?.full_name || user.email.split("@")[0] } });
        setPage("relatorio");
      },
      onError: async (msg) => {
        setError(msg);
        await supabase.from("solicitacoes").update({ status:"erro" }).eq("id", sol.id);
        setRodando(null);
        setPage("solicitacoes");
      },
    });
  }

  async function rejeitarSolicitacao(id) {
    await supabase.from("solicitacoes").update({ status:"rejeitado" }).eq("id", id);
    setSolicitacoes(s => s.map(x => x.id===id ? {...x, status:"rejeitado"} : x));
  }

  function navigate(p) {
    setPage(p);
    setError("");
    if (mainRef.current) mainRef.current.scrollTo({ top:0, behavior:"smooth" });
  }

  const statusColor = s => ({ pendente: DS.amber, aprovado: DS.green, concluido: DS.green, rejeitado: DS.pink, erro: DS.pink }[s] || DS.gray);
  const statusBg    = s => ({ pendente: DS.amberPale, aprovado: DS.greenPale, concluido: DS.greenPale, rejeitado: DS.pinkPale, erro: DS.pinkPale }[s] || DS.grayLight);
  const pendentes   = solicitacoes.filter(s => s.status === "pendente").length;
  const userName    = user.user_metadata?.full_name || user.email.split("@")[0];
  const userInitial = userName.charAt(0).toUpperCase();

  const navItems = [
    { id:"historico",    label:"Dashboard",          Icon:IcoChart, badge: null },
    { id:"solicitacoes", label:"Solicitações",       Icon:IcoInbox, badge: pendentes > 0 ? pendentes : null },
    { id:"novo",         label:"Novo diagnóstico",   Icon:IcoPlus,  badge: null },
    { id:"todos",        label:"Diagnósticos",        Icon:IcoList,  badge: null },
  ];

  const pageHeaders = {
    solicitacoes: { title:"Fila de solicitações",        sub:"Aprove para gerar o diagnóstico ou rejeite a solicitação." },
    novo:         { title:"Novo diagnóstico",            sub:"Gere um diagnóstico manualmente para qualquer empresa." },
    historico:    { title:"Dashboard",                   sub:`${histCount} relatório${histCount !== 1 ? "s" : ""} gerado${histCount !== 1 ? "s" : ""} pela equipe LOUDR.` },
    todos:        { title:"Todos os diagnósticos",       sub:`Lista completa — ${histCount} relatório${histCount !== 1 ? "s" : ""} gerado${histCount !== 1 ? "s" : ""}.` },
  };

  const ph = pageHeaders[page];

  return (
    <div style={{ height:"100vh", background:"#ECEEF3", padding:10, boxSizing:"border-box", display:"flex", fontFamily:F, color:DS.text }}>
      <GlobalStyle />
      <div style={{ display:"flex", flex:1, background:DS.white, borderRadius:20, overflow:"hidden", boxShadow:"0 4px 32px rgba(0,0,0,0.07)" }}>

        {/* ── SIDEBAR ── */}
        <aside style={{ width:210, display:"flex", flexDirection:"column", borderRight:`1px solid ${DS.border}`, flexShrink:0, background:DS.white }}>

          <div style={{ padding:"22px 20px 18px" }}>
            <img src={logoPositivo} alt="LOUDR" style={{ height:20, display:"block" }} />
          </div>

          <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:DS.textLight, padding:"0 20px 8px" }}>
            Menu
          </div>

          <nav style={{ flex:1, padding:"0 10px", display:"flex", flexDirection:"column", gap:2 }}>
            {navItems.map(({ id, label, Icon, badge }) => {
              const active = page === id || (page === "streaming" && id === "solicitacoes") || (page === "relatorio" && id === "todos");
              return (
                <button key={id} onClick={() => navigate(id)} style={{
                  display:"flex", alignItems:"center", gap:10,
                  padding:"9px 12px", borderRadius:10, border:"none",
                  background: active ? DS.navy : "transparent",
                  color: active ? DS.white : DS.textMid,
                  cursor:"pointer", fontFamily:F, fontSize:13,
                  fontWeight: active ? 700 : 500,
                  textAlign:"left", width:"100%",
                }}>
                  <span style={{ opacity: active ? 1 : 0.55, display:"flex", alignItems:"center" }}><Icon /></span>
                  <span style={{ flex:1 }}>{label}</span>
                  {badge && (
                    <span style={{ background: active ? DS.green : DS.pink, color:DS.white, borderRadius:99, fontSize:10, fontWeight:700, padding:"1px 6px", lineHeight:"16px" }}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div style={{ borderTop:`1px solid ${DS.border}`, padding:"12px 10px 16px", display:"flex", flexDirection:"column", gap:2 }}>
            <div style={{ padding:"4px 12px", fontSize:11, color:DS.textLight, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {user.email}
            </div>
            <button onClick={onLogout} style={{
              display:"flex", alignItems:"center", gap:8,
              padding:"8px 12px", borderRadius:10, border:"none",
              background:"transparent", color:DS.pink,
              cursor:"pointer", fontFamily:F, fontSize:12,
              fontWeight:600, width:"100%", textAlign:"left",
            }}>
              <IcoLogout />
              Sair da conta
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main ref={mainRef} style={{ flex:1, overflowY:"auto", background:DS.offwhite, display:"flex", flexDirection:"column" }}>

          {ph && (
            <div style={{ background:DS.white, borderBottom:`1px solid ${DS.border}`, padding:"20px 28px" }}>
              <h1 style={{ fontSize:22, fontWeight:900, color:DS.navy, letterSpacing:"-0.02em", margin:0, marginBottom:2 }}>{ph.title}</h1>
              <p style={{ fontSize:13, color:DS.textLight, margin:0 }}>{ph.sub}</p>
            </div>
          )}

          {error && (
            <div style={{ background:DS.pinkPale, border:`1px solid #F4C0D1`, borderRadius:10, padding:"14px 18px", margin:"16px 28px 0" }}>
              <div style={{ fontWeight:800, color:DS.pink, marginBottom:4, fontSize:14 }}>Erro</div>
              <div style={{ fontSize:13, color:"#72243E" }}>{error}</div>
              <button onClick={() => setError("")} style={{ marginTop:8, fontSize:12, cursor:"pointer", background:"none", border:`1px solid ${DS.border}`, borderRadius:6, padding:"3px 10px", color:DS.textMid, fontFamily:F }}>Fechar</button>
            </div>
          )}

          <div style={{ padding:"24px 28px 48px", flex:1 }}>

            {page === "solicitacoes" && (
              <div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))", gap:10, marginBottom:24 }}>
                  {[
                    { val: solicitacoes.length, lbl:"total de pedidos" },
                    { val: pendentes, lbl:"aguardando aprovação", highlight: pendentes > 0 },
                    { val: solicitacoes.filter(s=>s.status==="concluido").length, lbl:"diagnósticos gerados" },
                    { val: solicitacoes.filter(s=>s.status==="rejeitado").length, lbl:"rejeitados" },
                  ].map((s,i) => (
                    <div key={i} style={{ background:s.highlight?DS.amberPale:DS.white, border:s.highlight?`1px solid #FED7AA`:`1px solid ${DS.border}`, borderRadius:12, padding:"14px 18px", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
                      <div style={{ fontSize:24, fontWeight:900, color:s.highlight?DS.amber:DS.navy }}>{s.val}</div>
                      <div style={{ fontSize:11, color:DS.textLight, marginTop:3 }}>{s.lbl}</div>
                    </div>
                  ))}
                </div>

                {loadingSol ? (
                  <div style={{ textAlign:"center", padding:"3rem", color:DS.textLight }}>Carregando...</div>
                ) : solicitacoes.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"4rem", color:DS.textLight }}>
                    <div style={{ fontSize:14, marginBottom:6 }}>Nenhuma solicitação ainda.</div>
                    <div style={{ fontSize:12 }}>Compartilhe a página pública para receber pedidos.</div>
                  </div>
                ) : (
                  solicitacoes.map(sol => (
                    <div key={sol.id} style={{ background:DS.white, border:`1px solid ${DS.border}`, borderRadius:12, padding:"16px 20px", marginBottom:10, boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
                      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4, flexWrap:"wrap" }}>
                            <span style={{ fontSize:15, fontWeight:800, color:DS.navy }}>{sol.empresa}</span>
                            <Pill bg={statusBg(sol.status)} color={statusColor(sol.status)}>{sol.status}</Pill>
                            {sol.setor && <span style={{ fontSize:12, color:DS.textLight }}>{normalizeSector(sol.setor)} · {sol.porte}</span>}
                          </div>
                          <div style={{ fontSize:12, color:DS.textLight, marginBottom:6 }}>
                            {sol.nome} · {sol.email} · {fmtDate(sol.created_at)}
                          </div>
                          {sol.site && <div style={{ fontSize:12, color:DS.textMid }}>{sol.site}</div>}
                          {sol.contexto && (
                            <div style={{ marginTop:8, padding:"8px 12px", background:DS.grayLight, borderRadius:8, fontSize:12, color:DS.textMid, lineHeight:1.55 }}>
                              {sol.contexto}
                            </div>
                          )}
                        </div>
                        {sol.status === "pendente" && (
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
                            {cooldownAtivo > 0 && (
                              <div style={{ fontSize:11, color:DS.amber, fontFamily:F, textAlign:"right" }}>
                                Próxima aprovação em {cooldownAtivo}s
                              </div>
                            )}
                            <div style={{ display:"flex", gap:8 }}>
                              <button onClick={() => rejeitarSolicitacao(sol.id)}
                                style={{ background:"none", border:`1px solid #F4C0D1`, borderRadius:8, padding:"7px 14px", fontSize:12, color:DS.pink, cursor:"pointer", fontFamily:F }}>
                                Rejeitar
                              </button>
                              <button onClick={() => aprovarERodar(sol)} disabled={cooldownAtivo > 0}
                                style={{ background: cooldownAtivo > 0 ? "#9ca3af" : DS.green, border:"none", borderRadius:8, padding:"7px 16px", fontSize:12, fontWeight:700, color:DS.white, cursor: cooldownAtivo > 0 ? "not-allowed" : "pointer", fontFamily:F }}>
                                {cooldownAtivo > 0 ? `Aguarde ${cooldownAtivo}s` : "Aprovar e rodar →"}
                              </button>
                            </div>
                          </div>
                        )}
                        {sol.status === "concluido" && (
                          <button onClick={() => {
                            const diag = historico.find(h => h.id === sol.diagnostico_id);
                            if (diag) { setSelectedRel({ data: diag.data, meta: diag }); navigate("relatorio"); }
                          }} style={{ background:"none", border:`1px solid ${DS.border}`, borderRadius:8, padding:"7px 14px", fontSize:12, color:DS.green, cursor:"pointer", fontFamily:F, flexShrink:0 }}>
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
              <div>
                {loadingHist ? (
                  <div style={{ textAlign:"center", padding:"3rem", color:DS.textLight }}>Carregando...</div>
                ) : historico.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"4rem", color:DS.textLight }}>Nenhum diagnóstico gerado ainda.</div>
                ) : (
                  <DashboardHistorico
                    historico={historico}
                    onVerRelatorio={d => { setSelectedRel({ data: d.data, meta: d }); navigate("relatorio"); }}
                    onVerTodos={() => { setFiltroSetor(""); navigate("todos"); }}
                    onSetorClick={s => { setFiltroSetor(s); navigate("todos"); }}
                  />
                )}
              </div>
            )}

            {page === "todos" && (
              <TodosPage
                historico={historico}
                loadingHist={loadingHist}
                initialSetor={filtroSetor}
                onOpen={d => { setSelectedRel({ data: d.data, meta: d }); navigate("relatorio"); }}
              />
            )}
          </div>
        </main>

        {/* ── RIGHT PANEL ── */}
        <aside style={{ width:252, borderLeft:`1px solid ${DS.border}`, flexShrink:0, overflowY:"auto", background:DS.white, display:"flex", flexDirection:"column" }}>

          {/* User card */}
          <div style={{ padding:"24px 20px 20px", borderBottom:`1px solid ${DS.border}`, textAlign:"center" }}>
            <div style={{ width:52, height:52, borderRadius:"50%", background:DS.navy, color:DS.white, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:900, margin:"0 auto 12px", fontFamily:F }}>
              {userInitial}
            </div>
            <div style={{ fontSize:14, fontWeight:800, color:DS.navy }}>{userName}</div>
            <div style={{ fontSize:11, color:DS.textLight, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.email}</div>
          </div>

          {/* Pendentes */}
          {pendentes > 0 && (
            <div style={{ padding:"16px", borderBottom:`1px solid ${DS.border}` }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:DS.amber, marginBottom:10 }}>
                Aguardando aprovação
              </div>
              {solicitacoes.filter(s => s.status === "pendente").slice(0, 3).map((sol, i, arr) => (
                <div key={sol.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom: i < arr.length-1 ? `1px solid ${DS.border}` : "none" }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:DS.amber, flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:DS.navy, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{sol.empresa}</div>
                    <div style={{ fontSize:10, color:DS.textLight }}>{sol.nome}</div>
                  </div>
                  <button onClick={() => navigate("solicitacoes")} style={{ fontSize:11, color:DS.green, background:"none", border:"none", cursor:"pointer", fontFamily:F, fontWeight:600, flexShrink:0 }}>ver</button>
                </div>
              ))}
            </div>
          )}

          {/* Recentes */}
          <div style={{ padding:"16px", flex:1 }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:DS.textLight, marginBottom:12 }}>
              Diagnósticos recentes
            </div>
            {loadingHist ? (
              <div style={{ fontSize:12, color:DS.textLight }}>Carregando...</div>
            ) : historico.length === 0 ? (
              <div style={{ fontSize:12, color:DS.textLight }}>Nenhum diagnóstico ainda.</div>
            ) : (
              historico.slice(0, 6).map((d, i, arr) => (
                <div key={d.id}
                  onClick={() => { setSelectedRel({ data: d.data, meta: d }); navigate("relatorio"); }}
                  style={{ padding:"10px 0", borderBottom: i < arr.length-1 ? `1px solid ${DS.border}` : "none", cursor:"pointer" }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.65"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  <div style={{ fontSize:12, fontWeight:700, color:DS.navy, marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.empresa}</div>
                  <div style={{ fontSize:10, color:DS.textLight }}>{fmtDate(d.created_at)}</div>
                </div>
              ))
            )}
          </div>
        </aside>

      </div>
    </div>
  );
}
