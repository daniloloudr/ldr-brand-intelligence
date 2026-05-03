import { useState, useEffect } from "react";
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

function SkeletonLine({ width = "100%", height = 12, bg = DS.border, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: 4,
      background: bg,
      animation: "pulse 1.6s ease-in-out infinite",
      ...style,
    }} />
  );
}

function RateLimitView({ countdown, attempt }) {
  return (
    <div style={{ background: DS.navyMid, borderRadius: 16, padding: "28px 32px", border: `1px solid ${DS.amber}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: DS.amber, animation: "pulse 1s infinite" }} />
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: DS.amber, textTransform: "uppercase", fontFamily: F }}>
          Aguardando limite da API — tentativa {attempt}/{MAX_RETRIES}
        </div>
      </div>
      <div style={{ fontSize: 20, fontWeight: 900, color: DS.white, marginBottom: 8, fontFamily: F }}>
        Limite de requisições atingido
      </div>
      <p style={{ fontSize: 13, color: DS.gray, marginBottom: 20, fontFamily: F, lineHeight: 1.7 }}>
        A API tem um limite de tokens por minuto. O agent retomará automaticamente — não feche a página.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ position: "relative", width: 68, height: 68, flexShrink: 0 }}>
          <svg viewBox="0 0 64 64" style={{ transform: "rotate(-90deg)", width: 68, height: 68 }}>
            <circle cx="32" cy="32" r="28" fill="none" stroke={DS.navyLight} strokeWidth="5" />
            <circle cx="32" cy="32" r="28" fill="none" stroke={DS.amber} strokeWidth="5"
              strokeDasharray={`${(countdown / RATE_LIMIT_WAIT) * 175.9} 175.9`}
              style={{ transition: "stroke-dasharray 1s linear" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: DS.white, fontFamily: F }}>
            {countdown}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: DS.white, marginBottom: 4, fontFamily: F }}>
            Retomando em {countdown}s
          </div>
          <div style={{ fontSize: 12, color: DS.gray, fontFamily: F }}>
            O diagnóstico continuará do ponto onde parou.
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonReport() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, animation: "fu 0.5s ease both" }}>
      {/* Company card skeleton */}
      <div style={{ background: DS.navy, borderRadius: 12, padding: "22px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: DS.green, animation: "pulse 1.2s infinite" }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: DS.green, textTransform: "uppercase", letterSpacing: "0.18em", fontFamily: F }}>
            Sintetizando diagnóstico
          </span>
        </div>
        <SkeletonLine width="50%" height={22} bg="#1E3550" style={{ marginBottom: 10 }} />
        <SkeletonLine width="38%" height={12} bg="#1E3550" style={{ marginBottom: 16 }} />
        <SkeletonLine width="88%" height={10} bg="#162840" style={{ marginBottom: 6 }} />
        <SkeletonLine width="72%" height={10} bg="#162840" />
      </div>

      {/* Practices grid skeleton */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {PRACTICE_COLORS.map((color, i) => (
          <div key={i} style={{ background: DS.white, border: `1px solid ${DS.border}`, borderRadius: 12, padding: "16px 18px", borderTop: `3px solid ${color}`, animation: `fu 0.4s ${i * 0.07}s ease both` }}>
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
          <div key={i} style={{ background: DS.white, border: `1px solid ${DS.border}`, borderRadius: 12, padding: "16px 18px", animation: `fu 0.4s ${0.28 + i * 0.07}s ease both` }}>
            <SkeletonLine width="55%" height={11} style={{ marginBottom: 10 }} />
            <SkeletonLine width="100%" height={5} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PartialDataPreview({ data }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, animation: "fu 0.5s ease both" }}>
      <div style={{ background: DS.navy, borderRadius: 12, padding: "22px 26px" }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: DS.white, marginBottom: 4, fontFamily: F }}>
          {data.empresa}
        </div>
        <div style={{ fontSize: 13, color: DS.gray, fontFamily: F }}>
          {[data.setor, data.porte, data.dominio].filter(Boolean).join(" · ")}
        </div>
        {data.frase_diagnostico && (
          <div style={{ marginTop: 14, borderLeft: `3px solid ${DS.green}`, paddingLeft: 14, fontSize: 13, color: "#c9d8e8", fontStyle: "italic", fontFamily: F, lineHeight: 1.65 }}>
            "{data.frase_diagnostico}"
          </div>
        )}
      </div>
      {data.resumo_executivo && (
        <Card>
          <Lbl color={DS.textLight}>Resumo executivo</Lbl>
          <p style={{ fontSize: 13, color: DS.textMid, lineHeight: 1.7, fontFamily: F }}>{data.resumo_executivo}</p>
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
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, fontFamily: F }}>{s.l}</div>
              <Bar score={data[s.k]} color={sc(data[s.k])} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function StreamingView({ searchSteps, partialData, rateLimitCountdown, rateLimitAttempt }) {
  const [msgIdx, setMsgIdx] = useState(0);

  const isRateLimit   = rateLimitCountdown > 0;
  const searchCount   = searchSteps.length;
  const allDone       = searchCount >= TOTAL_SEARCHES;
  const isWaiting     = searchCount === 0;
  const isGenerating  = allDone && !partialData?.empresa;

  const messages = isWaiting ? WAITING_MSGS : GENERATING_MSGS;

  useEffect(() => {
    setMsgIdx(0);
  }, [isWaiting, allDone]);

  useEffect(() => {
    const t = setInterval(() => setMsgIdx(i => (i + 1) % messages.length), 2400);
    return () => clearInterval(t);
  }, [messages.length]);

  const progressPct = isWaiting ? 5 : allDone ? 92 : 8 + (searchCount / TOTAL_SEARCHES) * 75;

  if (isRateLimit) {
    return <RateLimitView countdown={rateLimitCountdown} attempt={rateLimitAttempt} />;
  }

  return (
    <div>

      {/* ── Status header ── */}
      <div style={{ background: DS.navy, borderRadius: 16, padding: "28px 32px", marginBottom: 14, position: "relative", overflow: "hidden" }}>
        {/* bg glow */}
        <div style={{ position: "absolute", right: -40, top: -40, width: 200, height: 200, borderRadius: "50%", background: DS.green, opacity: 0.04 }} />

        {/* Phase label */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: DS.green, animation: "pulse 1.1s infinite", flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: DS.green, textTransform: "uppercase", fontFamily: F }}>
            {isWaiting
              ? "Agent inicializando"
              : allDone
              ? "Gerando diagnóstico"
              : `Pesquisando · ${searchCount} de ${TOTAL_SEARCHES}`}
          </span>
        </div>

        {/* Rotating message */}
        <div
          key={`${msgIdx}-${isWaiting}-${allDone}`}
          style={{ fontSize: 22, fontWeight: 900, color: DS.white, marginBottom: 8, fontFamily: F, animation: "fu 0.35s ease both" }}
        >
          {messages[msgIdx % messages.length]}
        </div>

        <p style={{ fontSize: 13, color: DS.gray, marginBottom: 22, fontFamily: F }}>
          Não feche esta página. O relatório será exibido ao final da análise.
        </p>

        {/* Progress bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: DS.textLight, fontFamily: F }}>Progresso da análise</span>
            <span style={{ fontSize: 11, color: DS.green, fontWeight: 700, fontFamily: F }}>{Math.round(progressPct)}%</span>
          </div>
          <div style={{ background: DS.navyLight, borderRadius: 99, height: 5, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              background: `linear-gradient(90deg, ${DS.green}, #0ecf9f)`,
              borderRadius: 99,
              width: `${progressPct}%`,
              transition: "width 1.4s cubic-bezier(.22,1,.36,1)",
            }} />
          </div>
        </div>
      </div>

      {/* ── Search timeline ── */}
      <Card style={{ marginBottom: 14 }}>
        <Lbl color={DS.textLight}>Fontes pesquisadas</Lbl>
        <div>
          {SEARCH_LABELS.map((label, i) => {
            const done     = i < searchCount - 1;
            const active   = i === searchCount - 1;
            const upcoming = i >= searchCount;
            const query    = searchSteps[i] || label;

            return (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: "10px 0",
                  borderBottom: i < SEARCH_LABELS.length - 1 ? `1px solid ${DS.border}` : "none",
                  opacity: upcoming ? 0.32 : 1,
                  transition: "opacity 0.5s ease",
                  animation: active ? "fu 0.4s ease both" : "none",
                }}
              >
                {/* Step indicator */}
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 800, fontFamily: F,
                  background: done ? DS.green : active ? "transparent" : DS.grayLight,
                  border: active ? `2px solid ${DS.green}` : done ? "none" : `1px solid ${DS.border}`,
                  color: done ? DS.white : active ? DS.green : DS.textLight,
                  animation: active ? "pulse 1.3s ease infinite" : "none",
                }}>
                  {done ? "✓" : i + 1}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 13, fontFamily: F, lineHeight: 1.5,
                    color: done ? DS.textMid : active ? DS.text : DS.textLight,
                    fontWeight: active ? 600 : 400,
                  }}>
                    {upcoming ? label : query}
                  </div>
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
                  <span style={{ fontSize: 11, color: DS.green, fontWeight: 700, flexShrink: 0, fontFamily: F, paddingTop: 2 }}>
                    concluído
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Skeleton or partial data ── */}
      {isGenerating && <SkeletonReport />}
      {!isGenerating && partialData?.empresa && <PartialDataPreview data={partialData} />}

    </div>
  );
}
