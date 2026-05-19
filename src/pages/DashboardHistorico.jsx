import { DS, F } from "../lib/constants";
import { sc, scBg, normalizeSector } from "../lib/helpers";
import { Bar } from "../components/Bar";
import { Card } from "../components/Card";
import { Lbl } from "../components/Lbl";
import { Tooltip } from "../components/Tooltip";

const goToMetodologia = () => { window.location.hash = "#/metodologia"; };

const SCORE_TOOLTIPS = {
  singularidade: {
    title: "Score de Singularidade",
    description: "Mede o grau de diferenciação e unicidade da marca. O agent analisa posicionamento, narrativa, comunicação e concorrentes para avaliar se a marca reivindica um território único.",
  },
  consistencia: {
    title: "Score de Consistência",
    description: "Avalia a coerência entre o que a marca diz ser e o que o mercado percebe. Cruza comunicação oficial com reviews, redes sociais e reputação pública.",
  },
  posicionamento: {
    title: "Score de Posicionamento",
    description: "Mede a clareza estratégica da marca. Avalia se a proposta de valor é nítida, diferenciada e coerente entre todos os canais.",
  },
  geral: {
    title: "Score Médio Geral",
    description: "Média aritmética dos três scores do framework Smart Branding: Singularidade, Consistência e Posicionamento.",
  },
};

export function DashboardHistorico({ historico, onVerRelatorio, onVerTodos, onSetorClick }) {
  if (!historico.length) return null;

  const avgOf = key => {
    const vals = historico.map(d => d[key]).filter(v => v != null);
    if (!vals.length) return null;
    return +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  };

  const avgSing  = avgOf("score_singularidade");
  const avgCons  = avgOf("score_consistencia");
  const avgPos   = avgOf("score_posicionamento");
  const avgGeral = [avgSing, avgCons, avgPos].every(v => v != null)
    ? +((avgSing + avgCons + avgPos) / 3).toFixed(1)
    : null;

  const withAvg = [...historico]
    .map(d => ({
      ...d,
      avgScore: +(
        ((d.score_singularidade || 0) + (d.score_consistencia || 0) + (d.score_posicionamento || 0)) / 3
      ).toFixed(1),
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  const setorMap = {};
  historico.forEach(d => {
    const s = normalizeSector(d.setor);
    if (s) setorMap[s] = (setorMap[s] || 0) + 1;
  });
  const setores = Object.entries(setorMap).sort((a, b) => b[1] - a[1]);

  const tierDefs = [
    { label:"Referência",        range:"9–10", color:"#7F77DD", bg:"#EEECFB", min:9,   max:10  },
    { label:"Sólido",            range:"7–8",  color:DS.green,  bg:DS.greenPale, min:7, max:8.99 },
    { label:"Em desenvolvimento",range:"4–6",  color:DS.amber,  bg:DS.amberPale, min:4, max:6.99 },
    { label:"Crítico",           range:"1–3",  color:DS.pink,   bg:DS.pinkPale,  min:0, max:3.99 },
  ];
  const tiers = tierDefs.map(t => ({
    ...t,
    count: withAvg.filter(d => d.avgScore >= t.min && d.avgScore <= t.max).length,
  }));

  const kpis = [
    { label:"Marcas analisadas",   value: historico.length, suffix:"",    color:DS.navy,             bg:DS.grayLight,           tooltip: null },
    { label:"Média Singularidade", value: avgSing,          suffix:"/10", color:sc(avgSing  || 0),   bg:scBg(avgSing  || 0),   tooltip: "singularidade" },
    { label:"Média Consistência",  value: avgCons,          suffix:"/10", color:sc(avgCons  || 0),   bg:scBg(avgCons  || 0),   tooltip: "consistencia" },
    { label:"Média Posicionamento",value: avgPos,           suffix:"/10", color:sc(avgPos   || 0),   bg:scBg(avgPos   || 0),   tooltip: "posicionamento" },
    { label:"Score médio geral",   value: avgGeral,         suffix:"/10", color:sc(avgGeral || 0),   bg:scBg(avgGeral || 0),   tooltip: "geral" },
  ];

  return (
    <div style={{ marginBottom:32 }}>

      {/* Header */}
      <div style={{ background:DS.navy, borderRadius:12, padding:"18px 24px", marginBottom:12, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.2em", color:DS.green, textTransform:"uppercase", marginBottom:4, fontFamily:F }}>
            Inteligência de Mercado
          </div>
          <div style={{ fontSize:16, fontWeight:900, color:DS.white, fontFamily:F }}>
            {historico.length} marca{historico.length !== 1 ? "s" : ""} analisada{historico.length !== 1 ? "s" : ""}
            {avgGeral && (
              <span style={{ color:DS.gray, fontWeight:400, fontSize:13, marginLeft:12 }}>
                score médio geral{" "}
                <span style={{ color:sc(avgGeral), fontWeight:700 }}>{avgGeral}/10</span>
              </span>
            )}
          </div>
        </div>
        <div style={{ fontSize:11, color:DS.gray, fontFamily:F }}>Framework Smart Branding · LOUDR</div>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))", gap:8, marginBottom:12 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ background:k.bg, borderRadius:10, padding:"14px 16px", border:`1px solid ${k.color}33` }}>
            <div style={{ fontSize:26, fontWeight:900, color:k.color, lineHeight:1, fontFamily:F }}>
              {k.value ?? "—"}{k.value != null ? k.suffix : ""}
            </div>
            <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ fontSize:11, color:DS.textLight, lineHeight:1.4, fontFamily:F }}>{k.label}</span>
              {k.tooltip && (
                <Tooltip
                  title={SCORE_TOOLTIPS[k.tooltip].title}
                  description={SCORE_TOOLTIPS[k.tooltip].description}
                  scale
                  link={{ label:"Ver metodologia completa", onClick: goToMetodologia }}
                >
                  <span style={{ width:15, height:15, borderRadius:"50%", background:DS.border, color:DS.textLight, fontSize:9, fontWeight:700, display:"inline-flex", alignItems:"center", justifyContent:"center", cursor:"default", flexShrink:0, fontFamily:F }}>?</span>
                </Tooltip>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Ranking + Tiers/Setores */}
      <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:12, marginBottom:12 }}>

        {/* Ranking */}
        <Card>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
            <Lbl color={DS.textLight}>Ranking das marcas · score médio</Lbl>
          </div>
          <div>
            {withAvg.slice(0, 10).map((d, i) => (
              <div key={d.id}
                onClick={() => onVerRelatorio && onVerRelatorio(d)}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom: i < Math.min(withAvg.length, 10)-1 ? `1px solid ${DS.border}` : "none", cursor:"pointer", transition:"opacity 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.65"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                <div style={{ width:24, height:24, borderRadius:"50%", background:i < 3 ? DS.navy : DS.grayLight, color:i < 3 ? DS.green : DS.textLight, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, flexShrink:0, fontFamily:F }}>
                  {i+1}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:DS.navy, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", fontFamily:F }}>{d.empresa}</div>
                  {(d.setor || d.porte) && (
                    <div style={{ fontSize:10, color:DS.textLight, fontFamily:F }}>
                      {[normalizeSector(d.setor), d.porte].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
                <div style={{ minWidth:90 }}>
                  <Bar score={d.avgScore} color={sc(d.avgScore)} />
                </div>
              </div>
            ))}
          </div>
          {withAvg.length > 10 && onVerTodos && (
            <button onClick={onVerTodos} style={{ marginTop:14, width:"100%", padding:"9px", background:"none", border:`1px solid ${DS.border}`, borderRadius:8, fontSize:12, color:DS.green, fontWeight:700, cursor:"pointer", fontFamily:F }}>
              Ver todos os {withAvg.length} diagnósticos →
            </button>
          )}
        </Card>

        {/* Right column */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

          {/* Maturidade */}
          <Card>
            <Lbl color={DS.textLight}>Maturidade de marca</Lbl>
            {tiers.map((t, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom: i < tiers.length-1 ? 10 : 0 }}>
                <div style={{ width:8, height:8, borderRadius:2, background:t.color, flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:DS.text, fontFamily:F }}>{t.label}</span>
                  <span style={{ fontSize:10, color:DS.textLight, marginLeft:5, fontFamily:F }}>{t.range}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <div style={{ height:5, borderRadius:3, background:t.count > 0 ? t.color : DS.border, width:Math.max(t.count * 16, 4), transition:"width 0.6s ease" }} />
                  <span style={{ fontSize:13, fontWeight:900, color:t.count > 0 ? t.color : DS.textLight, minWidth:18, textAlign:"right", fontFamily:F }}>{t.count}</span>
                </div>
              </div>
            ))}
          </Card>

          {/* Setores */}
          {setores.length > 0 && (
            <Card>
              <Lbl color={DS.textLight}>Setores analisados</Lbl>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {setores.map(([setor, count]) => (
                  <button key={setor} onClick={() => onSetorClick && onSetorClick(setor)}
                    style={{ background:DS.navy, borderRadius:8, padding:"5px 10px", display:"flex", alignItems:"center", gap:6, border:"none", cursor: onSetorClick ? "pointer" : "default", transition:"opacity 0.15s" }}
                    onMouseEnter={e => { if (onSetorClick) e.currentTarget.style.opacity = "0.75"; }}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                  >
                    <span style={{ fontSize:12, color:"#d1e8e0", fontWeight:600, fontFamily:F }}>{setor}</span>
                    <span style={{ fontSize:11, background:DS.green+"44", color:DS.green, borderRadius:99, padding:"1px 6px", fontWeight:700, fontFamily:F }}>{count}</span>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Score por dimensão */}
      <Card>
        <Lbl color={DS.textLight}>Score médio por dimensão</Lbl>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:20 }}>
          {[
            { label:"Singularidade",  desc:"Diferenciação de marca",   val:avgSing, tooltipKey:"singularidade" },
            { label:"Consistência",   desc:"Coerência de identidade",  val:avgCons, tooltipKey:"consistencia"  },
            { label:"Posicionamento", desc:"Clareza estratégica",      val:avgPos,  tooltipKey:"posicionamento" },
          ].map(d => (
            <div key={d.label}>
              <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:2 }}>
                <span style={{ fontSize:12, fontWeight:700, color:DS.text, fontFamily:F }}>{d.label}</span>
                <Tooltip
                  title={SCORE_TOOLTIPS[d.tooltipKey].title}
                  description={SCORE_TOOLTIPS[d.tooltipKey].description}
                  scale
                  link={{ label:"Ver metodologia completa", onClick: goToMetodologia }}
                >
                  <span style={{ width:14, height:14, borderRadius:"50%", background:DS.border, color:DS.textLight, fontSize:9, fontWeight:700, display:"inline-flex", alignItems:"center", justifyContent:"center", cursor:"default", flexShrink:0, fontFamily:F }}>?</span>
                </Tooltip>
              </div>
              <div style={{ fontSize:11, color:DS.textLight, marginBottom:10, fontFamily:F }}>{d.desc}</div>
              {d.val != null
                ? <Bar score={d.val} color={sc(d.val)} />
                : <div style={{ fontSize:12, color:DS.textLight, fontFamily:F }}>—</div>
              }
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
}
