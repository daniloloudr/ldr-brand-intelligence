# LOUDR OS — Prompt do Agente Autônomo
**Versão:** 4.3 · Maio 2026

Cole este prompt no início de cada sessão do Claude Code.

---

## O Produto

**LOUDR OS** é o sistema operacional de marca para empresas que levam identidade a sério. Um SaaS B2B com dois módulos integrados em uma conta:

**LOUDR Intelligence** — o que o mercado percebe. Diagnóstico externo via dados públicos, monitor contínuo de scores, social listening, inteligência competitiva.

**LOUDR Brand OS** — o que a marca declara ser. Brand book digital e vivo, design system como MUI Theme dinâmico, Brand Assistant com RAG, aprovação de campanhas por IA.

**O diferencial único:** cruzamento automático entre identidade declarada (Brand OS) vs. identidade percebida (Intelligence) = Identity Gap Score.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Vite + React 18 |
| Roteamento | React Router v6 |
| UI | Material UI v6 (@mui/material) — nunca inline style |
| State | Zustand |
| Data | TanStack Query |
| Banco | Supabase (PostgreSQL + Auth + RLS + pg_vector) |
| Streaming | **Netlify Edge Functions (Deno)** — SSE nativo |
| Servidor | Netlify Functions (Node.js 20) — CRUD sem streaming |
| AI | Anthropic claude-sonnet-4-20250514 |
| Embeddings | Anthropic voyage-3 (RAG) |
| E-mail | Resend |
| Pagamento | Stripe |

---

## Regras invioláveis

1. **MUI sempre** — `sx prop` + `styled()`. Nunca inline style. Nunca outra biblioteca de UI
2. **Tema via ThemeProvider** — `platformTheme` para a plataforma, `buildBrandTheme(designSystem)` para o contexto de marca ativa
3. **Zustand para estado global** — workspace ativo, marca ativa, tema MUI, estado do chat lateral
4. **React Query para dados** — cache, invalidação, loading states. Nunca fetch direto em useEffect
5. **supabase-js no frontend** — respeita RLS com JWT do usuário. Drizzle apenas em Functions admin com filtro workspace_id explícito
6. **RLS em toda tabela nova** — isolamento por `workspace_id` sem exceção
7. **Anthropic key nunca no frontend** — streaming via Edge Function, CRUD via Netlify Function
8. **`import.meta.env.VITE_*`** — nunca `process.env.REACT_APP_*`
9. **Rate limit 429** — retry automático com countdown circular visual (até 3x, 65s)
10. **RAG filtrado por brand_id** — brand book nunca enviado integralmente para a API
11. **React Router v6** — layouts aninhados, sem hash-based routing
12. **Zod em toda validação** — frontend e backend
13. **Cron sequencial** — processar workspaces com loop + await + delay 12s. Nunca em paralelo
14. **Debounce em re-embeds** — usar `useReembed()` com 2s. Nunca chamar no onChange direto
15. **Nurturing idempotente** — checar `nurturing_emails (solicitacao_id, dia)` antes de enviar. Unique constraint é a garantia
16. **Git: commit + push por funcionalidade** — nunca na `main`
17. **SPECS.md é documento vivo** — marcar como concluído após cada entrega

---

## Tema da plataforma

```js
// src/theme/platformTheme.js
palette: {
  mode: 'dark',
  primary:    { main: '#0D9E7A' },   // green — Intelligence
  secondary:  { main: '#E8185A' },   // pink — alertas
  warning:    { main: '#EF9F27' },   // amber — atenção
  info:       { main: '#7F77DD' },   // purple — Brand OS
  background: { default: '#0D1B2A', paper: '#162840' },
  text:       { primary: '#FFFFFF', secondary: '#8A9AB0' },
}
typography: { fontFamily: "'Cairo', sans-serif" }
```

```js
// src/theme/buildBrandTheme.js — aplicado no BrandOSLayout
export function buildBrandTheme(designSystem) {
  // Gera MUI theme a partir do design_system da marca ativa
  // Troca a interface visualmente quando usuário entra no contexto da marca
}
```

---

## Streaming — Edge Function obrigatória

```js
// netlify/edge-functions/anthropic.js — Deno, pass-through real
export default async function handler(request) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': Deno.env.get('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: await request.text(),
  })
  return new Response(response.body, {   // pass-through — sem buffer
    status: response.status,
    headers: { 'Content-Type': 'text/event-stream', 'Access-Control-Allow-Origin': '*' }
  })
}
```

```toml
# netlify.toml
[[edge_functions]]
  path = "/api/anthropic"
  function = "anthropic"
```

```js
// src/lib/runStream.js
const API_URL = import.meta.env.DEV
  ? '/api/v1/messages'      // Vite proxy em dev
  : '/api/anthropic'        // Edge Function em produção
```

---

## Estrutura de pastas

```
netlify/
  edge-functions/           # Deno — streaming SSE
    anthropic.js
    assistant-chat.js
  functions/                # Node.js 20 — CRUD, webhooks, cron
    _supabase.js / _drizzle.js / _middleware.js / _prompts.js / _rag.js
    stripe-webhook.js
    cron-monitor.js
    auth/ workspaces/ intelligence/ brandos/ emails/

src/
  main.jsx                  # ThemeProvider + QueryClient + Router
  App.jsx                   # Routes React Router v6
  theme/
    platformTheme.js
    buildBrandTheme.js
  stores/
    authStore.js / workspaceStore.js / brandStore.js
  hooks/
    useWorkspace.js / useCurrentBrand.js / useBrandTheme.js
    useChat.js / useApiError.js / useReembed.js
  lib/
    supabase.js / api.js / runStream.js
    schemas.js / stripe.js / utils.js
  components/
    common/     # ScoreBar, ScoreCard, StatusChip, EmptyState, UpgradeGate, StreamingView
    intelligence/  # DiagnosticoCard, SentimentChart, TerritoryMap, IdentityGapCard
    brandos/    # BrandBookSection, TokenSwatch, ChatBubble, VerdictPanel
  layouts/
    AuthLayout.jsx / AppLayout.jsx
    IntelligenceLayout.jsx / BrandOSLayout.jsx
  pages/
    public/     # LandingPage, RelatorioPublico, Metodologia
    auth/       # Login, Register, Invite, Onboarding
    dashboard/  # Dashboard
    intelligence/  # Diagnostico, Evolucao, SocialListening, Concorrentes
    brandos/    # BrandList, BrandOnboarding, BrandBook, sections/, Assistant, Campaigns
    workspace/  # Workspace, Members
    admin/      # Solicitacoes, AdminHistorico

supabase/functions/
  on-solicitacao-insert/ / on-diagnostico-approved/ / monthly-report/ / nurturing/
```

---

## Roteamento (React Router v6)

```
/                  LandingPage         /app/brands/:id/identity     Identity
/relatorio/:id     RelatorioPublico    /app/brands/:id/positioning  Positioning
/login             Login               /app/brands/:id/design-system DesignSystem
/register          Register            /app/brands/:id/references   References
/invite/:token     Invite              /app/brands/:id/history      History
/onboarding        Onboarding          /app/brands/:id/assistant    Assistant
/app               Dashboard           /app/brands/:id/assistant/:cid Assistant
/app/intelligence  Diagnostico         /app/brands/:id/campaigns    Campaigns
/app/intelligence/evolucao  Evolucao   /app/brands/:id/campaigns/new CampaignNew
/app/intelligence/listening Listening  /app/brands/:id/campaigns/:cid CampaignDetail
/app/intelligence/concorrentes Concorrentes
/app/brands        BrandList           /app/workspace               Workspace
/app/brands/new    BrandOnboarding     /app/workspace/members       Members
/app/brands/:id    BrandBook           /admin                       Solicitacoes
```

---

## Planos

```js
PLANOS = {
  trial:      { preco:0,    diagnosticos_mes:1, monitor:null,      concorrentes:0, social_listening:false, marcas:1, assistant_msgs:10,       campanhas:false, membros:1 },
  starter:    { preco:490,  diagnosticos_mes:1, monitor:'mensal',  concorrentes:0, social_listening:false, marcas:1, assistant_msgs:Infinity,  campanhas:false, membros:1 },
  pro:        { preco:1490, diagnosticos_mes:3, monitor:'semanal', concorrentes:2, social_listening:true,  marcas:3, assistant_msgs:Infinity,  campanhas:true,  membros:3 },
  enterprise: { preco:3990, diagnosticos_mes:Infinity, monitor:'diario', concorrentes:5, social_listening:true, marcas:Infinity, campanhas:true, membros:Infinity },
}
```

---

## RAG — Brand Assistant

```
Mensagem do usuário
  → embedding (voyage-3)
  → 5 chunks mais similares WHERE brand_id = :id
  → system prompt com APENAS esses chunks
  → Claude API (streaming via Edge Function)
  → persiste mensagem + resposta
```

Brand book **nunca** enviado integralmente. Só os 5 fragmentos relevantes.

---

## Git Workflow

```bash
# Após cada funcionalidade entregue e testada
git add .
git commit -m "feat: F01 landing page"
git push origin dev

# Nunca commitar na main
# Merge para main só após validação completa da fase
```

Convenção: `feat:` nova feature · `fix:` correção · `chore:` manutenção · `refactor:` refatoração

---

## Checklist QA antes de cada commit

- [ ] Feature funciona do início ao fim sem erro no console
- [ ] Dados salvos com workspace_id correto
- [ ] RLS: workspace A não vê dados do workspace B
- [ ] UpgradeGate bloqueia se plano insuficiente
- [ ] Viewer não consegue editar (403)
- [ ] Platform admin acessa /admin via platform_admins
- [ ] Streaming SSE visível em tempo real (não espera resposta completa)
- [ ] Cron sequencial com delay — não disparou em paralelo
- [ ] Re-embed com debounce — não chamou no onChange direto
- [ ] Nurturing verificou nurturing_emails antes de enviar
- [ ] SPECS.md atualizado com funcionalidade concluída

---

## Como usar

**Iniciar a Fase 1 do zero:**
```
Leia o PROMPT-AGENTE.md e o SPECS.md. Configure o repositório,
instale as dependências e execute todas as tarefas da Fase 1
em sequência sem pedir confirmação. Após cada funcionalidade,
faça commit na branch dev com mensagem descritiva e marque
como concluída no SPECS.md. Nunca pare para perguntar —
se tiver dúvida, tome a decisão mais conservadora e continue.
```

**Continuar de onde parou:**
```
Leia o SPECS.md, identifique a última tarefa concluída,
execute a próxima e repita até concluir a fase atual.
```

**Executar funcionalidade específica:**
```
Construa o [F01 / F05 / nome] seguindo as regras do PROMPT-AGENTE.md.
```

---

*LOUDR OS · PROMPT-AGENTE v4.3 · Maio 2026*