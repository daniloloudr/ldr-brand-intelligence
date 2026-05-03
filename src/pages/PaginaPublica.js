import { useState } from "react";
import { supabase } from "../lib/supabase";
import { DS, F, PRATICAS } from "../lib/constants";
import { GlobalStyle } from "../components/GlobalStyle";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Select } from "../components/Select";

export function PaginaPublica() {
  const [form, setForm] = useState({ nome:"", email:"", empresa:"", site:"", setor:"", porte:"", contexto:"" });
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [error, setError] = useState("");

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nome || !form.email || !form.empresa) { setError("Preencha os campos obrigatórios."); return; }
    setLoading(true); setError("");
    const { error: dbErr } = await supabase.from("solicitacoes").insert({
      nome: form.nome, email: form.email, empresa: form.empresa,
      site: form.site, setor: form.setor, porte: form.porte,
      contexto: form.contexto, status: "pendente",
    });
    setLoading(false);
    if (dbErr) { setError("Erro ao enviar solicitação. Tente novamente."); return; }
    setSucesso(true);
  }

  if (sucesso) return (
    <div style={{ minHeight:"100vh", background:DS.navy, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:F, padding:20 }}>
      <GlobalStyle />
      <div style={{ maxWidth:480, width:"100%", textAlign:"center" }}>
        <div style={{ width:64, height:64, background:DS.green, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px", fontSize:28 }}>✓</div>
        <h2 style={{ fontSize:26, fontWeight:900, color:DS.white, letterSpacing:"-0.02em", marginBottom:12 }}>Solicitação enviada!</h2>
        <p style={{ fontSize:15, color:DS.gray, lineHeight:1.7, marginBottom:28 }}>
          Recebemos seu pedido de diagnóstico de marca. Nossa equipe vai analisar e entrar em contato em breve.
        </p>
        <div style={{ background:DS.navyMid, borderRadius:12, padding:"18px 22px", textAlign:"left" }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", color:DS.green, marginBottom:8 }}>O que acontece agora</div>
          {["Nossa equipe revisa sua solicitação", "Rodamos o diagnóstico de singularidade da sua marca", "Você recebe o relatório completo por e-mail"].map((s,i) => (
            <div key={i} style={{ display:"flex", gap:10, marginBottom:8 }}>
              <span style={{ color:DS.green, fontWeight:700, flexShrink:0 }}>{i+1}.</span>
              <span style={{ fontSize:13, color:DS.gray }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:DS.offwhite, fontFamily:F }}>
      <GlobalStyle />

      <div style={{ background:DS.navy, padding:"0 28px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:10, height:10, background:DS.pink }} />
          <span style={{ fontSize:16, fontWeight:900, color:DS.white, letterSpacing:"-0.02em" }}>LOUDR</span>
          <span style={{ fontSize:12, color:DS.gray }}>Brand Intelligence</span>
        </div>
        <button onClick={() => { window.location.hash = "#/login"; }}
          style={{ background:"none", border:`1px solid ${DS.navyLight}`, borderRadius:8, padding:"5px 14px", fontSize:12, color:DS.gray, cursor:"pointer" }}>
          Área interna
        </button>
      </div>

      <div style={{ maxWidth:680, margin:"0 auto", padding:"40px 20px 72px" }}>

        <div className="a0" style={{ background:DS.navy, borderRadius:16, padding:"40px 36px", marginBottom:20, position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", right:-24, top:-24, width:200, height:200, borderRadius:"50%", background:DS.green, opacity:0.05 }} />
          <div style={{ position:"absolute", right:64, bottom:-36, width:120, height:120, borderRadius:"50%", background:DS.pink, opacity:0.08 }} />
          <div style={{ width:16, height:16, background:DS.pink, marginBottom:18 }} />
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.2em", color:DS.green, marginBottom:10, textTransform:"uppercase" }}>LOUDR · BRAND INTELLIGENCE</div>
          <h1 style={{ fontSize:30, fontWeight:900, color:DS.white, letterSpacing:"-0.03em", lineHeight:1.2, marginBottom:14 }}>
            Descubra o score de<br /><span style={{ color:DS.green }}>singularidade da sua marca</span>
          </h1>
          <p style={{ fontSize:14, color:DS.gray, lineHeight:1.7, maxWidth:480, marginBottom:24 }}>
            Nossa equipe roda um diagnóstico completo baseado no framework Smart Branding — análise de dados públicos, 4 práticas, scores e oportunidades estratégicas.
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {PRATICAS.map(p => (
              <div key={p.key} style={{ background:DS.navyMid, borderRadius:8, padding:"10px 14px", borderLeft:`3px solid ${p.color}` }}>
                <div style={{ fontSize:11, fontWeight:700, color:p.color, marginBottom:2 }}>{p.label}</div>
                <div style={{ fontSize:11, color:DS.gray }}>{p.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <Card className="a1">
          <div style={{ fontSize:16, fontWeight:800, color:DS.navy, marginBottom:4, letterSpacing:"-0.01em" }}>Solicite seu diagnóstico</div>
          <p style={{ fontSize:13, color:DS.textLight, marginBottom:24 }}>Gratuito e sem compromisso. Nossa equipe analisa e envia o relatório completo.</p>

          {error && <div style={{ background:DS.pinkPale, border:`1px solid #F4C0D1`, borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#72243E" }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
              <Input label="Seu nome" value={form.nome} onChange={set("nome")} placeholder="João Silva" required />
              <Input label="E-mail" type="email" value={form.email} onChange={set("email")} placeholder="joao@empresa.com.br" required />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
              <Input label="Empresa" value={form.empresa} onChange={set("empresa")} placeholder="Nome da empresa" required />
              <Input label="Site" value={form.site} onChange={set("site")} placeholder="www.empresa.com.br" />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
              <Select label="Setor" value={form.setor} onChange={set("setor")} options={["Tecnologia","Varejo","Saúde","Educação","Finanças","Indústria","Serviços","E-commerce","Outro"]} />
              <Select label="Porte" value={form.porte} onChange={set("porte")} options={["Startup","PME","Médio porte","Grande empresa"]} />
            </div>
            <div style={{ marginBottom:24 }}>
              <label style={{ fontSize:10, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", color:DS.textLight, display:"block", marginBottom:6 }}>
                Contexto do negócio <span style={{ fontWeight:400, textTransform:"none" }}>(opcional)</span>
              </label>
              <textarea value={form.contexto} onChange={set("contexto")}
                placeholder="Descreva brevemente sua empresa, momento atual, principais desafios ou o que gostaria de entender sobre sua marca..."
                rows={4}
                style={{ width:"100%", padding:"11px 14px", fontSize:14, fontFamily:F, border:`1.5px solid ${DS.border}`, borderRadius:8, background:DS.offwhite, resize:"vertical", color:DS.text, lineHeight:1.55, boxSizing:"border-box" }} />
            </div>

            <button type="submit" disabled={loading}
              style={{ width:"100%", background:loading ? "#9ca3af" : DS.navy, color:DS.white, border:"none", padding:"14px", borderRadius:8, fontSize:15, fontWeight:800, cursor:loading?"not-allowed":"pointer", boxSizing:"border-box" }}>
              {loading ? "Enviando..." : "Solicitar diagnóstico gratuito →"}
            </button>
          </form>
        </Card>

        <div className="a2" style={{ marginTop:20, display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10 }}>
          {[
            { n:"100%", l:"baseado em dados públicos reais" },
            { n:"4",    l:"práticas do framework Smart Branding" },
            { n:"48h",  l:"tempo médio de entrega" },
          ].map((s,i) => (
            <div key={i} style={{ background:DS.white, border:`1px solid ${DS.border}`, borderRadius:10, padding:"14px 16px", textAlign:"center" }}>
              <div style={{ fontSize:22, fontWeight:900, color:DS.navy }}>{s.n}</div>
              <div style={{ fontSize:11, color:DS.textLight, marginTop:4, lineHeight:1.4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
