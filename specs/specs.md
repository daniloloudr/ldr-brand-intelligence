# LOUDR OS — Especificação Completa do Produto
**Versão:** 4.3  
**Data:** Maio 2026  
**Status:** Documento vivo — atualizar a cada entrega  
**Owner:** Danilo Silva · LOUDR  
**Changelog v4.3:** Arquitetura de informação adicionada — pergunta principal por módulo, hierarquia de leitura, estrutura de informação por tela, Identity Gap como componente transversal.

---

## Visão do Produto

**LOUDR OS** é o sistema operacional de marca para empresas que levam identidade a sério.

Combina diagnóstico externo com dados públicos, governança interna do brand book, inteligência competitiva em tempo real e um assistente estratégico que conhece cada detalhe da marca — tudo em uma plataforma, uma conta, um workspace.

**O diferencial único:** cruzamento automático entre identidade declarada (Brand OS) e identidade percebida (Intelligence) = Identity Gap Score. Nenhum produto no mundo faz isso de forma contínua e automatizada.

---

## Os Dois Módulos

```
┌─────────────────────────────────────────────────────────┐
│                      LOUDR OS                           │
│                                                         │
│  ┌─────────────────────┐   ┌─────────────────────────┐  │
│  │  LOUDR INTELLIGENCE │   │      LOUDR BRAND OS     │  │
│  │  O que o mercado    │◄──►  O que a marca declara  │  │
│  │  percebe sobre você │   │  ser e as ferramentas   │  │
│  │                     │   │  para executar isso     │  │
│  │  Diagnóstico externo│   │  Brand Engine           │  │
│  │  Monitor contínuo   │   │  Brand Assistant (RAG)  │  │
│  │  Social Listening   │   │  Campaign Approval      │  │
│  │  Inteligência comp. │   │  Design System vivo     │  │
│  └─────────────────────┘   └─────────────────────────┘  │
│                                                         │
│         Um login · Um workspace · Um produto            │
└─────────────────────────────────────────────────────────┘
```

---

## Stack Técnica

| Camada | Tecnologia | Decisão |
|--------|-----------|---------|
| Frontend | Vite + React 18 | Bundler rápido, HMR nativo |
| Roteamento | React Router v6 | Layouts aninhados para BrandOS |
| UI | Material UI v6 (@mui/material) | Tema dinâmico por marca via createTheme |
| Ícones | @mui/icons-material | Consistência com MUI |
| State global | Zustand | Workspace ativo, marca ativa, tema, chat |
| Data fetching | TanStack Query | Cache, sincronização, loading states |
| Animações | Framer Motion | Transições entre telas |
| Editor rich text | Lexical (Meta) | Seções editáveis do brand book |
| Banco | Supabase (PostgreSQL) | Auth, RLS, Edge Functions, pg_vector |
| Servidor | **Netlify Edge Functions** | Streaming SSE nativo — ver seção crítica abaixo |
| ORM | Drizzle | Queries tipadas — ver regra de uso abaixo |
| Validação | Zod | Schemas frontend e backend |
| AI | Anthropic claude-sonnet-4-20250514 | Diagnósticos, assistant, aprovações |
| Embeddings | Anthropic voyage-3 | RAG do Brand Assistant |
| E-mail | Resend | Transacional + nurturing |
| Pagamento | Stripe | Planos, billing, webhooks |
| Assets | Supabase Storage | Logos, imagens, moodboard |
| Auth | Supabase Auth | JWT, sessões, invite links |

### ⚠️ Decisão crítica — Netlify Edge Functions para streaming

Netlify Functions (Node.js) têm timeout de 10s e **não suportam streaming SSE real** — `await response.text()` retorna tudo de uma vez, quebrando a experiência de geração em tempo real.

**Usar Netlify Edge Functions (Deno) para todas as rotas que fazem streaming:**

```toml
# netlify.toml
[[edge_functions]]
  path = "/api/anthropic"
  function = "anthropic"

[[edge_functions]]
  path = "/api/assistant"
  function = "assistant-chat"
```

```js
// netlify/edge-functions/anthropic.js — Edge Function com streaming nativo
export default async function handler(request, context) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      }
    })
  }

  const body = await request.json()

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY'),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  // Pass-through do stream — sem await, sem buffer
  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    }
  })
}
```

**Netlify Functions (Node.js) continuam sendo usadas para:** webhooks Stripe, cron jobs, operações sem streaming (CRUD, auth, e-mails).

### ⚠️ Regra de uso — Drizzle vs Supabase-js

Os dois clientes se comportam de forma diferente com RLS. Misturá-los na mesma operação pode quebrar o isolamento multi-tenant.

| Contexto | Cliente | Motivo |
|----------|---------|--------|
| Frontend (React) | `supabase-js` | Respeita RLS automaticamente com o JWT do usuário |
| Edge Functions (usuário autenticado) | `supabase-js` com `Authorization: Bearer {jwt}` | Respeita RLS |
| Netlify Functions (operações admin/LOUDR) | Drizzle com `SUPABASE_SERVICE_KEY` | Bypassa RLS — usar apenas quando necessário e com filtros explícitos de workspace_id |
| Cron jobs e automações | Drizzle com service key | Sem usuário autenticado — sempre filtrar por workspace_id no código |

**Regra:** nunca usar Drizzle com service key em código que processa dados de um único workspace sem filtro explícito `WHERE workspace_id = :id`.

### Variáveis de ambiente

```
# Client-side (VITE_ prefix — expostas no bundle)
VITE_SUPABASE_URL=
VITE_SUPABASE_KEY=          # anon key (RLS protege)
VITE_STRIPE_PUBLIC_KEY=
VITE_CALENDLY_URL=
VITE_APP_URL=

# Server-side (Netlify — nunca no frontend)
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
SUPABASE_SERVICE_KEY=       # service role — só em Functions admin
GOOGLE_FONTS_API_KEY=
```

---

## Design System da Plataforma

```js
// src/theme/platformTheme.js
export const platformTheme = createTheme({
  palette: {
    mode: 'dark',
    primary:    { main: '#0D9E7A', dark: '#0B8567', light: '#E1F5EE' },
    secondary:  { main: '#E8185A', light: '#FBEAF0' },
    warning:    { main: '#EF9F27', light: '#FEF3C7' },
    info:       { main: '#7F77DD', light: '#EEEDFE' },
    background: { default: '#0D1B2A', paper: '#162840' },
    text:       { primary: '#FFFFFF', secondary: '#8A9AB0', disabled: '#4A5A6A' },
    divider:    '#1E3550',
    error:      { main: '#E8185A' },
  },
  typography: {
    fontFamily: "'Cairo', sans-serif",
    fontWeightLight: 400, fontWeightRegular: 500,
    fontWeightMedium: 700, fontWeightBold: 900,
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton:    { styleOverrides: { root: { textTransform: 'none', fontWeight: 700 } } },
    MuiCard:      { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiTextField: { defaultProps: { variant: 'outlined', size: 'small' } },
  }
})

// src/theme/buildBrandTheme.js
export function buildBrandTheme(designSystem) {
  const { colors, typography, border_radius } = designSystem
  return createTheme({
    palette: {
      mode: 'light',
      primary:    { main: colors.primary.main, light: colors.primary.light, dark: colors.primary.dark, contrastText: colors.primary.on },
      secondary:  { main: colors.secondary.main },
      background: { default: colors.background, paper: colors.surface },
    },
    typography: { fontFamily: `"${typography.font_primary}", sans-serif` },
    shape: { borderRadius: parseInt(border_radius.sm ?? '8') },
  })
}
```

**Tokens de cor:**
```
navy #0D1B2A · navyMid #162840 · navyLight #1E3550
green #0D9E7A · greenDim #0B8567 · greenPale #E1F5EE
pink #E8185A · pinkPale #FBEAF0
amber #EF9F27 · amberPale #FEF3C7
purple #7F77DD · purplePale #EEEDFE
gray #8A9AB0 · border #E2EBE8
```

---

## Estrutura de Pastas

```
loudr-os/
├── netlify.toml
├── vite.config.js
├── package.json
│
├── netlify/
│   ├── edge-functions/              # Streaming SSE — Deno runtime
│   │   ├── anthropic.js             # Proxy streaming diagnóstico
│   │   └── assistant-chat.js        # Proxy streaming Brand Assistant
│   └── functions/                   # Node.js 20 — sem streaming
│       ├── _supabase.js             # Cliente supabase-js com service key
│       ├── _drizzle.js              # Drizzle para operações admin
│       ├── _middleware.js           # requireAuth, ok(), serverError()
│       ├── _prompts.js              # System prompts
│       ├── _rag.js                  # RAG: chunks, embeddings, retrieval
│       ├── _rateLimit.js            # Rate limiting de login
│       ├── stripe-webhook.js        # Eventos Stripe → atualiza plano
│       ├── cron-monitor.js          # Diagnósticos automáticos
│       ├── cron-monitor-daily.js    # Diagnósticos diários (Enterprise)
│       ├── auth/
│       │   ├── login.js
│       │   ├── register.js
│       │   ├── invite.js
│       │   └── me.js
│       ├── workspaces/
│       ├── intelligence/
│       │   ├── diagnose.js
│       │   ├── listen.js
│       │   └── alerts.js
│       ├── brandos/
│       │   ├── brands/
│       │   ├── brand-book/
│       │   │   ├── generate.js
│       │   │   ├── update.js        # Atualiza seção + re-embed + recalc gap
│       │   │   ├── tokens.js
│       │   │   └── fonts.js         # Proxy Google Fonts API
│       │   └── campaigns/
│       │       ├── submit.js
│       │       └── approve.js
│       └── emails/
│           ├── send-diagnostic.js
│           ├── notify-request.js
│           └── nurturing.js
│
├── src/
│   ├── main.jsx                     # ThemeProvider + QueryClient + Router
│   ├── App.jsx                      # Routes com React Router v6
│   ├── theme/
│   │   ├── platformTheme.js
│   │   ├── buildBrandTheme.js
│   │   └── tokens.js
│   ├── stores/
│   │   ├── authStore.js
│   │   ├── workspaceStore.js
│   │   └── brandStore.js            # marca ativa, brand book, tema MUI
│   ├── hooks/
│   │   ├── useWorkspace.js
│   │   ├── useCurrentBrand.js
│   │   ├── useBrandTheme.js
│   │   ├── useChat.js
│   │   └── useApiError.js
│   ├── lib/
│   │   ├── supabase.js              # createClient com VITE_ keys
│   │   ├── api.js                   # Fetch wrapper
│   │   ├── runStream.js             # SSE com retry de rate limit
│   │   ├── schemas.js               # Zod schemas
│   │   ├── stripe.js
│   │   └── utils.js                 # fmtDate, calcularScoreLead, checkPlano, PLANOS, calcIdentityGap
│   ├── components/
│   │   ├── common/
│   │   │   ├── GlobalStyle.jsx
│   │   │   ├── ScoreBar.jsx
│   │   │   ├── ScoreCard.jsx
│   │   │   ├── StatusChip.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── UpgradeGate.jsx
│   │   │   ├── StreamingView.jsx
│   │   │   ├── PageLoader.jsx
│   │   │   └── SessionExpiredModal.jsx
│   │   ├── intelligence/
│   │   │   ├── DiagnosticoCard.jsx
│   │   │   ├── RelatorioCompleto.jsx
│   │   │   ├── SentimentChart.jsx
│   │   │   ├── TerritoryMap.jsx
│   │   │   ├── CompetitorGrid.jsx
│   │   │   └── IdentityGapCard.jsx  # Exibe gap score + narrativa
│   │   └── brandos/
│   │       ├── BrandBookSection.jsx
│   │       ├── TokenSwatch.jsx
│   │       ├── TypeScale.jsx
│   │       ├── Moodboard.jsx
│   │       ├── ChatBubble.jsx
│   │       ├── ChatInput.jsx
│   │       ├── ContextPanel.jsx
│   │       ├── VerdictPanel.jsx
│   │       └── ApprovalBadge.jsx
│   ├── layouts/
│   │   ├── AuthLayout.jsx
│   │   ├── AppLayout.jsx
│   │   ├── IntelligenceLayout.jsx
│   │   └── BrandOSLayout.jsx        # ThemeProvider dinâmico
│   └── pages/
│       ├── public/
│       │   ├── LandingPage.jsx
│       │   ├── RelatorioPublico.jsx
│       │   └── Metodologia.jsx
│       ├── auth/
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── Invite.jsx
│       │   └── Onboarding.jsx
│       ├── dashboard/
│       │   └── Dashboard.jsx
│       ├── intelligence/
│       │   ├── Diagnostico.jsx
│       │   ├── Evolucao.jsx
│       │   ├── SocialListening.jsx
│       │   └── Concorrentes.jsx
│       ├── brandos/
│       │   ├── BrandList.jsx
│       │   ├── BrandOnboarding.jsx
│       │   ├── BrandBook.jsx
│       │   ├── sections/
│       │   │   ├── Identity.jsx
│       │   │   ├── Positioning.jsx
│       │   │   ├── DesignSystem.jsx
│       │   │   ├── References.jsx
│       │   │   └── History.jsx
│       │   ├── Assistant.jsx
│       │   ├── Campaigns.jsx
│       │   ├── CampaignNew.jsx
│       │   └── CampaignDetail.jsx
│       ├── workspace/
│       │   ├── Workspace.jsx
│       │   └── Members.jsx
│       └── admin/
│           ├── AdminShell.jsx
│           ├── Solicitacoes.jsx
│           └── AdminHistorico.jsx
│
├── supabase/
│   └── functions/
│       ├── on-solicitacao-insert/
│       ├── on-diagnostico-approved/
│       └── monthly-report/
│
├── db/
│   ├── schema.js                    # Drizzle schema
│   ├── migrations/
│   └── seed.js                      # Workspace LOUDR + platform_admin
│
└── public/
    └── index.html
```

---

## Roteamento

```jsx
<Routes>
  <Route path="/" element={<LandingPage />} />
  <Route path="/metodologia" element={<Metodologia />} />
  <Route path="/relatorio/:id" element={<RelatorioPublico />} />

  <Route element={<AuthLayout />}>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/invite/:token" element={<Invite />} />
    <Route path="/onboarding" element={<Onboarding />} />
  </Route>

  <Route element={<AppLayout />}>
    <Route path="/app" element={<Dashboard />} />

    <Route path="/app/intelligence" element={<IntelligenceLayout />}>
      <Route index element={<Diagnostico />} />
      <Route path="evolucao" element={<Evolucao />} />
      <Route path="listening" element={<SocialListening />} />
      <Route path="concorrentes" element={<Concorrentes />} />
    </Route>

    <Route path="/app/brands" element={<BrandList />} />
    <Route path="/app/brands/new" element={<BrandOnboarding />} />
    <Route path="/app/brands/:brandId" element={<BrandOSLayout />}>
      <Route index element={<BrandBook />} />
      <Route path="identity" element={<Identity />} />
      <Route path="positioning" element={<Positioning />} />
      <Route path="design-system" element={<DesignSystem />} />
      <Route path="references" element={<References />} />
      <Route path="history" element={<History />} />
      <Route path="assistant" element={<Assistant />} />
      <Route path="assistant/:convId" element={<Assistant />} />
      <Route path="campaigns" element={<Campaigns />} />
      <Route path="campaigns/new" element={<CampaignNew />} />
      <Route path="campaigns/:campaignId" element={<CampaignDetail />} />
    </Route>

    <Route path="/app/workspace" element={<Workspace />} />
    <Route path="/app/workspace/members" element={<Members />} />

    <Route path="/admin" element={<AdminShell />}>
      <Route index element={<Solicitacoes />} />
      <Route path="historico" element={<AdminHistorico />} />
    </Route>
  </Route>
</Routes>
```

---

## Banco de Dados

### Schema completo

```sql
-- ═══════════════════════════════════════════
-- CORE
-- ═══════════════════════════════════════════

create table workspaces (
  id                      uuid default gen_random_uuid() primary key,
  created_at              timestamptz default now(),
  nome                    text not null,
  dominio                 text,
  setor                   text,
  porte                   text,
  plano                   text default 'trial',
  plano_status            text default 'active',
  stripe_customer_id      text,
  stripe_subscription_id  text,
  trial_ends_at           timestamptz default (now() + interval '14 days'),
  diagnosticos_mes        int default 0,
  diagnosticos_reset_at   timestamptz default (date_trunc('month', now()) + interval '1 month')
);

create table workspace_members (
  id            uuid default gen_random_uuid() primary key,
  workspace_id  uuid references workspaces(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete cascade,
  role          text default 'member',  -- owner|admin|member|viewer
  created_at    timestamptz default now(),
  unique(workspace_id, user_id)
);

-- ⚠️ Admins da plataforma LOUDR — separado do sistema de roles por workspace
-- Identifica usuários LOUDR com acesso ao /admin sem workspace específico
create table platform_admins (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade unique,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════
-- INTELLIGENCE
-- ═══════════════════════════════════════════

create table diagnosticos (
  id                    uuid default gen_random_uuid() primary key,
  created_at            timestamptz default now(),
  workspace_id          uuid references workspaces(id),
  user_id               uuid references auth.users(id),
  user_name             text,
  user_email            text,
  empresa               text,
  dominio               text,
  setor                 text,
  porte                 text,
  score_singularidade   int,
  score_consistencia    int,
  score_posicionamento  int,
  score_experiencia     int,
  score_escala          int,
  frase_diagnostico     text,
  dados                 jsonb,
  publico               boolean default true,
  tipo                  text default 'manual'
);

create table solicitacoes (
  id                  uuid default gen_random_uuid() primary key,
  created_at          timestamptz default now(),
  nome                text not null,
  email               text not null,
  empresa             text not null,
  site                text,
  setor               text,
  porte               text,
  cargo               text,
  contexto            text,
  status              text default 'pendente',
  score_qualificacao  int,
  diagnostico_id      uuid references diagnosticos(id),
  workspace_id        uuid references workspaces(id)
);

create table listening_events (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id),
  fonte         text,
  tipo          text,
  titulo        text,
  conteudo      text,
  sentiment     text,
  score_impacto int,
  url           text,
  lido          boolean default false
);

create table sentiment_snapshots (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id),
  data          date,
  positivo_pct  numeric,
  neutro_pct    numeric,
  negativo_pct  numeric,
  volume_total  int
);

create table concorrentes (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id),
  nome          text,
  dominio       text,
  ativo         boolean default true
);

create table diagnosticos_concorrentes (
  id                    uuid default gen_random_uuid() primary key,
  created_at            timestamptz default now(),
  concorrente_id        uuid references concorrentes(id),
  workspace_id          uuid references workspaces(id),
  score_singularidade   int,
  score_consistencia    int,
  score_posicionamento  int,
  dados                 jsonb
);

create table alertas (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id),
  tipo          text,
  titulo        text,
  descricao     text,
  severidade    text,
  lido          boolean default false,
  dados         jsonb
);

-- ═══════════════════════════════════════════
-- BRAND OS
-- ═══════════════════════════════════════════

create table brands (
  id            uuid default gen_random_uuid() primary key,
  workspace_id  uuid references workspaces(id),
  nome          text not null,
  slug          text not null,
  logo_url      text,
  status        text default 'draft',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(workspace_id, slug)
);

create table brand_books (
  id              uuid default gen_random_uuid() primary key,
  brand_id        uuid unique references brands(id),
  identity        jsonb,
  positioning     jsonb,
  design_system   jsonb,
  references      jsonb,
  version         int default 1,
  updated_at      timestamptz default now()
);

create table brand_book_history (
  id              uuid default gen_random_uuid() primary key,
  brand_book_id   uuid references brand_books(id),
  section         text,
  snapshot        jsonb,
  changed_by      uuid references auth.users(id),
  changed_at      timestamptz default now(),
  note            text
);

-- pg_vector: habilitar com: supabase db execute "create extension if not exists vector"
create table brand_book_chunks (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  brand_id      uuid references brands(id) on delete cascade,
  section       text not null,
  content       text not null,
  embedding     vector(1536),
  updated_at    timestamptz default now()
);

create index on brand_book_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index on brand_book_chunks (brand_id);

create table conversations (
  id          uuid default gen_random_uuid() primary key,
  brand_id    uuid references brands(id),
  user_id     uuid references auth.users(id),
  title       text,
  created_at  timestamptz default now()
);

create table messages (
  id              uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id),
  role            text,
  content         text,
  metadata        jsonb,
  created_at      timestamptz default now()
);

create table campaigns (
  id            uuid default gen_random_uuid() primary key,
  brand_id      uuid references brands(id),
  submitted_by  uuid references auth.users(id),
  title         text not null,
  content       jsonb,
  status        text default 'pending',
  verdict       jsonb,
  reviewed_at   timestamptz,
  created_at    timestamptz default now()
);

-- Controle de idempotência do nurturing de e-mails
-- Garante que cada e-mail da sequência seja enviado exatamente uma vez
create table nurturing_emails (
  id              uuid default gen_random_uuid() primary key,
  solicitacao_id  uuid references solicitacoes(id) on delete cascade,
  dia             int not null,          -- 2 | 5 | 10 | 15
  enviado_at      timestamptz default now(),
  status          text default 'enviado', -- enviado | falhou
  unique(solicitacao_id, dia)             -- impede duplicatas
);

alter table nurturing_emails enable row level security;

-- ═══════════════════════════════════════════
-- INTEGRAÇÃO Intelligence ↔ Brand OS
-- ═══════════════════════════════════════════

create table identity_gap_snapshots (
  id                    uuid default gen_random_uuid() primary key,
  created_at            timestamptz default now(),
  brand_id              uuid references brands(id),
  workspace_id          uuid references workspaces(id),
  diagnostico_id        uuid references diagnosticos(id),
  gap_score             numeric,   -- 0-10, onde 0 = alinhamento perfeito
  gap_narrativa         text,      -- descrição gerada por IA do gap
  dimensoes             jsonb,     -- gap por dimensão (ver algoritmo abaixo)
  declarado_scores      jsonb,     -- scores do brand_book no momento
  percebido_scores      jsonb      -- scores do diagnóstico externo
);
```

### ⚠️ Algoritmo do Identity Gap Score

O gap é calculado por `calcIdentityGap()` em `src/lib/utils.js` e também no backend em `netlify/functions/brandos/brand-book/update.js`.

**Mapeamento de dimensões** (declarado → percebido):

| Dimensão | Campo brand_book | Campo diagnóstico |
|----------|-----------------|------------------|
| Singularidade | `identity.positioning_clarity` (0-10) | `score_singularidade` |
| Consistência | `design_system completude` (% campos preenchidos × 10) | `score_consistencia` |
| Posicionamento | `positioning.differentiation_score` (0-10) | `score_posicionamento` |
| Experiência | `identity.tone_clarity` (0-10) | `score_experiencia` |
| Escala | `references.completude` (% campos × 10) | `score_escala` |

```js
// src/lib/utils.js
export function calcIdentityGap(brandBook, diagnostico) {
  const dims = [
    { nome: 'singularidade', declarado: brandBook.identity?.positioning_clarity ?? 5, percebido: diagnostico.score_singularidade ?? 5 },
    { nome: 'consistencia',  declarado: calcConsistenciaScore(brandBook.design_system), percebido: diagnostico.score_consistencia ?? 5 },
    { nome: 'posicionamento',declarado: brandBook.positioning?.differentiation_score ?? 5, percebido: diagnostico.score_posicionamento ?? 5 },
    { nome: 'experiencia',   declarado: brandBook.identity?.tone_clarity ?? 5, percebido: diagnostico.score_experiencia ?? 5 },
    { nome: 'escala',        declarado: calcReferencesScore(brandBook.references), percebido: diagnostico.score_escala ?? 5 },
  ]

  const gaps = dims.map(d => ({
    ...d,
    gap: Math.abs(d.declarado - d.percebido),
    direcao: d.percebido > d.declarado ? 'mercado_supera' : 'marca_supera',
  }))

  const gap_score = gaps.reduce((sum, d) => sum + d.gap, 0) / gaps.length

  return { gap_score: parseFloat(gap_score.toFixed(1)), dimensoes: gaps }
}

function calcConsistenciaScore(designSystem) {
  if (!designSystem) return 0
  const campos = ['colors', 'typography', 'spacing', 'border_radius']
  const preenchidos = campos.filter(c => designSystem[c]).length
  return (preenchidos / campos.length) * 10
}

function calcReferencesScore(references) {
  if (!references) return 0
  const campos = ['moodboard', 'brands', 'differentiation']
  const preenchidos = campos.filter(c => references[c] && references[c].length > 0).length
  return (preenchidos / campos.length) * 10
}
```

**Trigger de cálculo:**
1. Novo diagnóstico gerado → `calcIdentityGap()` se workspace tem brand_book ativo
2. Brand book atualizado → `calcIdentityGap()` com último diagnóstico
3. Cron diário (Enterprise) → recalcula para todos os workspaces ativos

### RLS

```sql
alter table workspaces               enable row level security;
alter table workspace_members        enable row level security;
alter table platform_admins          enable row level security;
alter table diagnosticos             enable row level security;
alter table solicitacoes             enable row level security;
alter table listening_events         enable row level security;
alter table sentiment_snapshots      enable row level security;
alter table concorrentes             enable row level security;
alter table diagnosticos_concorrentes enable row level security;
alter table alertas                  enable row level security;
alter table brands                   enable row level security;
alter table brand_books              enable row level security;
alter table brand_book_history       enable row level security;
alter table brand_book_chunks        enable row level security;
alter table conversations            enable row level security;
alter table messages                 enable row level security;
alter table campaigns                enable row level security;
alter table identity_gap_snapshots   enable row level security;

-- Workspace: membro acessa o seu
create policy "membro acessa workspace" on workspaces
  for all using (id in (select workspace_id from workspace_members where user_id = auth.uid()));

-- Diagnóstico: leitura pública para relatório compartilhável
create policy "leitura publica diagnosticos" on diagnosticos
  for select using (publico = true);
create policy "workspace acessa diagnosticos" on diagnosticos
  for all using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

-- Solicitações: insert público
create policy "publico pode solicitar" on solicitacoes
  for insert to anon, authenticated with check (true);

-- platform_admins: só o próprio usuário vê seu registro
create policy "admin ve proprio registro" on platform_admins
  for select using (user_id = auth.uid());

-- Padrão para demais tabelas: workspace_id via workspace_members
-- (repetir para: listening_events, sentiment_snapshots, concorrentes,
-- diagnosticos_concorrentes, alertas, brands, brand_books, brand_book_history,
-- brand_book_chunks, conversations, messages, campaigns, identity_gap_snapshots)
```

---

## Planos e Limites

```js
export const PLANOS = {
  trial:      { nome:'Trial',      preco:0,    duracao_dias:14,  diagnosticos_mes:1, monitor:null,      concorrentes:0, social_listening:false, marcas:1, assistant_msgs:10,        campanhas:false, membros:1         },
  starter:    { nome:'Starter',    preco:490,                    diagnosticos_mes:1, monitor:'mensal',  concorrentes:0, social_listening:false, marcas:1, assistant_msgs:Infinity,  campanhas:false, membros:1,        stripe_price_id:'price_starter_xxx' },
  pro:        { nome:'Pro',        preco:1490,                   diagnosticos_mes:3, monitor:'semanal', concorrentes:2, social_listening:true,  marcas:3, assistant_msgs:Infinity,  campanhas:true,  membros:3,        stripe_price_id:'price_pro_xxx'     },
  enterprise: { nome:'Enterprise', preco:3990,                   diagnosticos_mes:Infinity, monitor:'diario', concorrentes:5, social_listening:true,  marcas:Infinity, assistant_msgs:Infinity, campanhas:true, membros:Infinity, stripe_price_id:'price_enterprise_xxx' },
}
```

---

## SYSTEM_PROMPT — Diagnóstico Intelligence

```js
// netlify/functions/_prompts.js
export const SYSTEM_PROMPT_DIAGNOSTICO = `
Você é o Brand Intelligence Agent da LOUDR — agência de Smart Branding que conecta estratégia, design e tecnologia.

A LOUDR opera pelo framework Smart Branding com 4 práticas:
1. INTELIGÊNCIA & SINGULARIDADE — posicionamento, arquitetura de marca, cultura e essência
2. EXPERIÊNCIA & EXPRESSÃO — identidade visual e verbal, storytelling, design system
3. PLATAFORMAS & ECOSSISTEMAS — produto digital, e-commerce, plataformas, integrações
4. FUTURO & ESCALA — data, AI, growth branding, CRM, performance

IMPORTANTE: Faça EXATAMENTE 5 buscas web. Nem mais, nem menos.
Pesquise: (1) site oficial e LinkedIn, (2) redes sociais e posicionamento, (3) Reclame Aqui e Google Reviews, (4) Glassdoor e cultura interna, (5) notícias recentes e concorrentes.

Responda SOMENTE com JSON válido, sem markdown, sem explicações fora do JSON:

{
  "empresa": "Nome",
  "dominio": "dominio.com.br",
  "setor": "Setor",
  "porte": "Startup|PME|Médio|Grande",
  "momento_atual": "...",
  "frase_diagnostico": "Uma frase cirúrgica e provocativa sobre a marca",
  "resumo_executivo": "...",
  "identidade_declarada": "...",
  "identidade_percebida": "...",
  "gap_identidade": "...",
  "praticas_loudr": {
    "inteligencia_singularidade": { "score": 0, "diagnostico": "...", "evidencias": "...", "oportunidade": "..." },
    "experiencia_expressao":      { "score": 0, "diagnostico": "...", "evidencias": "...", "oportunidade": "..." },
    "plataformas_ecossistemas":   { "score": 0, "diagnostico": "...", "evidencias": "...", "oportunidade": "..." },
    "futuro_escala":              { "score": 0, "diagnostico": "...", "evidencias": "...", "oportunidade": "..." }
  },
  "score_singularidade": 0,
  "score_consistencia": 0,
  "score_posicionamento": 0,
  "score_experiencia": 0,
  "score_escala": 0,
  "justificativa_scores": "...",
  "sinais_cultura": "...",
  "sinais_investimento": "...",
  "evolucao_marca": "...",
  "gap_ads_vs_site": "...",
  "diferenciais_ativos": ["...", "..."],
  "zona_ruido": ["...", "..."],
  "territorio_inexplorado": "...",
  "pergunta_provocativa": "...",
  "concorrentes": [
    { "nome": "...", "diferencial": "...", "ameaca": "baixa|media|alta", "sinal": "..." }
  ],
  "oportunidades": [
    { "titulo": "...", "descricao": "...", "pratica_loudr": "...", "impacto": "alto|medio|baixo", "prazo": "imediato|curto|médio prazo" }
  ],
  "quick_wins": ["...", "..."],
  "porta_entrada_loudr": "..."
}

Scores: 1-3 crítico · 4-6 em desenvolvimento · 7-8 sólido · 9-10 referência de mercado
Tom: direto, estratégico, sem eufemismo. A frase_diagnostico deve ser memorável e incômoda.
`
```

---

## Especificação de Funcionalidades

### F01 · Landing Page

**Arquivo:** `src/pages/public/LandingPage.jsx` · **Rota:** `/` · **Auth:** não requer

Seções: Nav fixo blur · Hero CMO · Pain 6 cards · How it works + mock report · Proof 6 cards · Stats bar · Exemplo O Boticário · Formulário (nome*, email*, empresa*, cargo, contexto) · FAQ + CTA · Footer

Formulário: `calcularScoreLead()` → insert em `solicitacoes` status `pendente`

**Git:** `feat: F01 landing page` → push

---

### F02 · Relatório Público

**Arquivo:** `src/pages/public/RelatorioPublico.jsx` · **Rota:** `/relatorio/:id` · **Auth:** não requer

Leitura pública via RLS · Relatório completo · Botão Calendly · Gate de e-mail antes das oportunidades

**Git:** `feat: F02 relatorio publico` → push

---

### F03 · Autenticação

**Arquivos:** `src/pages/auth/` · **Rotas:** `/login` `/register` `/invite/:token` `/onboarding`

Login: `supabase.auth.signInWithPassword()` · Rate limiting 10/15min · Redirect inteligente
Register: `supabase.auth.signUp()` → `/onboarding`
Onboarding 3 passos: empresa → plano → confirmação (cria workspace + owner)
Convite: token 48h → nova senha → entra como member

**Git:** `feat: F03 auth login register onboarding` → push

---

### F04 · Dashboard — Central de Comando

**Arquivo:** `src/pages/dashboard/Dashboard.jsx` · **Rota:** `/app` · **Auth:** requer

Header: LOUDR Score Global + variação 24h + frase narrativa + Quick Actions
Grid: donut sentiment · consistência brand book · share of voice · radar pilares
Insights: sugestões proativas do assistant + botão Deep Strategy
Operacional: timeline de atividade + Quick Wins do dia

**Git:** `feat: F04 dashboard cmo` → push

---

### F05 · Intelligence — Diagnóstico

**Arquivo:** `src/pages/intelligence/Diagnostico.jsx` · **Rota:** `/app/intelligence` · **Auth:** requer + plano ativo

Último diagnóstico em destaque · Botão "Gerar novo" com verificação de limite · Histórico com filtros · Download PDF · Compartilhar link
Streaming via Edge Function com buscas visíveis · Countdown circular em 429 · Retry 3x

**Git:** `feat: F05 intelligence diagnostico streaming` → push

---

### F06 · Intelligence — Evolução de Scores ✅

**Arquivo:** `src/pages/app/Evolucao.jsx` · **Rota:** `#/app/evolucao` · **Auth:** requer + starter+

Gráfico Recharts — 3 scores ao longo do tempo · Seletor período · Insight automático de maior variação

**Git:** `feat: F06 intelligence evolucao scores` → push

---

### F07 · Intelligence — Social Listening ✅

**Arquivo:** `src/pages/app/SocialListening.jsx` · **Rota:** `#/app/listening` · **Auth:** requer + pro+ · **Guard:** UpgradeGate

Score de sentiment · Gráfico área 7d/30d/90d · Feed filtrado por fonte · Tópicos em alta (Trend Discovery)

**Git:** `feat: F07 social listening sentiment` → push

---

### F08 · Intelligence — Inteligência Competitiva ✅

**Arquivo:** `src/pages/app/Concorrentes.jsx` · **Rota:** `#/app/concorrentes` · **Auth:** requer + pro+ · **Guard:** UpgradeGate

Adicionar concorrentes (limite plano) · Territory Map scatter plot · Gap Analysis por dimensão · Scores lado a lado

**Git:** `feat: F08 inteligencia competitiva concorrentes` → push

---

### F09 · Brand OS — Lista de Marcas ✅

**Arquivo:** `src/pages/app/BrandList.jsx` · **Rota:** `#/app/brands` · **Auth:** requer + starter+

Grid de cards · Botão "Nova marca" · Limite por plano (1/3/∞) · Empty state com CTA

**Git:** `feat: F09 brandos lista marcas` → push

---

### F10 · Brand OS — Onboarding de Marca (Wizard) ✅

**Arquivo:** `src/pages/app/BrandOnboarding.jsx` · **Rota:** `#/app/brands/new` · **Auth:** requer

MUI Stepper — 3 passos: Identidade básica · Missão & valores (arquétipos, chips) · Design System inicial
Cria brand + brand_book no Supabase ao concluir.

**Git:** `feat: F10 brandos onboarding wizard` → push

---

### F11 · Brand OS — Brand Book ✅

**Arquivo:** `src/pages/app/BrandBook.jsx` · **Rota:** `#/app/brands/:brandId` · **Auth:** requer

Sidebar: Identity · Positioning · Design System · References · History
Editor inline com MUI TextField · Toda edição salva em `brand_book_history` · Color picker nativo
Suporte a valores, arquétipos, vocabulário proibido, moodboard, paleta de cores e tipografia.

**Git:** `feat: F11 brandos brand book editor` → push

---

### F12 · Brand OS — Brand Assistant ✅

**Arquivo:** `src/pages/app/BrandAssistant.jsx` · **Rota:** `#/app/brands/:brandId/assistant` · **Auth:** requer + starter+

Layout 3 colunas: histórico de conversas · chat com streaming SSE · painel de contexto RAG
RAG: system prompt construído com brand book completo (identity, positioning, design_system)
Comportamento proativo: sugere perguntas ao iniciar + sinaliza gaps no brand book
Persiste conversas e mensagens no Supabase (conversations + messages)

**Git:** `feat: F12 brandos brand assistant rag` → push

---

### F13 · Brand OS — Aprovação de Campanhas ✅

**Arquivos:** `src/pages/app/Campaigns.jsx` `CampaignNew.jsx` `CampaignDetail.jsx` · **Auth:** requer + pro+

Fluxo: submissão → IA avalia contra brand book → veredicto JSON → exibição
Dimensões: tom de voz · consistência de valores · vocabulário · posicionamento
Interface: conteúdo + veredicto lado a lado · score + badge · sugestões + palavras problemáticas
Análise via streaming SSE + Anthropic. Persiste em campaigns no Supabase.

**Git:** `feat: F13 brandos campaign approval` → push

---

### F14 · Workspace — Configurações

**Arquivo:** `src/pages/workspace/Workspace.jsx` · **Rota:** `/app/workspace`

Abas: Empresa · Equipe (convite por e-mail, roles) · Plano (uso, faturas, upgrade) · Alertas (canais, frequência)

**Git:** `feat: F14 workspace configuracoes` → push

---

### F15 · Integração — Identity Gap ✅

**Arquivo:** `src/components/intelligence/IdentityGapCard.jsx` · **Disponível em:** Dashboard + Intelligence

Cruzamento declarado (brand_books) vs percebido (diagnosticos)
Exibe: gap_score · narrativa por dimensão · evolução ao longo do tempo · alerta quando gap aumenta
Algoritmo: `calcIdentityGap()` — ver seção de banco de dados acima
Integrado em: Home (compact) + Diagnostico (full)

**Git:** `feat: F15 identity gap integration` → push

---

### F16 · Admin LOUDR — Fila de Solicitações

**Arquivo:** `src/pages/admin/Solicitacoes.jsx` · **Rota:** `/admin` · **Auth:** requer + `platform_admins`

⚠️ Acesso via tabela `platform_admins` — não via role de workspace

Lista com score de qualificação · Filtros · Aprovar/Rejeitar · Cooldown 120s · Streaming ao aprovar · E-mail automático (Resend) · Stats

**Git:** `feat: F16 admin solicitacoes fila` → push

---

### F17 · Automações

| Gatilho | Ação | Runtime |
|---------|------|---------|
| INSERT solicitacoes | E-mail equipe LOUDR com score do lead | Supabase Edge Function |
| UPDATE status='aprovado' | E-mail relatório + Calendly para lead | Supabase Edge Function |
| Diagnóstico gerado | Nurturing D+2, D+5, D+10, D+15 (com idempotência) | Netlify Function |
| Diagnóstico gerado | Recalcular Identity Gap se brand book ativo | Netlify Function |
| Brand book atualizado | Re-embed seção (com debounce 2s) + recalcular Identity Gap | Netlify Function |
| Cron semanal (Pro) | Diagnóstico automático com throttling sequencial | Netlify Function cron |
| Cron diário (Enterprise) | Diagnóstico automático com throttling sequencial + alertas + gap | Netlify Function cron |
| Dia 1 do mês | Relatório PDF mensal para todos os membros | Supabase Edge Function |

#### ⚠️ Throttling no cron de diagnósticos automáticos

O cron **nunca** processa workspaces em paralelo. Com 20 clientes Pro, disparar 20 chamadas simultâneas à Anthropic esgota o rate limit imediatamente.

```js
// netlify/functions/cron-monitor.js
export async function handler() {
  const DELAY_ENTRE_WORKSPACES = 12000 // 12s — espaço suficiente entre chamadas

  const workspaces = await getWorkspacesElegiveis() // Pro + Enterprise ativos

  for (const ws of workspaces) {
    try {
      await gerarDiagnosticoAutomatico(ws)
    } catch (err) {
      // log e continua — não interrompe os demais workspaces
      console.error(`Erro workspace ${ws.id}:`, err.message)
    }
    // aguarda entre cada workspace, mesmo em caso de erro
    await new Promise(r => setTimeout(r, DELAY_ENTRE_WORKSPACES))
  }
}
```

**Capacidade:** com 12s de delay, o cron processa ~70 workspaces dentro do timeout de 15min do Netlify. Acima disso, dividir em batches por horário.

#### ⚠️ Debounce no re-embed do brand book

Sem debounce, editar um parágrafo longo dispara múltiplas chamadas ao voyage-3 desnecessariamente. Usar o hook abaixo em todos os editores do brand book.

```js
// src/hooks/useReembed.js
import { useRef } from 'react'

export function useReembed() {
  const timerRef = useRef(null)

  function scheduleReembed(brandId, section, data) {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      await fetch('/.netlify/functions/brandos/brand-book/update', {
        method: 'POST',
        body: JSON.stringify({ brandId, section, data }),
      })
    }, 2000) // aguarda 2s após a última edição antes de chamar a API
  }

  return { scheduleReembed }
}
```

Usar `scheduleReembed()` nos componentes Identity, Positioning, DesignSystem e References — nunca chamar o endpoint de update diretamente no onChange.

#### ⚠️ Idempotência no nurturing de e-mails

Antes de enviar cada e-mail da sequência, verificar na tabela `nurturing_emails` se já foi enviado. A unique constraint `(solicitacao_id, dia)` garante que re-execuções da função não duplicam envios.

```ts
// supabase/functions/nurturing/index.ts
async function enviarNurturing(solicitacaoId: string, dia: number) {
  // Tenta inserir o registro — falha silenciosamente se já existir
  const { error } = await supabase
    .from('nurturing_emails')
    .insert({ solicitacao_id: solicitacaoId, dia, status: 'enviado' })

  if (error?.code === '23505') {
    // unique_violation — e-mail já foi enviado, ignorar
    console.log(`Nurturing dia ${dia} para ${solicitacaoId} já enviado. Pulando.`)
    return
  }

  if (error) throw error

  // Só chega aqui no primeiro envio — registrou com sucesso
  await resend.emails.send({ ... })
}
```

**Git:** `feat: F17 automacoes throttling debounce nurturing` → push

---

## Git Workflow

**Regra:** commit + push após **cada funcionalidade entregue e testada**. Não acumular.

```bash
# Após concluir cada funcionalidade (F01, F02, etc.)
git add .
git commit -m "feat: F01 landing page captura de leads"
git push origin dev

# Nunca commitar na main diretamente
# Merge para main só após validação completa da fase
```

**Convenção de mensagens:**
```
feat: F01 landing page
feat: F05 intelligence diagnostico streaming
fix: F05 countdown rate limit nao resetava
chore: atualizar SPECS.md fase 1 concluida
refactor: F12 extrair RAG para hook useRag
```

---

## Regras de Desenvolvimento

1. **MUI sempre** — `sx prop` + `styled()`. Nunca inline style
2. **Tema via ThemeProvider** — `platformTheme` para a plataforma, `buildBrandTheme()` no BrandOSLayout
3. **Zustand para estado global** — workspace, marca ativa, tema MUI, chat lateral
4. **React Query para dados** — cache, invalidação. Nunca fetch direto em useEffect
5. **supabase-js no frontend** — respeita RLS com JWT do usuário
6. **Drizzle apenas em Functions admin** — sempre com filtro workspace_id explícito
7. **Edge Functions para streaming** — diagnóstico e assistant chat
8. **RLS em toda tabela nova** — isolamento por workspace_id sem exceção
9. **Anthropic key nunca no frontend** — sempre via Edge Function
10. **Rate limit 429** — retry com countdown circular (3x, 65s)
11. **RAG por brand_id** — brand book nunca enviado integralmente para a API
12. **Zod em toda validação** — frontend e backend
13. **Git: commit + push por funcionalidade** — nunca na main
14. **SPECS.md é documento vivo** — marcar como concluído após cada entrega
15. **Cron sequencial** — nunca processar workspaces em paralelo no cron. Usar loop com `await` e delay de 12s entre cada workspace
16. **Debounce em re-embeds** — usar `useReembed()` em todos os editores do brand book. Nunca chamar o endpoint de update diretamente no onChange
17. **Nurturing idempotente** — sempre checar `nurturing_emails` antes de enviar. A unique constraint `(solicitacao_id, dia)` é a garantia — nunca enviar sem tentar o insert primeiro

---

## Checklist de QA por Funcionalidade

Executar antes de cada commit:

- [ ] Funcionalidade funciona do início ao fim sem erro no console
- [ ] Dados salvos com workspace_id correto no Supabase
- [ ] RLS: workspace A não vê dados do workspace B
- [ ] UpgradeGate bloqueia feature se plano insuficiente
- [ ] Viewer não consegue editar (retorna 403)
- [ ] Platform admin acessa /admin (via platform_admins, não workspace role)
- [ ] Streaming SSE visível em tempo real (não espera resposta completa)
- [ ] Cron processa workspaces sequencialmente com delay (não em paralelo)
- [ ] Re-embed usa debounce de 2s (não dispara no onChange direto)
- [ ] Nurturing verifica nurturing_emails antes de enviar (sem duplicatas)
- [ ] SPECS.md atualizado com funcionalidade marcada como concluída

---

## Arquitetura de Informação

### Pergunta principal de cada módulo

| Módulo | Pergunta que responde |
|--------|----------------------|
| Dashboard | O que eu preciso fazer hoje? |
| Intelligence | Como o mercado me vê? |
| Brand OS — Brand Book | Quem eu disse que sou? |
| Brand OS — Assistant | Como executo isso on-brand? |
| Brand OS — Campanhas | Essa peça está alinhada com a marca? |
| Identity Gap | Quanto minha percepção difere da minha identidade? |

### Hierarquia de leitura em cada tela

1. **Score antes de detalhe** — o usuário vê o número primeiro, a narrativa e evidências ficam abaixo ou em tela de detalhe
2. **Alertas no topo, tendências no meio, histórico no fundo** — informação urgente sobe para o header, histórico fica nas telas secundárias
3. **Dados com fonte visível** — cada insight tem origem rastreável (Reclame Aqui, LinkedIn, diagnóstico de dd/mm). Nunca um número sem procedência
4. **O assistant nunca interrompe** — Contextual Side-Bar sempre disponível mas nunca abre sozinho. Sugestões proativas aparecem como cards discretos
5. **UpgradeGate mostra o valor antes de bloquear** — features de plano superior aparecem com preview desfocado + CTA. O usuário entende o que perde antes de decidir

### Hierarquia de informação por tela

**Dashboard `/app`**
```
Header: LOUDR Score Global → variação 24h → frase narrativa → Quick Actions
Grid:   Donut sentiment | Consistência brand book | Share of Voice | Radar pilares
Body:   Cards de sugestões proativas → botão Deep Strategy
Footer: Timeline de atividade → Quick Wins do dia
```

**Diagnóstico `/app/intelligence`**
```
Hero:    Frase diagnóstica → scores das 4 práticas
Detalhe: Identidade declarada vs percebida → gap narrativo
Ação:    Oportunidades priorizadas → quick wins acionáveis
Nav:     Histórico de diagnósticos anteriores
```

**Social Listening `/app/intelligence/listening`**
```
Header: Score de sentiment atual (pos/neu/neg %) → variação
Gráfico: Evolução do sentiment 7d/30d/90d
Feed:    Eventos filtráveis por fonte e sentiment
Alertas: Picos de menção negativa → Trend Discovery
```

**Brand Book `/app/brands/:id`**
```
Sidebar: Identity → Positioning → Design System → References → History
Content: Seção ativa editável inline com Lexical
Preview: MUI Theme da marca ativo na interface enquanto edita
Banner:  Identity Gap alert se gap > 3 pontos
```

**Brand Assistant `/app/brands/:id/assistant`**
```
Esquerda (240px): Histórico de conversas por data
Centro (flex):    Chat com streaming + sugestões proativas ao abrir
Direita (320px):  Painel RAG — chunks referenciados + link para editar seção
```

**Campaign Detail `/app/brands/:id/campaigns/:id`**
```
Esquerda: Conteúdo submetido (copy, canais, assets)
Direita:  Veredicto IA — score geral → dimensões → palavras proibidas destacadas → sugestões inline
Ações:    Aprovar manualmente | Solicitar revisão | Arquivar
```

**Identity Gap** *(componente transversal)*
```
Score:     Gap 0-10 (0 = alinhamento perfeito) → direção por dimensão
Narrativa: Texto gerado por IA explicando o gap
Evolução:  Gráfico de linha do gap ao longo do tempo
Ação:      "Qual edição no brand book fecha esse gap?"
Aparece:   Dashboard (card grid) | Intelligence (abaixo dos scores) | Brand Book (banner se gap > 3)
```

---

## Roadmap de Execução

| Fase | Funcionalidades | Critério de aceite |
|------|----------------|-------------------|
| **1 — Infra + Auth** | Deploy Netlify + Edge Functions, Supabase schema, auth, workspace, onboarding | Login funcionando em produção, workspace criado |
| **2 — Billing** | Stripe checkout, webhook, planos, UpgradeGate, trial | Upgrade de trial para Starter processa sem erro |
| **3 — Intelligence MVP** | F01 F02 F05 F16 F17 (parcial) | 10 diagnósticos entregues para leads reais |
| **4 — Intelligence Pro** | F06 F07 F08 F15 (parcial) | 10 clientes pagantes ativos |
| **5 — Brand Engine** | F09 F10 F11 | Brand book de 2 marcas reais montado em < 30min |
| **6 — Brand Assistant** | F12 (RAG completo + Zen Mode) | Time LOUDR usa em 3 campanhas reais sem re-briefing |
| **7 — Campanhas + Multi** | F13 F14 | Cliente externo onboarda e aprova campanha sozinho |
| **8 — Integração** | F15 completo, F04 completo, F17 completo | Identity Gap calculado em tempo real |

---

*LOUDR OS · SPECS v4.3 · Maio 2026*  
*Atualizar este documento após cada entrega. Em caso de conflito com PROMPT-AGENTE.md, este prevalece.*