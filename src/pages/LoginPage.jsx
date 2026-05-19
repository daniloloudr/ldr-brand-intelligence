import { useState } from "react";
import { supabase } from "../lib/supabase";
import { DS, F } from "../lib/constants";
import { GlobalStyle } from "../components/GlobalStyle";

export function LoginPage({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError("E-mail ou senha incorretos."); return; }
    onLogin(data.user);
    window.location.hash = "#/app";
  }

  return (
    <div style={{ minHeight:"100vh", background:DS.navy, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:F, padding:20 }}>
      <GlobalStyle />
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:8 }}>
            <div style={{ width:12, height:12, background:DS.pink }} />
            <span style={{ fontSize:22, fontWeight:900, color:DS.white, letterSpacing:"-0.02em" }}>LOUDR</span>
          </div>
          <div style={{ fontSize:13, color:DS.gray }}>Brand Intelligence · Área interna</div>
        </div>
        <div style={{ background:DS.navyMid, borderRadius:16, padding:"28px" }}>
          <div style={{ fontSize:16, fontWeight:800, color:DS.white, marginBottom:20 }}>Entrar</div>
          {error && <div style={{ background:DS.pinkPale, borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#72243E" }}>{error}</div>}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:10, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", color:DS.gray, display:"block", marginBottom:6 }}>E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@loudr.com.br"
                style={{ width:"100%", padding:"11px 14px", fontSize:14, fontFamily:F, background:DS.navy, border:`1px solid ${DS.navyLight}`, borderRadius:8, color:DS.white, boxSizing:"border-box" }} />
            </div>
            <div style={{ marginBottom:24 }}>
              <label style={{ fontSize:10, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", color:DS.gray, display:"block", marginBottom:6 }}>Senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                style={{ width:"100%", padding:"11px 14px", fontSize:14, fontFamily:F, background:DS.navy, border:`1px solid ${DS.navyLight}`, borderRadius:8, color:DS.white, boxSizing:"border-box" }} />
            </div>
            <button type="submit" disabled={loading}
              style={{ width:"100%", background:DS.green, color:DS.white, border:"none", borderRadius:8, padding:"13px", fontSize:14, fontWeight:800, cursor:loading?"not-allowed":"pointer", boxSizing:"border-box" }}>
              {loading ? "Entrando..." : "Entrar →"}
            </button>
          </form>
          <button onClick={() => { window.location.hash = ""; }}
            style={{ marginTop:16, width:"100%", background:"none", border:"none", fontSize:12, color:DS.gray, cursor:"pointer", textAlign:"center" }}>
            ← Voltar à página principal
          </button>
        </div>
      </div>
    </div>
  );
}
