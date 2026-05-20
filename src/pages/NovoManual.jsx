import { useState } from "react";
import { supabase } from "../lib/supabase";
import { DS, F } from "../lib/constants";
import { runStream } from "../lib/api";
import { tryParseJSON } from "../lib/helpers";
import { Input } from "../components/Input";
import { Card } from "../components/Card";
import { StreamingView } from "./StreamingView";

export function NovoManual({ user, onDone }) {
  const [empresa, setEmpresa]   = useState("");
  const [contexto, setContexto] = useState("");
  const [streaming, setStreaming]     = useState(false);
  const [steps, setSteps]             = useState([]);
  const [partial, setPartial]         = useState(null);
  const [streamText, setStreamText]   = useState("");
  const [error, setError]             = useState("");
  const [rlCountdown, setRlCountdown] = useState(0);
  const [rlAttempt, setRlAttempt]     = useState(0);

  async function run() {
    if (!empresa.trim()) return;
    setStreaming(true); setSteps([]); setPartial(null); setStreamText(""); setError("");
    await runStream({
      empresa, contexto,
      onSearchStep: (c, q) => setSteps(p => { const u=[...p]; u[c-1]=q||`Busca ${c}`; return u; }),
      onText: (txt) => { setStreamText(txt); const p=tryParseJSON(txt); if(p) setPartial(p); },
      onRateLimit: (s, t) => { setRlCountdown(s); setRlAttempt(t); },
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
          publico: true,
        }).select().single();
        setStreaming(false);
        onDone(parsed, { id: diag?.id, created_at: new Date().toISOString(), user_name: user.user_metadata?.full_name || user.email.split("@")[0] });
      },
      onError: (msg) => { setError(msg); setStreaming(false); },
    });
  }

  if (streaming) return <StreamingView searchSteps={steps} partialData={partial} rateLimitCountdown={rlCountdown} rateLimitAttempt={rlAttempt} streamText={streamText} />;

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontSize:22, fontWeight:900, color:DS.navy, letterSpacing:"-0.02em", marginBottom:4 }}>Novo diagnóstico</h2>
        <p style={{ fontSize:13, color:DS.textLight }}>Gere um diagnóstico manualmente para qualquer empresa.</p>
      </div>
      {error && <div style={{ background:DS.pinkPale, border:`1px solid #F4C0D1`, borderRadius:10, padding:"14px 18px", marginBottom:14, fontSize:13, color:"#72243E" }}>{error}</div>}
      <Card>
        <Input label="Empresa ou domínio" value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="ex: Nubank, farm.com.br" required />
        <div style={{ marginBottom:24 }}>
          <label style={{ fontSize:10, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", color:DS.textLight, display:"block", marginBottom:6 }}>
            Contexto adicional <span style={{ fontWeight:400, textTransform:"none" }}>(opcional)</span>
          </label>
          <textarea value={contexto} onChange={e => setContexto(e.target.value)}
            placeholder="ex: fintech B2B, lançou novo produto em 2024..." rows={4}
            style={{ width:"100%", padding:"11px 14px", fontSize:14, fontFamily:F, border:`1.5px solid ${DS.border}`, borderRadius:8, background:DS.offwhite, resize:"vertical", color:DS.text, lineHeight:1.55, boxSizing:"border-box" }} />
        </div>
        <button onClick={run} disabled={!empresa.trim()}
          style={{ background:empresa.trim()?DS.navy:"#9ca3af", color:DS.white, border:"none", padding:"13px 28px", borderRadius:8, fontSize:14, fontWeight:800, fontFamily:F, cursor:empresa.trim()?"pointer":"not-allowed" }}>
          Gerar diagnóstico →
        </button>
      </Card>
    </div>
  );
}
