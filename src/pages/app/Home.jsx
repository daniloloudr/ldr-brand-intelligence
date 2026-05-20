import { useState, useEffect, useCallback } from 'react'
import { useWorkspace }  from '../../lib/WorkspaceContext'
import { supabase }      from '../../lib/supabase'
import { PRATICAS, PLANOS } from '../../lib/constants'
import { fmtDate }       from '../../lib/helpers'

/* ─── CSS ────────────────────────────────────────────────────────── */

const CSS = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp {
    from { opacity:0; transform:translateY(20px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes countUp {
    from { opacity:0; transform:translateY(10px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .home-root {
    padding: 48px 52px 80px;
    max-width: 1060px;
    color: #fff;
    font-family: 'Cairo', sans-serif;
  }
  @media (max-width:900px) { .home-root { padding: 28px 20px 60px; } }

  /* header */
  .home-eyebrow {
    font-size: 10px; font-weight: 700; letter-spacing: 0.2em;
    text-transform: uppercase; color: #3D4E60;
    margin-bottom: 8px;
    animation: fadeUp 0.5s ease both;
  }
  .home-title {
    font-size: clamp(26px,3.5vw,38px); font-weight: 900;
    letter-spacing: -0.03em; color: #fff;
    line-height: 1; margin: 0 0 4px;
    animation: fadeUp 0.5s 0.05s ease both;
  }
  .home-sub {
    font-size: 13px; color: #7A8899; margin: 0 0 48px;
    animation: fadeUp 0.5s 0.1s ease both;
  }

  /* score grid */
  .home-scores {
    display: grid; grid-template-columns: repeat(3,1fr); gap: 2px;
    margin-bottom: 2px;
  }
  @media (max-width:700px) { .home-scores { grid-template-columns: 1fr; } }

  .score-card {
    background: #0E1E30;
    border: 1px solid #1E3348;
    padding: 28px 24px 24px;
    position: relative; overflow: hidden;
    animation: fadeUp 0.5s ease both;
  }
  .score-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
  }
  .score-card--green::before  { background: #0D9E7A; }
  .score-card--amber::before  { background: #EF9F27; }
  .score-card--pink::before   { background: #E8185A; }

  .score-card-label {
    font-size: 9px; font-weight: 700; letter-spacing: 0.2em;
    text-transform: uppercase; color: #3D4E60; margin-bottom: 12px;
  }
  .score-card-value {
    font-size: clamp(56px,6vw,80px); font-weight: 900; line-height: 1;
    letter-spacing: -0.04em; font-variant-numeric: tabular-nums;
    animation: countUp 0.6s 0.2s ease both;
  }
  .score-card-value--green { color: #0D9E7A; }
  .score-card-value--amber { color: #EF9F27; }
  .score-card-value--pink  { color: #E8185A; }

  .score-card-denom {
    font-size: 16px; font-weight: 400; color: #3D4E60; margin-left: 3px;
  }
  .score-card-tag {
    display: inline-block; margin-top: 12px;
    font-size: 9px; font-weight: 700; letter-spacing: 0.16em;
    text-transform: uppercase; padding: 3px 8px;
  }
  .score-card-tag--green { color: #0D9E7A; background: rgba(13,158,122,0.1); }
  .score-card-tag--amber { color: #EF9F27; background: rgba(239,159,39,0.1); }
  .score-card-tag--pink  { color: #E8185A; background: rgba(232,24,90,0.1); }

  /* bar under value */
  .score-bar-track {
    height: 2px; background: #1E3348; margin-top: 16px;
  }
  .score-bar-fill {
    height: 100%; transition: width 1s cubic-bezier(0.4,0,0.2,1);
  }

  /* frase */
  .home-frase {
    background: #0E1E30; border: 1px solid #1E3348;
    border-left: 3px solid #0D9E7A;
    padding: 20px 24px; margin: 2px 0 32px;
    animation: fadeUp 0.5s 0.25s ease both;
  }
  .home-frase-text {
    font-size: 15px; font-weight: 600; line-height: 1.6;
    color: #E8ECF0; font-style: italic;
  }
  .home-frase-empresa {
    font-size: 11px; color: #3D4E60; margin-top: 6px;
    font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  }

  /* section titles */
  .home-section-title {
    font-size: 9px; font-weight: 700; letter-spacing: 0.2em;
    text-transform: uppercase; color: #3D4E60;
    margin: 0 0 12px; padding-top: 28px;
    border-top: 1px solid #1E3348;
    animation: fadeUp 0.5s 0.3s ease both;
  }

  /* oportunidades */
  .opp-list { display: flex; flex-direction: column; gap: 1px; margin-bottom: 0; }
  .opp-item {
    background: #0E1E30; border: 1px solid #1E3348;
    padding: 16px 20px;
    display: flex; align-items: flex-start; gap: 16px;
    animation: fadeUp 0.5s ease both;
    transition: background 0.15s;
  }
  .opp-item:hover { background: #122033; }
  .opp-num {
    font-size: 11px; font-weight: 900; color: #1E3348;
    background: #1B2F45; width: 24px; height: 24px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; font-variant-numeric: tabular-nums;
  }
  .opp-titulo { font-size: 13px; font-weight: 800; color: #E8ECF0; margin-bottom: 3px; }
  .opp-desc   { font-size: 12px; color: #7A8899; line-height: 1.55; }
  .opp-tags   { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
  .opp-tag {
    font-size: 9px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; padding: 2px 7px;
  }
  .opp-tag--alto    { color: #E8185A; background: rgba(232,24,90,0.1); }
  .opp-tag--medio   { color: #EF9F27; background: rgba(239,159,39,0.1); }
  .opp-tag--baixo   { color: #7A8899; background: rgba(122,136,153,0.1); }
  .opp-tag--prazo   { color: #0D9E7A; background: rgba(13,158,122,0.1); }

  /* alertas */
  .alert-list { display: flex; flex-direction: column; gap: 1px; }
  .alert-item {
    background: #0E1E30; border: 1px solid #1E3348;
    padding: 12px 16px;
    display: flex; align-items: flex-start; gap: 12px;
    animation: fadeUp 0.5s ease both;
    opacity: 1; transition: opacity 0.3s;
  }
  .alert-item--lido { opacity: 0.4; }
  .alert-dot {
    width: 6px; height: 6px; border-radius: 50%;
    flex-shrink: 0; margin-top: 5px;
  }
  .alert-titulo { font-size: 13px; font-weight: 700; color: #E8ECF0; margin-bottom: 2px; }
  .alert-desc   { font-size: 12px; color: #7A8899; }
  .alert-date   { font-size: 10px; color: #3D4E60; margin-top: 3px; font-weight: 700; letter-spacing: 0.08em; }
  .alert-btn {
    margin-left: auto; flex-shrink: 0; align-self: center;
    background: none; border: 1px solid #1E3348;
    padding: 4px 10px; font-size: 10px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: #7A8899; cursor: pointer; font-family: 'Cairo', sans-serif;
    transition: border-color 0.15s, color 0.15s;
  }
  .alert-btn:hover { border-color: #0D9E7A; color: #0D9E7A; }

  /* empty */
  .home-empty {
    border: 1px dashed #1E3348;
    padding: 60px 32px; text-align: center;
    animation: fadeUp 0.5s ease both;
  }
  .home-empty-title { font-size: 15px; font-weight: 800; color: #B0BACB; margin-bottom: 8px; }
  .home-empty-sub   { font-size: 13px; color: #7A8899; margin-bottom: 24px; }

  /* CTA */
  .home-cta {
    display: inline-flex; align-items: center; gap: 8px;
    background: #E8185A; color: #fff; border: none;
    padding: 14px 28px; font-size: 11px; font-weight: 700;
    letter-spacing: 0.14em; text-transform: uppercase;
    font-family: 'Cairo', sans-serif; cursor: pointer;
    transition: background 0.15s, transform 0.15s;
    margin-top: 36px;
    animation: fadeUp 0.5s 0.4s ease both;
  }
  .home-cta:hover { background: #C01048; transform: translateY(-1px); }
  .home-cta-wrap { display: flex; justify-content: flex-end; padding-top: 32px; border-top: 1px solid #1E3348; }
`

/* ─── helpers ─────────────────────────────────────────────────────── */

function scoreVariant(s) {
  if (s >= 7) return 'green'
  if (s >= 5) return 'amber'
  return 'pink'
}
function scoreTag(s) {
  if (s >= 7) return 'Sólido'
  if (s >= 5) return 'Em desenvolvimento'
  return 'Crítico'
}
function alertDotColor(sev) {
  if (sev === 'critical' || sev === 'error') return '#E8185A'
  if (sev === 'warning') return '#EF9F27'
  if (sev === 'success') return '#0D9E7A'
  return '#7A8899'
}

/* ─── sub-components ─────────────────────────────────────────────── */

function ScoreCard({ label, value, delay = 0 }) {
  const v   = scoreVariant(value ?? 0)
  const pct = Math.round(((value ?? 0) / 10) * 100)
  return (
    <div className={`score-card score-card--${v}`} style={{ animationDelay: `${delay}s` }}>
      <div className="score-card-label">{label}</div>
      <div>
        <span className={`score-card-value score-card-value--${v}`}>{value ?? '—'}</span>
        <span className="score-card-denom">/10</span>
      </div>
      <div className={`score-card-tag score-card-tag--${v}`}>{scoreTag(value ?? 0)}</div>
      <div className="score-bar-track">
        <div className={`score-bar-fill`} style={{ width: `${pct}%`, background: v === 'green' ? '#0D9E7A' : v === 'amber' ? '#EF9F27' : '#E8185A' }} />
      </div>
    </div>
  )
}

function AlertRow({ alerta, onMarkRead }) {
  const [loading, setLoading] = useState(false)
  async function mark() {
    setLoading(true)
    await supabase.from('alertas').update({ lido: true }).eq('id', alerta.id)
    onMarkRead(alerta.id)
    setLoading(false)
  }
  return (
    <div className={`alert-item${alerta.lido ? ' alert-item--lido' : ''}`}>
      <div className="alert-dot" style={{ background: alertDotColor(alerta.severidade) }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="alert-titulo">{alerta.titulo}</div>
        {alerta.descricao && <div className="alert-desc">{alerta.descricao}</div>}
        <div className="alert-date">{fmtDate(alerta.created_at)}</div>
      </div>
      {!alerta.lido && (
        <button className="alert-btn" onClick={mark} disabled={loading}>
          {loading ? '...' : 'Lido'}
        </button>
      )}
    </div>
  )
}

/* ─── main component ─────────────────────────────────────────────── */

export function Home() {
  const { workspace }          = useWorkspace()
  const [loading, setLoading]  = useState(true)
  const [diag, setDiag]        = useState(null)
  const [alertas, setAlertas]  = useState([])

  const load = useCallback(async () => {
    if (!workspace?.id) return
    setLoading(true)
    const [{ data: d }, { data: a }] = await Promise.all([
      supabase.from('diagnosticos').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('alertas').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(5),
    ])
    setDiag(d ?? null)
    setAlertas(a ?? [])
    setLoading(false)
  }, [workspace?.id])

  useEffect(() => { load() }, [load])

  function markRead(id) {
    setAlertas(prev => prev.map(a => a.id === id ? { ...a, lido: true } : a))
  }

  const planoNome    = PLANOS[workspace?.plano]?.nome ?? 'Trial'
  const dados        = diag?.dados ?? null
  const oportunidades = Array.isArray(dados?.oportunidades) ? dados.oportunidades.slice(0, 3) : []

  return (
    <div className="home-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Header */}
      <div className="home-eyebrow">— Dashboard</div>
      <h1 className="home-title">{workspace?.nome}</h1>
      <p className="home-sub">
        Plano {planoNome}
        {diag ? ` · último diagnóstico ${fmtDate(diag.created_at)}` : ' · nenhum diagnóstico gerado'}
      </p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{ width: 32, height: 32, border: '2px solid #1E3348', borderTopColor: '#0D9E7A', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
        </div>
      ) : !diag ? (
        <>
          <div className="home-empty">
            <div className="home-empty-title">Nenhum diagnóstico ainda</div>
            <div className="home-empty-sub">Gere o primeiro diagnóstico e descubra oportunidades de crescimento.</div>
            <button className="home-cta" onClick={() => { window.location.hash = '#/app/diagnostico' }}>
              Gerar primeiro diagnóstico →
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Scores */}
          <div className="home-scores">
            <ScoreCard label="Singularidade"  value={diag.score_singularidade}  delay={0.1} />
            <ScoreCard label="Consistência"   value={diag.score_consistencia}   delay={0.18} />
            <ScoreCard label="Posicionamento" value={diag.score_posicionamento} delay={0.26} />
          </div>

          {/* Frase */}
          {dados?.frase_diagnostico && (
            <div className="home-frase">
              <div className="home-frase-text">"{dados.frase_diagnostico}"</div>
              {dados.empresa && <div className="home-frase-empresa">{dados.empresa}</div>}
            </div>
          )}

          {/* Oportunidades */}
          {oportunidades.length > 0 && (
            <>
              <div className="home-section-title">Top 3 oportunidades</div>
              <div className="opp-list">
                {oportunidades.map((op, i) => {
                  const pratica = PRATICAS.find(p => p.key === op.pratica_loudr)
                  return (
                    <div className="opp-item" key={i} style={{ animationDelay: `${0.3 + i * 0.07}s` }}>
                      <div className="opp-num">{i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="opp-titulo">{op.titulo}</div>
                        <div className="opp-desc">{op.descricao}</div>
                        <div className="opp-tags">
                          {op.impacto && <span className={`opp-tag opp-tag--${op.impacto}`}>Impacto {op.impacto}</span>}
                          {op.prazo   && <span className="opp-tag opp-tag--prazo">{op.prazo}</span>}
                          {pratica    && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: pratica.color, padding: '2px 7px', background: pratica.color + '18' }}>{pratica.label}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Alertas */}
          <div className="home-section-title">Alertas recentes</div>
          {alertas.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', border: '1px solid #1E3348', color: '#3D4E60', fontSize: 13 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0D9E7A', flexShrink: 0 }} />
              Nenhum alerta — tudo certo.
            </div>
          ) : (
            <div className="alert-list">
              {alertas.map(a => <AlertRow key={a.id} alerta={a} onMarkRead={markRead} />)}
            </div>
          )}

          {/* CTA */}
          <div className="home-cta-wrap">
            <button className="home-cta" onClick={() => { window.location.hash = '#/app/diagnostico' }}>
              Gerar novo diagnóstico →
            </button>
          </div>
        </>
      )}
    </div>
  )
}
