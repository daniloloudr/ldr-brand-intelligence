import { useState, useEffect, useRef } from "react";
import { useTheme } from "@mui/material/styles";
import { RATE_LIMIT_WAIT, MAX_RETRIES } from "../lib/constants";
import { sc } from "../lib/helpers";
import { Bar } from "../components/Bar";
import { PALETTE } from '../lib/theme'
import { Box, Typography } from "@mui/material";
import Skeleton from "@mui/material/Skeleton";
import { Card, CardContent } from "@mui/material";

const TOTAL_SEARCHES = 5;

const SEARCH_LABELS = [
  "Site oficial · proposta de valor",
  "LinkedIn · cultura e posicionamento",
  "Reputação pública · reviews e Glassdoor",
  "Redes sociais · tom de voz",
  "Concorrentes diretos · diferenciação",
];

const WAITING_MSGS = [
  "Inicializando o agent...",
  "Conectando às fontes de dados...",
  "Preparando análise de marca...",
  "Configurando framework Smart Branding...",
];

const GENERATING_MSGS = [
  "Aplicando framework Smart Branding...",
  "Calculando scores das 4 práticas...",
  "Mapeando gaps de identidade...",
  "Mapeando territórios possíveis...",
  "Finalizando o diagnóstico...",
];

const PRACTICE_COLORS = [PALETTE.data.positivo, PALETTE.data.critico, PALETTE.data.neutro, PALETTE.data.atencao];


// Skeleton do MUI — antes era um Box com keyframe "pulse" próprio
function SkeletonLine({ width = "100%", height = 12, sx = {} }) {
  return <Skeleton variant="rounded" animation="wave" width={width} height={height} sx={sx} />;
}

function RateLimitView({ countdown, attempt }) {
  return (
    <Box sx={{ bgcolor: 'background.paper',  padding: "28px 32px", border: `1px solid ${PALETTE.data.atencao}` }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: '10px', marginBottom: '12px' }}>
        <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: PALETTE.data.atencao, animation: "pulse 1s infinite" }} />
        <Box sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: PALETTE.data.atencao, textTransform: "uppercase" }}>
          Aguardando limite da API — tentativa {attempt}/{MAX_RETRIES}
        </Box>
      </Box>
      <Box sx={{ fontSize: 20, fontWeight: 900, color: 'text.primary', marginBottom: '8px' }}>
        Limite de requisições atingido
      </Box>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', marginBottom: '20px', lineHeight: 1.7 }}>
        A API tem um limite de tokens por minuto. O agent retomará automaticamente — não feche a página.
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: '20px' }}>
        <Box sx={{ position: "relative", width: 68, height: 68, flexShrink: 0 }}>
          <svg viewBox="0 0 64 64" style={{ transform: "rotate(-90deg)", width: 68, height: 68 }}>
            <circle cx="32" cy="32" r="28" fill="none" stroke={'divider'} strokeWidth="5" />
            <circle cx="32" cy="32" r="28" fill="none" stroke={PALETTE.data.atencao} strokeWidth="5"
              strokeDasharray={`${(countdown / RATE_LIMIT_WAIT) * 175.9} 175.9`}
              style={{ transition: "stroke-dasharray 1s linear" }} />
          </svg>
          <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: 'text.primary' }}>
            {countdown}
          </Box>
        </Box>
        <Box>
          <Box sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary', marginBottom: '4px' }}>
            Retomando em {countdown}s
          </Box>
          <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
            O diagnóstico continuará do ponto onde parou.
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function SkeletonReport({ elapsed, tokenCount }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: '10px', animation: "fu 0.5s ease both" }}>
      {/* Generating indicator */}
      <Box sx={{ bgcolor: 'background.default',  padding: "22px 26px" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: '16px' }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: '8px' }}>
            <Box sx={{ width: 7, height: 7, borderRadius: "50%", background: PALETTE.data.positivo, animation: "pulse 1.2s infinite" }} />
            <Typography component="span" sx={{ fontSize: 10, fontWeight: 700, color: PALETTE.data.positivo, textTransform: "uppercase", letterSpacing: "0.18em" }}>
              IA escrevendo diagnóstico
            </Typography>
          </Box>
          {tokenCount > 0 && (
            <Typography component="span" sx={{ fontSize: 11, color: 'text.disabled' }}>
              ~{tokenCount} tokens gerados
            </Typography>
          )}
        </Box>

        {/* Animated writing cursor lines */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: '7px' }}>
          {[
            { w: "52%", h: 20, delay: 0 },
            { w: "36%", h: 11, delay: 0.1 },
            { w: "90%", h: 9,  delay: 0.2 },
            { w: "76%", h: 9,  delay: 0.3 },
            { w: "60%", h: 9,  delay: 0.4 },
          ].map((l, i) => (
            <SkeletonLine key={i} width={l.w} height={l.h} sx={{ animationDelay: `${l.delay}s` }} />
          ))}
        </Box>

        {/* Writing cursor */}
        <Box sx={{ marginTop: '12px', display: "flex", alignItems: "center", gap: '6px' }}>
          <Box sx={{ width: 2, height: 14, background: PALETTE.data.positivo, animation: "blink 0.9s step-end infinite", }} />
          <Typography component="span" sx={{ fontSize: 11, color: 'text.secondary' }}>sintetizando dados...</Typography>
        </Box>
      </Box>

      {/* Practices grid skeleton */}
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: '10px' }}>
        {PRACTICE_COLORS.map((color, i) => (
          <Box key={i} sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider',  padding: "16px 18px", borderTop: `3px solid ${color}`, animation: `fu 0.4s ${i * 0.07}s ease both` }}>
            <SkeletonLine width="65%" height={13} sx={{ marginBottom: 10 }} />
            <SkeletonLine width="100%" height={9} sx={{ marginBottom: 5 }} />
            <SkeletonLine width="80%" height={9} sx={{ marginBottom: 14 }} />
            <SkeletonLine width="100%" height={5} />
          </Box>
        ))}
      </Box>

      {/* Scores skeleton */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: '10px' }}>
        {[0, 1, 2].map(i => (
          <Box key={i} sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider',  padding: "16px 18px", animation: `fu 0.4s ${0.28 + i * 0.07}s ease both` }}>
            <SkeletonLine width="55%" height={11} sx={{ marginBottom: 10 }} />
            <SkeletonLine width="100%" height={5} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function PartialDataPreview({ data }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: '10px', animation: "fu 0.5s ease both" }}>
      <Box sx={{ bgcolor: 'background.default',  padding: "22px 26px" }}>
        <Box sx={{ fontSize: 22, fontWeight: 900, color: 'text.primary', marginBottom: '4px' }}>
          {data.empresa}
        </Box>
        <Box sx={{ fontSize: 13, color: 'text.secondary' }}>
          {[data.setor, data.porte, data.dominio].filter(Boolean).join(" · ")}
        </Box>
        {data.frase_diagnostico && (
          <Box sx={{ marginTop: '14px', borderLeft: `3px solid ${PALETTE.data.positivo}`, paddingLeft: '14px', fontSize: 13, color: 'text.secondary', fontStyle: "italic", lineHeight: 1.65 }}>
            "{data.frase_diagnostico}"
          </Box>
        )}
      </Box>
      {data.resumo_executivo && (
        <Card variant="outlined"><CardContent>
          <Typography variant="overline" component="div" sx={{ mb: 1.25 }}>Resumo executivo</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.7 }}>{data.resumo_executivo}</Typography>
        </CardContent></Card>
      )}
      {(data.score_singularidade || data.score_consistencia) && (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: '8px' }}>
          {[
            { l: "Singularidade",  k: "score_singularidade" },
            { l: "Consistência",   k: "score_consistencia" },
            { l: "Posicionamento", k: "score_posicionamento" },
          ].filter(s => data[s.k]).map(s => (
            <Card variant="outlined" key={s.k}><CardContent>
              <Box sx={{ fontSize: 12, fontWeight: 700, marginBottom: '8px', color: 'text.primary' }}>{s.l}</Box>
              <Bar score={data[s.k]} color={sc(data[s.k])} />
            </CardContent></Card>
          ))}
        </Box>
      )}
    </Box>
  );
}

function formatElapsed(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// 98% in 120s = 0.817% per second; tick every 500ms = 0.408% per tick
const DURATION = 120;
const TICK_MS  = 500;
const STEP     = (98 / DURATION) / (1000 / TICK_MS);

export function StreamingView({ searchSteps, partialData, rateLimitCountdown, rateLimitAttempt, streamText = "" }) {
  const [msgIdx, setMsgIdx]     = useState(0);
  const [elapsed, setElapsed]   = useState(0);
  const [progress, setProgress] = useState(0);
  const startRef = useRef(Date.now());

  const isRateLimit  = rateLimitCountdown > 0;
  const searchCount  = searchSteps.length;
  const allDone      = searchCount >= TOTAL_SEARCHES;
  const isWaiting    = searchCount === 0;
  const isGenerating = allDone && !partialData?.empresa;

  const messages = isWaiting ? WAITING_MSGS : GENERATING_MSGS;
  const msgSpeed = isGenerating ? 1800 : 2400;

  const tokenCount = Math.floor(streamText.length / 4);

  // Elapsed clock
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  // Continuous progress ticker: 0% → 98% over 120 seconds, never pauses
  useEffect(() => {
    const t = setInterval(() => setProgress(p => Math.min(p + STEP, 98)), TICK_MS);
    return () => clearInterval(t);
  }, []);

  // Reset message index on phase change
  useEffect(() => { setMsgIdx(0); }, [isWaiting, allDone]);

  // Message rotation
  useEffect(() => {
    const t = setInterval(() => setMsgIdx(i => (i + 1) % messages.length), msgSpeed);
    return () => clearInterval(t);
  }, [messages.length, msgSpeed]);

  const progressPct = progress;

  if (isRateLimit) {
    return <RateLimitView countdown={rateLimitCountdown} attempt={rateLimitAttempt} />;
  }

  return (
    <Box>

      {/* ── Status header ── */}
      <Box sx={{ bgcolor: 'background.default',  padding: "28px 32px", marginBottom: '14px', position: "relative", overflow: "hidden", border: 1, borderColor: 'divider' }}>
        <Box sx={{ position: "absolute", right: -40, top: -40, width: 200, height: 200, borderRadius: "50%", background: PALETTE.data.positivo, opacity: 0.04 }} />

        {/* Phase label + elapsed */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: '16px' }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: '10px' }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: PALETTE.data.positivo, animation: "pulse 1.1s infinite", flexShrink: 0 }} />
            <Typography component="span" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: PALETTE.data.positivo, textTransform: "uppercase" }}>
              {isWaiting
                ? "Agent inicializando"
                : allDone
                ? "Gerando diagnóstico"
                : `Pesquisando · ${searchCount} de ${TOTAL_SEARCHES}`}
            </Typography>
          </Box>
          <Typography component="span" sx={{ fontSize: 12, color: 'text.secondary', fontVariantNumeric: "tabular-nums" }}>
            {formatElapsed(elapsed)}
          </Typography>
        </Box>

        {/* Rotating message */}
        <div
          key={`${msgIdx}-${isWaiting}-${allDone}`}
          sx={{ typography: "h5", color: "text.primary", mb: 1, animation: "fu 0.35s ease both" }}
        >
          {messages[msgIdx % messages.length]}
        </Box>

        <Typography sx={{ fontSize: 13, color: 'text.secondary', marginBottom: '22px' }}>
          {isGenerating
            ? "A IA está sintetizando todos os dados coletados. Isso pode levar até 60 segundos."
            : "Não feche esta página. O relatório será exibido ao final da análise."}
        </Typography>

        {/* Progress bar */}
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", marginBottom: '6px' }}>
            <Typography component="span" sx={{ fontSize: 11, color: 'text.disabled' }}>Progresso da análise</Typography>
            <Typography component="span" sx={{ fontSize: 11, color: PALETTE.data.positivo, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {Math.round(progressPct)}%
            </Typography>
          </Box>
          <Box sx={{ background: 'divider',  height: 5, overflow: "hidden" }}>
            <Box sx={{
              height: "100%",
              background: `linear-gradient(90deg, ${PALETTE.data.positivo}, ${PALETTE.neutral[500]})`,
              
              width: `${progressPct}%`,
              transition: "width 1.2s cubic-bezier(.22,1,.36,1)",
            }} />
          </Box>
        </Box>

        {/* Token counter strip — visible only during generating */}
        {isGenerating && tokenCount > 0 && (
          <Box sx={{ marginTop: '14px', display: "flex", alignItems: "center", gap: '8px', animation: "fu 0.3s ease both" }}>
            <Box sx={{ flex: 1, height: '1px', background: 'divider' }} />
            <Typography component="span" sx={{ fontSize: 11, color: 'text.secondary', whiteSpace: "nowrap" }}>
              {tokenCount.toLocaleString("pt-BR")} tokens gerados
            </Typography>
            <Box sx={{ flex: 1, height: '1px', background: 'divider' }} />
          </Box>
        )}
      </Box>

      {/* ── Search timeline ── */}
      <Card variant="outlined" sx={{ marginBottom: '14px' }}><CardContent>
        <Typography variant="overline" component="div" sx={{ mb: 1.25 }}>Fontes pesquisadas</Typography>
        <Box>
          {SEARCH_LABELS.map((label, i) => {
            const done     = i < searchCount - 1;
            const active   = i === searchCount - 1;
            const upcoming = i >= searchCount;
            const query    = searchSteps[i] || label;
            const stateKey = done ? `d-${i}` : active ? `a-${i}` : `u-${i}`;

            return (
              <div
                key={stateKey}
                sx={{
                  display: "flex", alignItems: "flex-start", gap: "12px",
                  padding: "10px 0",
                  borderBottom: i < SEARCH_LABELS.length - 1 ? 1 : 0, borderColor: "divider",
                  opacity: upcoming ? 0.28 : 1,
                  animation: active ? "lightUp 0.65s ease both"
                            : done   ? "fu 0.3s ease both"
                            : "none",
                  background: active
                    ? `linear-gradient(90deg, rgba(13,158,122,0.12) 0%, transparent 80%)`
                    : done
                    ? `linear-gradient(90deg, rgba(13,158,122,0.05) 0%, transparent 70%)`
                    : "transparent",
                  borderRadius: (active || done) ? 8 : 0,
                  marginLeft: (active || done) ? -8 : 0,
                  paddingLeft: (active || done) ? 8 : 0,
                }}
              >
                {/* Step indicator */}
                <Box sx={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: '1px',
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 800,
                  bgcolor: done ? PALETTE.data.positivo : active ? "transparent" : 'action.selected',
                  border: active ? `2px solid ${PALETTE.data.positivo}` : done ? "none" : `1px solid divider`,
                  color: done ? "#fff" : active ? PALETTE.data.positivo : 'text.disabled',
                  animation: done   ? "checkPop 0.4s ease both"
                            : active ? "pulse 1.3s ease infinite"
                            : "none",
                }}>
                  {done ? "✓" : i + 1}
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Box sx={{
                    fontSize: 11, color: 'text.secondary',
                    marginBottom: upcoming ? '0px' : '2px',
                  }}>
                    {label}
                  </Box>
                  {!upcoming && (
                    <Box sx={{
                      fontSize: 13, lineHeight: 1.45,
                      color: done ? 'text.secondary' : active ? 'text.primary' : 'text.secondary',
                      fontWeight: active ? 600 : 400,
                    }}>
                      {query}
                    </Box>
                  )}
                  {active && (
                    <Box sx={{ display: "flex", gap: '4px', marginTop: '6px' }}>
                      {[0, 1, 2].map(d => (
                        <Box key={d} sx={{
                          width: 5, height: 5, borderRadius: "50%",
                          background: PALETTE.data.positivo,
                          animation: `pulse 1.2s ${d * 0.22}s ease infinite`,
                        }} />
                      ))}
                    </Box>
                  )}
                </Box>

                {done && (
                  <Typography component="span" sx={{
                    fontSize: 11, color: PALETTE.data.positivo, fontWeight: 700, flexShrink: 0, paddingTop: '2px',
                    animation: "fu 0.35s 0.1s ease both",
                  }}>
                    concluído
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      </CardContent></Card>

      {/* ── Skeleton or partial data ── */}
      {isGenerating && <SkeletonReport elapsed={elapsed} tokenCount={tokenCount} />}
      {!isGenerating && partialData?.empresa && <PartialDataPreview data={partialData} />}

    </Box>
  );
}
