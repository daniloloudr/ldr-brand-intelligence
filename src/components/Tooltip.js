import { useState, useRef } from "react";
import { DS, F } from "../lib/constants";

export function Tooltip({ title, description, scale, link, children }) {
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef(null);

  const show = () => { clearTimeout(hideTimer.current); setVisible(true); };
  const hide = () => { hideTimer.current = setTimeout(() => setVisible(false), 120); };

  return (
    <div style={{ position:"relative", display:"inline-flex", alignItems:"center" }}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && (
        <div
          onMouseEnter={show}
          onMouseLeave={hide}
          style={{
            position:"absolute",
            bottom:"calc(100% + 10px)",
            left:"50%",
            transform:"translateX(-50%)",
            zIndex:300,
            background:DS.navy,
            border:`1px solid ${DS.navyLight}`,
            borderRadius:10,
            padding:"14px 16px",
            width:280,
            boxShadow:"0 8px 28px rgba(0,0,0,0.35)",
            pointerEvents:"auto",
          }}
        >
          {/* Arrow */}
          <div style={{ position:"absolute", top:"100%", left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"7px solid transparent", borderRight:"7px solid transparent", borderTop:`7px solid ${DS.navyLight}` }} />
          <div style={{ position:"absolute", top:"calc(100% - 1px)", left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"6px solid transparent", borderRight:"6px solid transparent", borderTop:`6px solid ${DS.navy}` }} />

          {title && (
            <div style={{ fontSize:12, fontWeight:800, color:DS.white, marginBottom:6, fontFamily:F }}>{title}</div>
          )}
          {description && (
            <p style={{ fontSize:12, color:DS.gray, lineHeight:1.65, margin:0, fontFamily:F, marginBottom: scale || link ? 10 : 0 }}>{description}</p>
          )}
          {scale && (
            <div style={{ borderTop:`1px solid ${DS.navyLight}`, paddingTop:8, marginBottom: link ? 8 : 0 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:DS.textLight, marginBottom:6, fontFamily:F }}>Escala</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"3px 8px" }}>
                {[
                  { range:"1–3", label:"Crítico",           color:DS.pink },
                  { range:"4–6", label:"Em desenvolvimento", color:DS.amber },
                  { range:"7–8", label:"Sólido",            color:DS.green },
                  { range:"9–10",label:"Referência",        color:"#7F77DD" },
                ].map(t => (
                  <div key={t.range} style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <div style={{ width:6, height:6, borderRadius:1, background:t.color, flexShrink:0 }} />
                    <span style={{ fontSize:11, color:DS.gray, fontFamily:F }}><span style={{ fontWeight:700 }}>{t.range}</span> {t.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {link && (
            <div style={{ borderTop:`1px solid ${DS.navyLight}`, paddingTop:8 }}>
              <button
                onClick={link.onClick}
                style={{ background:"none", border:"none", padding:0, fontSize:11, color:DS.green, fontWeight:700, cursor:"pointer", fontFamily:F, textAlign:"left" }}
              >
                {link.label} →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
