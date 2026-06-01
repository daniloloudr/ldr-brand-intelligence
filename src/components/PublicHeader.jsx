import { useState, useEffect } from 'react'
import logoNegativa from '../assets/negativa.svg'

const F   = "'Cairo', sans-serif"
const DIV = '#1E3348'

export function PublicHeader({ children, sticky = false }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (sticky) return
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [sticky])

  return (
    <header style={{
      position: sticky ? 'sticky' : 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 100,
      height: scrolled ? 56 : 72,
      padding: '0 clamp(24px, 5vw, 64px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: scrolled ? 'rgba(8,17,31,1)' : 'rgba(8,17,31,1)',
      backdropFilter: 'blur(14px)',
      borderBottom: `1px solid ${DIV}`,
      fontFamily: F,
      transition: 'height 0.3s ease, background 0.3s ease',
      boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <img src={logoNegativa} alt="LOUDR" style={{ height: 48, display: 'block' }} />
        <div style={{ width: 1, height: 32, background: DIV, flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7A8899', fontFamily: F }}>
          Brand Intelligence
        </span>
      </div>
      {children && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {children}
        </div>
      )}
    </header>
  )
}
