import { useState } from "react";
import { DS, F, PRATICAS } from "../lib/constants";
import { fmtDate, sc } from "../lib/helpers";
import { gerarPPT } from "../lib/pptx";
import { Bar } from "../components/Bar";
import { Pill, ipill, apill, ppill } from "../components/Pill";
import { Lbl } from "../components/Lbl";
import { Card } from "../components/Card";

function SharePanel({ meta, data }) {
  const [copied, setCopied]     = useState(false);
  const [pptLoading, setPptLoading] = useState(false);
  const [pptError, setPptError] = useState("");
  const shareUrl = window.location.href.split("#")[0] + "#/relatorio/" + meta.id;

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  async function downloadPPT() {
    setPptLoading(true);
    setPptError("");
    try {
      await gerarPPT(data, meta);
    } catch (e) {
      setPptError("Erro ao gerar apresentação. Tente novamente.");
    } finally {
      setPptLoading(false);
    }
  }

  function sendEmail() {
    const subject = `Diagnóstico de Marca: ${data.empresa}`;
    const body = [
      `Diagnóstico Smart Branding — ${data.empresa}`,
      ``,
      `"${data.frase_diagnostico}"`,
      ``,
      `SCORES`,
      `• Singularidade:  ${data.score_singularidade}/10`,
      `• Consistência:   ${data.score_consistencia}/10`,
      `• Posicionamento: ${data.score_posicionamento}/10`,
      ``,
      `RESUMO`,
      data.resumo_executivo,
      ``,
      `─────────────────────────────`,
      `Ver relatório completo:`,
      shareUrl,
      ``,
      `Diagnóstico gerado por LOUDR Brand Intelligence`,
      `loudr.com.br`,
    ].join("\n");
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  }

  return (
    <div style={{ background:DS.navy, borderRadius:12, padding:"16px 20px", marginBottom:16, border:`1px solid ${DS.navyLight}` }}>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", color:DS.green, marginBottom:12, fontFamily:F }}>Compartilhar relatório</div>
      <div style={{ display:"flex", gap:8, marginBottom:10 }}>
        <input
          type="text"
          readOnly
          value={shareUrl}
          onFocus={e => e.target.select()}
          style={{ flex:1, padding:"8px 12px", fontSize:12, fontFamily:F, background:DS.navyMid, border:`1px solid ${DS.navyLight}`, borderRadius:8, color:DS.gray, outline:"none", minWidth:0 }}
        />
        <button
          onClick={copyLink}
          style={{ background: copied ? DS.green : DS.navyLight, border:"none", borderRadius:8, padding:"8px 16px", fontSize:12, fontWeight:700, color: copied ? DS.white : DS.gray, cursor:"pointer", fontFamily:F, whiteSpace:"nowrap", flexShrink:0, transition:"background 0.2s" }}
        >
          {copied ? "Copiado ✓" : "Copiar link"}
        </button>
      </div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        <button
          onClick={sendEmail}
          style={{ background:"none", border:`1px solid ${DS.navyLight}`, borderRadius:8, padding:"7px 16px", fontSize:12, color:DS.gray, cursor:"pointer", fontFamily:F }}
        >
          Enviar por e-mail →
        </button>
        <button
          onClick={downloadPPT}
          disabled={pptLoading}
          style={{
            background: pptLoading ? DS.navyLight : DS.green,
            border:"none", borderRadius:8, padding:"7px 16px",
            fontSize:12, fontWeight:700,
            color: pptLoading ? DS.gray : DS.white,
            cursor: pptLoading ? "not-allowed" : "pointer",
            fontFamily:F, display:"flex", alignItems:"center", gap:6,
            transition:"background 0.2s",
          }}
        >
          {pptLoading ? (
            <>
              <span style={{ width:10, height:10, border:`2px solid ${DS.gray}`, borderTopColor:"transparent", borderRadius:"50%", display:"inline-block", animation:"spin 0.7s linear infinite" }} />
              Gerando PPT...
            </>
          ) : "↓ Baixar apresentação (.pptx)"}
        </button>
      </div>
      {pptError && <p style={{ fontSize:11, color:DS.pink, marginTop:8, marginBottom:0, fontFamily:F }}>{pptError}</p>}
      <p style={{ fontSize:11, color:DS.textLight, marginTop:10, marginBottom:0, lineHeight:1.5, fontFamily:F }}>
        Qualquer pessoa com o link pode visualizar este relatório.
      </p>
    </div>
  );
}

export function RelatorioCompleto({ data, onBack, backLabel="← Voltar", meta=null }) {
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div>
      {meta && (
        <div style={{ marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
            {onBack
              ? <button onClick={onBack} style={{ background:"none", border:"none", color:DS.textLight, cursor:"pointer", fontSize:13, fontFamily:F, padding:0 }}>{backLabel}</button>
              : <div />
            }
            <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
              <div style={{ fontSize:12, color:DS.textLight, fontFamily:F }}>
                {meta.created_at && fmtDate(meta.created_at)}{meta.user_name && ` · por ${meta.user_name}`}
              </div>
              {meta.id && (
                <button
                  onClick={() => setShareOpen(o => !o)}
                  style={{ background: shareOpen ? DS.navy : "none", border:`1px solid ${shareOpen ? DS.navy : DS.border}`, borderRadius:8, padding:"4px 12px", fontSize:12, fontWeight:600, color: shareOpen ? DS.white : DS.textMid, cursor:"pointer", fontFamily:F }}
                >
                  {shareOpen ? "✕ Fechar" : "Compartilhar →"}
                </button>
              )}
            </div>
          </div>
          {shareOpen && meta.id && <div style={{ marginTop:12 }}><SharePanel meta={meta} data={data} /></div>}
        </div>
      )}
      <div className="a0" style={{ background:DS.navy, borderRadius:16, padding:"30px 34px", marginBottom:14, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", right:-24, top:-24, width:200, height:200, borderRadius:"50%", background:DS.green, opacity:0.05 }} />
        <div style={{ width:14, height:14, background:DS.pink, marginBottom:16 }} />
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.2em", color:DS.green, marginBottom:8, textTransform:"uppercase" }}>Brand Intelligence Report · LOUDR</div>
        <h2 style={{ fontSize:28, fontWeight:900, color:DS.white, letterSpacing:"-0.03em", marginBottom:4 }}>{data.empresa}</h2>
        <div style={{ fontSize:13, color:DS.gray, marginBottom:8 }}>{data.setor} · {data.porte} · {data.dominio}</div>
        {data.momento_atual && <div style={{ fontSize:13, color:"#a0b8c8", marginBottom:16, fontStyle:"italic" }}>{data.momento_atual}</div>}
        <div style={{ borderLeft:`3px solid ${DS.green}`, paddingLeft:16, fontStyle:"italic", fontSize:14, color:"#c9d8e8", lineHeight:1.65 }}>"{data.frase_diagnostico}"</div>
      </div>
      <Card style={{ marginBottom:14 }}>
        <Lbl color={DS.textLight}>Resumo executivo</Lbl>
        <p style={{ fontSize:14, color:DS.textMid, lineHeight:1.8 }}>{data.resumo_executivo}</p>
      </Card>
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", color:DS.textLight, marginBottom:12, fontFamily:F }}>Diagnóstico por prática Smart Branding</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(340px, 1fr))", gap:10 }}>
          {PRATICAS.map(p => {
            const pr = data.praticas_loudr?.[p.key];
            if (!pr) return null;
            return (
              <div key={p.key} style={{ background:DS.white, border:`1px solid ${DS.border}`, borderRadius:12, padding:"18px 20px", borderTop:`3px solid ${p.color}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:12, marginBottom:10 }}>
                  <div><div style={{ fontSize:13, fontWeight:800, color:DS.text }}>{p.label}</div><div style={{ fontSize:11, color:DS.textLight }}>{p.sub}</div></div>
                  <div style={{ minWidth:80 }}><Bar score={pr.score} color={p.color} /></div>
                </div>
                <p style={{ fontSize:13, color:DS.textMid, lineHeight:1.6, marginBottom:8 }}>{pr.diagnostico}</p>
                {pr.evidencias && (
                  <div style={{ background:DS.grayLight, borderRadius:8, padding:"8px 12px", marginBottom:8 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:DS.textLight, textTransform:"uppercase", marginBottom:4 }}>Evidências</div>
                    <p style={{ fontSize:12, color:DS.textMid, lineHeight:1.5 }}>{pr.evidencias}</p>
                  </div>
                )}
                {pr.oportunidade && (
                  <div style={{ borderLeft:`2px solid ${p.color}`, paddingLeft:10 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:p.color, textTransform:"uppercase", marginBottom:3 }}>O que a LOUDR faria</div>
                    <p style={{ fontSize:12, color:DS.textMid, fontStyle:"italic" }}>{pr.oportunidade}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:10, marginBottom:14 }}>
        {[{label:"Singularidade",key:"score_singularidade",desc:"Diferenciação"},{label:"Consistência",key:"score_consistencia",desc:"Coerência"},{label:"Posicionamento",key:"score_posicionamento",desc:"Clareza"}].map(s=>(
          <Card key={s.key}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:2 }}>{s.label}</div>
            <div style={{ fontSize:11, color:DS.textLight, marginBottom:10 }}>{s.desc}</div>
            <Bar score={data[s.key]} color={sc(data[s.key])} />
          </Card>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
        {[{label:"Identidade declarada",key:"identidade_declarada",accent:DS.green},{label:"Identidade percebida",key:"identidade_percebida",accent:DS.pink}].map(b=>(
          <Card key={b.key} style={{ borderTop:`3px solid ${b.accent}`, borderRadius:"0 0 12px 12px" }}>
            <Lbl color={b.accent}>{b.label}</Lbl>
            <p style={{ fontSize:13, color:DS.textMid, lineHeight:1.7 }}>{data[b.key]}</p>
          </Card>
        ))}
      </div>
      <div style={{ background:DS.amberPale, borderLeft:`4px solid ${DS.amber}`, borderRadius:"0 12px 12px 0", padding:"16px 20px", marginBottom:14 }}>
        <Lbl color="#92400e">Gap de identidade</Lbl>
        <p style={{ fontSize:14, color:"#78350f", lineHeight:1.7 }}>{data.gap_identidade}</p>
      </div>
      <div style={{ background:DS.navy, borderRadius:12, padding:"20px 24px", marginBottom:14 }}>
        <Lbl color={DS.green}>Território inexplorado</Lbl>
        <p style={{ fontSize:14, color:"#d1e8e0", fontStyle:"italic", lineHeight:1.7 }}>{data.territorio_inexplorado}</p>
      </div>
      {data.pergunta_provocativa && (
        <div style={{ background:DS.pinkPale, borderLeft:`4px solid ${DS.pink}`, borderRadius:"0 12px 12px 0", padding:"16px 20px", marginBottom:14 }}>
          <Lbl color={DS.pink}>Se essa marca sumisse amanhã...</Lbl>
          <p style={{ fontSize:14, color:"#4B1528", lineHeight:1.7 }}>{data.pergunta_provocativa}</p>
        </div>
      )}
      {data.concorrentes?.length > 0 && (
        <Card style={{ marginBottom:14 }}>
          <Lbl color={DS.textLight}>Contexto competitivo</Lbl>
          {data.concorrentes.map((c,i) => (
            <div key={i}>
              <div style={{ display:"flex", gap:12, padding:"8px 0", alignItems:"flex-start" }}>
                <div style={{ minWidth:120, fontWeight:700, fontSize:13, flexShrink:0 }}>{c.nome}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, color:DS.textMid }}>{c.diferencial}</div>
                  {c.sinal && <div style={{ fontSize:11, color:DS.textLight, fontStyle:"italic", marginTop:4 }}>↳ {c.sinal}</div>}
                </div>
                <div style={{ flexShrink:0 }}>{apill(c.ameaca)}</div>
              </div>
              {i < data.concorrentes.length-1 && <div style={{ height:1, background:DS.border }} />}
            </div>
          ))}
        </Card>
      )}
      {data.oportunidades?.length > 0 && (
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", color:DS.textLight, marginBottom:12, fontFamily:F }}>Oportunidades estratégicas</div>
          {data.oportunidades.map((op,i) => (
            <Card key={i} style={{ marginBottom:10, display:"flex", gap:14 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:DS.navy, color:DS.green, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, flexShrink:0 }}>{i+1}</div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:6 }}>
                  <span style={{ fontWeight:800, fontSize:13 }}>{op.titulo}</span>
                  {op.pratica_loudr && ppill(op.pratica_loudr)}
                  {ipill(op.impacto)}
                  <Pill bg={DS.greenPale} color={DS.greenDim}>{op.prazo}</Pill>
                </div>
                <p style={{ fontSize:13, color:DS.textMid, lineHeight:1.6 }}>{op.descricao}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
      {data.quick_wins?.length > 0 && (
        <div style={{ background:DS.greenPale, borderRadius:12, padding:"16px 20px", marginBottom:14 }}>
          <Lbl color={DS.greenDim}>Quick wins</Lbl>
          {data.quick_wins.map((qw,i) => (
            <div key={i} style={{ display:"flex", gap:10, marginBottom:8 }}>
              <span style={{ color:DS.green, fontWeight:900 }}>→</span>
              <span style={{ fontSize:13, color:DS.greenDim, fontWeight:600 }}>{qw}</span>
            </div>
          ))}
        </div>
      )}
      {data.porta_entrada_loudr && (
        <div style={{ background:DS.navyMid, borderLeft:`4px solid ${DS.green}`, borderRadius:"0 12px 12px 0", padding:"16px 20px", marginBottom:14 }}>
          <Lbl color={DS.green}>Porta de entrada LOUDR</Lbl>
          <p style={{ fontSize:14, color:"#d1e8e0", lineHeight:1.7 }}>{data.porta_entrada_loudr}</p>
        </div>
      )}
      <div style={{ background:DS.navy, borderRadius:12, padding:"22px 26px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:20, flexWrap:"wrap", marginBottom:14 }}>
        <div>
          <Lbl color={DS.green}>Próximo passo</Lbl>
          <div style={{ fontSize:16, fontWeight:900, color:DS.white, marginBottom:6 }}>Esse diagnóstico é só o começo.</div>
          <p style={{ fontSize:13, color:DS.gray, lineHeight:1.6, maxWidth:400 }}>Um Brand Discovery Sprint aprofunda cada ponto e entrega um roadmap completo.</p>
        </div>
        <button onClick={() => window.open("https://loudr.com.br","_blank")} style={{ background:DS.green, color:DS.white, border:"none", borderRadius:8, padding:"12px 24px", fontSize:14, fontWeight:800, cursor:"pointer" }}>
          Falar com a LOUDR →
        </button>
      </div>
      <button onClick={onBack} style={{ background:"none", border:`1px solid ${DS.border}`, borderRadius:8, padding:"8px 20px", fontSize:13, color:DS.textMid, cursor:"pointer", fontFamily:F }}>
        {backLabel}
      </button>
    </div>
  );
}
