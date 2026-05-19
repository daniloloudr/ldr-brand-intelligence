import { DS } from "../lib/constants";

export function Card({ children, style={} }) {
  return (
    <div style={{ background:DS.white, border:`1px solid ${DS.border}`, borderRadius:12, padding:"20px 24px", ...style }}>
      {children}
    </div>
  );
}
