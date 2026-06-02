# LOUDR Brand Intelligence

Plataforma SaaS B2B que transforma a gestão de marca de uma atividade subjetiva em inteligência mensurável. Usa IA para gerar diagnósticos estratégicos, monitorar scores ao longo do tempo e avaliar campanhas com base no brand book de cada cliente.

---

## Visão de negócio

### O problema

CMOs e líderes de marketing gastam budget de marca sem conseguir mostrar o que estão construindo. Não existe visibilidade objetiva sobre se a marca está evoluindo, se a identidade declarada corresponde à percebida pelo mercado, e como a empresa se posiciona em relação aos concorrentes.

### A solução

A LOUDR Brand Intelligence aplica o framework proprietário **Smart Branding** — 4 práticas que cobrem desde a singularidade da marca até sua capacidade de escala — e usa IA para analisar sinais públicos da empresa (site, redes, anúncios, cobertura de imprensa) e devolver um diagnóstico quantificado com scores, gaps e oportunidades priorizadas.

O produto tem duas frentes:

**Para a equipe LOUDR (admin):** fila de aprovação de diagnósticos gratuitos captados pela landing page. A equipe revisa o lead, aprova, e a IA gera o relatório em tempo real com streaming.

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
| claude-sonnet-4-5 · 5 buscas web · max_tokens 4000 (produção) | ~$0.35–0.50 |
| claude-haiku-4-5 · sem buscas web · max_tokens 2048 (local dev) | ~$0.01 |

A principal alavanca de custo é o número de buscas web. Em dev local, `NETLIFY_DEV=true` faz as functions usarem Haiku sem web_search — respostas instantâneas para testar o fluxo.

---

## Visão técnica

### Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Vite 6 + React 19 |
| UI | Material UI v6 — `sx prop` / `styled()` / `ThemeProvider` |
| Auth + DB | Supabase (PostgreSQL + Auth + RLS + Edge Functions) |
| Servidor | Netlify Functions (serverless) |
| IA (produção) | Anthropic API — `claude-sonnet-4-5` com `web_search_20250305` |
| IA (local dev) | `claude-haiku-4-5-20251001` sem web_search (via `NETLIFY_DEV`) |
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
  └── runStream() → /.netlify/functions/anthropic
        Proxy SSE server-side que injeta ANTHROPIC_KEY
        Nunca expõe a chave no frontend
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
│       ├── anthropic.js          # Proxy SSE Anthropic — Brand Assistant streaming
│       ├── _prompt.js            # SYSTEM_PROMPT compartilhado (diagnóstico + cron)
│       ├── diagnostico-gerar.js  # Geração de diagnóstico server-side (timeout 120s)
│       ├── listening-coletar.js  # Social listening — 8 chamadas paralelas por plataforma
│       ├── cron-monitor.js       # Diagnósticos automáticos reais (toda segunda, 8h)
│       ├── admin-create-workspace.js
│       ├── admin-invite.js
│       ├── stripe-checkout.js    # Cria sessão de checkout
│       └── stripe-webhook.js     # Eventos Stripe → atualiza workspace.plano
├── src/
│   ├── main.jsx
│   ├── App.jsx                   # Router hash-based + auth guard
│   ├── lib/
│   │   ├── constants.js          # DS, PLANOS, PRATICAS, SYSTEM_PROMPT
│   │   ├── theme.js              # Temas MUI dark e light
│   │   ├── helpers.js            # getRoute(), tryParseJSON(), fmtDate(), etc.
│   │   ├── api.js                # runStream() com retry de rate limit
│   │   ├── supabase.js           # Cliente Supabase
│   │   ├── stripe.js             # getCheckoutUrl()
│   │   ├── pdf.js                # Exportação para PDF
│   │   ├── pptx.js               # Exportação para PPTX
│   │   └── WorkspaceContext.jsx  # Context + useWorkspace()
│   ├── components/
│   │   ├── GlobalStyle.jsx       # Keyframes, scrollbar, box-sizing globais
│   │   ├── Bar.jsx               # Barra de score colorida
│   │   ├── Card.jsx              # Card com borda
│   │   ├── Lbl.jsx               # Label uppercase 10px
│   │   ├── Pill.jsx              # Badge colorida inline
│   │   ├── Input.jsx / Select.jsx
│   │   ├── Tooltip.jsx
│   │   ├── UpgradeGate.jsx       # Bloqueia feature + CTA de upgrade
│   │   ├── PublicHeader.jsx
│   │   └── PublicFooter.jsx
│   └── pages/
│       ├── PaginaPublica.jsx     # Landing page (#/)
│       ├── PaginaMetodologia.jsx # Framework Smart Branding (#/metodologia)
│       ├── RelatorioPublico.jsx  # Relatório por UUID sem auth (#/relatorio/:id)
│       ├── StreamingView.jsx     # Loading durante geração (5 fases)
│       ├── LoginPage.jsx
│       ├── AppInterno.jsx        # Admin LOUDR: fila, aprovações, histórico
│       ├── DashboardHistorico.jsx
│       ├── NovoManual.jsx        # Formulário de diagnóstico manual (admin)
│       ├── RelatorioCompleto.jsx # Relatório completo + share panel
│       ├── auth/
│       │   ├── RegisterPage.jsx
│       │   └── OnboardingPage.jsx  # Setup do workspace — 3 passos
│       └── app/
│           ├── AppShell.jsx        # Sidebar + layout do workspace
│           ├── Home.jsx            # Dashboard: scores, alertas, oportunidades
│           ├── Diagnostico.jsx     # Gerar + histórico de diagnósticos
│           ├── Evolucao.jsx        # Gráfico de evolução dos scores
│           ├── BrandList.jsx       # Grid de marcas do workspace
│           ├── BrandOnboarding.jsx # Wizard criação de marca (3 passos)
│           ├── BrandBook.jsx       # Editor do brand book (5 seções)
│           ├── BrandAssistant.jsx  # Chat IA com contexto do brand book (RAG)
│           ├── Campaigns.jsx       # Lista de campanhas
│           ├── CampaignNew.jsx     # Submissão de campanha para aprovação IA
│           ├── CampaignDetail.jsx  # Veredicto detalhado da campanha
│           ├── SocialListening.jsx # Monitoramento de sentimento (Pro+)
│           ├── Concorrentes.jsx    # Inteligência competitiva (Pro+)
│           └── WorkspacePage.jsx   # Config, equipe e billing
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
| `#/register` | `RegisterPage` | público |
| `#/onboarding` | `OnboardingPage` | auth |
| `#/app` | `Home` | auth + plano ativo |
| `#/app/diagnostico` | `Diagnostico` | auth + plano ativo |
| `#/app/evolucao` | `Evolucao` | auth + Starter+ |
| `#/app/brands-list` | `BrandList` | auth |
| `#/app/brand-book` | `BrandBook` | auth |
| `#/app/assistant` | `BrandAssistant` | auth |
| `#/app/campaigns` | `Campaigns` | auth |
| `#/app/listening` | `SocialListening` | auth + Pro+ |
| `#/app/concorrentes` | `Concorrentes` | auth + Pro+ |
| `#/app/workspace` | `WorkspacePage` | auth |
| `#/admin` | `AppInterno` | auth + loudr_admin |
| `#/admin-historico` | `DashboardHistorico` | auth + loudr_admin |

### Como a geração de diagnóstico funciona

```
1. Posicionamento.jsx — botão "Gerar diagnóstico" abre FormDialog
2. FormDialog coleta apenas contexto (empresa vem do workspace.dominio automaticamente)
3. iniciar(contexto) → gerarDiagnosticoServidor() → POST /.netlify/functions/diagnostico-gerar
4. Netlify Function (server-side):
   a. Valida JWT do usuário
   b. Chama Anthropic API com streaming SSE (coleta text_delta server-side)
   c. Extrai JSON da resposta
   d. Salva em diagnosticos (tipo: 'manual') + incrementa diagnosticos_mes
   e. Retorna { diagnostico } ao frontend
5. Frontend exibe loading com steps animados durante a chamada (~30-60s em produção)
6. Ao receber resposta, navega para o relatório

Modelos: claude-haiku-4-5-20251001 local (NETLIFY_DEV) · claude-sonnet-4-5 produção
Timeout: 30s local (limitação netlify-cli) · 120s produção
```

### Como o Social Listening funciona

```
1. SocialListening.jsx — botão "Coletar menções"
2. coletarListening() → POST /.netlify/functions/listening-coletar
3. Netlify Function faz 8 chamadas PARALELAS ao Anthropic, uma por plataforma:
   Twitter/X · Instagram · Facebook · TikTok · LinkedIn · Reclame Aqui · Google Reviews · News
4. Cada chamada: 1 busca focada na plataforma, max_tokens 1024, retorna JSON de eventos
5. Deduplicação por URL — eventos com URL já existente no workspace são descartados
6. Eventos novos salvos em listening_events + snapshot em sentiment_snapshots
7. Frontend recarrega o feed automaticamente

Tempo total em produção: ~15-20s (paralelo) · Timeout: 60s
```

**Retry de rate limit:** HTTP 429 → aguarda 65s com countdown visual → até 3 tentativas.
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

- **MUI obrigatório** — nunca instalar outra biblioteca de componentes nem usar `style={{}}`.
- **Sem react-router** — navegação é `window.location.hash = "#/destino"`.
- **ANTHROPIC_KEY nunca no frontend** — sempre via Netlify Function.
- **Variáveis client-side** precisam do prefixo `VITE_`.
- **`tryParseJSON`** em `helpers.js` remove fences de markdown e é tolerante com JSON mal-formado — não substituir por `JSON.parse` direto.
- **`TOTAL_SEARCHES = 5`** em `constants.js` deve bater com o número de buscas no `SYSTEM_PROMPT`.
- **Git:** commitar sempre na branch `dev`. Merge para `main` só após validação. Nunca commitar direto na `main`.
