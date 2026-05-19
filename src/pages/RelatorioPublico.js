import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { DS, F } from "../lib/constants";
import { GlobalStyle } from "../components/GlobalStyle";
import { RelatorioCompleto } from "./RelatorioCompleto";

export function RelatorioPublico() {
  const id = window.location.hash.replace(/^#\/relatorio\//, "");
  const [diag, setDiag]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!id) { setError("Link inválido."); setLoading(false); return; }
    supabase.from("diagnosticos").select("*").eq("id", id).single()
      .then(({ data, error: e }) => {
        setLoading(false);
        if (e || !data) { setError("Relatório não encontrado ou acesso negado."); return; }
        setDiag(data);
      });
  }, [id]);

  const header = (
    <div style={{ background:DS.navy, padding:"0 28px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:10 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:10, height:10, background:DS.pink }} />
        <span style={{ fontSize:16, fontWeight:900, color:DS.white, letterSpacing:"-0.02em", fontFamily:F }}>LOUDR</span>
        <span style={{ fontSize:12, color:DS.gray, fontFamily:F }}>Brand Intelligence</span>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        {import.meta.env.VITE_CALENDLY_URL && (
          <a
            href={import.meta.env.VITE_CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ background:DS.green, border:"none", borderRadius:8, padding:"6px 16px", fontSize:12, fontWeight:700, color:DS.white, cursor:"pointer", fontFamily:F, textDecoration:"none", display:"flex", alignItems:"center" }}
          >
            Agendar apresentação →
          </a>
        )}
        <button
          onClick={() => { window.location.hash = ""; }}
          style={{ background:"none", border:`1px solid ${DS.navyLight}`, borderRadius:8, padding:"5px 14px", fontSize:12, color:DS.gray, cursor:"pointer", fontFamily:F }}
        >
          Solicitar diagnóstico →
        </button>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ minHeight:"100vh", background:DS.navy, display:"flex", flexDirection:"column" }}>
      <GlobalStyle />{header}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:36, height:36, border:`3px solid ${DS.navyMid}`, borderTopColor:DS.green, borderRadius:"50%", animation:"spin 0.75s linear infinite" }} />
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight:"100vh", background:DS.navy, display:"flex", flexDirection:"column" }}>
      <GlobalStyle />{header}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
        <div style={{ textAlign:"center", maxWidth:380 }}>
          <div style={{ width:48, height:48, borderRadius:"50%", background:DS.pinkPale, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", fontSize:22 }}>✕</div>
          <div style={{ fontSize:18, fontWeight:800, color:DS.white, marginBottom:8, fontFamily:F }}>Relatório não encontrado</div>
          <p style={{ fontSize:13, color:DS.gray, lineHeight:1.7, fontFamily:F }}>{error}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:DS.offwhite, fontFamily:F }}>
      <GlobalStyle />{header}
      <div style={{ maxWidth:900, margin:"0 auto", padding:"32px 20px 80px" }}>
        <RelatorioCompleto data={diag.data} meta={diag} onBack={null} />
      </div>
    </div>
  );
}
