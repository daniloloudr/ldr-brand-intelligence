# LOUDR Brand Intelligence

Plataforma SaaS B2B que transforma a gestão de marca de uma atividade subjetiva em inteligência mensurável. Usa IA para gerar diagnósticos estratégicos, monitorar scores ao longo do tempo e avaliar campanhas com base no brand book de cada cliente.

---

## Visão de negócio

### O problema

CMOs e líderes de marketing gastam budget de marca sem conseguir mostrar o que estão construindo. Não existe visibilidade objetiva sobre se a marca está evoluindo, se a identidade declarada corresponde à percebida pelo mercado, e como a empresa se posiciona em relação aos concorrentes.

### A solução

A LOUDR Brand Intelligence aplica o framework proprietário **Smart Branding** — 4 práticas que cobrem desde a singularidade da marca até sua capacidade de escala — e usa IA para analisar sinais públicos da empresa (site, redes, anúncios, cobertura de imprensa) e devolver um diagnóstico quantificado com scores, gaps e oportunidades priorizadas.

O produto tem duas frentes:

**Para a equipe LOUDR (admin):** fila de aprovação de diagnósticos captados pela landing page + geração manual para qualquer empresa. A equipe revisa o lead, aprova, e a IA gera o relatório via background function (mesma arquitetura do workspace — sem streaming).

**Para o cliente (workspace):** ambiente self-service onde a empresa acompanha a evolução dos scores da sua marca ao longo do tempo, gerencia o brand book, submete campanhas para aprovação por IA e monitora concorrentes.

### Framework Smart Branding

| Prática | O que avalia |
|---|---|
| Inteligência & Singularidade | Diferenciação real, proposta de valor, posicionamento vs. mercado |
| Experiência & Expressão | Consistência visual e verbal, coerência entre canais |
| Plataformas & Ecossistemas | Presença digital, distribuição, SEO, redes sociais |
| Futuro & Escala | Capacidade de crescimento, inovação, sustentabilidade da marca |

Cada prática recebe um score de 1 a 10. A partir deles são calculados três indicadores consolidados: **Singularidade**, **Consistência** e **Posicionamento**.

| Score | Nível |
|---|---|
| 1–3 | Crítico |
| 4–6 | Em desenvolvimento |
| 7–8 | Sólido |
| 9–10 | Referência |

### Planos

| Plano | Preço | Diagnósticos/mês | Monitor | Concorrentes | Membros | Social Listening |
|---|---|---|---|---|---|---|
| Trial | grátis | 1 | — | 0 | 1 | não |
| Starter | R$ 490 | 1 | mensal | 5 | 1 | não |
| Pro | R$ 1.490 | 3 | semanal | 5 | 3 | sim |
| Enterprise | R$ 3.990 | ilimitado | diário | 15 | ilimitado | sim |

### Custo por diagnóstico

| Configuração | Custo estimado |
|---|---|
| claude-sonnet-4-6 · web_search · max_tokens 8000 (dev + prod) | ~$0.50–0.80 |

Diagnóstico sempre usa `aiConfig('premium')` — Sonnet 4.6 + web search em qualquer ambiente. A web search é estrutural: sem ela o modelo alucina dados públicos da empresa.

---

## Visão técnica

### Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Vite 6 + React 19 |
| UI | Material UI v6 — `sx prop` / `styled()` / `ThemeProvider` |
| Auth + DB | Supabase (PostgreSQL + Auth + RLS + Edge Functions) |
| Servidor | Netlify Functions (serverless) |
| IA | Anthropic API via `_ai.js` — `aiConfig(tier)` centralizado |
| Pagamento | Stripe (Checkout + Webhooks) |
| E-mail | Resend |
| Gráficos | Recharts |
| Exportação | jsPDF + PptxGenJS |
| Fonte | Cairo via Google Fonts |

### Arquitetura geral

```
Browser (Vite SPA)
  │
  ├── Hash router manual (sem react-router)
  │     getRoute() lê window.location.hash → monta o componente correto
  │
  ├── Supabase JS Client
  │     Auth, leitura/escrita de dados, RLS automático por workspace
  │
  └── Netlify Background Functions  (sufixo -background.js)
        POST → retorna 202 imediatamente (sem timeout)
        Function processa de forma assíncrona e salva resultado no Supabase
        Frontend faz polling a cada 3s até encontrar o resultado
        Erros salvos como { _job_error: true, error: "..." } no campo de dados
```

```
netlify/functions/_ai.js — aiConfig(tier)
  fast     → Haiku 4.5, 4000t, sem web search (dev simples)
  standard → Sonnet 4.5 dev / Sonnet 4.6 prod, com web search em prod
  premium  → Sonnet 4.6, 8000t, web search sempre (dev + prod)
```

O deploy roda no Netlify. O build (`vite build`) gera `dist/` com a SPA. O redirect `/* → /index.html` garante que o hash routing funcione em qualquer URL.

### Configuração local

```bash
npm install
netlify dev   # Sobe Vite + Netlify Functions juntos (recomendado)
# ou
npm run dev   # Só o Vite (sem as functions)
```

#### Variáveis de ambiente

Crie `.env` na raiz:

```
# Client-side (prefixo VITE_ obrigatório)
VITE_SUPABASE_URL=https://<projeto>.supabase.co
VITE_SUPABASE_KEY=eyJ...
VITE_STRIPE_PUBLIC_KEY=pk_live_...
VITE_CALENDLY_URL=https://calendly.com/loudr/insights
```

Configure no painel Netlify (nunca no `.env` nem no frontend):

```
ANTHROPIC_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
SUPABASE_SERVICE_KEY=eyJ...
```

### Estrutura de pastas

```
/
├── netlify/
│   └── functions/
│       ├── _ai.js                              # callAI(), aiConfig(tier), MODELS, TOOLS
│       ├── _prompt.js                          # SYSTEM_PROMPT compartilhado (diagnóstico)
│       ├── anthropic.js                        # Proxy SSE — Brand Assistant streaming
│       ├── diagnostico-gerar-background.js     # Diagnóstico via background + polling
│       ├── content-hub-gerar-background.js     # Keywords + ideias via background + polling
│       ├── listening-coletar-background.js     # Social listening via background + polling
│       ├── listening-coletar.js                # (legado sync — mantido para compatibilidade)
│       ├── cron-monitor.js                     # Diagnósticos automáticos (toda segunda, 8h)
│       ├── admin-create-workspace.js
│       ├── admin-invite.js
│       ├── admin-list-members.js
│       ├── stripe-checkout.js
│       └── stripe-webhook.js
├── src/
│   ├── main.jsx
│   ├── App.jsx                   # Router hash-based + auth guard
│   ├── lib/
│   │   ├── constants.js          # DS, PLANOS, PRATICAS
│   │   ├── theme.js              # Temas MUI dark e light
│   │   ├── helpers.js            # getRoute(), tryParseJSON(), fmtDate(), etc.
│   │   ├── api.js                # runStream() — apenas Brand Assistant
│   │   ├── supabase.js           # Cliente Supabase
│   │   ├── pdf.js                # Exportação para PDF
│   │   └── WorkspaceContext.jsx  # Context + useWorkspace()
│   ├── components/
│   │   ├── RelatorioCompleto.jsx # Relatório completo + share panel (compartilhado)
│   │   ├── ErrorBoundary.jsx     # Captura erros de render, exibe fallback
│   │   ├── GlobalStyle.jsx
│   │   ├── Bar.jsx               # Barra de score colorida
│   │   ├── Card.jsx
│   │   ├── Lbl.jsx               # Label uppercase 10px
│   │   ├── Pill.jsx              # Badge colorida inline
│   │   ├── Input.jsx / Select.jsx
│   │   ├── Tooltip.jsx
│   │   ├── UpgradeGate.jsx       # Bloqueia feature + CTA de upgrade
│   │   ├── PublicHeader.jsx / PublicFooter.jsx
│   │   └── intelligence/
│   │       └── IdentityGapCard.jsx
│   └── pages/
│       ├── PaginaPublica.jsx     # Landing page (#/)
│       ├── PaginaMetodologia.jsx # Framework Smart Branding (#/metodologia)
│       ├── RelatorioPublico.jsx  # Relatório por UUID sem auth (#/relatorio/:id)
│       ├── StreamingView.jsx     # Loading durante geração (Brand Assistant)
│       ├── LoginPage.jsx
│       ├── AppInterno.jsx        # Admin LOUDR: workspaces, fila, histórico
│       ├── DashboardHistorico.jsx
│       ├── NovoManual.jsx        # Diagnóstico manual admin (background + poll)
│       ├── auth/
│       │   └── OnboardingPage.jsx  # Aceitar convite + setup do workspace
│       └── app/
│           ├── AppShell.jsx        # Sidebar + layout + ErrorBoundary por rota
│           ├── Home.jsx            # Dashboard
│           ├── Posicionamento.jsx  # Diagnóstico + Evolução + Concorrentes (F06)
│           ├── ContentHub.jsx      # Keywords + Ideias de conteúdo (F08/F09/F10)
│           ├── SocialListening.jsx # Monitoramento de sentimento (F07a — Pro+)
│           ├── BrandList.jsx       # Grid de marcas
│           ├── BrandBook.jsx       # Editor do brand book
│           ├── BrandAssistant.jsx  # Chat IA com contexto do brand book
│           ├── Campaigns.jsx / CampaignNew.jsx / CampaignDetail.jsx
│           └── WorkspacePage.jsx   # Config, equipe
├── supabase/
│   ├── migrations/
│   │   ├── 005_setup_completo.sql    # Schema completo atual
│   │   └── 006_fix_rls_recursion.sql # Correção de políticas RLS
│   ├── functions/                    # Edge Functions (Supabase)
│   │   ├── enviar-diagnostico/       # E-mail para lead após aprovação
│   │   ├── notificar-solicitacao/    # Alerta para equipe LOUDR
│   │   ├── gerar-alertas/            # Alertas automáticos diários
│   │   ├── relatorio-mensal/         # Relatório mensal por e-mail
│   │   └── nurturing-sequence/       # Sequência D+2, D+5, D+10, D+15
│   └── seed_danilo.sql
├── .env
├── netlify.toml
└── vite.config.js
```

### Roteamento

Sem react-router. `getRoute()` em `helpers.js` lê `window.location.hash`.

| Hash | Componente | Acesso |
|---|---|---|
| `` / `#/` | `PaginaPublica` | público |
| `#/metodologia` | `PaginaMetodologia` | público |
| `#/relatorio/:id` | `RelatorioPublico` | público |
| `#/login` | `LoginPage` | público |
| `#/invite/:token` | `OnboardingPage` | público |
| `#/app` | `Home` | auth |
| `#/app/posicionamento` | `Posicionamento` | auth |
| `#/app/listening` | `SocialListening` | auth + Pro+ |
| `#/app/content-hub` | `ContentHub` | auth + Pro+ |
| `#/app/brands` | `BrandList` | auth |
| `#/app/brands/:id` | `BrandBook` | auth |
| `#/app/assistant` | `BrandAssistant` | auth |
| `#/app/workspace` | `WorkspacePage` | auth |
| `#/admin` | `AppInterno` | auth + platform_admin |

### Como a geração de diagnóstico funciona

```
1. Posicionamento.jsx — botão "Gerar diagnóstico" abre FormDialog
2. FormDialog coleta contexto (empresa vem do workspace.dominio)
3. iniciar(contexto):
   a. POST /.netlify/functions/diagnostico-gerar-background
   b. Netlify retorna 202 imediatamente (background function — sem timeout)
   c. Frontend entra em polling: consulta diagnosticos a cada 3s buscando
      created_at >= since + workspace_id = workspace.id
   d. Background function (async, até 15min):
      - Valida JWT e acesso ao workspace
      - Chama Anthropic com aiConfig('premium') — Sonnet 4.6 + web search sempre
      - Extrai JSON, salva em diagnosticos + incrementa diagnosticos_mes
      - Erros salvos como { _job_error: true, error: "..." }
   e. Polling detecta novo row → navega para o relatório

Admin (aprovarERodar + NovoManual): mesmo fluxo com { empresa, contexto }
em vez de workspace_id. Polling usa user_id + workspace_id IS NULL.

Modelo: claude-sonnet-4-6 + web_search (dev e prod — aiConfig('premium'))
```

### Como o Social Listening funciona

```
1. SocialListening.jsx — botão "Coletar menções"
2. POST /.netlify/functions/listening-coletar-background
3. Netlify retorna 202 imediatamente
4. Frontend entra em polling: consulta sentiment_snapshots a cada 3s (o snapshot
   é inserido ao final da coleta — sinaliza conclusão do job)
5. Background function (async):
   - 8 chamadas PARALELAS com stagger de 300ms, uma por plataforma:
     Twitter/X · Instagram · Facebook · TikTok · LinkedIn · Reclame Aqui · Google Reviews · News
   - Deduplicação por URL contra listening_events existentes
   - Salva eventos novos + insere sentinel_snapshot ao final
6. Polling detecta novo snapshot → chama load() para recarregar o feed

Modelo: aiConfig('standard') — Sonnet 4.6 em prod (com web search)
```

**Cooldown entre aprovações no admin:** 120s para evitar rajadas na API.

### Banco de dados (Supabase)

| Tabela | Descrição |
|---|---|
| `workspaces` | Workspace por empresa — plano, Stripe, contador de uso |
| `workspace_members` | Membros e roles (`admin` / `member`) |
| `diagnosticos` | Diagnósticos gerados — scores + JSON completo |
| `solicitacoes` | Leads captados pela landing page |
| `brands` | Marcas gerenciadas no Brand OS |
| `brand_books` | Brand book por marca (identidade, posicionamento, design system, referências) em JSONB |
| `brand_book_history` | Log de alterações por seção |
| `conversations` | Conversas do Brand Assistant |
| `messages` | Mensagens individuais |
| `campaigns` | Campanhas submetidas + veredicto IA |
| `concorrentes` | Concorrentes monitorados por workspace |
| `diagnosticos_concorrentes` | Scores de concorrentes ao longo do tempo |
| `listening_events` | Menções e eventos de social listening |
| `sentiment_snapshots` | Snapshots diários de sentimento agregado |
| `alertas` | Alertas automáticos por workspace |
| `identity_gap_snapshots` | Gap entre identidade declarada e percebida |
| `platform_admins` | Controle de acesso à área admin LOUDR |

RLS ativo em todas as tabelas — acesso mediado pela membership do workspace. Diagnósticos com `publico = true` são legíveis sem autenticação (relatórios compartilháveis por link).

### Estrutura do JSON gerado pela IA

```json
{
  "empresa": "Nome",
  "dominio": "dominio.com.br",
  "setor": "Setor",
  "porte": "Startup|PME|Médio|Grande",
  "frase_diagnostico": "...",
  "resumo_executivo": "...",
  "identidade_declarada": "...",
  "identidade_percebida": "...",
  "gap_identidade": "...",
  "praticas_loudr": {
    "inteligencia_singularidade": { "score": 6, "diagnostico": "...", "oportunidade": "..." },
    "experiencia_expressao":      { "score": 5, "diagnostico": "...", "oportunidade": "..." },
    "plataformas_ecossistemas":   { "score": 7, "diagnostico": "...", "oportunidade": "..." },
    "futuro_escala":              { "score": 4, "diagnostico": "...", "oportunidade": "..." }
  },
  "score_singularidade": 6,
  "score_consistencia": 7,
  "score_posicionamento": 5,
  "concorrentes": [
    { "nome": "...", "diferencial": "...", "ameaca": "baixa|media|alta" }
  ],
  "oportunidades": [
    { "titulo": "...", "pratica_loudr": "...", "impacto": "alto|medio|baixo", "prazo": "imediato|curto|médio prazo" }
  ],
  "quick_wins": ["..."]
}
```

### Design system

Tokens em `DS` (`src/lib/constants.js`), mapeados no tema MUI (`src/lib/theme.js`). Todo estilo via `sx prop`, `styled()` ou `theme` — nunca inline style.

```js
DS.navy       // #0D1B2A — fundo principal
DS.navyMid    // #162840 — cards (paper)
DS.navyLight  // #1E3550 — bordas / divider
DS.green      // #0D9E7A — cor primária / sucesso
DS.pink       // #E8185A — Experiência & Expressão
DS.purple     // #7F77DD — Plataformas & Ecossistemas
DS.amber      // #EF9F27 — Futuro & Escala / avisos
DS.gray       // #8A9AB0 — texto terciário
DS.border     // #E2EBE8 — bordas claras
```

Fonte: `Cairo` — pesos 400–900. Constante `F = "'Cairo', sans-serif"`.

### Regras de desenvolvimento

- **MUI obrigatório** — nunca instalar outra biblioteca de componentes.
- **Sem react-router** — navegação é `window.location.hash = "#/destino"`.
- **ANTHROPIC_KEY nunca no frontend** — sempre via Netlify Function.
- **Variáveis client-side** precisam do prefixo `VITE_`.
- **`tryParseJSON`** em `helpers.js` remove fences de markdown e é tolerante com JSON mal-formado — não substituir por `JSON.parse` direto.
- **Funções de IA:** sempre usar sufixo `-background.js` + `aiConfig(tier)` de `_ai.js`. Nunca colocar `if (isDev())` para modelo/tokens nas functions — isso já está encapsulado em `aiConfig`.
- **Tiers:** `fast` para tarefas simples, `standard` para análises gerais, `premium` para diagnóstico e tarefas onde qualidade é crítica (Sonnet 4.6 + web search em qualquer ambiente).
- **Polling:** frontend usa `created_at >= since` no Supabase com intervalo de 3s, timeout de 2-3min. Erros detectados via `data?._job_error`.
- **Git:** commitar sempre na branch `dev`. Merge para `main` só após validação. Nunca commitar direto na `main`.
