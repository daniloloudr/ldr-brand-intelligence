import { useState, useEffect, useRef } from "react";
import { useTheme } from "@mui/material/styles";
import { DS, F, RATE_LIMIT_WAIT, MAX_RETRIES } from "../lib/constants";
import { sc } from "../lib/helpers";
import { Bar } from "../components/Bar";
import { Lbl } from "../components/Lbl";
import { Card } from "../components/Card";

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
  "Identificando oportunidades estratégicas...",
  "Finalizando o diagnóstico...",
];

const PRACTICE_COLORS = ["#0D9E7A", "#E8185A", "#7F77DD", "#EF9F27"];

function useC() {
  const muiTheme = useTheme();
  const dark = muiTheme.palette.mode === "dark";
  return dark ? {
    bg:      "#0D1B2A",
    panel:   "#162840",
    panelMid:"#1E3550",
    border:  "#2A4A68",
    text:    "#D8E4F0",
    textSec: "#96AABF",
    textDis: "#4D6070",
    stepBg:  "#2A4A68",
    italic:  "#96AABF",
  } : {
    bg:      "#FFFFFF",
    panel:   "#F5F7F6",
    panelMid:"#E2EBE8",
    border:  "#E2EBE8",
    text:    "#0D1B2A",
    textSec: "#4A5A6A",
    textDis: "#8A9AB0",
    stepBg:  "#F0F4F3",
    italic:  "#4A5A6A",
  };
}

function SkeletonLine({ width = "100%", height = 12, bg, style = {} }) {
  const C = useC();
  return (
    <div style={{
      width, height, borderRadius: 4,
      background: bg || C.panelMid,
      animation: "pulse 1.6s ease-in-out infinite",
      ...style,
    }} />
  );
}

function RateLimitView({ countdown, attempt }) {
  const C = useC();
  return (
    <div style={{ background: C.panel, borderRadius: 16, padding: "28px 32px", border: `1px solid ${DS.amber}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: DS.amber, animation: "pulse 1s infinite" }} />
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: DS.amber, textTransform: "uppercase", fontFamily: F }}>
          Aguardando limite da API — tentativa {attempt}/{MAX_RETRIES}
        </div>
      </div>
      <div style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 8, fontFamily: F }}>
        Limite de requisições atingido
      </div>
      <p style={{ fontSize: 13, color: C.textSec, marginBottom: 20, fontFamily: F, lineHeight: 1.7 }}>
        A API tem um limite de tokens por minuto. O agent retomará automaticamente — não feche a página.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ position: "relative", width: 68, height: 68, flexShrink: 0 }}>
          <svg viewBox="0 0 64 64" style={{ transform: "rotate(-90deg)", width: 68, height: 68 }}>
            <circle cx="32" cy="32" r="28" fill="none" stroke={C.panelMid} strokeWidth="5" />
            <circle cx="32" cy="32" r="28" fill="none" stroke={DS.amber} strokeWidth="5"
              strokeDasharray={`${(countdown / RATE_LIMIT_WAIT) * 175.9} 175.9`}
              style={{ transition: "stroke-dasharray 1s linear" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: C.text, fontFamily: F }}>
            {countdown}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4, fontFamily: F }}>
            Retomando em {countdown}s
          </div>
          <div style={{ fontSize: 12, color: C.textSec, fontFamily: F }}>
            O diagnóstico continuará do ponto onde parou.
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonReport({ elapsed, tokenCount }) {
  const C = useC();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, animation: "fu 0.5s ease both" }}>
      {/* Generating indicator */}
      <div style={{ background: C.bg, borderRadius: 12, padding: "22px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: DS.green, animation: "pulse 1.2s infinite" }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: DS.green, textTransform: "uppercase", letterSpacing: "0.18em", fontFamily: F }}>
              IA escrevendo diagnóstico
            </span>
          </div>
          {tokenCount > 0 && (
            <span style={{ fontSize: 11, color: C.textDis, fontFamily: F }}>
              ~{tokenCount} tokens gerados
            </span>
          )}
        </div>

        {/* Animated writing cursor lines */}
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {[
            { w: "52%", h: 20, delay: 0 },
            { w: "36%", h: 11, delay: 0.1 },
            { w: "90%", h: 9,  delay: 0.2 },
            { w: "76%", h: 9,  delay: 0.3 },
            { w: "60%", h: 9,  delay: 0.4 },
          ].map((l, i) => (
            <SkeletonLine key={i} width={l.w} height={l.h} style={{ animationDelay: `${l.delay}s` }} />
          ))}
        </div>

        {/* Writing cursor */}
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 2, height: 14, background: DS.green, animation: "blink 0.9s step-end infinite", borderRadius: 1 }} />
          <span style={{ fontSize: 11, color: C.textSec, fontFamily: F }}>sintetizando dados...</span>
        </div>
      </div>

      {/* Practices grid skeleton */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {PRACTICE_COLORS.map((color, i) => (
          <div key={i} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", borderTop: `3px solid ${color}`, animation: `fu 0.4s ${i * 0.07}s ease both` }}>
            <SkeletonLine width="65%" height={13} style={{ marginBottom: 10 }} />
            <SkeletonLine width="100%" height={9} style={{ marginBottom: 5 }} />
            <SkeletonLine width="80%" height={9} style={{ marginBottom: 14 }} />
            <SkeletonLine width="100%" height={5} />
          </div>
        ))}
      </div>

      {/* Scores skeleton */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", animation: `fu 0.4s ${0.28 + i * 0.07}s ease both` }}>
            <SkeletonLine width="55%" height={11} style={{ marginBottom: 10 }} />
            <SkeletonLine width="100%" height={5} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PartialDataPreview({ data }) {
  const C = useC();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, animation: "fu 0.5s ease both" }}>
      <div style={{ background: C.bg, borderRadius: 12, padding: "22px 26px" }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: C.text, marginBottom: 4, fontFamily: F }}>
          {data.empresa}
        </div>
        <div style={{ fontSize: 13, color: C.textSec, fontFamily: F }}>
          {[data.setor, data.porte, data.dominio].filter(Boolean).join(" · ")}
        </div>
        {data.frase_diagnostico && (
          <div style={{ marginTop: 14, borderLeft: `3px solid ${DS.green}`, paddingLeft: 14, fontSize: 13, color: C.italic, fontStyle: "italic", fontFamily: F, lineHeight: 1.65 }}>
            "{data.frase_diagnostico}"
          </div>
        )}
      </div>
      {data.resumo_executivo && (
        <Card>
          <Lbl color={DS.green}>Resumo executivo</Lbl>
          <p style={{ fontSize: 13, color: C.textSec, lineHeight: 1.7, fontFamily: F }}>{data.resumo_executivo}</p>
        </Card>
      )}
      {(data.score_singularidade || data.score_consistencia) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {[
            { l: "Singularidade",  k: "score_singularidade" },
            { l: "Consistência",   k: "score_consistencia" },
            { l: "Posicionamento", k: "score_posicionamento" },
          ].filter(s => data[s.k]).map(s => (
            <Card key={s.k}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, fontFamily: F, color: C.text }}>{s.l}</div>
              <Bar score={data[s.k]} color={sc(data[s.k])} />
            </Card>
          ))}
        </div>
      )}
    </div>
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
  const C = useC();
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
    <div>

      {/* ── Status header ── */}
      <div style={{ background: C.bg, borderRadius: 16, padding: "28px 32px", marginBottom: 14, position: "relative", overflow: "hidden", border: `1px solid ${C.border}` }}>
        <div style={{ position: "absolute", right: -40, top: -40, width: 200, height: 200, borderRadius: "50%", background: DS.green, opacity: 0.04 }} />

        {/* Phase label + elapsed */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: DS.green, animation: "pulse 1.1s infinite", flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: DS.green, textTransform: "uppercase", fontFamily: F }}>
              {isWaiting
                ? "Agent inicializando"
                : allDone
                ? "Gerando diagnóstico"
                : `Pesquisando · ${searchCount} de ${TOTAL_SEARCHES}`}
            </span>
          </div>
          <span style={{ fontSize: 12, color: C.textSec, fontFamily: F, fontVariantNumeric: "tabular-nums" }}>
            {formatElapsed(elapsed)}
          </span>
        </div>

        {/* Rotating message */}
        <div
          key={`${msgIdx}-${isWaiting}-${allDone}`}
          style={{ fontSize: 22, fontWeight: 900, color: C.text, marginBottom: 8, fontFamily: F, animation: "fu 0.35s ease both" }}
        >
          {messages[msgIdx % messages.length]}
        </div>

        <p style={{ fontSize: 13, color: C.textSec, marginBottom: 22, fontFamily: F }}>
          {isGenerating
            ? "A IA está sintetizando todos os dados coletados. Isso pode levar até 60 segundos."
            : "Não feche esta página. O relatório será exibido ao final da análise."}
        </p>

        {/* Progress bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: C.textDis, fontFamily: F }}>Progresso da análise</span>
            <span style={{ fontSize: 11, color: DS.green, fontWeight: 700, fontFamily: F, fontVariantNumeric: "tabular-nums" }}>
              {Math.round(progressPct)}%
            </span>
          </div>
          <div style={{ background: C.panelMid, borderRadius: 99, height: 5, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              background: `linear-gradient(90deg, ${DS.green}, #0ecf9f)`,
              borderRadius: 99,
              width: `${progressPct}%`,
              transition: "width 1.2s cubic-bezier(.22,1,.36,1)",
            }} />
          </div>
        </div>

        {/* Token counter strip — visible only during generating */}
        {isGenerating && tokenCount > 0 && (
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, animation: "fu 0.3s ease both" }}>
            <div style={{ flex: 1, height: 1, background: C.panelMid }} />
            <span style={{ fontSize: 11, color: C.textSec, fontFamily: F, whiteSpace: "nowrap" }}>
              {tokenCount.toLocaleString("pt-BR")} tokens gerados
            </span>
            <div style={{ flex: 1, height: 1, background: C.panelMid }} />
          </div>
        )}
      </div>

      {/* ── Search timeline ── */}
      <Card style={{ marginBottom: 14 }}>
        <Lbl color={DS.green}>Fontes pesquisadas</Lbl>
        <div>
          {SEARCH_LABELS.map((label, i) => {
            const done     = i < searchCount - 1;
            const active   = i === searchCount - 1;
            const upcoming = i >= searchCount;
            const query    = searchSteps[i] || label;
            const stateKey = done ? `d-${i}` : active ? `a-${i}` : `u-${i}`;

            return (
              <div
                key={stateKey}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: "10px 0",
                  borderBottom: i < SEARCH_LABELS.length - 1 ? `1px solid ${C.border}` : "none",
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
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 800, fontFamily: F,
                  background: done ? DS.green : active ? "transparent" : C.stepBg,
                  border: active ? `2px solid ${DS.green}` : done ? "none" : `1px solid ${C.border}`,
                  color: done ? "#fff" : active ? DS.green : C.textDis,
                  animation: done   ? "checkPop 0.4s ease both"
                            : active ? "pulse 1.3s ease infinite"
                            : "none",
                }}>
                  {done ? "✓" : i + 1}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 11, fontFamily: F, color: C.textSec,
                    marginBottom: upcoming ? 0 : 2,
                  }}>
                    {label}
                  </div>
                  {!upcoming && (
                    <div style={{
                      fontSize: 13, fontFamily: F, lineHeight: 1.45,
                      color: done ? C.textSec : active ? C.text : C.textSec,
                      fontWeight: active ? 600 : 400,
                    }}>
                      {query}
                    </div>
                  )}
                  {active && (
                    <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                      {[0, 1, 2].map(d => (
                        <div key={d} style={{
                          width: 5, height: 5, borderRadius: "50%",
                          background: DS.green,
                          animation: `pulse 1.2s ${d * 0.22}s ease infinite`,
                        }} />
                      ))}
                    </div>
                  )}
                </div>

                {done && (
                  <span style={{
                    fontSize: 11, color: DS.green, fontWeight: 700, flexShrink: 0, fontFamily: F, paddingTop: 2,
                    animation: "fu 0.35s 0.1s ease both",
                  }}>
                    concluído
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Skeleton or partial data ── */}
      {isGenerating && <SkeletonReport elapsed={elapsed} tokenCount={tokenCount} />}
      {!isGenerating && partialData?.empresa && <PartialDataPreview data={partialData} />}

    </div>
  );
}
