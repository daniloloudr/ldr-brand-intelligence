import { createTheme, alpha } from '@mui/material/styles'

const C = {
  navy:       '#08111F',
  navyMid:    '#0E1E30',
  navySurf:   '#122033',
  navyElev:   '#1B2F45',
  border:     '#1E3348',
  teal:       '#0D9E7A',
  tealDim:    '#0B8567',
  tealPale:   '#E1F5EE',
  pink:       '#E8185A',
  pinkDim:    '#C01048',
  pinkPale:   '#FBEAF0',
  amber:      '#EF9F27',
  amberPale:  '#FEF3C7',
  purple:     '#7F77DD',
  textPri:    '#B0BACB',
  textSec:    '#7A8899',
  textDis:    '#3D4E60',
}

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary:    { main: C.teal,   dark: C.tealDim,  light: C.tealPale,  contrastText: '#fff' },
    secondary:  { main: C.pink,   dark: C.pinkDim,  light: C.pinkPale,  contrastText: '#fff' },
    warning:    { main: C.amber,  light: C.amberPale },
    info:       { main: C.purple },
    success:    { main: C.teal },
    error:      { main: C.pink },
    background: { default: C.navy, paper: C.navyMid },
    text:       { primary: C.textPri, secondary: C.textSec, disabled: C.textDis },
    divider:    C.border,
    /* custom tokens acessíveis via theme.palette.loudr.* */
    loudr: C,
  },
  typography: {
    fontFamily: "'Cairo', sans-serif",
    fontWeightLight:   400,
    fontWeightRegular: 500,
    fontWeightMedium:  700,
    fontWeightBold:    900,
    h1: { fontWeight: 900, letterSpacing: '-0.03em' },
    h2: { fontWeight: 900, letterSpacing: '-0.025em' },
    h3: { fontWeight: 800, letterSpacing: '-0.02em' },
    h4: { fontWeight: 800, letterSpacing: '-0.015em' },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 700 },
    subtitle2: { fontWeight: 700, color: C.textSec },
    overline: { fontWeight: 800, letterSpacing: '0.2em', fontSize: '0.625rem' },
    caption:  { color: C.textSec },
    button:   { fontWeight: 800, letterSpacing: '0.1em' },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { fontFamily: "'Cairo', sans-serif", background: C.navy },
        '::selection': { background: C.pink, color: '#fff' },
        '@keyframes spin': { to: { transform: 'rotate(360deg)' } },
        '@keyframes fadeUp': {
          from: { opacity: 0, transform: 'translateY(12px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          fontFamily: "'Cairo', sans-serif",
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          borderRadius: 4,
          fontSize: '0.6875rem',
        },
        sizeLarge:  { padding: '12px 28px', fontSize: '0.75rem' },
        sizeMedium: { padding: '9px 20px' },
        sizeSmall:  { padding: '6px 14px', fontSize: '0.625rem' },
        containedPrimary: {
          '&:hover': { background: C.tealDim },
        },
        containedSecondary: {
          '&:hover': { background: C.pinkDim },
        },
        outlinedPrimary: {
          borderColor: C.teal,
          '&:hover': { background: alpha(C.teal, 0.08) },
        },
        outlinedSecondary: {
          borderColor: C.pink,
          '&:hover': { background: alpha(C.pink, 0.08) },
        },
        text: { '&:hover': { background: alpha(C.textPri, 0.06) } },
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          background: C.navyMid,
          backgroundImage: 'none',
          border: `1px solid ${C.border}`,
          borderRadius: 8,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: { padding: '20px 24px', '&:last-child': { paddingBottom: 20 } },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { border: `1px solid ${C.border}` },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            fontFamily: "'Cairo', sans-serif",
            borderRadius: 4,
            background: C.navy,
            '& fieldset': { borderColor: C.border },
            '&:hover fieldset': { borderColor: C.textSec },
            '&.Mui-focused fieldset': { borderColor: C.teal },
          },
          '& .MuiInputLabel-root': {
            fontFamily: "'Cairo', sans-serif",
            color: C.textSec,
            '&.Mui-focused': { color: C.teal },
          },
          '& .MuiInputBase-input': { color: C.textPri },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 4, fontFamily: "'Cairo', sans-serif" },
        input: { fontFamily: "'Cairo', sans-serif" },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { fontFamily: "'Cairo', sans-serif" },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: { fontFamily: "'Cairo', sans-serif" },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: { fontFamily: "'Cairo', sans-serif", fontSize: '0.875rem' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: "'Cairo', sans-serif",
          fontWeight: 700,
          fontSize: '0.6875rem',
          letterSpacing: '0.06em',
          borderRadius: 4,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 2, backgroundColor: C.border },
        bar:  { borderRadius: 2 },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: C.border },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { fontFamily: "'Cairo', sans-serif", borderRadius: 4 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontFamily: "'Cairo', sans-serif",
          fontSize: '0.75rem',
          background: C.navyElev,
          border: `1px solid ${C.border}`,
        },
      },
    },
    MuiCircularProgress: {
      defaultProps: { color: 'primary' },
    },
    MuiStepper: {
      styleOverrides: {
        root: { background: 'transparent' },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: { fontFamily: "'Cairo', sans-serif", fontWeight: 700 },
      },
    },
    MuiTypography: {
      defaultProps: { variantMapping: { overline: 'div' } },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 4 },
      },
    },
  },
})

/* ── Light theme (RelatorioPublico) ─────────────────────────── */
const L = {
  bg:      '#F5F7F6',
  paper:   '#FFFFFF',
  border:  '#E2EBE8',
  hover:   '#F0F4F3',
  textPri: '#0D1B2A',
  textSec: '#4A5A6A',
  textDis: '#8A9AB0',
}
export const themeLight = createTheme({
  palette: {
    mode: 'light',
    primary:    { main: C.teal,  dark: C.tealDim,  light: C.tealPale,  contrastText: '#fff' },
    secondary:  { main: C.pink,  dark: C.pinkDim,  light: C.pinkPale,  contrastText: '#fff' },
    warning:    { main: C.amber, light: C.amberPale },
    background: { default: L.bg, paper: L.paper },
    text:       { primary: L.textPri, secondary: L.textSec, disabled: L.textDis },
    divider:    L.border,
    action:     { hover: L.hover },
    loudr:      C,
  },
  typography: {
    fontFamily: "'Cairo', sans-serif",
    fontWeightLight:   400,
    fontWeightRegular: 500,
    fontWeightMedium:  700,
    fontWeightBold:    900,
    h1: { fontWeight: 900, letterSpacing: '-0.03em' },
    h2: { fontWeight: 900, letterSpacing: '-0.025em' },
    h3: { fontWeight: 800, letterSpacing: '-0.02em' },
    h4: { fontWeight: 800, letterSpacing: '-0.015em' },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    overline: { fontWeight: 800, letterSpacing: '0.2em', fontSize: '0.625rem' },
    button:   { fontWeight: 800, letterSpacing: '0.1em' },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { fontFamily: "'Cairo', sans-serif", fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: 4, fontSize: '0.6875rem' },
        sizeLarge:  { padding: '12px 28px', fontSize: '0.75rem' },
        sizeMedium: { padding: '9px 20px' },
        sizeSmall:  { padding: '6px 14px', fontSize: '0.625rem' },
        containedPrimary: { '&:hover': { background: C.tealDim } },
        containedSecondary: { '&:hover': { background: C.pinkDim } },
        outlinedPrimary:   { borderColor: C.teal, '&:hover': { background: alpha(C.teal, 0.06) } },
        outlinedSecondary: { borderColor: C.pink, '&:hover': { background: alpha(C.pink, 0.06) } },
        text: { '&:hover': { background: alpha(L.textPri, 0.04) } },
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: { background: L.paper, backgroundImage: 'none', border: `1px solid ${L.border}`, borderRadius: 8 },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: { padding: '20px 24px', '&:last-child': { paddingBottom: 20 } },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { border: `1px solid ${L.border}` },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            fontFamily: "'Cairo', sans-serif",
            borderRadius: 4,
            background: L.bg,
            '& fieldset': { borderColor: L.border },
            '&:hover fieldset': { borderColor: L.textDis },
            '&.Mui-focused fieldset': { borderColor: C.teal },
          },
          '& .MuiInputLabel-root': { fontFamily: "'Cairo', sans-serif", color: L.textSec, '&.Mui-focused': { color: C.teal } },
          '& .MuiInputBase-input': { color: L.textPri },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontFamily: "'Cairo', sans-serif", fontWeight: 700, fontSize: '0.6875rem', letterSpacing: '0.06em', borderRadius: 4 },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 2, backgroundColor: L.border },
        bar:  { borderRadius: 2 },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: L.border } },
    },
    MuiTypography: {
      defaultProps: { variantMapping: { overline: 'div' } },
    },
  },
})
