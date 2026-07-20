import { useState } from "react";
import { navigate } from '../lib/helpers';
import { supabase } from "../lib/supabase";
import logoNegativa from "../assets/negativa.svg";
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'

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
    if (err) { setError("E-mail ou senha incorretos."); return; }
    onLogin(data.user);
    navigate("#/app");
  }

  const CSS = `
    *, *::before, *::after { box-sizing: border-box; }

    :root {
      --navy:      #08111F;
      --navy-mid:  #0E1E30;
      --navy-surf: #122033;
      --navy-elev: #1B2F45;
      --border:    #1E3348;
      --pink:      #E8185A;
      --pink-dim:  #C01048;
      --teal:      #0D9E7A;
      --gray-300:  #B0BACB;
      --gray-500:  #7A8899;
      --F: 'Cairo', sans-serif;
    }

    html, body { margin: 0; padding: 0; }
    body { font-family: var(--F); background: var(--navy); color: #fff; }
    ::selection { background: var(--pink); color: #fff; }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes gridPan {
      from { background-position: 0 0; }
      to   { background-position: 60px 60px; }
    }

    .auth-root {
      display: grid;
      grid-template-columns: 55fr 45fr;
      min-height: 100vh;
    }

    /* ── LEFT PANEL ── */
    .auth-brand {
      position: relative;
      background: var(--navy);
      background-image:
        linear-gradient(rgba(232,24,90,0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(232,24,90,0.025) 1px, transparent 1px);
      background-size: 60px 60px;
      animation: gridPan 8s linear infinite;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 64px 72px;
      overflow: hidden;
    }

    /* Decorative corner marks */
    .auth-brand::before {
      content: '';
      position: absolute;
      top: 0; left: 0;
      width: 120px; height: 120px;
      border-right: 1px solid rgba(232,24,90,0.18);
      border-bottom: 1px solid rgba(232,24,90,0.18);
      pointer-events: none;
    }
    .auth-brand::after {
      content: '';
      position: absolute;
      bottom: 0; right: 0;
      width: 80px; height: 80px;
      border-left: 1px solid rgba(232,24,90,0.18);
      border-top: 1px solid rgba(232,24,90,0.18);
      pointer-events: none;
    }

    /* Top-right corner mark */
    .auth-brand-corner-tr {
      position: absolute;
      top: 0; right: 0;
      width: 60px; height: 60px;
      border-left: 1px solid rgba(232,24,90,0.12);
      border-bottom: 1px solid rgba(232,24,90,0.12);
      pointer-events: none;
    }

    /* Pink accent bar */
    .auth-brand-bar {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
      background: var(--pink);
    }

    .auth-brand-top {
      animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.05s both;
    }

    .auth-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--pink);
      margin-bottom: 48px;
    }
    .auth-eyebrow::before {
      content: '';
      display: block;
      width: 20px;
      height: 1px;
      background: var(--pink);
    }

    .auth-headline {
      font-size: clamp(40px, 5vw, 64px);
      font-weight: 900;
      line-height: 0.93;
      letter-spacing: -0.03em;
      text-transform: uppercase;
      color: #fff;
      margin: 0 0 36px;
    }
    .auth-headline .accent { color: var(--pink); }

    .auth-quote {
      font-size: 14px;
      color: var(--gray-300);
      line-height: 1.7;
      font-style: italic;
      border-left: 2px solid rgba(232,24,90,0.4);
      padding-left: 18px;
      margin: 0 0 48px;
      max-width: 360px;
      animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.22s both;
    }

    .auth-bullets {
      list-style: none;
      padding: 0; margin: 0;
      display: flex;
      flex-direction: column;
      gap: 16px;
      animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.34s both;
    }
    .auth-bullet {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      font-size: 13px;
      color: var(--gray-300);
      line-height: 1.4;
    }
    .auth-bullet::before {
      content: '—';
      color: var(--pink);
      font-weight: 700;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .auth-brand-footer {
      animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.46s both;
      padding-top: 48px;
      border-top: 1px solid var(--border);
    }
    .auth-footer-link {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--gray-500);
      background: none;
      border: none;
      cursor: pointer;
      font-family: var(--F);
      padding: 0;
      transition: color 0.2s;
    }
    .auth-footer-link:hover { color: var(--pink); }

    /* ── RIGHT PANEL ── */
    .auth-form-panel {
      background: var(--navy-mid);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 56px;
      position: relative;
      border-left: 1px solid var(--border);
    }

    .auth-form-panel::before {
      content: '';
      position: absolute;
      bottom: 0; right: 0;
      width: 160px; height: 160px;
      background: radial-gradient(circle at bottom right, rgba(232,24,90,0.06), transparent 70%);
      pointer-events: none;
    }

    .auth-form-wrap {
      width: 100%;
      max-width: 380px;
      animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s both;
    }

    .auth-logo-wrap {
      margin-bottom: 48px;
    }
    .auth-logo-wrap img {
      height: 42px;
      display: block;
    }

    .auth-form-title {
      font-size: 22px;
      font-weight: 900;
      color: #fff;
      letter-spacing: -0.025em;
      margin: 0 0 32px;
      text-transform: uppercase;
    }

    .auth-error {
      border-left: 3px solid var(--pink);
      background: rgba(232,24,90,0.08);
      padding: 12px 16px;
      margin-bottom: 24px;
      font-size: 13px;
      color: #F4819A;
      line-height: 1.5;
    }

    .auth-field {
      margin-bottom: 20px;
    }
    .auth-label {
      display: block;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--gray-500);
      margin-bottom: 8px;
    }
    .auth-input {
      width: 100%;
      padding: 13px 16px;
      font-size: 14px;
      font-family: var(--F);
      background: var(--navy);
      border: 1px solid var(--border);
      border-radius: 2px;
      color: #fff;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      appearance: none;
    }
    .auth-input::placeholder { color: var(--gray-500); opacity: 0.6; }
    .auth-input:focus {
      border-color: var(--pink);
      box-shadow: 0 0 0 3px rgba(232,24,90,0.12);
    }

    .auth-submit {
      width: 100%;
      background: var(--pink);
      color: #fff;
      border: none;
      border-radius: 0;
      padding: 15px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-family: var(--F);
      cursor: pointer;
      margin-top: 8px;
      transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
    }
    .auth-submit:hover:not(:disabled) {
      background: var(--pink-dim);
      transform: translateY(-1px);
      box-shadow: 0 6px 24px rgba(232,24,90,0.28);
    }
    .auth-submit:disabled {
      cursor: not-allowed;
      opacity: 0.7;
    }

    .auth-link-row {
      margin-top: 24px;
      text-align: center;
      font-size: 12px;
      color: var(--gray-500);
    }
    .auth-link-btn {
      background: none;
      border: none;
      color: var(--gray-300);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.06em;
      cursor: pointer;
      font-family: var(--F);
      padding: 0;
      margin-left: 4px;
      transition: color 0.2s;
    }
    .auth-link-btn:hover { color: var(--pink); }

    /* ── MOBILE ── */
    @media (max-width: 768px) {
      .auth-root {
        grid-template-columns: 1fr;
      }
      .auth-brand {
        display: none;
      }
      .auth-form-panel {
        border-left: none;
        min-height: 100vh;
        padding: 48px 28px;
      }
    }
  `;

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="auth-root">

        {/* ── LEFT: BRAND PANEL ── */}
        <div className="auth-brand">
          <div className="auth-brand-bar" />
          <div className="auth-brand-corner-tr" />

          <div className="auth-brand-top">
            <div className="auth-eyebrow">— Brand Intelligence</div>
            <h1 className="auth-headline">
              INTELIGÊNCIA<br />
              DE <span className="accent">MARCA</span>
            </h1>
          </div>

          <div>
            <blockquote className="auth-quote">
              "Marcas que monitoram evoluem.<br />
              Marcas que ignoram somem."
            </blockquote>

            <ul className="auth-bullets">
              <li className="auth-bullet">Diagnóstico com IA em tempo real</li>
              <li className="auth-bullet">Framework Smart Branding proprietário</li>
              <li className="auth-bullet">Monitoramento contínuo de scores</li>
            </ul>
          </div>

          <div className="auth-brand-footer">
            <button
              className="auth-footer-link"
              onClick={() => { navigate(""); }}
            >
              Área Pública →
            </button>
          </div>
        </div>

        {/* ── RIGHT: FORM PANEL ── */}
        <div className="auth-form-panel">
          <div className="auth-form-wrap">

            <div className="auth-logo-wrap">
              <img src={logoNegativa} alt="LOUDR" />
            </div>

            <div className="auth-form-title">Entrar na plataforma</div>

            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 1 }}>{error}</Alert>
            )}

            <form onSubmit={handleLogin}>
              <TextField
                label="E-mail"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                fullWidth
                size="small"
                autoComplete="email"
                sx={{ mb: 2.5 }}
              />

              <TextField
                label="Senha"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                fullWidth
                size="small"
                autoComplete="current-password"
                sx={{ mb: 1 }}
              />

              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                disabled={loading}
                sx={{ mt: 1 }}
              >
                {loading ? "..." : "Entrar →"}
              </Button>
            </form>

            <div className="auth-link-row">
              Não tem conta?
              <button
                className="auth-link-btn"
                onClick={() => { navigate("#/register"); }}
              >
                Criar conta →
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
