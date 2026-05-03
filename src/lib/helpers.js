import { DS } from "./constants";

export function getRoute() {
  const hash = window.location.hash;
  if (hash === "#/login") return "login";
  if (hash.startsWith("#/relatorio/")) return "relatorio-publico";
  if (hash.startsWith("#/app")) return "app";
  if (hash === "#/metodologia") return "metodologia";
  return "public";
}

export const sc    = s => s >= 7 ? DS.green    : s >= 5 ? DS.amber    : DS.pink;
export const scBg  = s => s >= 7 ? DS.greenPale: s >= 5 ? DS.amberPale: DS.pinkPale;
export const scTxt = s => s >= 7 ? DS.greenDim : s >= 5 ? "#92400e"   : "#72243E";

export const fmtDate = iso => new Date(iso).toLocaleDateString("pt-BR", {
  day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit"
});

export function tryParseJSON(txt) {
  if (!txt) return null;
  let s = txt.replace(/^```[a-z]*\n?/im, "").replace(/\n?```$/im, "").trim();
  try { const r = JSON.parse(s); if (r.empresa) return r; } catch {}
  const j0 = s.indexOf("{"), j1 = s.lastIndexOf("}");
  if (j0 >= 0 && j1 > j0) {
    try { const r = JSON.parse(s.slice(j0, j1+1)); if (r.empresa) return r; } catch {}
  }
  return null;
}
