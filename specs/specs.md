# LOUDR OS — Especificação Completa do Produto
**Versão:** 5.6
**Data:** Junho 2026
**Status:** Documento vivo — atualizar a cada entrega
**Owner:** Danilo Silva · LOUDR
**Changelog v5.6:** Arquitetura de IA migrada para background functions + polling. Todas as funções que chamam IA usam sufixo `-background.js` — Netlify retorna 202 imediatamente, function processa async, frontend faz polling no Supabase a cada 3s. `aiConfig(tier)` centralizado em `_ai.js` (fast/standard/premium) — modelo/tokens/web_search por tier sem `if (isDev())` nas functions. Diagnóstico usa `aiConfig('premium')` — Sonnet 4.6 + web search em dev e prod (sem web search o modelo alucina dados públicos). Admin (aprovarERodar + NovoManual) migrado de runStream para background + poll. `RelatorioCompleto` movido de `src/pages/` para `src/components/` — componente compartilhado entre admin, app e relatório público. Passagem de dados unificada em `{ ...row, ...row.data }` nos três contextos.
**Changelog v5.5:** Decisões arquiteturais alinhadas com o código existente. Streaming mantido em Netlify Functions Node.js. Zustand e TanStack Query removidos. Drizzle removido. ANTHROPIC_API_KEY renomeado para ANTHROPIC_KEY. Lexical adiado.
**Changelog v5.4:** Modelo de acesso fechado — sem self-service. Apenas convidados acessam. Admin master (danilo@loudr.com.br) cria workspaces, convida clientes e pode impersonar qualquer ambiente. Register público removido. Onboarding removido. F03 reescrito. F05 expandido com gestão de workspaces e impersonation. Pontos de atenção corrigidos — stripe removido do schema e pastas, roadmap sem fase de billing, rota raiz corrigida para redirect, nomes de arquivos alinhados com numeração F01-F19, SYSTEM_PROMPT_MANUAL consolidado no F11, LandingPage.jsx removida da estrutura. F11 expandido — extração de manual gera design.md estruturado seguindo padrão de mercado, com SYSTEM_PROMPT dedicado, schema atualizado e integração com RAG. Listening dividido em Social e Search. Stack de AI expandida com estratégia multi-modelo para gestão de custos. Stripe removido — validar modelo comercial antes. Exportação removida — dados ficam na plataforma. Landing page substituída por redirect para login.

---

## Visão do Produto

**LOUDR OS** é o sistema operacional de marca para empresas que levam identidade a sério.

Combina diagnóstico externo com dados públicos, governança interna do brand book, inteligência de conteúdo, inteligência competitiva em tempo real e um assistente estratégico onipresente — tudo em uma plataforma, uma conta, um workspace.

**O diferencial único:** cruzamento automático entre identidade declarada (Brand System) e identidade percebida (Posicionamento) = Identity Gap Score. Nenhum produto no mundo faz isso de forma contínua e automatizada.

---

## Navegação — 6 Grupos

```
┌─────────────────────────────────────────┐
│         LOUDR — [Nome do Workspace]     │
├─────────────────────────────────────────┤
│  ◈ Painel da Marca                      │  Dashboard do CMO
│  ◈ Posicionamento                       │  Inteligência unificada
│  ◈ Listening                 Pro+       │  Social · Search
│  ◈ Content                              │  Palavras / Oportunidades / Ideias
│  ◈ Brand System                         │  Manual / Assets / Tokens / Brand book
│  ◈ Brand Assistant                      │  Chat onipresente
├─────────────────────────────────────────┤
│  ◈ Workspace                            │  Config, equipe, billing
└─────────────────────────────────────────┘
```

### Pergunta principal de cada módulo

| Módulo | Pergunta que responde |
|--------|----------------------|
| Painel da Marca | O que eu preciso fazer hoje? |
| Posicionamento | Como o mercado me vê? |
| Listening — Social | O que estão falando sobre mim agora? |
| Listening — Search | Como me encontram e o que buscam? |
| Content | Quais palavras e temas devo reivindicar? |
| Brand System | Quem eu sou e como executo isso? |
| Brand Assistant | Como faço isso respeitando a minha marca? |
| Identity Gap | Quanto o que declaro difere do que percebem? |

---

## Stack Técnica

| Camada | Tecnologia | Decisão |
|--------|-----------|---------|
| Frontend | Vite + React 19 | Bundler rápido, HMR nativo |
| Roteamento | Hash-based manual | `getRoute()` em helpers.js — sem react-router |
| UI | Material UI v6 (@mui/material) | Tema dinâmico por marca via createTheme |
| Ícones | @mui/icons-material | Consistência com MUI |
| State global | React Context (WorkspaceContext.jsx) | Suficiente para o tamanho atual — Zustand adiado |
| Data fetching | supabase-js direto em useEffect | Sem TanStack Query por ora — adicionar se houver problema de cache/sincronização |
| Editor rich text | MUI TextField / controlled inputs | Lexical adiado — não vale a complexidade agora |
| Banco | Supabase (PostgreSQL) | Auth, RLS, Edge Functions, pg_vector |
| Streaming | **Netlify Functions (Node.js 20)** | Já funciona em produção — migrar para Edge Functions Deno só se houver timeout real |
| Servidor | Netlify Functions (Node.js 20) | CRUD, webhooks, cron, streaming |
| Variável AI | `ANTHROPIC_KEY` | Nome em produção — não renomear |
| AI (diagnóstico) | claude-sonnet-4-6 + web_search (sempre) | `aiConfig('premium')` — dev e prod iguais |
| AI (outros módulos) | Sonnet 4.5 dev / Sonnet 4.6 prod | `aiConfig('standard')` — web search só em prod |
| AI (tarefas simples) | Haiku 4.5 (sem web search) | `aiConfig('fast')` — barato, rápido |
| AI chat | Futuro: GPT-4o mini ou Gemini Flash | Brand Assistant conversacional — mais barato por token |
| AI social X | Futuro: Grok API | Busca de dados públicos no X/Twitter |
| AI social Meta | Futuro: Meta AI | Dados públicos de Facebook e Instagram |
| Embeddings | Anthropic voyage-3 | RAG do Brand Assistant |
| E-mail | Resend | Transacional + nurturing |
| Assets | Supabase Storage | Logos, fontes, moodboard, manuais PDF |
| Auth | Supabase Auth | JWT, sessões, invite links |
| Gráficos | Recharts | Evolução de scores, sentiment |

### Estratégia multi-modelo — gestão de custos de AI

O produto usa modelos diferentes por tipo de tarefa para otimizar custo sem sacrificar qualidade.

| Tarefa | Tier atual | Modelo | Modelo futuro | Motivo |
|--------|-----------|--------|--------------|--------|
| Diagnóstico de marca | `premium` | Sonnet 4.6 + web_search (sempre) | manter | Qualidade máxima — produto core. Sem web search alucina dados públicos |
| Extração de manual PDF | `premium` | Sonnet 4.6 | manter | Precisão crítica |
| Aprovação de campanha | `standard` | Sonnet 4.6 prod | manter | Avaliação estratégica |
| Keywords / Content Hub | `standard` | Sonnet 4.6 prod | SEO API | web_search adequado no MVP |
| Social Listening | `standard` | Sonnet 4.6 prod | Grok/Meta API | Dados nativos são mais completos |
| Brand Assistant (chat) | stream | Sonnet 4.6 | GPT-4o mini / Gemini Flash | Conversação — custo alto por token |
| Embeddings RAG | — | voyage-3 (futuro) | manter | Qualidade dos embeddings impacta o assistant |

**Princípio de implementação:**
- Abstrair o cliente de AI num `AIClient` em `src/lib/ai.js` — a troca de modelo não deve exigir mudança nas páginas
- Cada chamada deve registrar: modelo usado, tokens de input/output, custo estimado
- Dashboard de custos no admin mostra consumo por modelo e por workspace

```js
// src/lib/ai.js — abstração futura
export async function callAI(task, payload) {
  const config = AI_ROUTING[task] // task → modelo, endpoint, max_tokens
  return config.client.call(payload)
}

export const AI_ROUTING = {
  diagnostico:        { model: 'claude-sonnet-4-20250514', client: anthropic },
  manual_extraction:  { model: 'claude-sonnet-4-20250514', client: anthropic },
  campaign_approval:  { model: 'claude-sonnet-4-20250514', client: anthropic },
  assistant_chat:     { model: 'claude-sonnet-4-20250514', client: anthropic }, // → gpt-4o-mini futuramente
  content_keywords:   { model: 'claude-sonnet-4-20250514', client: anthropic },
  content_ideas:      { model: 'claude-sonnet-4-20250514', client: anthropic },
}
```

**Não implementar agora** — a troca de modelos acontece quando houver volume suficiente para justificar a complexidade. O MVP usa Anthropic em tudo. A estrutura já prevê a migração.

---

### Background Functions — Padrão obrigatório para IA

Todas as Netlify Functions que chamam IA usam sufixo `-background.js`. Netlify retorna 202 imediatamente, a function processa de forma assíncrona (até 15min), salva resultado no Supabase, e o frontend faz polling.

```
Padrão de implementação:
  POST /.netlify/functions/<nome>-background
  → 202 aceito imediatamente

  Background:
  → callAI({ ...aiConfig(tier) }) 
  → salva resultado em tabela Supabase
  → erro salvo como { _job_error: true, error: "..." }

  Frontend:
  → polling Supabase a cada 3s, since = timestamp antes do POST
  → timeout 2-3min, detecta _job_error
```

```
Functions de IA:
  diagnostico-gerar-background.js      → aiConfig('premium')
  content-hub-gerar-background.js      → aiConfig('standard') dev / aiConfig com web search prod
  listening-coletar-background.js      → aiConfig('standard')

Streaming SSE (apenas Brand Assistant):
  anthropic.js                         → proxy SSE — chat conversacional
```

**`aiConfig(tier)` em `netlify/functions/_ai.js`:**

| Tier | Modelo | Tokens | Web Search | Quando usar |
|------|--------|--------|-----------|-------------|
| `fast` | Haiku 4.5 | 4000 | nunca | dev simples, tarefas baratas |
| `standard` | Sonnet 4.5 (dev) / Sonnet 4.6 (prod) | 5000/6000 | só prod | análises gerais |
| `premium` | Sonnet 4.6 | 8000 | sempre | diagnóstico, extração PDF, qualidade crítica |

### Acesso ao banco — supabase-js em todo lugar

| Contexto | Cliente | RLS |
|----------|---------|-----|
| Frontend React | supabase-js com JWT do usuário | Respeita automaticamente |
| Netlify Functions admin | supabase-js com SUPABASE_SERVICE_KEY | Bypassa — sempre filtrar workspace_id explicitamente |
| Cron jobs | supabase-js com service key | Idem — filtro workspace_id obrigatório |

### Variáveis de ambiente

```
# Client-side (VITE_ prefix — inlined pelo Vite no bundle)
VITE_SUPABASE_URL=
VITE_SUPABASE_KEY=      # anon key — seguro expor, protegido por RLS
VITE_STRIPE_PUBLIC_KEY=
VITE_CALENDLY_URL=

# Server-side (Netlify Functions — nunca vão para o bundle)
ANTHROPIC_KEY=           # nunca ANTHROPIC_API_KEY — nome em produção
SUPABASE_URL=            # mesmo valor que VITE_SUPABASE_URL, usado pelas functions
SUPABASE_SERVICE_KEY=    # bypassa RLS — nunca expor
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_PRO=
STRIPE_PRICE_ENTERPRISE=
RESEND_API_KEY=
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
  typography: { fontFamily: "'Cairo', sans-serif" },
  shape: { borderRadius: 10 },
  components: {
    MuiButton:    { styleOverrides: { root: { textTransform: 'none', fontWeight: 700 } } },
    MuiCard:      { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiTextField: { defaultProps: { variant: 'outlined', size: 'small' } },
  }
})

// src/theme/buildBrandTheme.js — aplica o design system da marca na interface
export function buildBrandTheme(designSystem) {
  const { colors, typography, border_radius } = designSystem
  return createTheme({
    palette: {
      mode: 'light',
      primary:    { main: colors.primary.main, light: colors.primary.light, dark: colors.primary.dark },
      secondary:  { main: colors.secondary.main },
      background: { default: colors.background, paper: colors.surface },
    },
    typography: { fontFamily: `"${typography.font_primary}", sans-serif` },
    shape: { borderRadius: parseInt(border_radius?.sm ?? '8') },
  })
}
```

**Tokens de cor da plataforma:**
```
navy #0D1B2A · navyMid #162840 · navyLight #1E3550
green #0D9E7A · greenDim #0B8567 · greenPale #E1F5EE   (Posicionamento / sucesso)
pink #E8185A · pinkPale #FBEAF0                        (alertas / crise)
amber #EF9F27 · amberPale #FEF3C7                      (Social Listening / atenção)
purple #7F77DD · purplePale #EEEDFE                    (Brand System / assistant)
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
│   ├── edge-functions/              # Deno — streaming SSE
│   │   ├── anthropic.js
│   │   └── assistant-chat.js
│   └── functions/                   # Node.js 20 — CRUD, webhooks, cron
│       ├── _supabase.js
│       ├── _drizzle.js
│       ├── _middleware.js           # requireAuth, ok(), serverError()
│       ├── _prompts.js              # SYSTEM_PROMPT_DIAGNOSTICO, _PALAVRAS, _MANUAL, _IDEIAS
│       ├── _rag.js                  # chunks, embeddings, retrieval por brand_id
│       ├── _rateLimit.js
│       ├── cron-monitor.js          # diagnósticos automáticos — sequencial 12s
│       ├── auth/
│       ├── workspaces/
│       ├── intelligence/
│       │   ├── diagnose.js
│       │   ├── listen.js
│       │   └── alerts.js
│       ├── content/
│       │   ├── keywords.js          # análise de palavras-chave do domínio
│       │   ├── opportunities.js     # gap de conteúdo vs concorrentes
│       │   └── ideas.js             # clusters de tópicos + ideias on-brand
│       ├── brand-system/
│       │   ├── manual-extract.js    # PDF → Anthropic → brand book estruturado
│       │   ├── brand-book-update.js # atualiza seção + re-embed (debounce 2s)
│       │   ├── tokens.js            # retorna CSS custom properties
│       │   └── fonts.js             # proxy Google Fonts API
│       ├── campaigns/
│       └── emails/
│
├── src/
│   ├── main.jsx
│   ├── App.jsx                      # Router hash-based + auth guard
│   ├── theme/
│   │   ├── platformTheme.js
│   │   └── buildBrandTheme.js
│   ├── stores/
│   │   ├── authStore.js
│   │   ├── workspaceStore.js
│   │   ├── brandStore.js
│   │   └── assistantStore.js        # estado do chat lateral onipresente
│   ├── hooks/
│   │   ├── useWorkspace.js
│   │   ├── useCurrentBrand.js
│   │   ├── useBrandTheme.js
│   │   ├── useChat.js
│   │   ├── useReembed.js            # debounce 2s para re-embed do brand book
│   │   └── useApiError.js
│   ├── lib/
│   │   ├── supabase.js
│   │   ├── api.js
│   │   ├── runStream.js             # SSE com retry 3x e countdown 65s
│   │   ├── schemas.js
│   │   └── utils.js                 # fmtDate, calcularScoreLead, checkPlano,
│   │                                # PLANOS, calcIdentityGap, calcTemperatura
│   ├── components/
│   │   ├── common/
│   │   │   ├── GlobalStyle.jsx
│   │   │   ├── ScoreBar.jsx
│   │   │   ├── ScoreCard.jsx
│   │   │   ├── StatusChip.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── UpgradeGate.jsx
│   │   │   ├── StreamingView.jsx
│   │   │   ├── TemperaturaBar.jsx   # visual frio→morno→quente por rede social
│   │   │   └── PageLoader.jsx
│   │   ├── intelligence/
│   │   │   ├── DiagnosticoCard.jsx
│   │   │   ├── RelatorioCompleto.jsx
│   │   │   ├── SentimentChart.jsx
│   │   │   ├── TerritoryMap.jsx
│   │   │   ├── CompetitorGrid.jsx
│   │   │   └── IdentityGapCard.jsx
│   │   ├── content/
│   │   │   ├── KeywordTable.jsx     # tabela de palavras-chave com filtros
│   │   │   ├── RadarClusters.jsx    # visualização circular de tópicos
│   │   │   └── IdeiaCard.jsx
│   │   └── brand-system/
│   │       ├── BrandBookSection.jsx
│   │       ├── TokenSwatch.jsx
│   │       ├── TypeScale.jsx
│   │       ├── Moodboard.jsx
│   │       ├── AssetCard.jsx
│   │       ├── ChatBubble.jsx
│   │       ├── ChatInput.jsx
│   │       ├── AssistantDrawer.jsx  # sidebar lateral onipresente
│   │       ├── ContextPanel.jsx
│   │       ├── VerdictPanel.jsx
│   │       └── ApprovalBadge.jsx
│   ├── layouts/
│   │   ├── AuthLayout.jsx
│   │   ├── AppShell.jsx             # nav 6 grupos + AssistantDrawer sempre montado
│   │   └── BrandSystemLayout.jsx    # ThemeProvider dinâmico da marca
│   └── pages/
│       ├── public/
│       │   ├── RelatorioPublico.jsx    # rota pública mantida
│       │   └── Metodologia.jsx
│       ├── auth/
│       │   ├── Login.jsx          # único ponto de entrada público
│       │   └── Invite.jsx         # aceitar convite + definir senha
│       ├── app/
│       │   ├── Home.jsx                    # Painel da Marca
│       │   ├── Posicionamento.jsx          # F06
│       │   ├── ListeningSocial.jsx         # F07a
│       │   ├── ListeningSearch.jsx         # F07b
│       │   ├── Content.jsx                 # hub de conteúdo
│       │   ├── ContentPalavras.jsx         # F08
│       │   ├── ContentOportunidades.jsx    # F09
│       │   ├── ContentIdeias.jsx           # F10
│       │   ├── BrandSystem.jsx             # hub do brand system
│       │   ├── BrandManual.jsx             # F11
│       │   ├── BrandAssets.jsx             # F12
│       │   ├── BrandTokens.jsx             # F13
│       │   ├── BrandBook.jsx               # F14
│       │   ├── Campaigns.jsx               # F15 — dentro do brand system
│       │   ├── CampaignNew.jsx
│       │   ├── CampaignDetail.jsx
│       │   ├── BrandAssistant.jsx          # F16 — tela cheia
│       │   └── WorkspacePage.jsx
│       └── admin/
│           ├── AdminShell.jsx
│           ├── AdminWorkspaces.jsx    # lista + criar workspace + impersonation
│           ├── AdminSolicitacoes.jsx  # fila de aprovação
│           └── AdminHistorico.jsx
│
├── supabase/
│   └── functions/
│       ├── on-solicitacao-insert/
│       ├── on-diagnostico-approved/
│       ├── on-brand-book-updated/   # re-embed + recalc identity gap
│       ├── monthly-report/
│       └── nurturing/
│
├── db/
│   ├── schema.js
│   ├── migrations/
│   └── seed.js
│
└── public/
    └── index.html
```

---

## Roteamento

Hash-based. `getRoute()` em `src/lib/utils.js` lê `window.location.hash`.

| Hash | Componente | Acesso |
|------|-----------|--------|
| `` / `#/` | redirect → `#/login` | público |
| `#/metodologia` | Metodologia | público |
| `#/relatorio/:id` | RelatorioPublico | público |
| `#/login` | Login | público |
| `#/invite/:token` | Invite | público |
| `#/app` | Home | auth + plano |
| `#/app/posicionamento` | Posicionamento | auth + plano |
| `#/app/listening` | Listening (hub) | auth + Pro+ |
| `#/app/listening/social` | ListeningSocial | auth + Pro+ |
| `#/app/listening/search` | ListeningSearch | auth + Pro+ |
| `#/app/content` | Content | auth + plano |
| `#/app/content/palavras` | ContentPalavras | auth + plano |
| `#/app/content/oportunidades` | ContentOportunidades | auth + plano |
| `#/app/content/ideias` | ContentIdeias | auth + plano |
| `#/app/brand-system` | BrandSystem | auth |
| `#/app/brand-system/manual` | BrandManual | auth |
| `#/app/brand-system/assets` | BrandAssets | auth |
| `#/app/brand-system/tokens` | BrandTokens | auth |
| `#/app/brand-system/brand-book` | BrandBook | auth |
| `#/app/brand-system/aprovacoes` | Campaigns | auth + Pro+ |
| `#/app/assistant` | BrandAssistant | auth |
| `#/app/workspace` | WorkspacePage | auth |
| `#/admin` | AdminWorkspaces | auth + platform_admin |
| `#/admin/solicitacoes` | AdminSolicitacoes | auth + platform_admin |
| `#/admin/historico` | AdminHistorico | auth + platform_admin |

---

## Banco de Dados

### Schema completo

```sql
-- ═══════════════════════════════════
-- CORE
-- ═══════════════════════════════════

create table workspaces (
  id                      uuid default gen_random_uuid() primary key,
  created_at              timestamptz default now(),
  nome                    text not null,
  dominio                 text,
  setor                   text,
  porte                   text,
  plano                   text default 'trial',
  plano_status            text default 'active',
  -- stripe_customer_id e stripe_subscription_id: adicionar quando billing for implementado
  trial_ends_at           timestamptz default (now() + interval '14 days'),
  diagnosticos_mes        int default 0,
  diagnosticos_reset_at   timestamptz default (date_trunc('month', now()) + interval '1 month')
);

create table workspace_members (
  id            uuid default gen_random_uuid() primary key,
  workspace_id  uuid references workspaces(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete cascade,
  role          text default 'member',
  created_at    timestamptz default now(),
  unique(workspace_id, user_id)
);

-- Convites gerados pelo admin para clientes
create table workspace_invites (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id) on delete cascade,
  email         text not null,
  token         text unique not null,
  expires_at    timestamptz default (now() + interval '7 days'),
  aceito_at     timestamptz,
  convidado_por uuid references auth.users(id)
);

alter table workspace_invites enable row level security;

-- Admins da plataforma LOUDR — separado do sistema de roles por workspace
create table platform_admins (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade unique,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════
-- INTELLIGENCE
-- ═══════════════════════════════════

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
  rede          text default 'geral',  -- geral | instagram | linkedin | google_reviews | reclame_aqui | glassdoor
  positivo_pct  numeric,
  neutro_pct    numeric,
  negativo_pct  numeric,
  volume_total  int
);

create index on sentiment_snapshots (workspace_id, rede, data);

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

-- ═══════════════════════════════════
-- CONTENT
-- ═══════════════════════════════════

create table content_keywords (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id),
  termo         text not null,
  volume        text,                  -- alto | medio | baixo
  intencao      text,                  -- informacional | transacional | navegacional
  dificuldade   text,                  -- alta | media | baixa
  pagina        text,
  tipo          text default 'dominio' -- dominio | oportunidade
);

create index on content_keywords (workspace_id, tipo);

create table content_ideas (
  id              uuid default gen_random_uuid() primary key,
  created_at      timestamptz default now(),
  workspace_id    uuid references workspaces(id),
  palavra_semente text,
  cluster         text,                -- o_que | como | quando | onde | por_que | vs
  pergunta        text,
  ideia_gerada    text,
  status          text default 'ideia' -- ideia | em_producao | publicado
);

create index on content_ideas (workspace_id, status);

-- ═══════════════════════════════════
-- BRAND SYSTEM
-- ═══════════════════════════════════

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

create table brand_manuals (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id),
  brand_id      uuid references brands(id),
  arquivo_url   text,
  status        text default 'processando', -- processando | extraido | erro
  extracao      jsonb
);

create table brand_assets (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id),
  brand_id      uuid references brands(id),
  tipo          text,                  -- logo | fonte | cor | outro
  nome          text,
  arquivo_url   text,
  formato       text,                  -- svg | png | woff2 | hex
  versao        int default 1
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

-- RAG: habilitar pg_vector com: supabase db execute "create extension if not exists vector"
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

-- ═══════════════════════════════════
-- INTEGRAÇÃO
-- ═══════════════════════════════════

create table identity_gap_snapshots (
  id                    uuid default gen_random_uuid() primary key,
  created_at            timestamptz default now(),
  brand_id              uuid references brands(id),
  workspace_id          uuid references workspaces(id),
  diagnostico_id        uuid references diagnosticos(id),
  gap_score             numeric,
  gap_narrativa         text,
  dimensoes             jsonb,
  declarado_scores      jsonb,
  percebido_scores      jsonb
);

-- ═══════════════════════════════════
-- AUTOMAÇÕES
-- ═══════════════════════════════════

create table nurturing_emails (
  id              uuid default gen_random_uuid() primary key,
  solicitacao_id  uuid references solicitacoes(id) on delete cascade,
  dia             int not null,
  enviado_at      timestamptz default now(),
  status          text default 'enviado',
  unique(solicitacao_id, dia)
);
```

### RLS — ativar em todas as tabelas

```sql
-- Habilitar em todas
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table platform_admins enable row level security;
alter table diagnosticos enable row level security;
alter table solicitacoes enable row level security;
alter table listening_events enable row level security;
alter table sentiment_snapshots enable row level security;
alter table concorrentes enable row level security;
alter table diagnosticos_concorrentes enable row level security;
alter table alertas enable row level security;
alter table content_keywords enable row level security;
alter table content_ideas enable row level security;
alter table brands enable row level security;
alter table brand_manuals enable row level security;
alter table brand_assets enable row level security;
alter table brand_books enable row level security;
alter table brand_book_history enable row level security;
alter table brand_book_chunks enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table campaigns enable row level security;
alter table identity_gap_snapshots enable row level security;
alter table nurturing_emails enable row level security;

-- Padrão: membro acessa dados do seu workspace
create policy "membro acessa workspace" on workspaces
  for all using (id in (select workspace_id from workspace_members where user_id = auth.uid()));

create policy "leitura publica diagnosticos" on diagnosticos
  for select using (publico = true);
create policy "workspace acessa diagnosticos" on diagnosticos
  for all using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

create policy "publico pode solicitar" on solicitacoes
  for insert to anon, authenticated with check (true);

-- Repetir padrão workspace_id para: listening_events, sentiment_snapshots,
-- concorrentes, diagnosticos_concorrentes, alertas, content_keywords,
-- content_ideas, brands, brand_manuals, brand_assets, brand_books,
-- brand_book_history, brand_book_chunks, conversations, messages,
-- campaigns, identity_gap_snapshots
```

---

## Planos e Limites

```js
// src/lib/constants.js
export const PLANOS = {
  trial: {
    nome: 'Trial', preco: 0,
    diagnosticos_mes: 1, monitor: null, concorrentes: 0,
    social_listening: false, membros: 1,
  },
  starter: {
    nome: 'Starter', preco: 490,
    diagnosticos_mes: 1, monitor: 'mensal', concorrentes: 5,
    social_listening: false, membros: 1,
  },
  pro: {
    nome: 'Pro', preco: 1490,
    diagnosticos_mes: 3, monitor: 'semanal', concorrentes: 5,
    social_listening: true, membros: 3,
  },
  enterprise: {
    nome: 'Enterprise', preco: 3990,
    diagnosticos_mes: Infinity, monitor: 'diario', concorrentes: 15,
    social_listening: true, membros: Infinity,
  },
}

export function checkPlano(workspace, feature) {
  if (workspace.id === '00000000-0000-0000-0000-000000000001') return true // LOUDR admin
  return PLANOS[workspace.plano]?.[feature] ?? false
}
```

---

## System Prompts

### SYSTEM_PROMPT_DIAGNOSTICO

```
Você é o Brand Intelligence Agent da LOUDR — agência de Smart Branding.

A LOUDR opera pelo framework Smart Branding com 4 práticas:
1. INTELIGÊNCIA & SINGULARIDADE — posicionamento, arquitetura, cultura, essência
2. EXPERIÊNCIA & EXPRESSÃO — identidade visual e verbal, storytelling, design system
3. PLATAFORMAS & ECOSSISTEMAS — produto digital, e-commerce, plataformas, integrações
4. FUTURO & ESCALA — data, AI, growth branding, CRM, performance

Faça EXATAMENTE 5 buscas web:
(1) site oficial e LinkedIn
(2) redes sociais e posicionamento
(3) Reclame Aqui e Google Reviews
(4) Glassdoor e cultura interna
(5) notícias recentes e concorrentes

Responda SOMENTE com JSON válido, sem markdown:

{
  "empresa": "...", "dominio": "...", "setor": "...", "porte": "Startup|PME|Médio|Grande",
  "frase_diagnostico": "frase cirúrgica e provocativa",
  "resumo_executivo": "...",
  "identidade_declarada": "...", "identidade_percebida": "...", "gap_identidade": "...",
  "praticas_loudr": {
    "inteligencia_singularidade": { "score": 0, "diagnostico": "...", "evidencias": "...", "oportunidade": "..." },
    "experiencia_expressao":      { "score": 0, "diagnostico": "...", "evidencias": "...", "oportunidade": "..." },
    "plataformas_ecossistemas":   { "score": 0, "diagnostico": "...", "evidencias": "...", "oportunidade": "..." },
    "futuro_escala":              { "score": 0, "diagnostico": "...", "evidencias": "...", "oportunidade": "..." }
  },
  "score_singularidade": 0, "score_consistencia": 0, "score_posicionamento": 0,
  "score_experiencia": 0, "score_escala": 0,
  "concorrentes": [{ "nome": "...", "diferencial": "...", "ameaca": "baixa|media|alta", "sinal": "..." }],
  "oportunidades": [{ "titulo": "...", "descricao": "...", "pratica_loudr": "...", "impacto": "alto|medio|baixo", "prazo": "imediato|curto|médio prazo" }],
  "quick_wins": ["..."],
  "territorio_inexplorado": "...",
  "pergunta_provocativa": "..."
}

Scores: 1–3 crítico · 4–6 em desenvolvimento · 7–8 sólido · 9–10 referência
```

### SYSTEM_PROMPT_MANUAL
Ver seção F11 — o prompt completo está especificado dentro da funcionalidade, junto com o template do design.md.

### SYSTEM_PROMPT_PALAVRAS

```
Você é o Brand Intelligence Agent da LOUDR. Analise o domínio informado e identifique as palavras-chave do negócio usando busca web.

Retorne SOMENTE JSON válido:
{
  "dominio": "...",
  "palavras_chave": [
    { "termo": "...", "volume": "alto|medio|baixo", "intencao": "informacional|transacional|navegacional", "dificuldade": "alta|media|baixa", "pagina": "..." }
  ]
}
```

### SYSTEM_PROMPT_IDEIAS (com RAG)

```
Você é o Brand Assistant da marca {brand_name}.

CONTEXTO DA MARCA (fragmentos relevantes):
{rag_chunks}

Gere clusters de perguntas e temas em torno da palavra-chave "{palavra_semente}".
Organize por intenção: o_que | como | quando | onde | por_que | vs
Para cada tema, gere uma ideia de conteúdo que respeite o tom de voz e o vocabulário da marca.

Retorne SOMENTE JSON:
{
  "palavra_semente": "...",
  "clusters": [
    { "tipo": "o_que|como|...", "pergunta": "...", "ideia": "..." }
  ]
}
```

---

## Especificação de Funcionalidades

---

### F01 · Entrada — Redirect para Login
**Arquivo:** `src/App.jsx` (lógica de roteamento) · **Rota:** `#/`

A rota raiz redireciona direto para `#/login`. Não há landing page pública por ora.

**Motivo:** o produto está em fase de validação com clientes selecionados. A landing page de captura de leads pode ser implementada depois, quando o modelo comercial estiver validado.

```js
// src/lib/utils.js — getRoute()
if (!hash || hash === '#/') return redirect('#/login')
```

A rota `#/relatorio/:id` continua pública para relatórios compartilhados.

**Git:** `feat: F01 entrada redirect login` → push

---

### F02 · Relatório Público
**Arquivo:** `src/pages/public/RelatorioPublico.jsx` · **Rota:** `#/relatorio/:id` · **Auth:** não requer

Leitura pública via RLS · Relatório completo · Gate de e-mail antes das oportunidades · Botão Calendly

**Git:** `feat: F02 relatorio publico` → push

---

### F03 · Autenticação — Acesso por convite
**Arquivos:** `src/pages/auth/` · **Rotas:** `#/login` · `#/invite/:token`

O produto é fechado. Não existe cadastro público nem self-service de onboarding.

**Formas de acesso:**
1. **Admin master** (danilo@loudr.com.br) — acessa diretamente via login. Tem acesso a todos os workspaces
2. **Cliente convidado** — recebe link de convite gerado pelo admin. Clica no link, define senha, acessa o workspace

**Login (`#/login`):**
- Email + senha via `supabase.auth.signInWithPassword()`
- Rate limiting: 10 tentativas por IP em 15 minutos
- Redirect: admin master → `#/admin` · cliente → `#/app`
- Sem opção de "criar conta" visível na tela

**Convite (`#/invite/:token`):**
- Token gerado pelo admin com validade de 7 dias
- Página de aceite: exibe nome do workspace + campo de senha
- Ao confirmar: cria usuário no Supabase Auth + vincula ao workspace
- Redirect para `#/app` após ativação

**Rotas removidas:** `#/register` e `#/onboarding` não existem neste modelo

**Git:** `feat: F03 auth login por convite` → push

---

### F04 · Painel da Marca (Dashboard)
**Arquivo:** `src/pages/app/Home.jsx` · **Rota:** `#/app` · **Auth:** requer

```
Header: LOUDR Score Global + variação 24h + frase diagnóstica + Quick Actions
Grid:   Donut sentiment | Consistência brand book | Share of Voice | Radar pilares
Body:   Sugestões proativas do assistant (cards discretos) + botão Deep Strategy
Footer: Timeline de atividade + Quick Wins do dia
```

**Git:** `feat: F04 painel da marca dashboard` → push

---

### F05 · Admin LOUDR — Painel de Controle
**Arquivos:** `src/pages/admin/` · **Rota:** `#/admin` · **Auth:** platform_admin

O admin master (danilo@loudr.com.br) tem controle total da plataforma.

#### Seções do painel admin

**Workspaces (`#/admin`)**
- Lista de todos os workspaces ativos com nome, plano, membros, último diagnóstico
- Botão "Criar workspace" — abre modal: nome da empresa + domínio + setor
- Ao criar: workspace é gerado imediatamente, admin master é adicionado como owner
- Botão "Entrar como cliente" por workspace → impersonation (ver abaixo)
- Botão "Convidar cliente" por workspace → gera link de convite

**Convidar cliente:**
- Admin informa o e-mail do cliente
- Sistema gera token de convite com validade de 7 dias
- E-mail enviado via Resend com link `#/invite/:token`
- Ao aceitar: usuário define senha e acessa o workspace

**Solicitações (`#/admin/solicitacoes`)**
- Fila com score de qualificação · Aprovar/Rejeitar
- Cooldown 120s entre aprovações · Streaming ao aprovar
- E-mail automático ao concluir · Stats de conversão

**Histórico (`#/admin/historico`)**
- Todos os diagnósticos gerados na plataforma
- Filtros por workspace, data, tipo

#### Impersonation — entrar no ambiente do cliente

O admin master pode acessar qualquer workspace como se fosse o próprio cliente, sem precisar da senha dele.

```js
// src/stores/authStore.js
{
  user: { ... },
  impersonating: null,  // { workspaceId, workspaceName } quando em modo impersonation
}
```

**Fluxo:**
1. Admin clica "Entrar como cliente" no workspace X
2. `impersonating` é setado no Zustand com os dados do workspace
3. Interface muda para o contexto do workspace X — nav, dados, tema da marca
4. Banner âmbar no topo: "Você está no ambiente de [Nome do Cliente] · Sair"
5. Ao clicar "Sair": `impersonating` volta para null, retorna para `#/admin`

**Segurança:**
- Impersonation é apenas client-side (Zustand) — as queries ao Supabase ainda usam o JWT do admin
- O admin já tem acesso via RLS (platform_admins bypassa via service key nas functions)
- Nenhuma senha do cliente é exposta ou usada

**Git:** `feat: F05 admin workspaces convites impersonation` → push

---

### F06 · Posicionamento (Inteligência unificada) ✅
**Arquivo:** `src/pages/app/Posicionamento.jsx` · **Rota:** `#/app/posicionamento`
**Substitui:** Diagnostico.jsx + Evolucao.jsx + Concorrentes.jsx

```
Topo:     3 scores + variação + frase diagnóstica + Identity Gap + botão "Gerar novo"
Seção 1:  Tabela de diagnósticos — empresa, data, scores, download PDF, compartilhar
Seção 2:  Gráfico de linha Recharts — 5 scores no tempo, seletor período, marcadores
Seção 3:  Concorrentes (Starter+) — slot cards visuais + sugestões do diagnóstico
```

**Geração server-side:** `gerarDiagnosticoServidor()` → `diagnostico-gerar.js`
- Empresa preenchida automaticamente do `workspace.dominio` (sem campo manual)
- FormDialog lista as 5 fontes pesquisadas
- Loading screen com steps animados + tela de erro com botão Voltar
- Salva em `diagnosticos` (tipo: 'manual') mesmo se o browser fechar durante a geração

**Concorrentes:** slots visuais fixos por plano (starter: 5, pro: 5, enterprise: 15)
Sugestões automáticas dos concorrentes detectados no último diagnóstico.

**Git:** `feat: F06 posicionamento merge inteligencia` → push

---

### F07 · Listening — Social + Search
**Arquivos:** `src/pages/app/SocialListening.jsx` + (Search: pendente)
**Rotas:** `#/app/listening` · **Auth:** Pro+

#### F07a · Social — O que falam sobre mim ✅

```
Topo:   3 score cards (positivo/neutro/negativo %) + botão "Coletar menções"
Corpo:  Gráfico de área Recharts — evolução do sentimento 7d/30d/90d
Tópicos: Trend Discovery — palavras mais frequentes nos eventos
Feed:   Eventos filtráveis por fonte e sentiment
```

**Coleta server-side:** `coletarListening()` → `listening-coletar.js`
- **8 chamadas paralelas** ao Anthropic, uma por plataforma:
  Twitter/X · Instagram · Facebook · TikTok · LinkedIn · Reclame Aqui · Google Reviews · News
- Cada chamada: 1 busca focada, max_tokens 1024, retorna JSON de eventos
- **Deduplicação por URL** — eventos com URL já existente no workspace são ignorados
- Salva em `listening_events` + snapshot em `sentiment_snapshots`
- Tempo total: ~15-20s em produção (paralelo) · Timeout: 60s

Fontes atuais: web_search pública via Anthropic
Fontes futuras: Grok API (X/Twitter), Meta AI API (Facebook, Instagram)

#### F07b · Search — Como me encontram ❌ (pendente)

```
Topo:   Volume de buscas orgânicas estimado + variação vs mês anterior
Corpo:  Termos de busca que levam ao site — tabela por volume e intenção
        Comparativo: marca vs concorrentes nos mesmos termos
Alertas: Novo concorrente dominando termo que você reivindica
```

Fontes MVP: Anthropic web_search analisa resultados de busca do domínio
Fontes futuras: Google Search Console API (dados reais de clique e impressão)

**Git:** `feat: F07 listening social e search` → push

---

### F08 · Content — Palavras-chave
**Arquivo:** `src/pages/app/ContentPalavras.jsx` · **Rota:** `#/app/content/palavras`

Análise do domínio via Anthropic web_search → retorna palavras-chave estruturadas
Tabela: termo, volume, intenção, dificuldade, página de origem
Filtros por intenção e volume · Busca por termo · Botão "Atualizar análise"

**Git:** `feat: F08 content palavras chave dominio` → push

---

### F09 · Content — Oportunidades
**Arquivo:** `src/pages/app/ContentOportunidades.jsx` · **Rota:** `#/app/content/oportunidades`

Palavras-chave do setor que a empresa ainda não reivindica.
Cruza keywords do domínio (F08) com keywords dos concorrentes → identifica gap
Tabela: termo, volume, quem domina, gap (sim/não), potencial de impacto
Ordenado por impacto · CTA por linha: "Gerar ideia para este termo" → ContentIdeias

**Git:** `feat: F09 content oportunidades gap conteudo` → push

---

### F10 · Content — Ideias
**Arquivo:** `src/pages/app/ContentIdeias.jsx` · **Rota:** `#/app/content/ideias`

Inspirado no AnswerThePublic — clusters de perguntas on-brand.

```
Campo:   Busca por palavra-chave semente
Visual:  RadarClusters — círculo de tópicos agrupados por: o que / como / quando / onde / por que / vs
Clique:  Gera ideia de conteúdo respeitando tom de voz via RAG do Brand System
Lista:   Ideias salvas com status (ideia / em produção / publicado)
```

Diferencial: ideias geradas respeitam vocabulário e tom do Brand System — não são genéricas.

**Git:** `feat: F10 content ideias clusters on-brand` → push

---

### F11 · Brand System — Manual de Marca
**Arquivo:** `src/pages/app/BrandManual.jsx` · **Rota:** `#/app/brand-system/manual`

Fonte primária de inteligência do sistema. O cliente sobe o manual em PDF — a IA lê, extrai, normaliza e gera um `design.md` estruturado seguindo o padrão de mercado. Esse arquivo é o ativo central: alimenta o brand book, os tokens, o RAG do assistant e serve como contexto para qualquer modelo de IA futuro.

### Fluxo completo

```
1. Upload       PDF do manual → Supabase Storage (arquivo original preservado)
2. Extração     Netlify Function → Anthropic API com PDF como base64
                claude-sonnet-4 lê o PDF inteiro e extrai todas as informações
3. Geração      IA gera o design.md no padrão estruturado (ver abaixo)
4. Salvamento   design.md salvo como texto em brand_manuals.design_md (Supabase)
5. Preview      Usuário revisa o design.md gerado antes de confirmar
6. Propagação   Ao confirmar: preenche brand_books + design tokens + re-embed RAG
7. Status       processando → extraído → confirmado | erro
```

### O que é o design.md

Documento de texto estruturado em Markdown que captura toda a identidade de marca de forma que qualquer modelo de IA consiga entender e usar como contexto. Segue o padrão já usado por times de design e desenvolvimento para documentar design systems.

```markdown
# [Nome da Marca] — Design System

## Identidade da Marca
**Missão:** ...
**Visão:** ...
**Valores:** valor1 · valor2 · valor3
**Arquétipo:** O Criador / O Herói / etc.
**Posicionamento:** ...

## Tom de Voz
**Personalidade:** adjetivo1, adjetivo2, adjetivo3
**Formal ↔ Informal:** 3/10 (muito informal)
**Técnico ↔ Acessível:** 7/10 (acessível)
**Emocional ↔ Racional:** 5/10 (equilibrado)

**Escreva assim:**
- Use linguagem próxima e direta
- Prefira frases curtas e ativas
- Celebre o cliente, não o produto

**Nunca escreva:**
- Não use jargão técnico sem explicação
- Evite tom corporativo ou distante

## Vocabulário
**Palavras on-brand:** transformar, criar, juntos, potencializar, autêntico
**Palavras proibidas:** barato, urgente, promoção imperdível, oferta relâmpago

## Paleta de Cores
| Token | Hex | Uso |
|-------|-----|-----|
| primary | #C8625A | CTAs, destaques, links |
| secondary | #F5E6D3 | Backgrounds, superfícies |
| text | #1A1A1A | Texto principal |
| muted | #8A8A8A | Texto secundário |

## Tipografia
**Display / Títulos:** Cormorant Garamond — peso 400, 700
**Corpo / UI:** Inter — peso 400, 500
**Escala:** 12 / 14 / 16 / 20 / 24 / 32 / 40 / 56px

## Espaçamento
Base: 8px · Escala: 4, 8, 12, 16, 24, 32, 48, 64, 96px

## Bordas e Raios
**Border radius:** sm 4px · md 8px · lg 16px · pill 9999px
**Bordas:** 1px solid — tom suave, nunca pesado

## Referências Visuais
- Marcas que admiramos: [marca1], [marca2]
- O que nos diferencia delas: ...
- Estética geral: editorial, fotografia real, assimetria intencional

## Concorrentes Declarados
| Empresa | Diferencial deles | Nossa diferença |
|---------|------------------|----------------|
| ... | ... | ... |

## Não somos
- Não somos uma marca de luxo inacessível
- Não somos uma marca genérica de massa
- Não somos formais ou corporativos
```

### SYSTEM_PROMPT_MANUAL_EXTRACTION

```
Você é o Brand Intelligence Agent da LOUDR.

Analise o manual de marca enviado e gere um design.md completo seguindo o padrão abaixo.
Seja fiel ao que está no documento — não invente informações ausentes.
Quando uma informação não estiver no manual, omita a seção em vez de preencher com placeholder.
Use linguagem técnica precisa nos campos de design (nomes corretos de fontes, hexadecimais exatos).

O design.md deve ser autocontido: qualquer modelo de IA que receba esse documento como contexto deve conseguir tomar decisões de marca sem precisar do PDF original.

Retorne APENAS o conteúdo do design.md em Markdown, começando com "# [Nome da Marca] — Design System".
Não inclua explicações antes ou depois do documento.
```

### Schema atualizado

```sql
alter table brand_manuals add column design_md text;
-- Armazena o design.md gerado como texto puro
-- Indexado para busca futura e usado diretamente no RAG
```

### Integração com o RAG

O `design.md` completo é chunkizado e embedado em `brand_book_chunks` com `section = 'design_md'`. Isso permite que o Brand Assistant use trechos específicos conforme a pergunta — tipografia quando fala de visual, tom de voz quando fala de copy.

### Valor estratégico

O `design.md` gerado pela LOUDR é um ativo da plataforma:
- Serve como contexto para o Brand Assistant (RAG)
- Alimenta os design tokens automaticamente
- Pode ser passado como contexto para qualquer modelo de IA externo
- É o padrão que times de desenvolvimento usam para alinhar design e código
- Com volume, a LOUDR acumula o maior acervo de design systems documentados do Brasil

**Git:** `feat: F11 brand system manual design-md extracao` → push

---

### F12 · Brand System — Assets
**Arquivo:** `src/pages/app/BrandAssets.jsx` · **Rota:** `#/app/brand-system/assets`

Upload de logos SVG/PNG, fontes, paleta de cores
Organização por tipo · Versionamento · Link CDN copiável (Supabase Storage público)

**Git:** `feat: F12 brand system asset library` → push

---

### F13 · Brand System — Design Tokens
**Arquivo:** `src/pages/app/BrandTokens.jsx` · **Rota:** `#/app/brand-system/tokens`

Color picker por token · Preview MUI Theme em tempo real · Escala tipográfica
Gerado a partir do manual (F11) ou preenchido manualmente
Exportar: design.md · tokens.json · CSS custom properties

**Git:** `feat: F13 brand system design tokens` → push

---

### F14 · Brand System — Brand Book
**Arquivo:** `src/pages/app/BrandBook.jsx` · **Rota:** `#/app/brand-system/brand-book`

```
Seção Identidade:     Missão, visão, valores, arquétipo, tom, vocabulário on-brand vs proibido
Seção Posicionamento: Proposta de valor, personas, diferenciação
Seção Histórico:      Changelog com diff por seção
```

Edição inline com Lexical · Toda edição → `brand_book_history` · Re-embed com debounce 2s · Recalcula Identity Gap

**Git:** `feat: F14 brand system brand book editor` → push

---

### F15 · Brand System — Aprovações (Campanhas)
**Arquivo:** `src/pages/app/Campaigns.jsx` · **Rota:** `#/app/brand-system/aprovacoes` · **Auth:** Pro+

Aprovação de campanhas contra as diretrizes do Brand System via RAG.
Dimensões avaliadas: tom de voz · consistência de valores · vocabulário proibido · posicionamento · guidelines visuais
Interface: conteúdo submetido + veredicto lado a lado · score + badge · sugestões inline

**Git:** `feat: F15 brand system aprovacoes campanhas` → push

---

### F16 · Brand Assistant (tela cheia + sidebar lateral)
**Arquivo:** `src/pages/app/BrandAssistant.jsx` · **Rota:** `#/app/assistant`

**Duas formas de acesso:**
1. Tela cheia em `#/app/assistant` — 3 colunas: histórico / chat / painel RAG
2. Sidebar lateral via `AssistantDrawer` — abre em qualquer tela sem perder contexto

**RAG:**
- Embedding da mensagem (voyage-3)
- 5 chunks mais similares WHERE brand_id = :id
- System prompt com apenas esses chunks — brand book nunca enviado inteiro

**Contextual:** sabe em qual módulo o usuário está — adapta sugestões automaticamente
"Você está vendo as oportunidades de conteúdo, quer que eu gere uma ideia?"

**Estado global (Zustand):**
```js
// src/stores/assistantStore.js
{ isOpen: false, conversationId: null, messages: [], contextoTela: null }
```

**Git:** `feat: F16 brand assistant promovido sidebar lateral` → push

---

### F17 · Workspace — Configurações
**Arquivo:** `src/pages/app/WorkspacePage.jsx` · **Rota:** `#/app/workspace`

Abas: Empresa · Equipe (convite, roles) · Alertas (canais, frequência)

**Git:** `feat: F17 workspace configuracoes` → push

---

### F18 · Integração — Identity Gap
**Componente:** `src/components/intelligence/IdentityGapCard.jsx` · Transversal

```
Score:     Gap 0–10 (0 = alinhamento perfeito) por dimensão
Narrativa: Texto gerado por IA
Evolução:  Gráfico de linha do gap ao longo do tempo
Ação:      "Qual edição no brand book fecha esse gap?"
Aparece:   Painel da Marca (grid) | Posicionamento (abaixo scores) | Brand Book (banner se gap > 3)
```

**Algoritmo:**
```js
export function calcIdentityGap(brandBook, diagnostico) {
  const dims = [
    { nome: 'singularidade', declarado: brandBook.identity?.positioning_clarity ?? 5, percebido: diagnostico.score_singularidade ?? 5 },
    { nome: 'consistencia',  declarado: calcConsistenciaScore(brandBook.design_system), percebido: diagnostico.score_consistencia ?? 5 },
    { nome: 'posicionamento',declarado: brandBook.positioning?.differentiation_score ?? 5, percebido: diagnostico.score_posicionamento ?? 5 },
    { nome: 'experiencia',   declarado: brandBook.identity?.tone_clarity ?? 5, percebido: diagnostico.score_experiencia ?? 5 },
    { nome: 'escala',        declarado: calcReferencesScore(brandBook.references), percebido: diagnostico.score_escala ?? 5 },
  ]
  const gaps = dims.map(d => ({ ...d, gap: Math.abs(d.declarado - d.percebido) }))
  const gap_score = parseFloat((gaps.reduce((s, d) => s + d.gap, 0) / gaps.length).toFixed(1))
  return { gap_score, dimensoes: gaps }
}
```

**Trigger:** novo diagnóstico gerado · brand book atualizado · cron diário Enterprise

**Git:** `feat: F18 identity gap integration` → push

---

### F19 · Automações
| Gatilho | Ação | Runtime |
|---------|------|---------|
| INSERT solicitacoes | E-mail equipe LOUDR + score do lead | Supabase Edge Function |
| UPDATE status=aprovado | E-mail relatório + Calendly para lead | Supabase Edge Function |
| Diagnóstico gerado | Nurturing D+2, D+5, D+10, D+15 (idempotente) | Netlify Function |
| Diagnóstico gerado | Recalcular Identity Gap se brand book ativo | Netlify Function |
| Brand book atualizado | Re-embed seção (debounce 2s) + recalcular gap | Netlify Function |
| Manual extraído | Preencher brand_book + tokens + re-embed completo | Netlify Function |
| Cron semanal Pro + mensal Starter | Diagnóstico automático real via Anthropic (15s delay entre workspaces) | Netlify cron — toda segunda 8h |
| Cron diário Enterprise | Diagnóstico automático real (todo dia) | Netlify cron — toda segunda 8h (enterprise: `diaDaSemana` ignorado) |
| Dia 1 do mês | Relatório mensal PDF por e-mail | Supabase Edge Function |

**Throttling:**
```js
// netlify/functions/cron-monitor.js
// Chama Anthropic API diretamente (não-streaming), salva diagnóstico com tipo='cron'
// Modelo: Haiku local / Sonnet produção · Delay: 15s entre workspaces
for (const ws of workspaces) {
  if (!verificarFrequencia(ws.plano, diaDaSemana, hoje)) continue
  try { await gerarDiagnostico(empresa, null) }
  catch (err) { console.error(`Erro ${ws.id}:`, err.message) }
  await new Promise(r => setTimeout(r, 15000)) // nunca em paralelo
}
```

**Nurturing idempotente:**
```ts
const { error } = await supabase.from('nurturing_emails')
  .insert({ solicitacao_id, dia, status: 'enviado' })
if (error?.code === '23505') return // já enviado — ignorar silenciosamente
```

**Git:** `feat: F19 automacoes throttling nurturing` → push

---

## Conta Admin — danilo@loudr.com.br

```sql
-- db/seed.js
INSERT INTO workspaces (id, nome, dominio, plano, plano_status, trial_ends_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'LOUDR', 'loudr.com.br', 'enterprise', 'active', NULL);

INSERT INTO platform_admins (user_id) VALUES (:user_id_danilo);
```

- Sem onboarding — login vai direto para `#/admin`
- Sem cobrança — `checkPlano()` retorna `true` para qualquer feature
- Sem trial — `trial_ends_at = NULL`

---

## Git Workflow

```bash
# Após cada funcionalidade entregue e testada
git add .
git commit -m "feat: F06 posicionamento merge inteligencia"
git push origin dev
# Nunca commitar na main — merge só após validação da fase
```

**Convenção:** `feat:` nova feature · `fix:` correção · `chore:` manutenção · `refactor:` refatoração

---

## Regras de Desenvolvimento

1. **MUI sempre** — `sx prop` + `styled()`. Nunca inline style
2. **Tema via ThemeProvider** — `platformTheme` na plataforma, `buildBrandTheme()` em contexto de marca
3. **WorkspaceContext para estado global** — `useWorkspace()` em qualquer componente que precise do workspace
4. **supabase-js direto** — fetch em useEffect com supabase-js. Sem TanStack Query por ora
5. **supabase-js no frontend** — respeita RLS. Functions admin usam supabase-js com SUPABASE_SERVICE_KEY + filtro workspace_id explícito
6. **RLS em toda tabela nova** — isolamento por workspace_id sem exceção
7. **Streaming via Netlify Functions** — `/.netlify/functions/anthropic` para diagnóstico e assistant
8. **ANTHROPIC_KEY nunca no frontend** — sempre via Netlify Function
9. **Rate limit 429** — retry com countdown circular (3x, 65s)
10. **RAG por brand_id** — brand book nunca enviado integralmente para a API
11. **Cron sequencial** — loop com await + delay 12s. Nunca processar em paralelo
12. **Debounce em re-embeds** — `useReembed()` com 2s. Nunca chamar no onChange direto
13. **Nurturing idempotente** — checar `nurturing_emails (solicitacao_id, dia)` antes de enviar
14. **Manual é fonte primária** — extração do PDF preenche brand book, tokens e RAG. Não pedir ao usuário o que o manual já responde
15. **Content respeita a marca** — ideias geradas usam RAG do Brand System, nunca genéricas
16. **Assistant persiste estado** — WorkspaceContext ou prop drilling mantém chat entre telas via sidebar
17. **Temperatura é visual** — cor obrigatória além do número (azul/amber/vermelho)
18. **Merge não destrói** — ao unificar telas, reaproveitar componentes existentes
19. **SPECS.md é documento vivo** — marcar como concluído após cada entrega

---

## Checklist de QA — Executar antes de cada commit

**Qualidade geral:**
- [ ] Feature funciona do início ao fim sem erro no console
- [ ] Dados salvos com workspace_id correto no Supabase
- [ ] RLS: workspace A não vê dados do workspace B
- [ ] UpgradeGate bloqueia feature se plano insuficiente
- [ ] Viewer não consegue editar (retorna 403)
- [ ] Platform admin acessa /admin via platform_admins

**Streaming e performance:**
- [ ] Streaming SSE visível em tempo real (não espera resposta completa)
- [ ] Cron sequencial com delay de 12s — não disparou em paralelo
- [ ] Re-embed usa debounce de 2s — não chamou no onChange direto

**Automações:**
- [ ] Nurturing verificou nurturing_emails antes de enviar (sem duplicatas)

**Brand System:**
- [ ] Extração do manual preenche brand book e tokens corretamente
- [ ] Re-embed dispara após edição do brand book (com debounce)
- [ ] Identity Gap recalculado após novo diagnóstico ou edição

**Content:**
- [ ] Palavras-chave retornam dados do domínio correto
- [ ] Ideias geradas respeitam tom de voz da marca (verificar vocabulário proibido)

**Assistant:**
- [ ] RAG usa apenas chunks do brand_id — não mistura dados de outras marcas
- [ ] Sidebar lateral mantém contexto da tela atual
- [ ] Chat persiste estado ao navegar entre telas

**SPECS:**
- [ ] SPECS.md atualizado com funcionalidade marcada como concluída

---

## Roadmap de Execução

| Fase | Funcionalidades | Critério de aceite |
|------|----------------|-------------------|
| **1 — Infra + Auth** | Deploy Netlify + Edge Functions, Supabase schema completo, auth, workspace, onboarding, seed admin | Login em produção, workspace criado, danilo@loudr.com.br acessa sem onboarding |
| **2 — Intelligence MVP** | F01, F02, F03, F05, F06 (diagnóstico + evolução), F19 (e-mails) | Diagnóstico gerado e relatório público funcionando |
| **3 — Listening + Content** | F07a, F07b, F08, F09, F10 | Social com temperatura + Search + Content com 3 sub-páginas |
| **4 — Brand System** | F11, F12, F13, F14, F15 | Manual em PDF → design.md gerado + brand book preenchido |
| **5 — Brand Assistant** | F16 (RAG + sidebar lateral) | Assistant responde com contexto real do brand book |
| **6 — Integração + Dashboard** | F04 completo, F17, F18, F19 completo | Identity Gap calculado em tempo real · Dashboard com todos os blocos |

---

*LOUDR OS · SPECS v5.4 · Maio 2026*
*Atualizar este documento após cada entrega. Em caso de conflito com PROMPT-AGENTE.md, este prevalece.*
