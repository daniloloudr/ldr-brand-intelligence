import { createTheme } from '@mui/material/styles'
import { green, amber, red, purple, lightBlue, grey } from '@mui/material/colors'

/* ═══════════════════════════════════════════════════════════════════
   TEMA — BR4NDCODE
   ═══════════════════════════════════════════════════════════════════
   Arquivo ÚNICO de cor e forma. Traduz `.spec/brand.md` (v1.0) para MUI.
   Nenhum hex de marca existe fora daqui.

   As regras da marca que mais pesam nesta tradução:
   • Preto e branco são as PRIMÁRIAS. O verde é apoio.
   • "Cheiro verde": o verde não passa de ~10% da área de uma peça. Por isso
     ele é `secondary` (uso deliberado), NUNCA `primary` — se fosse primary,
     todo botão do MUI nasceria verde e a regra morreria na primeira tela.
   • Verde não vai em texto corrido nem em background regular.
   • Cada verde tem seu par: Verde 1 (#00FF55) com PRETO, Verde 2 (#00DD55)
     com BRANCO. Por isso o modo claro usa o Verde 2 e o escuro o Verde 1.
   • Linhas de 1px e cantos arredondados com progressão lógica.
═══════════════════════════════════════════════════════════════════ */

/* ─── Marca (brand.md §02) ─── */
const MARCA = {
  branco: '#FFFFFF',
  preto:  '#000000',
  verde1: '#00FF55',   // par: preto
  verde2: '#00DD55',   // par: branco
}

const FONTE = "'Saira', system-ui, sans-serif"

/* Eixo de largura da Saira (brand.md §05): títulos usam Condensed/Expanded.
   Como a fonte é variável, isso é o eixo `wdth` — não outra família. */
const CONDENSED = { fontVariationSettings: '"wdth" 85' }
const EXPANDED  = { fontVariationSettings: '"wdth" 115' }

/* ─── Cores de DADO ──────────────────────────────────────────────────
   NÃO são marca: score, sentimento, série de gráfico e status precisam de
   leitura funcional, e o brand.md não define paleta de dados. Ficam nas
   paletas semânticas do MUI até o time de criação dizer o contrário. */
export const PALETTE = {
  marca: MARCA,
  data: {
    positivo: green[600],     positivoDim: green[800],     positivoFraco: green[50],
    atencao:  amber[700],     atencaoDim:  amber[900],     atencaoFraco:  amber[50],
    critico:  red[600],       criticoDim:  red[800],       criticoFraco:  red[50],
    neutro:   purple[400],    neutroDim:   purple[700],    neutroFraco:   purple[50],
    info:     lightBlue[600], infoDim:     lightBlue[800], infoFraco:     lightBlue[50],
  },
  neutral: {
    0: MARCA.branco, 25: grey[50], 50: grey[100], 100: grey[200], 200: grey[300],
    300: grey[400], 400: grey[500], 500: grey[600], 600: grey[700],
    700: grey[800], 800: grey[900], 900: '#111111', 950: MARCA.preto,
  },
}

const keyframes = {
  '@keyframes spin':     { to: { transform: 'rotate(360deg)' } },
  '@keyframes fu':       { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'none' } },
  '@keyframes fadeUp':   { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'none' } },
  '@keyframes pulse':    { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } },
  '@keyframes blink':    { '0%,100%': { opacity: 1 }, '50%': { opacity: 0 } },
  '@keyframes checkPop': { '0%': { transform: 'scale(0)', opacity: 0 }, '65%': { transform: 'scale(1.25)' }, '100%': { transform: 'scale(1)', opacity: 1 } },
  '.a0': { animation: 'fu .38s ease both' },
  '.a1': { animation: 'fu .38s .06s ease both' },
  '.a2': { animation: 'fu .38s .12s ease both' },
  '.a3': { animation: 'fu .38s .18s ease both' },
  '.a4': { animation: 'fu .38s .24s ease both' },
  '.a5': { animation: 'fu .38s .30s ease both' },
  '.a6': { animation: 'fu .38s .36s ease both' },
  '.a7': { animation: 'fu .38s .42s ease both' },
  '.a8': { animation: 'fu .38s .48s ease both' },
}

function makeTheme(mode) {
  const claro = mode === 'light'
  // Primária = preto no claro, branco no escuro (as duas primárias da marca)
  const primaria = claro ? MARCA.preto : MARCA.branco
  // Accent = o verde cujo PAR é o fundo daquele modo (brand.md §02)
  const accent   = claro ? MARCA.verde2 : MARCA.verde1

  return createTheme({
    palette: {
      mode,
      primary: {
        main: primaria,
        dark: claro ? '#222222' : grey[200],
        light: claro ? grey[800] : MARCA.branco,
        contrastText: claro ? MARCA.branco : MARCA.preto,
      },
      secondary: {
        main: accent,
        dark: claro ? '#00B446' : MARCA.verde2,
        light: claro ? '#B8FFD4' : '#7CFFAE',
        // Sobre verde, o que vai por cima é sempre PRETO (brand.md §03)
        contrastText: MARCA.preto,
      },
      success: { main: PALETTE.data.positivo, light: PALETTE.data.positivoFraco },
      warning: { main: PALETTE.data.atencao,  light: PALETTE.data.atencaoFraco },
      error:   { main: PALETTE.data.critico,  light: PALETTE.data.criticoFraco },
      info:    { main: PALETTE.data.info,     light: PALETTE.data.infoFraco },
      background: {
        default: claro ? MARCA.branco : MARCA.preto,
        paper:   claro ? MARCA.branco : '#0D0D0D',
      },
      text: {
        primary:   claro ? PALETTE.neutral[900] : PALETTE.neutral[25],
        secondary: claro ? PALETTE.neutral[500] : PALETTE.neutral[300],
        disabled:  claro ? PALETTE.neutral[400] : PALETTE.neutral[500],
      },
      divider: claro ? PALETTE.neutral[100] : '#262626',
      data: PALETTE.data,
    },

    typography: {
      fontFamily: FONTE,
      // Títulos em Condensed; o corpo fica na largura normal (brand.md §05)
      h1: { ...CONDENSED, fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { ...CONDENSED, fontWeight: 700, letterSpacing: '-0.015em' },
      h3: { ...CONDENSED, fontWeight: 600, letterSpacing: '-0.01em' },
      h4: { ...CONDENSED, fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      overline: { ...EXPANDED, fontWeight: 600, letterSpacing: '0.14em' },
      button: { fontWeight: 600 },
    },

    // Cantos com progressão lógica (brand.md §04): base 8 → a escala do sx
    // (borderRadius: 1/2/3) devolve 8/16/24.
    shape: { borderRadius: 8 },

    components: {
      MuiCssBaseline: { styleOverrides: { body: { backgroundColor: claro ? MARCA.branco : MARCA.preto }, ...keyframes } },
      MuiButton:    { defaultProps: { disableElevation: true } },
      // Linha de 1px como elemento de interface (brand.md §04)
      MuiCard:      { defaultProps: { variant: 'outlined' }, styleOverrides: { root: { backgroundImage: 'none', borderWidth: 1 } } },
      MuiPaper:     { styleOverrides: { root: { backgroundImage: 'none' }, outlined: { borderWidth: 1 } } },
      MuiDivider:   { styleOverrides: { root: { borderBottomWidth: 1 } } },
      MuiTextField: { defaultProps: { variant: 'outlined', size: 'small' } },
      MuiTypography:{ defaultProps: { variantMapping: { overline: 'div' } } },
    },
  })
}

export const themeLight = makeTheme('light')
export const theme      = makeTheme('dark')

export default themeLight
