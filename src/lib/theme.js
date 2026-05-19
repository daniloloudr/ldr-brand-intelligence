import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary:    { main: '#0D9E7A', dark: '#0B8567', light: '#E1F5EE' },
    secondary:  { main: '#E8185A', light: '#FBEAF0' },
    warning:    { main: '#EF9F27', light: '#FEF3C7' },
    info:       { main: '#7F77DD', light: '#EEEDFE' },
    background: { default: '#0D1B2A', paper: '#162840' },
    text:       { primary: '#FFFFFF', secondary: '#8A9AB0', disabled: '#4A5A6A' },
    divider:    '#1E3550',
  },
  typography: {
    fontFamily: "'Cairo', sans-serif",
    fontWeightLight:   400,
    fontWeightRegular: 500,
    fontWeightMedium:  700,
    fontWeightBold:    900,
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: "'Cairo', sans-serif",
          fontWeight: 700,
          textTransform: 'none',
          borderRadius: 8,
        },
        containedPrimary: {
          background: '#0D9E7A',
          '&:hover': { background: '#0B8567' },
        },
        containedSecondary: {
          background: '#E8185A',
          '&:hover': { background: '#C01048' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: '#162840',
          border: '1px solid #1E3550',
          borderRadius: 12,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            fontFamily: "'Cairo', sans-serif",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontFamily: "'Cairo', sans-serif", fontWeight: 600 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
  },
})
