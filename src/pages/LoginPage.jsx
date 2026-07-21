import { useState } from "react";
import { navigate } from '../lib/helpers';
import { supabase } from "../lib/supabase";

// Login — split estilo Runway: showcase à esquerda + form à direita.
// Identidade s1ngulr = Vercel light (monocromático). Form em CSS puro; auth Supabase intacta.
// O visual da esquerda é placeholder — trocável por imagem/vídeo de marca quando pronta.
export function LoginPage({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setError("");
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError("E-mail ou senha incorretos. Tente de novo."); return; }
    onLogin(data.user);
    navigate("/app");
  }

  const CSS = `
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; background: #fff; }

    .sp-root {
      --text:     #171717;
      --muted:    #666666;
      --faint:    #999999;
      --border:   #EAEAEA;
      --border-h: #CFCFCF;
      --btn:      #000000;
      --btn-h:    #333333;
      --sans: system-ui, -apple-system, 'Segoe UI', 'Inter', 'Helvetica Neue', Arial, sans-serif;
      --mono: ui-monospace, 'Geist Mono', 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;

      display: grid;
      grid-template-columns: 1fr 1fr;
      min-height: 100vh;
      font-family: var(--sans);
      color: var(--text);
      -webkit-font-smoothing: antialiased;
    }
    .sp-root ::selection { background: #171717; color: #fff; }

    /* ── ESQUERDA: showcase ── */
    .sp-show {
      position: relative;
      border-right: 1px solid var(--border);
      padding: 44px 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      background:
        radial-gradient(120% 80% at 100% 0%, #FFFFFF 0%, transparent 55%),
        linear-gradient(150deg, #FAFAFA 0%, #F0F0F0 100%);
    }
    /* textura geométrica sutil (grid de pontos) — precisão técnica */
    .sp-show::before {
      content: '';
      position: absolute; inset: 0;
      background-image: radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1.4px);
      background-size: 22px 22px;
      mask-image: linear-gradient(160deg, #000 10%, transparent 75%);
      -webkit-mask-image: linear-gradient(160deg, #000 10%, transparent 75%);
      pointer-events: none;
    }
    .sp-nav {
      position: relative;
      display: flex;
      flex-wrap: wrap;
      gap: 18px;
      font-family: var(--mono);
      font-size: 10.5px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--faint);
    }
    .sp-nav b { color: var(--text); font-weight: 500; }
    .sp-foot { position: relative; max-width: 460px; }
    .sp-head {
      font-size: clamp(30px, 3.6vw, 46px);
      font-weight: 600;
      line-height: 1.04;
      letter-spacing: -0.035em;
      color: var(--text);
      margin: 0 0 16px;
    }
    .sp-sub {
      font-size: 15px;
      line-height: 1.6;
      color: var(--muted);
      margin: 0;
      max-width: 400px;
    }

    /* ── DIREITA: form ── */
    .sp-form {
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      padding: 48px 24px;
    }
    .sp-card { width: 100%; max-width: 320px; }
    @media (prefers-reduced-motion: no-preference) {
      .sp-card { animation: spUp 0.5s cubic-bezier(0.16,1,0.3,1) both; }
    }
    @keyframes spUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

    .sp-mark {
      text-align: center;
      font-weight: 600;
      font-size: 23px;
      letter-spacing: -0.04em;
      color: #171717;
      margin: 0 0 26px;
    }
    .sp-title { text-align: center; font-size: 15px; font-weight: 500; letter-spacing: -0.01em; margin: 0 0 4px; }
    .sp-desc  { text-align: center; font-size: 13px; color: var(--muted); margin: 0 0 26px; }

    .sp-error {
      font-size: 13px; line-height: 1.5;
      color: #B4232A; background: #FDF3F3;
      border: 1px solid #F3D4D4;
      padding: 10px 13px; border-radius: 6px; margin-bottom: 16px;
    }

    .sp-input {
      width: 100%;
      background: #fff;
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      font-family: var(--sans);
      font-size: 14px;
      padding: 11px 13px;
      outline: none;
      margin-bottom: 10px;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .sp-input::placeholder { color: var(--faint); }
    .sp-input:hover { border-color: var(--border-h); }
    .sp-input:focus { border-color: #171717; box-shadow: 0 0 0 1px #171717; }

    .sp-btn {
      width: 100%; margin-top: 6px;
      background: var(--btn); color: #fff;
      border: 1px solid var(--btn); border-radius: 8px;
      padding: 11px;
      font-family: var(--sans); font-size: 14px; font-weight: 500;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, opacity 0.15s;
    }
    .sp-btn:hover:not(:disabled) { background: var(--btn-h); border-color: var(--btn-h); }
    .sp-btn:disabled { opacity: 0.6; cursor: default; }
    .sp-btn:focus-visible { outline: 2px solid #171717; outline-offset: 2px; }

    .sp-alt { text-align: center; margin-top: 22px; font-size: 13px; color: var(--muted); }
    .sp-alt button {
      background: none; border: none; color: var(--text);
      font-family: var(--sans); font-size: 13px; font-weight: 500;
      cursor: pointer; padding: 0 0 0 4px;
      text-decoration: underline; text-underline-offset: 2px; text-decoration-color: var(--border-h);
      transition: text-decoration-color 0.15s;
    }
    .sp-alt button:hover { text-decoration-color: var(--text); }

    /* ── MOBILE: só o form ── */
    @media (max-width: 860px) {
      .sp-root { grid-template-columns: 1fr; }
      .sp-show { display: none; }
    }
  `;

  return (
    <div className="sp-root">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ── Showcase ── */}
      <div className="sp-show">
        <div className="sp-nav">
          <span><b>Estratégia</b></span>
          <span>Inteligência</span>
          <span>Estúdio</span>
          <span>Copiloto</span>
        </div>
        <div className="sp-foot">
          <h2 className="sp-head">A marca no meio da operação.</h2>
          <p className="sp-sub">
            Diagnóstico com IA, inteligência de mercado e criação on-brand — a memória
            viva da sua marca, em tempo real.
          </p>
        </div>
      </div>

      {/* ── Form ── */}
      <div className="sp-form">
        <div className="sp-card">
          <div className="sp-mark">s1ngulr</div>
          <h1 className="sp-title">Entre na sua conta</h1>
          <p className="sp-desc">Brand intelligence platform</p>

          {error && <div className="sp-error" role="alert">{error}</div>}

          <form onSubmit={handleLogin}>
            <input
              className="sp-input" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="E-mail" autoComplete="email" required autoFocus
            />
            <input
              className="sp-input" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Senha" autoComplete="current-password" required
            />
            <button className="sp-btn" type="submit" disabled={loading}>
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
