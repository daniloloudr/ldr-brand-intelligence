import { useState, useEffect } from "react";
import { useTheme } from "@mui/material/styles";
import { supabase } from "../lib/supabase";
import { DS, F } from "../lib/constants";
import { Input } from "../components/Input";
import { Card } from "../components/Card";

const STEPS = [
  'Pesquisando o site e fontes públicas...',
  'Aplicando framework Smart Branding...',
  'Calculando scores de singularidade e consistência...',
  'Mapeando gaps de identidade...',
  'Identificando oportunidades estratégicas...',
  'Finalizando o diagnóstico...',
]

function pollForDiagnostico(userId, since) {
  const MAX_WAIT = 180_000
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const check = async () => {
      if (Date.now() - start > MAX_WAIT) {
        reject(new Error('O diagnóstico demorou mais que o esperado. Tente novamente.'))
        return
      }
      const { data } = await supabase
        .from('diagnosticos')
        .select('*')
        .eq('user_id', userId)
        .is('workspace_id', null)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data) {
        if (data.data?._job_error) reject(new Error(data.data.error || 'Erro ao gerar diagnóstico.'))
        else resolve(data)
      } else {
        setTimeout(check, 3000)
      }
    }
    setTimeout(check, 3000)
  })
}

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
    stepBg:  "#0A1525",
    stepText:"#4D6070",
    stepAct: "#96AABF",
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
    stepBg:  "#F5F7F8",
    stepText:"#8A9AB0",
    stepAct: "#4A5A6A",
  };

  const [empresa, setEmpresa]   = useState("");
  const [contexto, setContexto] = useState("");
  const [gerando, setGerando]   = useState(false);
  const [step, setStep]         = useState(0);
  const [error, setError]       = useState("");

  useEffect(() => {
    if (!gerando) return
    const id = setInterval(() => setStep(s => s + 1), 8000)
    return () => clearInterval(id)
  }, [gerando])

  async function run() {
    if (!empresa.trim()) return;
    setError("");
    setGerando(true);
    setStep(0);
    const since = new Date().toISOString();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada. Faça login novamente.');
      const res = await fetch('/.netlify/functions/diagnostico-gerar-background', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body:    JSON.stringify({ empresa: empresa.trim(), contexto: contexto.trim() || undefined }),
      });
      if (!res.ok && res.status !== 202) throw new Error(`Erro ${res.status}`);
      const diag = await pollForDiagnostico(user.id, since);
      setGerando(false);
      onDone(diag.data, diag);
    } catch (e) {
      setGerando(false);
      setError(e.message || 'Erro inesperado. Tente novamente.');
    }
  }

  if (gerando) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: 20, textAlign: 'center', padding: '2rem', fontFamily: F }}>
        <div style={{ width: 48, height: 48, border: `3px solid ${DS.green}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.title, marginBottom: 6 }}>Gerando diagnóstico</div>
          <div style={{ fontSize: 13, color: C.stepAct, minHeight: 20 }}>{STEPS[step % STEPS.length]}</div>
        </div>
        <div style={{ fontSize: 11, color: C.stepText }}>Pode fechar esta aba — o diagnóstico continuará no servidor</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

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
