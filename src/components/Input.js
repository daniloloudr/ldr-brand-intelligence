import { DS, F } from "../lib/constants";

export function Input({ label, value, onChange, type="text", placeholder, required }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ fontSize:10, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", color:DS.textLight, display:"block", marginBottom:6, fontFamily:F }}>
        {label}{required && " *"}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={{ width:"100%", padding:"11px 14px", fontSize:14, fontFamily:F, border:`1.5px solid ${DS.border}`, borderRadius:8, background:DS.offwhite, color:DS.text, boxSizing:"border-box", outline:"none" }}
      />
    </div>
  );
}
