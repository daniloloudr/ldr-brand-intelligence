import logoBranco from "../assets/logo branco.svg"
import { navigate } from '../lib/helpers';
import { PALETTE } from '../lib/theme'
import { Box, Typography } from "@mui/material";
import Button from "@mui/material/Button";


export function PublicFooter() {
  return (
    <Box component="footer" sx={{
      background: PALETTE.neutral[950],
      borderTop: `1px solid ${PALETTE.neutral[100]}`,
      padding: 'clamp(28px, 4vw, 40px) clamp(24px, 5vw, 64px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '20px',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Box component="img" src={logoBranco} alt="BR4NDCODE" sx={{ height: 32, width: "auto", display: "block" }} />
        <Box sx={{ width: '1px', height: 18, background: PALETTE.neutral[100], flexShrink: 0 }} />
        <Typography component="span" sx={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: PALETTE.neutral[400] }}>
          Smart Branding
        </Typography>
      </Box>
      <Typography component="span" sx={{ fontSize: 11, color: PALETTE.neutral[600], letterSpacing: '0.04em' }}>
        © 2026 BR4NDCODE — Todos os direitos reservados
      </Typography>
      <Button variant="text" size="small" color="inherit"
        onClick={() => { navigate('#/login') }}
        sx={{ "&:hover": { color: "secondary.main" } }}
      >
        Área interna →
      </Button>
    </Box>
  )
}
