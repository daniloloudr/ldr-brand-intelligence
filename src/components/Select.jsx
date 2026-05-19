import { DS, F } from "../lib/constants";

export function Select({ label, value, onChange, options, required }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ fontSize:10, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", color:DS.textLight, display:"block", marginBottom:6, fontFamily:F }}>
        {label}{required && " *"}
      </label>
      <select
        value={value}
        onChange={onChange}
        required={required}
        style={{ width:"100%", padding:"11px 14px", fontSize:14, fontFamily:F, border:`1.5px solid ${DS.border}`, borderRadius:8, background:DS.offwhite, color:DS.text, boxSizing:"border-box", outline:"none" }}
      >
        <option value="">Selecione...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
