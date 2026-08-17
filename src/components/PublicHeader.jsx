import { useState, useEffect } from 'react'
import logoBranco from "../assets/logo branco.svg"
import { PALETTE } from '../lib/theme'
import { Box, Typography } from "@mui/material";

const DIV = PALETTE.neutral[100]

export function PublicHeader({ children, sticky = false }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (sticky) return
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [sticky])

  return (
    <Box component="header" sx={{
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
      transition: 'height 0.3s ease, background 0.3s ease',
      boxSizing: 'border-box',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <Box component="img" src={logoBranco} alt="BR4NDCODE" sx={{ height: 48, width: "auto", display: "block" }} />
        <Box sx={{ width: '1px', height: 32, background: DIV, flexShrink: 0 }} />
        <Typography component="span" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: PALETTE.neutral[400] }}>
          Brand Intelligence
        </Typography>
      </Box>
      {children && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {children}
        </Box>
      )}
    </Box>
  )
}
