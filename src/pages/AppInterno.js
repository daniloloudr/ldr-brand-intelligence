import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { DS, F, COOLDOWN_ENTRE_APROVACOES } from "../lib/constants";
import { runStream } from "../lib/api";
import { fmtDate, scBg, scTxt, tryParseJSON } from "../lib/helpers";
import { GlobalStyle } from "../components/GlobalStyle";
import { Pill } from "../components/Pill";
import { RelatorioCompleto } from "./RelatorioCompleto";
import { StreamingView } from "./StreamingView";
import { NovoManual } from "./NovoManual";
import { DashboardHistorico } from "./DashboardHistorico";

export function AppInterno({ user, onLogout }) {
  const [page, setPage]                   = useState("historico");
  const [solicitacoes, setSolicitacoes]   = useState([]);
  const [loadingSol, setLoadingSol]       = useState(true);
  const [historico, setHistorico]         = useState([]);
  const [loadingHist, setLoadingHist]     = useState(true);
  const [histCount, setHistCount]         = useState(0);
  const [selectedSol, setSelectedSol]     = useState(null);
  const [selectedRel, setSelectedRel]     = useState(null);
  const [streamSteps, setStreamSteps]         = useState([]);
  const [partialData, setPartialData]         = useState(null);
  const [error, setError]                     = useState("");
  const [rodando, setRodando]                 = useState(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const [rateLimitAttempt, setRateLimitAttempt]     = useState(0);
  const [cooldownAtivo, setCooldownAtivo]     = useState(0);
  const cooldownRef = useRef(null);

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
    setSelectedSol(null);
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
          setor: parsed.setor, porte: parsed.porte,
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
    setSelectedSol(null);
  }

  function navigate(p) { setPage(p); setError(""); window.scrollTo({ top:0, behavior:"smooth" }); }

  const statusColor = s => ({ pendente: DS.amber, aprovado: DS.green, concluido: DS.green, rejeitado: DS.pink, erro: DS.pink }[s] || DS.gray);
  const statusBg    = s => ({ pendente: DS.amberPale, aprovado: DS.greenPale, concluido: DS.greenPale, rejeitado: DS.pinkPale, erro: DS.pinkPale }[s] || DS.grayLight);
  const pendentes   = solicitacoes.filter(s => s.status === "pendente").length;

  return (
    <div style={{ fontFamily:F, color:DS.text, background:DS.offwhite, minHeight:"100vh" }}>
      <GlobalStyle />

      <nav style={{ position:"sticky", top:0, zIndex:10, background:DS.white, borderBottom:`1px solid ${DS.border}`, padding:"0 28px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }} onClick={() => navigate("solicitacoes")}>
          <div style={{ width:10, height:10, background:DS.pink }} />
          <span style={{ fontSize:16, fontWeight:900, color:DS.navy, letterSpacing:"-0.02em" }}>LOUDR</span>
          <span style={{ fontSize:12, color:DS.textLight }}>Brand Intelligence</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          {[
            { id:"solicitacoes", label:"Solicitações", badge: pendentes > 0 ? pendentes : null },
            { id:"novo", label:"Novo diagnóstico", badge: null },
            { id:"historico", label:"Histórico", badge: histCount > 0 ? histCount : null },
          ].map(tab => (
            <button key={tab.id} onClick={() => navigate(tab.id)} style={{
              background: page===tab.id ? DS.navy : "none",
              color: page===tab.id ? DS.white : DS.textMid,
              border: `1px solid ${page===tab.id ? DS.navy : DS.border}`,
              borderRadius:8, padding:"5px 12px", fontSize:12, fontFamily:F,
              cursor:"pointer", display:"flex", alignItems:"center", gap:5,
            }}>
              {tab.label}
              {tab.badge && <span style={{ background:page===tab.id?DS.green:DS.pink, color:DS.white, borderRadius:99, fontSize:10, fontWeight:700, padding:"1px 5px" }}>{tab.badge}</span>}
            </button>
          ))}
          <span style={{ fontSize:12, color:DS.textLight, marginLeft:8 }}>{user.email}</span>
          <button onClick={onLogout} style={{ background:"none", border:`1px solid ${DS.border}`, borderRadius:8, padding:"5px 10px", fontSize:12, color:DS.textLight, cursor:"pointer", fontFamily:F }}>Sair</button>
        </div>
      </nav>

      <div style={{ maxWidth:900, margin:"0 auto", padding:"28px 20px 72px" }}>

        {error && (
          <div style={{ background:DS.pinkPale, border:`1px solid #F4C0D1`, borderRadius:10, padding:"14px 18px", marginBottom:14 }}>
            <div style={{ fontWeight:800, color:DS.pink, marginBottom:4, fontSize:14 }}>Erro</div>
            <div style={{ fontSize:13, color:"#72243E" }}>{error}</div>
            <button onClick={() => setError("")} style={{ marginTop:8, fontSize:12, cursor:"pointer", background:"none", border:`1px solid ${DS.border}`, borderRadius:6, padding:"3px 10px", color:DS.textMid, fontFamily:F }}>Fechar</button>
          </div>
        )}

        {page === "solicitacoes" && (
          <div>
            <div style={{ marginBottom:24 }}>
              <h2 style={{ fontSize:22, fontWeight:900, color:DS.navy, letterSpacing:"-0.02em", marginBottom:4 }}>Fila de solicitações</h2>
              <p style={{ fontSize:13, color:DS.textLight }}>Aprove para rodar o diagnóstico ou rejeite a solicitação.</p>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))", gap:10, marginBottom:20 }}>
              {[
                { val: solicitacoes.length, lbl:"total de pedidos" },
                { val: pendentes, lbl:"aguardando aprovação", highlight: pendentes > 0 },
                { val: solicitacoes.filter(s=>s.status==="concluido").length, lbl:"diagnósticos gerados" },
                { val: solicitacoes.filter(s=>s.status==="rejeitado").length, lbl:"rejeitados" },
              ].map((s,i) => (
                <div key={i} style={{ background:s.highlight?DS.amberPale:DS.grayLight, border:s.highlight?`1px solid #FED7AA`:`1px solid ${DS.border}`, borderRadius:10, padding:"12px 16px" }}>
                  <div style={{ fontSize:22, fontWeight:900, color:s.highlight?DS.amber:DS.navy }}>{s.val}</div>
                  <div style={{ fontSize:11, color:DS.textLight, marginTop:2 }}>{s.lbl}</div>
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
                <div key={sol.id} style={{ background:DS.white, border:`1px solid ${DS.border}`, borderRadius:12, padding:"16px 20px", marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4, flexWrap:"wrap" }}>
                        <span style={{ fontSize:15, fontWeight:800, color:DS.navy }}>{sol.empresa}</span>
                        <Pill bg={statusBg(sol.status)} color={statusColor(sol.status)}>{sol.status}</Pill>
                        {sol.setor && <span style={{ fontSize:12, color:DS.textLight }}>{sol.setor} · {sol.porte}</span>}
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
            onBack={() => navigate("solicitacoes")}
            backLabel="← Voltar às solicitações"
          />
        )}

        {page === "historico" && (
          <div>
            <div style={{ marginBottom:20 }}>
              <h2 style={{ fontSize:22, fontWeight:900, color:DS.navy, letterSpacing:"-0.02em", marginBottom:4 }}>Histórico de diagnósticos</h2>
              <p style={{ fontSize:13, color:DS.textLight }}>Todos os relatórios gerados pela equipe LOUDR.</p>
            </div>
            {loadingHist ? (
              <div style={{ textAlign:"center", padding:"3rem", color:DS.textLight }}>Carregando...</div>
            ) : historico.length === 0 ? (
              <div style={{ textAlign:"center", padding:"4rem", color:DS.textLight }}>Nenhum diagnóstico gerado ainda.</div>
            ) : (
              <>
                <DashboardHistorico
                  historico={historico}
                  onVerRelatorio={d => { setSelectedRel({ data: d.data, meta: d }); navigate("relatorio"); }}
                />
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", color:DS.textLight, marginBottom:12, fontFamily:F }}>
                  Todos os diagnósticos
                </div>
                {historico.map(d => (
                <div key={d.id} onClick={() => { setSelectedRel({ data: d.data, meta: d }); navigate("relatorio"); }}
                  style={{ background:DS.white, border:`1px solid ${DS.border}`, borderRadius:12, padding:"16px 20px", marginBottom:10, cursor:"pointer", display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor=DS.green; e.currentTarget.style.boxShadow=`0 2px 12px rgba(13,158,122,0.08)`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor=DS.border; e.currentTarget.style.boxShadow="none"; }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, fontWeight:800, color:DS.navy, marginBottom:2 }}>{d.empresa}</div>
                    <div style={{ fontSize:11, color:DS.textLight, marginBottom:8 }}>{fmtDate(d.created_at)} · por {d.user_name || d.user_email}</div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      {[{l:"Singularidade",v:d.score_singularidade},{l:"Consistência",v:d.score_consistencia},{l:"Posicionamento",v:d.score_posicionamento}].map(s=>(
                        <span key={s.l} style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:99, background:scBg(s.v), color:scTxt(s.v), fontFamily:F }}>{s.l} {s.v}</span>
                      ))}
                    </div>
                  </div>
                  <span style={{ fontSize:12, color:DS.green, fontWeight:700, flexShrink:0 }}>Ver →</span>
                </div>
              ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
