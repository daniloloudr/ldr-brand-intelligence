import { useTheme } from "@mui/material/styles";
import { sc, normalizeSector, navigate } from "../lib/helpers";
import { Bar } from "../components/Bar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import Box from "@mui/material/Box";
import { PALETTE } from '../lib/theme'
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";

const goToMetodologia = () => { navigate("#/metodologia"); };

const SCORE_TOOLTIPS = {
  singularidade:  { title: "Score de Singularidade",  description: "Mede o grau de diferenciação e unicidade da marca." },
  consistencia:   { title: "Score de Consistência",   description: "Avalia a coerência entre o que a marca diz ser e o que o mercado percebe." },
  posicionamento: { title: "Score de Posicionamento", description: "Mede a clareza estratégica da marca." },
  geral:          { title: "Score Médio Geral",        description: "Média dos três scores do framework Smart Branding." },
};

/* ─── sub-components ─────────────────────────────────────────────── */

function SectionTitle({ children }) {
  return (
    <Box sx={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: 'text.disabled', marginBottom: '12px' }}>
      {children}
    </Box>
  );
}

function PanelCard({ children, style = {} }) {
  return (
    <Box sx={{
      bgcolor: 'background.paper', border: 1, borderColor: 'divider',
       padding: "18px 20px",
      boxShadow: `0 1px 4px transparent`,
      ...style,
    }}>
      {children}
    </Box>
  );
}

/* ─── main component ─────────────────────────────────────────────── */

export function DashboardHistorico({ historico, onVerRelatorio, onVerTodos, onSetorClick }) {
  const muiTheme = useTheme();
  const isDark   = muiTheme.palette.mode === "dark";


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
    { label: "Referência",         range: "9–10", color: PALETTE.data.neutro, min: 9,   max: 10   },
    { label: "Sólido",             range: "7–8",  color: PALETTE.data.positivo,  min: 7,   max: 8.99 },
    { label: "Em desenvolvimento", range: "4–6",  color: PALETTE.data.atencao,  min: 4,   max: 6.99 },
    { label: "Crítico",            range: "1–3",  color: PALETTE.data.critico,   min: 0,   max: 3.99 },
  ];
  const tiers = tierDefs.map(t => ({
    ...t,
    count: withAvg.filter(d => d.avgScore >= t.min && d.avgScore <= t.max).length,
  }));
  // maior tier — base da proporção das barras
  const maxTier = Math.max(...tiers.map(t => t.count), 0);

  const kpis = [
    { label: "Marcas analisadas",    value: historico.length, suffix: "",     color: isDark ? PALETTE.data.positivo : PALETTE.neutral[900],  bg: isDark ? PALETTE.data.positivo + "18"   : PALETTE.data.positivoFraco, key: null },
    { label: "Média Singularidade",  value: avgSing,          suffix: "/10",  color: sc(avgSing  || 0), bg: sc(avgSing  || 0) + "18",  key: "singularidade" },
    { label: "Média Consistência",   value: avgCons,          suffix: "/10",  color: sc(avgCons  || 0), bg: sc(avgCons  || 0) + "18",  key: "consistencia" },
    { label: "Média Posicionamento", value: avgPos,           suffix: "/10",  color: sc(avgPos   || 0), bg: sc(avgPos   || 0) + "18",  key: "posicionamento" },
    { label: "Score médio geral",    value: avgGeral,         suffix: "/10",  color: sc(avgGeral || 0), bg: sc(avgGeral || 0) + "18",  key: "geral" },
  ];

  return (
    <Box>

      {/* ── Row 1: KPI strip ─────────────────────────────────── */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: '12px', marginBottom: '20px' }}>
        {kpis.map((k, i) => (
          <PanelCard key={i}>
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: '6px' }}>
              <Box>
                <Box sx={{ fontSize: 26, fontWeight: 900, color: k.color, lineHeight: 1 }}>
                  {k.value ?? "—"}{k.value != null ? k.suffix : ""}
                </Box>
                <Box sx={{ fontSize: 11, color: 'text.disabled', marginTop: '5px', lineHeight: 1.3 }}>{k.label}</Box>
              </Box>
              <Box sx={{ width: 36, height: 36,  background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Typography component="span" sx={{ fontSize: 16 }}>
                  {i === 0 ? "📊" : i === 1 ? "⬡" : i === 2 ? "◈" : i === 3 ? "◎" : "✦"}
                </Typography>
              </Box>
            </Box>
            {k.key && (
              <Box sx={{ marginTop: '10px' }}>
                <Bar score={k.value || 0} color={k.color} />
              </Box>
            )}
          </PanelCard>
        ))}
      </Box>

      {/* ── Row 2: Ranking + Maturidade/Setores ──────────────── */}
      <Box sx={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: '12px', marginBottom: '20px' }}>

        {/* Ranking */}
        <PanelCard>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: '16px' }}>
            <SectionTitle>Ranking das marcas · score médio</SectionTitle>
            {withAvg.length > 10 && onVerTodos && (
              <Button variant="outlined" size="small" onClick={onVerTodos}>
                Ver todos {withAvg.length} →
              </Button>
            )}
          </Box>
          <Box>
            {withAvg.slice(0, 10).map((d, i) => (
              <Box key={d.id} onClick={() => onVerRelatorio && onVerRelatorio(d)}
                sx={{
                  display: "flex", alignItems: "center", gap: "12px", padding: "9px 0",
                  borderBottom: i < Math.min(withAvg.length, 10) - 1 ? 1 : 0, borderColor: "divider",
                  cursor: "pointer", "&:hover": { opacity: 0.65 },
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.65"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                <Box sx={{
                  width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                  background: i < 3 ? PALETTE.data.positivo + "22" : 'divider' + "44",
                  color: i < 3 ? PALETTE.data.positivo : 'text.disabled',
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 900,
                }}>
                  {i + 1}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary', whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {d.empresa}
                  </Box>
                  {(d.setor || d.porte) && (
                    <Box sx={{ fontSize: 10, color: 'text.disabled' }}>
                      {[normalizeSector(d.setor), d.porte].filter(Boolean).join(" · ")}
                    </Box>
                  )}
                </Box>
                <Box sx={{ minWidth: 110 }}>
                  <Bar score={d.avgScore} color={sc(d.avgScore)} />
                </Box>
                <Box sx={{ fontSize: 13, fontWeight: 900, color: sc(d.avgScore), minWidth: 28, textAlign: "right" }}>
                  {d.avgScore}
                </Box>
              </Box>
            ))}
          </Box>
        </PanelCard>

        {/* Right column: Maturidade + Setores */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: '12px' }}>

          {/* Maturidade */}
          <PanelCard>
            <SectionTitle>Maturidade de marca</SectionTitle>
            {tiers.map((t, i) => (
              <Box key={i} sx={{ display: "flex", alignItems: "center", gap: '10px', marginBottom: i < tiers.length - 1 ? '12px' : '0px'}}>
                <Box sx={{ width: 8, height: 8,  background: t.color, flexShrink: 0 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography component="span" sx={{ fontSize: 12, fontWeight: 700, color: 'text.primary' }}>{t.label}</Typography>
                  <Typography component="span" sx={{ fontSize: 10, color: 'text.disabled', marginLeft: '6px' }}>{t.range}</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: '8px' }}>
                  {/* Proporcional ao maior tier — antes era count*16px, que passava de
                      1400px quando um tier tinha muitas marcas e estourava a página. */}
                  <LinearProgress variant="determinate"
                    value={maxTier > 0 ? (t.count / maxTier) * 100 : 0}
                    sx={{ width: 120, height: 5, '& .MuiLinearProgress-bar': { backgroundColor: t.color } }} />
                  <Typography component="span" sx={{ fontSize: 13, fontWeight: 900, color: t.count > 0 ? t.color : 'text.disabled', minWidth: 18, textAlign: "right" }}>
                    {t.count}
                  </Typography>
                </Box>
              </Box>
            ))}
          </PanelCard>

          {/* Setores */}
          {setores.length > 0 && (
            <PanelCard>
              <SectionTitle>Setores analisados</SectionTitle>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: '6px' }}>
                {setores.map(([setor, count]) => (
                  <Button variant="outlined" size="small" key={setor} onClick={() => onSetorClick && onSetorClick(setor)}
                    sx={{
                      display: "flex", alignItems: "center", gap: "6px",
                      cursor: onSetorClick ? "pointer" : "default",
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={e => { if (onSetorClick) e.currentTarget.style.opacity = "0.75"; }}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                  >
                    <Typography component="span" sx={{ fontSize: 12, color: PALETTE.data.positivo, fontWeight: 600 }}>{setor}</Typography>
                    <Typography component="span" sx={{ fontSize: 11, background: PALETTE.data.positivo + "33", color: PALETTE.data.positivo,  padding: "1px 6px", fontWeight: 700 }}>{count}</Typography>
                  </Button>
                ))}
              </Box>
            </PanelCard>
          )}
        </Box>
      </Box>

      {/* ── Row 3: Score por dimensão ─────────────────────────── */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: '12px' }}>
        {[
          { label: "Singularidade",  desc: "Diferenciação de marca",  val: avgSing, key: "singularidade" },
          { label: "Consistência",   desc: "Coerência de identidade", val: avgCons, key: "consistencia"  },
          { label: "Posicionamento", desc: "Clareza estratégica",     val: avgPos,  key: "posicionamento" },
        ].map(d => (
          <PanelCard key={d.label}>
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: '10px' }}>
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: '6px', marginBottom: '2px' }}>
                  <Typography component="span" sx={{ fontSize: 13, fontWeight: 800, color: 'text.primary' }}>{d.label}</Typography>
                  <Tooltip arrow placement="top" title={
                    <Box sx={{ p: 0.5 }}>
                      <Typography variant="subtitle2">{SCORE_TOOLTIPS[d.key].title}</Typography>
                      <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>{SCORE_TOOLTIPS[d.key].description}</Typography>
                      <Link component="button" variant="caption" onClick={goToMetodologia} sx={{ mt: 1 }}>Ver metodologia</Link>
                    </Box>
                  }>
                    <Typography component="span" sx={{
                      width: 14, height: 14, borderRadius: "50%",
                      background: 'divider', color: 'text.disabled',
                      fontSize: 9, fontWeight: 700,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      cursor: "default",
                    }}>?</Typography>
                  </Tooltip>
                </Box>
                <Box sx={{ fontSize: 11, color: 'text.disabled' }}>{d.desc}</Box>
              </Box>
              {d.val != null && (
                <Box sx={{ fontSize: 28, fontWeight: 900, color: sc(d.val), lineHeight: 1 }}>
                  {d.val}
                </Box>
              )}
            </Box>
            {d.val != null
              ? <Bar score={d.val} color={sc(d.val)} />
              : <Box sx={{ fontSize: 12, color: 'text.disabled' }}>—</Box>
            }
          </PanelCard>
        ))}
      </Box>

    </Box>
  );
}
