# Prompt — Agente Autônomo LOUDR Brand Intelligence

Cole este prompt no início de cada sessão do Claude Code.

---

## PROMPT

Você é o agente de desenvolvimento do **LOUDR Brand Intelligence** — uma plataforma SaaS B2B de inteligência de marca construída com Vite + React, Netlify Functions, Supabase e Anthropic API.

Você tem acesso completo ao repositório e deve trabalhar de forma autônoma até completar a tarefa solicitada.

---

### Contexto do produto

O LOUDR Brand Intelligence tem dois momentos de uso:

**MVP atual (concluído):**
- Página pública de captura de leads
- Área interna com fila de aprovação manual (LOUDR)
- Geração de diagnóstico via Anthropic API com streaming SSE em tempo real
- Relatório completo com 4 práticas Smart Branding, scores, gaps e oportunidades
- Link público compartilhável por diagnóstico
- Histórico de diagnósticos
- Retry automático de rate limit com countdown visual

**Próximo estágio (SaaS):**
- Workspace por empresa com autenticação e isolamento por RLS
- Self-service: cliente cria conta, assina plano, opera sozinho
- Monitor automático de scores ao longo do tempo
- Social listening com feed de menções e sentiment
- Inteligência competitiva com monitoramento de concorrentes
- Billing via Stripe com 3 planos: Starter R$490, Pro R$1.490, Enterprise R$3.990

---

### Stack técnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Vite + React |
| Servidor | Netlify Functions |
| Banco | Supabase (PostgreSQL + Auth + RLS + Edge Functions) |
| AI | Anthropic claude-sonnet-4-5 com web_search_20250305 |
| E-mail | Resend |
| Pagamento | Stripe |
| UI | Material UI (MUI) — `@mui/material` + `@mui/icons-material` |
| Estilo | MUI sx prop + styled() + ThemeProvider — nunca inline style |
| Font | Cairo via Google Fonts |

**Variáveis de ambiente:**
```
# Client-side (.env)
VITE_SUPABASE_URL=
VITE_SUPABASE_KEY=
VITE_STRIPE_PUBLIC_KEY=
VITE_CALENDLY_URL=

# Server-side (Netlify — nunca no frontend)
ANTHROPIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
SUPABASE_SERVICE_KEY=
```

---

### Design System — nunca usar valores hardcoded de cor

```js
const DS = {
  navy:"#0D1B2A", navyMid:"#162840", navyLight:"#1E3550",
  green:"#0D9E7A", greenDim:"#0B8567", greenPale:"#E1F5EE",
  pink:"#E8185A", pinkPale:"#FBEAF0",
  white:"#FFFFFF", offwhite:"#F7F9F8",
  border:"#E2EBE8", gray:"#8A9AB0", grayLight:"#F0F4F3",
  text:"#0D1B2A", textMid:"#4A5A6A", textLight:"#8A9AB0",
  amber:"#EF9F27", amberPale:"#FEF3C7",
  purple:"#7F77DD", purplePale:"#EEEDFE",
};
const F = "'Cairo', sans-serif";
```

---

### Tema MUI — mapeamento dos tokens DS

```js
// src/lib/theme.js
import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary:   { main: '#0D9E7A', dark: '#0B8567', light: '#E1F5EE' },
    secondary: { main: '#E8185A', light: '#FBEAF0' },
    warning:   { main: '#EF9F27', light: '#FEF3C7' },
    info:      { main: '#7F77DD', light: '#EEEDFE' },
    background:{ default: '#0D1B2A', paper: '#162840' },
    text:      { primary: '#FFFFFF', secondary: '#8A9AB0', disabled: '#4A5A6A' },
    divider:   '#1E3550',
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
        root: { fontFamily: "'Cairo', sans-serif", fontWeight: 700, textTransform: 'none', borderRadius: 8 },
        containedPrimary: { background: '#0D9E7A', '&:hover': { background: '#0B8567' } },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { background: '#162840', border: '1px solid #1E3550', borderRadius: 12 },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: { '& .MuiOutlinedInput-root': { borderRadius: 8, fontFamily: "'Cairo', sans-serif" } },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontFamily: "'Cairo', sans-serif", fontWeight: 600 },
      },
    },
  },
})
```

**Uso no main.jsx:**
```jsx
import { ThemeProvider, CssBaseline } from '@mui/material'
import { theme } from './lib/theme'

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <App />
  </ThemeProvider>
)
```

**Instalação:**
```bash
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
```

---

### Regras de desenvolvimento — seguir sempre

1. **Usar Material UI (MUI) como biblioteca de componentes** — `@mui/material` + `@mui/icons-material`. Nunca usar inline style. Todo estilo via `sx prop`, `styled()` ou `theme`. Os tokens DS são mapeados no tema MUI (palette, typography, spacing)
2. **Nunca usar react-router** — roteamento é hash-based via `window.location.hash`
3. **Nunca usar localStorage para dados críticos** — tudo persiste no Supabase
4. **Nunca expor ANTHROPIC_KEY no frontend** — sempre via Netlify Function
5. **Sempre usar `import.meta.env.VITE_*`** — nunca `process.env.REACT_APP_*`
6. **Sempre aplicar RLS** — toda tabela nova precisa de política de isolamento por workspace
7. **Sempre tratar rate limit 429** — retry automático com countdown visual
8. **Theme MUI** — criar `src/lib/theme.js` com os tokens DS mapeados. Usar `ThemeProvider` no `main.jsx`. Nunca sobrescrever com inline style
9. **Componentes pequenos** — cada página em arquivo próprio em `src/pages/`, componentes reutilizáveis em `src/components/`
10. **Documento vivo** — atualizar SPECS.md após cada entrega
11. **Git discipline** — commitar na branch `dev` após cada tarefa concluída. A cada 3 tarefas entregues, fazer push para `origin dev`. Nunca commitar direto na `main`. Mensagem de commit no padrão: `feat: [nome da tarefa]`, `fix: [descrição]`, `chore: [manutenção]`

---

### Estrutura de pastas esperada

```
/
├── netlify/functions/
│   ├── anthropic.js
│   ├── stripe-webhook.js
│   └── cron-monitor.js
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── lib/
│   │   ├── constants.js    (DS, F, PRATICAS, PLANOS, SYSTEM_PROMPT)
│   │   ├── theme.js        (MUI ThemeProvider com tokens DS mapeados)
│   │   ├── helpers.js      (getRoute, tryParseJSON, sc, fmtDate, calcularScoreLead, checkPlano)
│   │   ├── api.js          (runStream com retry)
│   │   ├── supabase.js     (cliente inicializado)
│   │   └── stripe.js       (loadStripe, getCheckoutUrl)
│   ├── components/
│   │   ├── GlobalStyle.jsx
│   │   ├── Bar.jsx
│   │   ├── Card.jsx
│   │   ├── Lbl.jsx
│   │   ├── Pill.jsx
│   │   ├── Spinner.jsx
│   │   ├── ScoreCard.jsx
│   │   ├── EmptyState.jsx
│   │   └── UpgradeGate.jsx
│   └── pages/
│       ├── public/         (PaginaPublica, RelatorioPublico, PaginaMetodologia)
│       ├── auth/           (LoginPage, RegisterPage, OnboardingPage)
│       ├── app/            (AppShell, Home, Diagnostico, NovoManual, Evolucao, SocialListening, Concorrentes, Workspace)
│       └── admin/          (AdminShell, Solicitacoes, AdminHistorico)
├── supabase/functions/
├── .env
├── netlify.toml
├── vite.config.js
└── SPECS.md
```

---

### Roteamento (hash-based)

```js
// src/lib/helpers.js
export function getRoute() {
  const h = window.location.hash;
  if (!h || h === '#/')             return 'public';
  if (h === '#/metodologia')        return 'metodologia';
  if (h.startsWith('#/relatorio/')) return 'relatorio-publico';
  if (h === '#/login')              return 'login';
  if (h === '#/register')           return 'register';
  if (h === '#/onboarding')         return 'onboarding';
  if (h === '#/app')                return 'app-home';
  if (h === '#/app/diagnostico')    return 'diagnostico';
  if (h === '#/app/evolucao')       return 'evolucao';
  if (h === '#/app/listening')      return 'listening';
  if (h === '#/app/concorrentes')   return 'concorrentes';
  if (h === '#/app/workspace')      return 'workspace';
  if (h === '#/admin')              return 'admin';
  if (h === '#/admin/historico')    return 'admin-historico';
  return 'public';
}
```

---

### Planos e limites

```js
export const PLANOS = {
  trial:      { nome:"Trial",      preco:0,    diagnosticos_mes:1, monitor:null,      concorrentes:0, membros:1,         social_listening:false },
  starter:    { nome:"Starter",    preco:490,  diagnosticos_mes:1, monitor:"mensal",  concorrentes:0, membros:1,         social_listening:false },
  pro:        { nome:"Pro",        preco:1490, diagnosticos_mes:3, monitor:"semanal", concorrentes:2, membros:3,         social_listening:true  },
  enterprise: { nome:"Enterprise", preco:3990, diagnosticos_mes:Infinity, monitor:"diario", concorrentes:5, membros:Infinity, social_listening:true },
};
```

---

### Netlify Function de proxy (anthropic.js)

```js
export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    }
  }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: event.body,
  })

  const data = await response.text()
  return {
    statusCode: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: data,
  }
}
```

---

### URL da API

```js
// src/lib/api.js
const API_URL = import.meta.env.DEV
  ? '/api/v1/messages'               // Vite proxy em dev
  : '/.netlify/functions/anthropic'  // Netlify Function em produção
```

---

### netlify.toml

```toml
[build]
  command   = "npm run build"
  publish   = "dist"
  functions = "netlify/functions"

[[redirects]]
  from   = "/*"
  to     = "/index.html"
  status = 200

[functions."cron-monitor"]
  schedule = "0 8 * * 1"
```

---

### vite.config.js

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
      }
    }
  }
})
```

---

### Git Workflow

**Branch principal de desenvolvimento:** `dev`  
**Branch de produção:** `main`  
**Nunca commitar direto na main.**

```bash
# Padrão de commit após cada tarefa
git add .
git commit -m "feat: RegisterPage e OnboardingPage com MUI"

# Push a cada 3 tarefas concluídas
git push origin dev

# Merge para main só após validação completa da fase
git checkout main
git merge dev
git push origin main
```

**Convenção de mensagens:**
- `feat:` nova funcionalidade
- `fix:` correção de bug
- `chore:` manutenção, dependências, config
- `refactor:` refatoração sem mudança de comportamento
- `style:` ajustes visuais sem lógica

---

### Checklist antes de cada commit

- [ ] Gerar diagnóstico do início ao fim
- [ ] Verificar salvamento no Supabase
- [ ] Verificar envio de e-mail (Resend)
- [ ] Testar link público do relatório sem auth
- [ ] Testar login, register e onboarding
- [ ] Verificar UpgradeGate em feature Pro
- [ ] Testar countdown de rate limit
- [ ] Verificar cooldown entre aprovações no admin
- [ ] Atualizar SPECS.md com o que foi entregue

---

## TAREFAS POR FASE

### Para executar a Fase 2 completa, diga:
> "Execute a Fase 2 do SPECS.md seguindo as regras acima. Comece pela migração para Vite, depois a Netlify Function de proxy, depois o deploy. A cada entrega, atualize o SPECS.md."

### Para executar uma tarefa específica, diga:
> "Construa o [nome da tarefa] seguindo as regras e design system acima."

### Para continuar de onde parou, diga:
> "Verifique o SPECS.md, identifique o que está pendente na Fase [X] e continue de onde parou."

---

*LOUDR Brand Intelligence · Prompt do Agente Autônomo · Maio 2026*