import { DS, F } from "../lib/constants";

export function Bar({ score, color }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <div style={{ flex:1, height:5, background:DS.border, borderRadius:3, overflow:"hidden" }}>
        <div style={{ width:`${score*10}%`, height:"100%", background:color, borderRadius:3, transition:"width 1.4s cubic-bezier(.22,1,.36,1)" }} />
      </div>
      <span style={{ fontSize:15, fontWeight:900, color, minWidth:20, textAlign:"right", fontFamily:F }}>{score}</span>
    </div>
  );
}
