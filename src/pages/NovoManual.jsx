import { useState } from "react";
import { useTheme } from "@mui/material/styles";
import { supabase } from "../lib/supabase";
import { DS, F } from "../lib/constants";
import { runStream } from "../lib/api";
import { tryParseJSON } from "../lib/helpers";
import { Input } from "../components/Input";
import { Card } from "../components/Card";
import { StreamingView } from "./StreamingView";

export function NovoManual({ user, onDone }) {
  const muiTheme = useTheme();
  const isDark   = muiTheme.palette.mode === "dark";

  const C = isDark ? {
    title:   "#D8E4F0",
    sub:     "#96AABF",
    errBg:   "#2A1525",
    errBord: "#6B2040",
    errText: "#F4A0C0",
    textBg:  "#0D1B2A",
    textBord:"#2A4A68",
    text:    "#D8E4F0",
    label:   "#96AABF",
    btn:     "#0D9E7A",
    btnDis:  "#2A4A68",
  } : {
    title:   "#0D1B2A",
    sub:     "#8A9AB0",
    errBg:   "#FBEAF0",
    errBord: "#F4C0D1",
    errText: "#72243E",
    textBg:  "#F7F9F8",
    textBord:"#E2EBE8",
    text:    "#0D1B2A",
    label:   "#8A9AB0",
    btn:     "#0D9E7A",
    btnDis:  "#D1D9E0",
  };

  const [empresa, setEmpresa]         = useState("");
  const [contexto, setContexto]       = useState("");
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
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: C.title, letterSpacing: "-0.02em", marginBottom: 4, fontFamily: F }}>Novo diagnóstico</h2>
        <p style={{ fontSize: 13, color: C.sub, fontFamily: F }}>Gere um diagnóstico manualmente para qualquer empresa.</p>
      </div>
      {error && (
        <div style={{ background: C.errBg, border: `1px solid ${C.errBord}`, borderRadius: 10, padding: "14px 18px", marginBottom: 14, fontSize: 13, color: C.errText, fontFamily: F }}>
          {error}
        </div>
      )}
      <Card>
        <Input label="Empresa ou domínio" value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="ex: Nubank, farm.com.br" required />
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.label, display: "block", marginBottom: 6, fontFamily: F }}>
            Contexto adicional <span style={{ fontWeight: 400, textTransform: "none" }}>(opcional)</span>
          </label>
          <textarea value={contexto} onChange={e => setContexto(e.target.value)}
            placeholder="ex: fintech B2B, lançou novo produto em 2024..." rows={4}
            style={{ width: "100%", padding: "11px 14px", fontSize: 14, fontFamily: F, border: `1.5px solid ${C.textBord}`, borderRadius: 8, background: C.textBg, resize: "vertical", color: C.text, lineHeight: 1.55, boxSizing: "border-box", outline: "none" }} />
        </div>
        <button onClick={run} disabled={!empresa.trim()}
          style={{ background: empresa.trim() ? C.btn : C.btnDis, color: "#fff", border: "none", padding: "13px 28px", borderRadius: 8, fontSize: 14, fontWeight: 800, fontFamily: F, cursor: empresa.trim() ? "pointer" : "not-allowed" }}>
          Gerar diagnóstico →
        </button>
      </Card>
    </div>
  );
}
