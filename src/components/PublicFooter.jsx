import logoNegativa from '../assets/negativa.svg'
import { navigate } from '../lib/helpers';

const F = "'Cairo', sans-serif"

export function PublicFooter() {
  return (
    <footer style={{
      background: '#060D17',
      borderTop: '1px solid #1E3348',
      padding: 'clamp(28px, 4vw, 40px) clamp(24px, 5vw, 64px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 20,
      fontFamily: F,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src={logoNegativa} alt="LOUDR" style={{ height: 32, display: 'block' }} />
        <div style={{ width: 1, height: 18, background: '#1E3348', flexShrink: 0 }} />
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7A8899' }}>
          Smart Branding
        </span>
      </div>
      <span style={{ fontSize: 11, color: '#3D4E60', letterSpacing: '0.04em' }}>
        © 2026 LOUDR — Todos os direitos reservados
      </span>
      <button
        onClick={() => { navigate('#/login') }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7A8899', fontFamily: F }}
        onMouseEnter={e => { e.currentTarget.style.color = '#E8185A' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#7A8899' }}
      >
        Área interna →
      </button>
    </footer>
  )
}
