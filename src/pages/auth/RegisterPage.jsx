import { useState } from "react";
import { navigate } from '../../lib/helpers';
import { supabase } from "../../lib/supabase";
import logoNegativa from "../../assets/negativa.svg";
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'

export function RegisterPage() {
  const [nome, setNome]       = useState("");
  const [email, setEmail]     = useState("");
  const [senha, setSenha]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nome || !email || !senha) { setError("Preencha todos os campos."); return; }
    if (senha.length < 6) { setError("A senha deve ter pelo menos 6 caracteres."); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { full_name: nome } },
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    navigate("#/onboarding");
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

    .auth-brand-corner-tr {
      position: absolute;
      top: 0; right: 0;
      width: 60px; height: 60px;
      border-left: 1px solid rgba(232,24,90,0.12);
      border-bottom: 1px solid rgba(232,24,90,0.12);
      pointer-events: none;
    }

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
      margin: 0 0 28px;
    }
    .auth-headline .accent { color: var(--pink); }

    .auth-subline {
      font-size: 14px;
      color: var(--gray-300);
      line-height: 1.65;
      max-width: 360px;
      margin: 0 0 40px;
      animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s both;
    }

    .auth-bullets {
      list-style: none;
      padding: 0; margin: 0;
      display: flex;
      flex-direction: column;
      gap: 16px;
      animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.32s both;
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

    /* Trial badge */
    .auth-trial-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 36px;
      padding: 10px 16px;
      border: 1px solid rgba(13,158,122,0.25);
      background: rgba(13,158,122,0.06);
      animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.44s both;
    }
    .auth-trial-dot {
      width: 6px;
      height: 6px;
      background: var(--teal);
      flex-shrink: 0;
    }
    .auth-trial-text {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--teal);
    }

    .auth-brand-footer {
      animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.52s both;
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

    .auth-terms {
      margin-top: 14px;
      font-size: 11px;
      color: var(--gray-500);
      text-align: center;
      line-height: 1.55;
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
            <div className="auth-eyebrow">— Plataforma SaaS</div>
            <h1 className="auth-headline">
              WORKSPACE<br />
              DE <span className="accent">MARCA</span>
            </h1>
          </div>

          <div>
            <p className="auth-subline">
              Crie sua conta e tenha acesso ao diagnóstico de marca
              mais completo do Brasil.
            </p>

            <ul className="auth-bullets">
              <li className="auth-bullet">14 dias de trial gratuito</li>
              <li className="auth-bullet">Setup em menos de 2 minutos</li>
              <li className="auth-bullet">Sem cartão de crédito para começar</li>
            </ul>

            <div className="auth-trial-badge">
              <div className="auth-trial-dot" />
              <span className="auth-trial-text">Trial de 14 dias — sem cartão</span>
            </div>
          </div>

          <div className="auth-brand-footer">
            <button
              className="auth-footer-link"
              onClick={() => { navigate("#/login"); }}
            >
              Já tem conta? Entrar →
            </button>
          </div>
        </div>

        {/* ── RIGHT: FORM PANEL ── */}
        <div className="auth-form-panel">
          <div className="auth-form-wrap">

            <div className="auth-logo-wrap">
              <img src={logoNegativa} alt="LOUDR" />
            </div>

            <div className="auth-form-title">Criar sua conta</div>

            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 1 }}>{error}</Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                label="Nome completo"
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                required
                fullWidth
                size="small"
                autoComplete="name"
                autoFocus
                sx={{ mb: 2.5 }}
              />

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
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
                fullWidth
                size="small"
                autoComplete="new-password"
                sx={{ mb: 1 }}
              />

              <Button
                type="submit"
                variant="contained"
                color="secondary"
                fullWidth
                size="large"
                disabled={loading}
                sx={{ mt: 1 }}
              >
                {loading ? "..." : "Criar conta →"}
              </Button>

              <p className="auth-terms">
                Ao criar sua conta você concorda com os Termos de Uso
                e a Política de Privacidade da LOUDR.
              </p>
            </form>

            <div className="auth-link-row">
              Já tem conta?
              <button
                className="auth-link-btn"
                onClick={() => { navigate("#/login"); }}
              >
                Entrar →
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
