import { DS, F } from "../lib/constants";

export function Lbl({ children, color=DS.green }) {
  return (
    <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", color, marginBottom:10, fontFamily:F }}>
      {children}
    </div>
  );
}
