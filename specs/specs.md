# LOUDR Brand Intelligence — SPECS
**Versão:** 3.0  
**Data:** Maio 2026  
**Para:** Agente de desenvolvimento  
**Stack:** Vite + React · Netlify Functions · Supabase · Anthropic API · Resend · Stripe

---

## 1. Visão do Produto

Plataforma SaaS B2B de inteligência de marca. Combina diagnóstico estratégico com IA, monitoramento contínuo de scores, social listening e inteligência competitiva num workspace por empresa.

### Dois lados do produto
- **Público:** landing page de captura + relatório compartilhável por link
- **Cliente:** workspace completo com diagnósticos, evolução, listening, concorrentes
- **Admin LOUDR:** fila de aprovações, gestão de solicitações, histórico geral

### Funil de conversão
```
Lead preenche formulário público
        ↓
LOUDR aprova e gera diagnóstico
        ↓
Lead recebe relatório por e-mail + link público
        ↓
Call de apresentação de insights (20 min)
        ↓
Trial de 14 dias no workspace
        ↓
Conversão para plano pago (Starter / Pro / Enterprise)
```

---

## 2. Diretrizes de Produto

O agente deve seguir sempre:

1. **Self-service primeiro** — cliente cria conta, configura workspace, gera diagnóstico e faz upgrade sem intervenção humana
2. **Dado antes de opinião** — cada score e recomendação tem evidência pública rastreável
3. **Expandir sem reescrever** — mesmo stack, mesmos tokens, mesma arquitetura
4. **Isolamento por workspace** — RLS no Supabase desde o início, nenhum dado vaza entre clientes
5. **Alertas são o produto de retenção** — qualidade dos alertas > quantidade de features
6. **Desktop primeiro** — usuário primário é CMO em desktop, mobile é secundário

---

## 3. Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Vite + React |
| Servidor | Netlify Functions |
| Banco | Supabase (PostgreSQL + Auth + Edge Functions) |
| AI | Anthropic claude-sonnet-4-5 com web_search_20250305 |
| E-mail | Resend |
| Pagamento | Stripe |
| Font | Cairo via Google Fonts |
| CSS | Inline styles com DS tokens — sem biblioteca de UI |

### Variáveis de ambiente
```
# .env (desenvolvimento)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_KEY=eyJ...
VITE_STRIPE_PUBLIC_KEY=pk_live_...
VITE_CALENDLY_URL=https://calendly.com/loudr/insights

# Netlify (produção — server-side, nunca no frontend)
ANTHROPIC_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
SUPABASE_SERVICE_KEY=eyJ...  # para Edge Functions
```

---

## 4. Design System

```js
// src/lib/constants.js
export const DS = {
  navy:       "#0D1B2A",   // fundo principal
  navyMid:    "#162840",   // cards escuros
  navyLight:  "#1E3550",   // bordas escuras
  green:      "#0D9E7A",   // cor primária / sucesso
  greenDim:   "#0B8567",   // hover green
  greenPale:  "#E1F5EE",   // bg sucesso
  pink:       "#E8185A",   // destaque / Experiência
  pinkPale:   "#FBEAF0",   // bg erro
  white:      "#FFFFFF",
  offwhite:   "#F7F9F8",   // bg claro
  border:     "#E2EBE8",   // bordas claras
  gray:       "#8A9AB0",   // texto terciário
  grayLight:  "#F0F4F3",   // bg secundário
  text:       "#0D1B2A",   // texto principal
  textMid:    "#4A5A6A",   // texto secundário
  textLight:  "#8A9AB0",   // texto desabilitado
  amber:      "#EF9F27",   // aviso / Futuro & Escala
  amberPale:  "#FEF3C7",   // bg aviso
  purple:     "#7F77DD",   // Plataformas & Ecossistemas
  purplePale: "#EEEDFE",
};

export const F = "'Cairo', sans-serif";

export const PRATICAS = [
  { key:"inteligencia_singularidade", label:"Inteligência & Singularidade", sub:"Posicionamento · Arquitetura · Cultura", color:DS.green },
  { key:"experiencia_expressao",      label:"Experiência & Expressão",      sub:"Identidade · Design · Storytelling",  color:DS.pink },
  { key:"plataformas_ecossistemas",   label:"Plataformas & Ecossistemas",   sub:"Produto · Digital · Engenharia",      color:DS.purple },
  { key:"futuro_escala",              label:"Futuro & Escala",              sub:"Data · AI · Growth · Performance",    color:DS.amber },
];

export const PLANOS = {
  trial:      { nome:"Trial",      preco:0,    diagnosticos_mes:1, monitor:null,      concorrentes:0, membros:1,         social_listening:false },
  starter:    { nome:"Starter",    preco:490,  diagnosticos_mes:1, monitor:"mensal",  concorrentes:0, membros:1,         social_listening:false },
  pro:        { nome:"Pro",        preco:1490, diagnosticos_mes:3, monitor:"semanal", concorrentes:2, membros:3,         social_listening:true  },
  enterprise: { nome:"Enterprise", preco:3990, diagnosticos_mes:Infinity, monitor:"diario", concorrentes:5, membros:Infinity, social_listening:true },
};

export const TOTAL_SEARCHES = 5;
export const RATE_LIMIT_WAIT = 65;
export const MAX_RETRIES = 3;
export const COOLDOWN_ENTRE_APROVACOES = 120;
```

### Keyframes globais (GlobalStyle.jsx)
```css
*, *::before, *::after { box-sizing: border-box !important; }
@keyframes spin      { to { transform: rotate(360deg); } }
@keyframes fadeUp    { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
@keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:0.35} }
@keyframes bounceDown{ 0%,100%{transform:translateY(0);opacity:.5} 50%{transform:translateY(6px);opacity:1} }
input:focus, textarea:focus, select:focus {
  outline: none !important;
  border-color: #0D9E7A !important;
  box-shadow: 0 0 0 3px #E1F5EE !important;
}
```

---

## 5. Estrutura de Pastas

```
/
├── netlify/
│   └── functions/
│       ├── anthropic.js          # Proxy SSE Anthropic — chave server-side
│       ├── stripe-webhook.js     # Eventos Stripe → atualiza workspace.plano
│       └── cron-monitor.js       # Diagnósticos automáticos agendados
├── public/
│   └── index.html                # Entry HTML com <script type="module" src="/src/main.jsx">
├── src/
│   ├── main.jsx                  # ReactDOM.createRoot
│   ├── App.jsx                   # Router hash-based + auth guard + font loader
│   ├── lib/
│   │   ├── constants.js          # DS, F, PRATICAS, PLANOS, SYSTEM_PROMPT
│   │   ├── helpers.js            # getRoute(), tryParseJSON(), sc(), fmtDate(), calcularScoreLead(), checkPlano()
│   │   ├── api.js                # runStream() com retry de rate limit
│   │   ├── supabase.js           # createClient inicializado
│   │   └── stripe.js             # loadStripe(), getCheckoutUrl()
│   ├── components/
│   │   ├── GlobalStyle.jsx       # <style> global com keyframes
│   │   ├── Bar.jsx               # Barra de score colorida
│   │   ├── Card.jsx              # Card branco com borda
│   │   ├── Lbl.jsx               # Label uppercase 10px
│   │   ├── Pill.jsx              # Badge colorida inline
│   │   ├── Spinner.jsx           # Loading circular animado
│   │   ├── ScoreCard.jsx         # Card de score com barra + label + variação
│   │   ├── EmptyState.jsx        # Estado vazio padronizado
│   │   └── UpgradeGate.jsx       # Bloqueia feature + exibe CTA de upgrade
│   └── pages/
│       ├── public/
│       │   ├── PaginaPublica.jsx          # Landing page de captura
│       │   ├── RelatorioPublico.jsx       # Relatório por ID sem auth
│       │   └── PaginaMetodologia.jsx      # Explicação do framework Smart Branding
│       ├── auth/
│       │   ├── LoginPage.jsx              # Login Supabase Auth
│       │   ├── RegisterPage.jsx           # Cadastro self-service
│       │   └── OnboardingPage.jsx         # Setup do workspace (3 passos)
│       ├── app/                           # Workspace do cliente (auth + plano)
│       │   ├── AppShell.jsx               # Nav lateral + layout
│       │   ├── Home.jsx                   # Dashboard: scores, alertas, oportunidades
│       │   ├── Diagnostico.jsx            # Diagnósticos + histórico + geração
│       │   ├── NovoManual.jsx             # Formulário + streaming
│       │   ├── Evolucao.jsx               # Gráfico de scores ao longo do tempo
│       │   ├── SocialListening.jsx        # Feed de menções + sentiment (Pro+)
│       │   ├── Concorrentes.jsx           # Inteligência competitiva (Pro+)
│       │   └── Workspace.jsx              # Config + equipe + billing
│       └── admin/                         # LOUDR internal (role: loudr_admin)
│           ├── AdminShell.jsx             # Nav admin
│           ├── Solicitacoes.jsx           # Fila de aprovação com score de qualificação
│           └── AdminHistorico.jsx         # Todos os diagnósticos gerados
├── supabase/
│   └── functions/
│       ├── enviar-diagnostico/    # Triggered: aprovação → e-mail para lead
│       ├── notificar-solicitacao/ # Triggered: nova solicitação → e-mail para LOUDR
│       ├── gerar-alertas/         # Scheduled: analisa dados, gera alertas
│       ├── coletar-sinais/        # Scheduled: coleta listening por workspace Pro+
│       ├── relatorio-mensal/      # Scheduled: dia 1 do mês → PDF + e-mail
│       └── nurturing-sequence/    # Triggered: D+2, D+5, D+10, D+15 pós-diagnóstico
├── .env
├── netlify.toml
├── vite.config.js
└── package.json
```

---

## 6. Roteamento

Hash-based, sem react-router. `getRoute()` em helpers.js lê `window.location.hash`.

```js
export function getRoute() {
  const hash = window.location.hash;
  if (!hash || hash === '#/') return 'public';
  if (hash === '#/metodologia') return 'metodologia';
  if (hash.startsWith('#/relatorio/')) return 'relatorio-publico';
  if (hash === '#/login') return 'login';
  if (hash === '#/register') return 'register';
  if (hash === '#/onboarding') return 'onboarding';
  if (hash === '#/app') return 'app-home';
  if (hash === '#/app/diagnostico') return 'diagnostico';
  if (hash === '#/app/evolucao') return 'evolucao';
  if (hash === '#/app/listening') return 'listening';
  if (hash === '#/app/concorrentes') return 'concorrentes';
  if (hash === '#/app/workspace') return 'workspace';
  if (hash === '#/admin') return 'admin';
  if (hash === '#/admin/historico') return 'admin-historico';
  return 'public';
}
```

| Hash | Componente | Requer |
|------|-----------|--------|
| `` ou `#/` | PaginaPublica | — |
| `#/metodologia` | PaginaMetodologia | — |
| `#/relatorio/:id` | RelatorioPublico | — |
| `#/login` | LoginPage | — |
| `#/register` | RegisterPage | — |
| `#/onboarding` | OnboardingPage | auth |
| `#/app` | Home | auth + plano ativo |
| `#/app/diagnostico` | Diagnostico | auth + plano ativo |
| `#/app/evolucao` | Evolucao | auth + starter+ |
| `#/app/listening` | SocialListening | auth + pro+ |
| `#/app/concorrentes` | Concorrentes | auth + pro+ |
| `#/app/workspace` | Workspace | auth |
| `#/admin` | Solicitacoes | auth + loudr_admin |
| `#/admin/historico` | AdminHistorico | auth + loudr_admin |

---

## 7. Banco de Dados

### Migration SQL completa

```sql
-- 1. Workspaces
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

-- 2. Membros
create table workspace_members (
  id            uuid default gen_random_uuid() primary key,
  workspace_id  uuid references workspaces(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete cascade,
  role          text default 'member',
  created_at    timestamptz default now(),
  unique(workspace_id, user_id)
);

-- 3. Diagnósticos
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
  frase_diagnostico     text,
  dados                 jsonb,
  publico               boolean default true,
  tipo                  text default 'manual'
);

-- 4. Solicitações (leads públicos)
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

-- 5. Listening events
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

-- 6. Snapshots de sentiment
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

-- 7. Concorrentes
create table concorrentes (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id),
  nome          text,
  dominio       text,
  ativo         boolean default true
);

-- 8. Diagnósticos de concorrentes
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

-- 9. Alertas
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

-- RLS
alter table workspaces              enable row level security;
alter table workspace_members       enable row level security;
alter table diagnosticos            enable row level security;
alter table solicitacoes            enable row level security;
alter table listening_events        enable row level security;
alter table sentiment_snapshots     enable row level security;
alter table concorrentes            enable row level security;
alter table diagnosticos_concorrentes enable row level security;
alter table alertas                 enable row level security;

-- Políticas padrão por workspace
create policy "membro acessa workspace" on workspaces
  for all using (id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  ));

create policy "leitura publica diagnosticos" on diagnosticos
  for select using (publico = true);

create policy "workspace acessa diagnosticos" on diagnosticos
  for all using (workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  ));

create policy "publico pode solicitar" on solicitacoes
  for insert to anon, authenticated with check (true);

-- Repetir padrão "workspace acessa X" para:
-- listening_events, sentiment_snapshots, concorrentes,
-- diagnosticos_concorrentes, alertas
```

---

## 8. Netlify Functions

### `netlify/functions/anthropic.js`
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

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

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

### `netlify.toml`
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

### `vite.config.js`
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

## 9. API do Produto

### URL base
```js
// src/lib/api.js
const API_URL = import.meta.env.DEV
  ? '/api/v1/messages'
  : '/.netlify/functions/anthropic'
```

### runStream()
Função principal de geração de diagnóstico via SSE.

**Parâmetros:**
- `empresa` (string) — nome ou domínio
- `contexto` (string) — contexto adicional opcional
- `onSearchStep(count, query)` — callback a cada busca web
- `onText(fullText)` — callback a cada chunk de texto
- `onDone(parsed)` — callback com JSON completo parseado
- `onError(message)` — callback de erro
- `onRateLimit(segundos, tentativa)` — callback de countdown

**Comportamento:**
- Retry automático em 429 com countdown visual
- Máximo MAX_RETRIES tentativas
- Salva progresso em localStorage durante o stream
- Remove do localStorage ao concluir

---

## 10. SYSTEM_PROMPT

```
Você é o Brand Intelligence Agent da LOUDR — agência de Smart Branding.

[...manter o prompt atual completo...]

IMPORTANTE: Faça EXATAMENTE 5 buscas web. Nem mais, nem menos.

Responda SOMENTE com JSON válido:
{
  "empresa": "...",
  "dominio": "...",
  "setor": "...",
  "porte": "Startup|PME|Médio|Grande",
  "momento_atual": "...",
  "frase_diagnostico": "...",
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
  "justificativa_scores": "...",
  "sinais_cultura": "...",
  "sinais_investimento": "...",
  "evolucao_marca": "...",
  "gap_ads_vs_site": "...",
  "diferenciais_ativos": [],
  "zona_ruido": [],
  "territorio_inexplorado": "...",
  "pergunta_provocativa": "...",
  "concorrentes": [{ "nome": "...", "diferencial": "...", "ameaca": "baixa|media|alta", "sinal": "..." }],
  "oportunidades": [{ "titulo": "...", "descricao": "...", "pratica_loudr": "...", "impacto": "alto|medio|baixo", "prazo": "imediato|curto|médio prazo" }],
  "quick_wins": [],
  "porta_entrada_loudr": "..."
}

Scores: 1-3 crítico · 4-6 em desenvolvimento · 7-8 sólido · 9-10 referência
```

---

## 11. Especificação das Páginas

### PaginaPublica.jsx
Landing page de alta conversão para CMOs.

**Seções:**
1. Nav fixo com blur — só CTA "Solicitar diagnóstico", "Área interna" no footer
2. Hero — headline, subheadline com dor de accountability, CTA primário + secundário, stats bar, âncora de scroll animada
3. Pain — 6 cards em grid 3x2 com dores do CMO
4. How it works — 4 práticas + mock report lado a lado
5. Proof — 6 cards com diferenciais + tags de metodologia
6. Stats bar — +200 diagnósticos · 8 setores · 48h (fundo navyMid)
7. Exemplo real — card O Boticário: frase, 4 scores com mini barras, botão link público
8. Formulário — nome*, email*, empresa*, cargo (select), contexto (textarea)
9. FAQ — 3 perguntas + CTA final
10. Footer

**Formulário:**
- Campos obrigatórios: nome, email, empresa
- Score de qualificação calculado antes do insert via `calcularScoreLead()`
- Insert em `solicitacoes` com status `pendente`
- Estado de sucesso com próximos passos

### RelatorioPublico.jsx
- Busca diagnóstico por ID em `diagnosticos` (leitura pública)
- Renderiza relatório completo com todas as seções
- Botão "Agendar apresentação de insights" → abre VITE_CALENDLY_URL
- Não requer autenticação

### LoginPage.jsx
- Email + senha
- `supabase.auth.signInWithPassword()`
- Redirect: se tem workspace → `#/app`, senão → `#/onboarding`

### RegisterPage.jsx
- Nome + email + senha
- `supabase.auth.signUp()` com `data: { full_name }`
- Redirect para `#/onboarding`

### OnboardingPage.jsx
3 passos com indicador de progresso:

**Passo 1 — Empresa**
- Nome da empresa (obrigatório)
- Domínio, setor (select), porte (select)

**Passo 2 — Plano**
- Cards dos 3 planos: Starter R$490, Pro R$1.490, Enterprise R$3.990
- Badge "mais popular" no Pro
- Botão "Começar trial grátis" → cria workspace com plano trial
- Botão "Assinar agora" → redirect para Stripe Checkout

**Passo 3 — Confirmação**
- Workspace criado
- Criado `workspace_members` com role `admin`
- Redirect para `#/app`

### AppShell.jsx
Layout do workspace. Presente em todas as rotas `#/app/*`.

**Nav lateral:**
- Logo LOUDR
- Home
- Diagnóstico
- Evolução (Starter+)
- Social Listening (Pro+ — com badge "Pro")
- Concorrentes (Pro+ — com badge "Pro")
- Workspace
- Indicador de plano + uso do mês (X/Y diagnósticos)
- Avatar do usuário + logout

### Home.jsx
Dashboard principal do workspace.

**Blocos:**
- Score atual — 3 scores em cards com variação desde último diagnóstico
- Frase diagnóstico do período — blockquote verde
- Top 3 oportunidades com prazo e impacto
- Feed de alertas recentes (últimos 5)
- Botão CTA "Gerar novo diagnóstico"

### Diagnostico.jsx
**Estrutura:**
- Último diagnóstico em destaque (relatório completo)
- Botão "Gerar novo" — verifica limite do plano, abre NovoManual
- Histórico em lista: empresa, data, scores, link para ver completo
- Cada item: download PDF + compartilhar link

### NovoManual.jsx
Formulário de nova solicitação + streaming.

**Estados:**
1. `form` — input de empresa + contexto
2. `streaming` — StreamingView com buscas + dados parciais + countdown de rate limit
3. `done` — redirect para diagnóstico gerado

**Ao concluir:**
- Salva em `diagnosticos` com `workspace_id`
- Incrementa `workspace.diagnosticos_mes`
- Redirect para `Diagnostico.jsx`

### Evolucao.jsx
- Gráfico de linha com Recharts: singularidade, consistência, posicionamento
- Seletor de período: 3m / 6m / 1a / tudo
- Tooltip ao hover com data e valores
- Insight automático: maior variação no período
- Painel de comparativo entre dois diagnósticos selecionados

### SocialListening.jsx (Pro+)
- Guard: se plano < pro → UpgradeGate
- Score de sentiment atual: % positivo / neutro / negativo
- Gráfico de área com evolução do sentiment (7d / 30d / 90d)
- Feed de eventos com filtro por fonte e sentiment
- Alertas de pico (volume anormal de menções negativas)
- Tópicos em alta

### Concorrentes.jsx (Pro+)
- Guard: se plano < pro → UpgradeGate
- Adicionar concorrente: nome + domínio (até limite do plano)
- Dashboard comparativo: seus scores vs. concorrentes (bar chart lado a lado)
- Histórico de scores por concorrente
- Feed de movimentos detectados
- Mapa de territórios (scatter plot: singularidade x consistência)

### Workspace.jsx
**Abas:**
1. **Empresa** — editar nome, domínio, setor, porte
2. **Equipe** — convidar por email, listar membros, definir role, remover
3. **Plano** — plano atual, uso do mês, data de renovação, botão upgrade/downgrade, histórico de faturas
4. **Alertas** — configurar: canais (email, slack webhook), frequência, tipos de alerta

### AdminShell.jsx + Solicitacoes.jsx
- Requer `role = 'loudr_admin'` no workspace_members
- Lista todas as solicitações com score de qualificação
- Botões: Aprovar e rodar / Rejeitar
- Cooldown de 120s entre aprovações (COOLDOWN_ENTRE_APROVACOES)
- Streaming em tempo real ao aprovar
- Stats: total, pendentes, concluídos, rejeitados

---

## 12. Componentes Compartilhados

### UpgradeGate.jsx
```jsx
// Exibido quando feature requer plano superior
function UpgradeGate({ planoNecessario, children }) {
  const { workspace } = useWorkspace()
  if (planoAtivo(workspace.plano) >= planoNecessario) return children
  return (
    <div style={{ /* estilo de gate */ }}>
      <div>Esta feature requer o plano {planoNecessario}</div>
      <button onClick={() => abrirStripeCheckout(planoNecessario)}>
        Fazer upgrade →
      </button>
    </div>
  )
}
```

### ScoreCard.jsx
```jsx
function ScoreCard({ label, score, variacao, desc }) {
  // Exibe score com barra colorida, label, variação (↑ ↓ →) e descrição
}
```

### StreamingView.jsx
```jsx
function StreamingView({ searchSteps, partialData, rateLimitCountdown, rateLimitAttempt }) {
  // Exibe buscas em tempo real, dados parciais conforme chegam,
  // e countdown circular quando rate limit é atingido
}
```

---

## 13. Supabase Edge Functions

### `enviar-diagnostico`
**Trigger:** UPDATE em `solicitacoes` WHERE status = 'aprovado'  
**Ação:** enviar e-mail para `solicitacoes.email` via Resend  
**Template:** scores em destaque + frase diagnóstico + link público + botão Calendly

### `notificar-solicitacao`
**Trigger:** INSERT em `solicitacoes`  
**Ação:** enviar e-mail para equipe LOUDR com dados do lead e score de qualificação

### `gerar-alertas`
**Schedule:** diário às 7h  
**Ação:** para cada workspace ativo, comparar último snapshot com anterior e gerar alertas

### `coletar-sinais`
**Schedule:** diário às 6h  
**Ação:** para cada workspace Pro+, rodar análise de listening via Anthropic API e salvar em `listening_events` e `sentiment_snapshots`

### `relatorio-mensal`
**Schedule:** dia 1 de cada mês às 9h  
**Ação:** gerar PDF de evolução + enviar por e-mail para todos os membros do workspace

### `nurturing-sequence`
**Trigger:** INSERT em `diagnosticos` WHERE tipo = 'aprovado_lead'  
**Ação:** agendar 4 e-mails: D+2, D+5, D+10, D+15  
**Cancelar se:** lead cria conta e assina plano

---

## 14. Plano de Execução por Fase

### Fase 2 — Fundação (0–90 dias)
**Critério de sucesso:** produto em produção, 10 diagnósticos entregues para leads reais, 1 contrato fechado

- [x] Migrar para Vite (vite.config.js, package.json, main.jsx, import.meta.env) — Mai/2026
- [x] Netlify Function anthropic.js + netlify.toml — Mai/2026
- [x] RegisterPage.jsx + OnboardingPage.jsx (MUI, 3 passos) — Mai/2026
- [x] UpgradeGate.jsx + guard de plano nas rotas — Mai/2026
- [x] calcularScoreLead() na fila de solicitações — Mai/2026
- [x] Botão Calendly no RelatorioPublico.jsx (via VITE_CALENDLY_URL) — Mai/2026
- [x] Score de qualificação exibido em Solicitacoes — Mai/2026
- [ ] Deploy em produção no Netlify (requer variáveis VITE_* no painel) - solicitar a um humano
- [x] Migration SQL completa (supabase/migrations/001_initial_schema.sql) — Mai/2026
- [x] Integração Stripe: stripe-checkout.js + stripe-webhook.js + src/lib/stripe.js — Mai/2026
- [x] Supabase Edge Function: enviar-diagnostico — Mai/2026
- [x] Supabase Edge Function: notificar-solicitacao — Mai/2026

### Fase 3 — Workspace do Cliente (90–180 dias)
**Critério de sucesso:** 10 clientes pagantes ativos

- [x] AppShell.jsx com nav lateral (src/pages/app/AppShell.jsx) — Mai/2026
- [x] Home.jsx com dashboard de scores e alertas (src/pages/app/Home.jsx) — Mai/2026
- [x] Diagnostico.jsx com histórico e geração (src/pages/app/Diagnostico.jsx) — Mai/2026
- [x] Evolucao.jsx com gráfico Recharts (src/pages/app/Evolucao.jsx) — Mai/2026
- [x] Workspace.jsx — empresa, equipe, plano, alertas (src/pages/app/WorkspacePage.jsx) — Mai/2026
- [x] Netlify Scheduled Function: cron-monitor.js — Mai/2026
- [x] Supabase Edge Function: gerar-alertas — Mai/2026
- [x] Supabase Edge Function: relatorio-mensal (e-mail HTML com scores + link workspace) — Mai/2026
- [x] Supabase Edge Function: nurturing-sequence (D+2, D+5, D+10, D+15) — Mai/2026
- [x] App.jsx: routing workspace → AppShell, admin → AppInterno — Mai/2026
- [ ] Relatório mensal PDF automático (servidor) — requer headless browser no Edge

### Fase 4 — Inteligência Competitiva (180–365 dias)
**Critério de sucesso:** 30 clientes, MRR R$50.000+

- [ ] Tabelas concorrentes + diagnosticos_concorrentes + listening_events + sentiment_snapshots
- [ ] SocialListening.jsx com feed e gráfico de sentiment
- [ ] Supabase Edge Function: coletar-sinais
- [ ] Concorrentes.jsx com dashboard comparativo
- [ ] Mapa de territórios (scatter plot D3/Recharts)
- [ ] Benchmarks por setor (Supabase view)
- [ ] BenchmarkSetor.jsx

---

## 15. Checklist de QA — Rodar Antes de Todo Deploy

- [ ] Gerar diagnóstico completo do início ao fim
- [ ] Verificar salvamento no Supabase (tabela diagnosticos)
- [ ] Verificar envio de e-mail automático (Resend)
- [ ] Testar link público do relatório sem autenticação
- [ ] Testar login, register e onboarding
- [ ] Verificar guard de plano em feature Pro
- [ ] Testar countdown de rate limit (simular 429)
- [ ] Verificar cooldown entre aprovações no admin

---

*LOUDR Brand Intelligence · SPECS v3.0 · Maio 2026*  
*Atualizar este documento a cada entrega de feature.*