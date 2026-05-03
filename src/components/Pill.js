import { DS, F, PRATICAS } from "../lib/constants";

export function Pill({ children, bg, color }) {
  return (
    <span style={{ display:"inline-block", fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:99, background:bg, color, fontFamily:F }}>
      {children}
    </span>
  );
}

export const ipill = v =>
  v==="alto"  ? <Pill bg={DS.greenPale} color={DS.greenDim}>impacto alto</Pill> :
  v==="medio" ? <Pill bg={DS.amberPale} color="#92400e">impacto médio</Pill> :
                <Pill bg={DS.grayLight} color={DS.textMid}>impacto baixo</Pill>;

export const apill = v =>
  v==="alta"  ? <Pill bg={DS.pinkPale} color={DS.pink}>ameaça alta</Pill> :
  v==="media" ? <Pill bg={DS.amberPale} color="#92400e">ameaça média</Pill> :
                <Pill bg={DS.grayLight} color={DS.textMid}>ameaça baixa</Pill>;

export const ppill = key => {
  const p = PRATICAS.find(p => p.key === key);
  return p ? <Pill bg={p.color+"22"} color={p.color}>{p.label}</Pill> : null;
};
