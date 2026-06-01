import { useTheme } from "@mui/material/styles";
import { DS, F } from "../lib/constants";
import { sc, normalizeSector } from "../lib/helpers";
import { Bar } from "../components/Bar";
import { Tooltip } from "../components/Tooltip";

const goToMetodologia = () => { window.location.hash = "#/metodologia"; };

const SCORE_TOOLTIPS = {
  singularidade:  { title: "Score de Singularidade",  description: "Mede o grau de diferenciação e unicidade da marca." },
  consistencia:   { title: "Score de Consistência",   description: "Avalia a coerência entre o que a marca diz ser e o que o mercado percebe." },
  posicionamento: { title: "Score de Posicionamento", description: "Mede a clareza estratégica da marca." },
  geral:          { title: "Score Médio Geral",        description: "Média dos três scores do framework Smart Branding." },
};

/* ─── sub-components ─────────────────────────────────────────────── */

function SectionTitle({ children, C }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.textDis, fontFamily: F, marginBottom: 12 }}>
      {children}
    </div>
  );
}

function PanelCard({ children, C, style = {} }) {
  return (
    <div style={{
      background: C.paper, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: "18px 20px",
      boxShadow: `0 1px 4px ${C.shadow}`,
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ─── main component ─────────────────────────────────────────────── */

export function DashboardHistorico({ historico, onVerRelatorio, onVerTodos, onSetorClick }) {
  const muiTheme = useTheme();
  const isDark   = muiTheme.palette.mode === "dark";

  const C = isDark ? {
    bg:      "#0D1B2A",
    paper:   "#162840",
    border:  "#2A4A68",
    text:    "#D8E4F0",
    textSec: "#96AABF",
    textDis: "#4D6070",
    shadow:  "rgba(0,0,0,0.25)",
    rowHover:"#1B3050",
    divider: "#2A4A68",
  } : {
    bg:      "#F0F2F5",
    paper:   "#FFFFFF",
    border:  "#E2EBE8",
    text:    "#0D1B2A",
    textSec: "#4A5A6A",
    textDis: "#8A9AB0",
    shadow:  "rgba(0,0,0,0.04)",
    rowHover:"#F5F7F6",
    divider: "#E2EBE8",
  };

  if (!historico.length) return null;

  /* ── computations ── */
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
      avgScore: +(((d.score_singularidade || 0) + (d.score_consistencia || 0) + (d.score_posicionamento || 0)) / 3).toFixed(1),
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  const setorMap = {};
  historico.forEach(d => {
    const s = normalizeSector(d.setor);
    if (s) setorMap[s] = (setorMap[s] || 0) + 1;
  });
  const setores = Object.entries(setorMap).sort((a, b) => b[1] - a[1]);

  const tierDefs = [
    { label: "Referência",         range: "9–10", color: "#7F77DD", min: 9,   max: 10   },
    { label: "Sólido",             range: "7–8",  color: DS.green,  min: 7,   max: 8.99 },
    { label: "Em desenvolvimento", range: "4–6",  color: DS.amber,  min: 4,   max: 6.99 },
    { label: "Crítico",            range: "1–3",  color: DS.pink,   min: 0,   max: 3.99 },
  ];
  const tiers = tierDefs.map(t => ({
    ...t,
    count: withAvg.filter(d => d.avgScore >= t.min && d.avgScore <= t.max).length,
  }));

  const kpis = [
    { label: "Marcas analisadas",    value: historico.length, suffix: "",     color: isDark ? DS.green : DS.navy,  bg: isDark ? DS.green + "18"   : DS.greenPale, key: null },
    { label: "Média Singularidade",  value: avgSing,          suffix: "/10",  color: sc(avgSing  || 0), bg: sc(avgSing  || 0) + "18",  key: "singularidade" },
    { label: "Média Consistência",   value: avgCons,          suffix: "/10",  color: sc(avgCons  || 0), bg: sc(avgCons  || 0) + "18",  key: "consistencia" },
    { label: "Média Posicionamento", value: avgPos,           suffix: "/10",  color: sc(avgPos   || 0), bg: sc(avgPos   || 0) + "18",  key: "posicionamento" },
    { label: "Score médio geral",    value: avgGeral,         suffix: "/10",  color: sc(avgGeral || 0), bg: sc(avgGeral || 0) + "18",  key: "geral" },
  ];

  return (
    <div>

      {/* ── Row 1: KPI strip ─────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
        {kpis.map((k, i) => (
          <PanelCard key={i} C={C} style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 900, color: k.color, lineHeight: 1, fontFamily: F }}>
                  {k.value ?? "—"}{k.value != null ? k.suffix : ""}
                </div>
                <div style={{ fontSize: 11, color: C.textDis, marginTop: 5, lineHeight: 1.3, fontFamily: F }}>{k.label}</div>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 16 }}>
                  {i === 0 ? "📊" : i === 1 ? "⬡" : i === 2 ? "◈" : i === 3 ? "◎" : "✦"}
                </span>
              </div>
            </div>
            {k.key && (
              <div style={{ marginTop: 10 }}>
                <Bar score={k.value || 0} color={k.color} />
              </div>
            )}
          </PanelCard>
        ))}
      </div>

      {/* ── Row 2: Ranking + Maturidade/Setores ──────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 12, marginBottom: 20 }}>

        {/* Ranking */}
        <PanelCard C={C}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <SectionTitle C={C}>Ranking das marcas · score médio</SectionTitle>
            {withAvg.length > 10 && onVerTodos && (
              <button onClick={onVerTodos}
                style={{ fontSize: 11, color: DS.green, background: "none", border: "none", cursor: "pointer", fontFamily: F, fontWeight: 700 }}>
                Ver todos {withAvg.length} →
              </button>
            )}
          </div>
          <div>
            {withAvg.slice(0, 10).map((d, i) => (
              <div key={d.id} onClick={() => onVerRelatorio && onVerRelatorio(d)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "9px 0",
                  borderBottom: i < Math.min(withAvg.length, 10) - 1 ? `1px solid ${C.divider}` : "none",
                  cursor: "pointer", transition: "opacity 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.65"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                  background: i < 3 ? DS.green + "22" : C.border + "44",
                  color: i < 3 ? DS.green : C.textDis,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 900, fontFamily: F,
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: F }}>
                    {d.empresa}
                  </div>
                  {(d.setor || d.porte) && (
                    <div style={{ fontSize: 10, color: C.textDis, fontFamily: F }}>
                      {[normalizeSector(d.setor), d.porte].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
                <div style={{ minWidth: 110 }}>
                  <Bar score={d.avgScore} color={sc(d.avgScore)} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 900, color: sc(d.avgScore), minWidth: 28, textAlign: "right", fontFamily: F }}>
                  {d.avgScore}
                </div>
              </div>
            ))}
          </div>
        </PanelCard>

        {/* Right column: Maturidade + Setores */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Maturidade */}
          <PanelCard C={C}>
            <SectionTitle C={C}>Maturidade de marca</SectionTitle>
            {tiers.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: i < tiers.length - 1 ? 12 : 0 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: t.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: F }}>{t.label}</span>
                  <span style={{ fontSize: 10, color: C.textDis, marginLeft: 6, fontFamily: F }}>{t.range}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ height: 5, borderRadius: 3, background: t.count > 0 ? t.color : C.border, width: Math.max(t.count * 16, 4), transition: "width 0.6s ease" }} />
                  <span style={{ fontSize: 13, fontWeight: 900, color: t.count > 0 ? t.color : C.textDis, minWidth: 18, textAlign: "right", fontFamily: F }}>
                    {t.count}
                  </span>
                </div>
              </div>
            ))}
          </PanelCard>

          {/* Setores */}
          {setores.length > 0 && (
            <PanelCard C={C}>
              <SectionTitle C={C}>Setores analisados</SectionTitle>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {setores.map(([setor, count]) => (
                  <button key={setor} onClick={() => onSetorClick && onSetorClick(setor)}
                    style={{
                      background: isDark ? DS.green + "18" : DS.greenPale,
                      borderRadius: 6, padding: "5px 10px",
                      display: "flex", alignItems: "center", gap: 6,
                      border: `1px solid ${DS.green}33`,
                      cursor: onSetorClick ? "pointer" : "default",
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={e => { if (onSetorClick) e.currentTarget.style.opacity = "0.75"; }}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                  >
                    <span style={{ fontSize: 12, color: DS.green, fontWeight: 600, fontFamily: F }}>{setor}</span>
                    <span style={{ fontSize: 11, background: DS.green + "33", color: DS.green, borderRadius: 99, padding: "1px 6px", fontWeight: 700, fontFamily: F }}>{count}</span>
                  </button>
                ))}
              </div>
            </PanelCard>
          )}
        </div>
      </div>

      {/* ── Row 3: Score por dimensão ─────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { label: "Singularidade",  desc: "Diferenciação de marca",  val: avgSing, key: "singularidade" },
          { label: "Consistência",   desc: "Coerência de identidade", val: avgCons, key: "consistencia"  },
          { label: "Posicionamento", desc: "Clareza estratégica",     val: avgPos,  key: "posicionamento" },
        ].map(d => (
          <PanelCard key={d.label} C={C}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: C.text, fontFamily: F }}>{d.label}</span>
                  <Tooltip
                    title={SCORE_TOOLTIPS[d.key].title}
                    description={SCORE_TOOLTIPS[d.key].description}
                    link={{ label: "Ver metodologia", onClick: goToMetodologia }}
                  >
                    <span style={{
                      width: 14, height: 14, borderRadius: "50%",
                      background: C.border, color: C.textDis,
                      fontSize: 9, fontWeight: 700,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      cursor: "default", fontFamily: F,
                    }}>?</span>
                  </Tooltip>
                </div>
                <div style={{ fontSize: 11, color: C.textDis, fontFamily: F }}>{d.desc}</div>
              </div>
              {d.val != null && (
                <div style={{ fontSize: 28, fontWeight: 900, color: sc(d.val), lineHeight: 1, fontFamily: F }}>
                  {d.val}
                </div>
              )}
            </div>
            {d.val != null
              ? <Bar score={d.val} color={sc(d.val)} />
              : <div style={{ fontSize: 12, color: C.textDis, fontFamily: F }}>—</div>
            }
          </PanelCard>
        ))}
      </div>

    </div>
  );
}
