# LOUDR Brand Intelligence

Plataforma SaaS B2B de inteligência de marca. Combina diagnóstico estratégico com IA, monitoramento contínuo de scores e inteligência competitiva num workspace por empresa.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Vite + React 19 |
| Estilo | Material UI v6 — `sx prop` / `styled()` / `ThemeProvider` |
| Auth + DB | Supabase (PostgreSQL + Auth + RLS + Edge Functions) |
| Servidor | Netlify Functions |
| AI | Anthropic API — `claude-sonnet-4-5` com `web_search_20250305` |
| E-mail | Resend |
| Pagamento | Stripe |
| Gráficos | Recharts |
| Exportação | jsPDF + PptxGenJS |
| Font | Cairo via Google Fonts |

## Configuração

### Variáveis de ambiente

Crie `.env` na raiz (client-side, prefixo `VITE_`):

```
VITE_SUPABASE_URL=https://<projeto>.supabase.co
VITE_SUPABASE_KEY=eyJ...
VITE_STRIPE_PUBLIC_KEY=pk_live_...
VITE_CALENDLY_URL=https://calendly.com/loudr/insights
```

Variáveis server-side (configurar no painel Netlify — nunca expor no frontend):

```
ANTHROPIC_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
SUPABASE_SERVICE_KEY=eyJ...
```

### Instalação e execução

```bash
npm install
npm run dev   # http://localhost:5173
```

## Estrutura de pastas

```
/
├── netlify/
│   └── functions/
│       ├── anthropic.js          # Proxy SSE Anthropic — chave server-side
│       ├── stripe-checkout.js    # Cria sessão de checkout
│       ├── stripe-webhook.js     # Eventos Stripe → atualiza workspace.plano
│       └── cron-monitor.js       # Diagnósticos automáticos agendados (toda segunda, 8h)
├── src/
│   ├── main.jsx                  # ReactDOM.createRoot + ThemeProvider + CssBaseline
│   ├── App.jsx                   # Router hash-based + auth guard + font loader
│   ├── lib/
│   │   ├── constants.js          # DS, F, PRATICAS, PLANOS, SYSTEM_PROMPT, STEPS
│   │   ├── theme.js              # MUI ThemeProvider com tokens DS mapeados
│   │   ├── helpers.js            # getRoute(), tryParseJSON(), sc(), fmtDate(), calcularScoreLead(), checkPlano()
│   │   ├── api.js                # runStream() com retry de rate limit
│   │   ├── supabase.js           # Cliente Supabase inicializado
│   │   ├── stripe.js             # loadStripe(), getCheckoutUrl()
│   │   ├── pdf.js                # Exportação de relatório para PDF
│   │   ├── pptx.js               # Exportação de relatório para PPTX
│   │   └── WorkspaceContext.jsx  # Context + hook useWorkspace()
│   ├── components/
│   │   ├── GlobalStyle.jsx       # <style> global: keyframes, scrollbar, box-sizing
│   │   ├── Bar.jsx               # Barra de score colorida
│   │   ├── Card.jsx              # Card com borda
│   │   ├── Lbl.jsx               # Label uppercase 10px
│   │   ├── Pill.jsx              # Badge colorida inline
│   │   ├── Input.jsx             # Input estilizado
│   │   ├── Select.jsx            # Select estilizado
│   │   ├── Tooltip.jsx           # Tooltip hover com delay
│   │   ├── UpgradeGate.jsx       # Bloqueia feature + CTA de upgrade
│   │   ├── PublicHeader.jsx      # Header das páginas públicas
│   │   └── PublicFooter.jsx      # Footer das páginas públicas
│   └── pages/
│       ├── PaginaPublica.jsx     # Landing page de captura (rota padrão e #/)
│       ├── PaginaMetodologia.jsx # Explicação do framework Smart Branding (#/metodologia)
│       ├── RelatorioPublico.jsx  # Relatório por ID sem auth (#/relatorio/:id)
│       ├── LoginPage.jsx         # Login via Supabase Auth (#/login)
│       ├── AppInterno.jsx        # Shell admin: nav + fila de aprovações
│       ├── DashboardHistorico.jsx# Histórico de diagnósticos (admin)
│       ├── NovoManual.jsx        # Formulário + streaming (contexto admin)
│       ├── RelatorioCompleto.jsx # Relatório completo com share panel
│       ├── StreamingView.jsx     # Tela de loading durante geração (5 fases)
│       ├── auth/
│       │   ├── RegisterPage.jsx  # Cadastro self-service (#/register)
│       │   └── OnboardingPage.jsx# Setup do workspace — 3 passos (#/onboarding)
│       └── app/
│           ├── AppShell.jsx      # Nav lateral + layout do workspace (#/app/*)
│           ├── Home.jsx          # Dashboard: scores, alertas, oportunidades (#/app)
│           ├── Diagnostico.jsx   # Diagnósticos + histórico + geração (#/app/diagnostico)
│           ├── Evolucao.jsx      # Gráfico de scores ao longo do tempo (#/app/evolucao)
│           └── WorkspacePage.jsx # Config + equipe + billing (#/app/workspace)
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── functions/
│       ├── enviar-diagnostico/   # Triggered: aprovação → e-mail para lead (Resend)
│       ├── notificar-solicitacao/# Triggered: nova solicitação → e-mail para equipe LOUDR
│       ├── gerar-alertas/        # Scheduled: analisa dados e gera alertas diários
│       ├── relatorio-mensal/     # Scheduled: dia 1 do mês → e-mail com evolução
│       └── nurturing-sequence/   # Triggered: D+2, D+5, D+10, D+15 pós-diagnóstico
├── .env
├── netlify.toml
├── vite.config.js
└── SPECS.md
```

## Roteamento

Sem react-router. `getRoute()` em `helpers.js` lê `window.location.hash`:

| Hash | Componente | Acesso |
|---|---|---|
| `` (vazio) ou `#/` | `PaginaPublica` | público |
| `#/metodologia` | `PaginaMetodologia` | público |
| `#/relatorio/:id` | `RelatorioPublico` | público |
| `#/login` | `LoginPage` | público |
| `#/register` | `RegisterPage` | público |
| `#/onboarding` | `OnboardingPage` | auth |
| `#/app` | `Home` | auth + plano ativo |
| `#/app/diagnostico` | `Diagnostico` | auth + plano ativo |
| `#/app/evolucao` | `Evolucao` | auth + starter+ |
| `#/app/listening` | `SocialListening` | auth + pro+ |
| `#/app/concorrentes` | `Concorrentes` | auth + pro+ |
| `#/app/workspace` | `WorkspacePage` | auth |
| `#/admin` | `AppInterno` (Solicitações) | auth + loudr_admin |
| `#/admin/historico` | `DashboardHistorico` | auth + loudr_admin |

Navegação via `window.location.hash = "#/destino"`.

## Banco de dados (Supabase)

### Tabelas principais

| Tabela | Descrição |
|---|---|
| `workspaces` | Workspace por empresa — plano, Stripe, limites de uso |
| `workspace_members` | Membros do workspace com role (`admin` / `member`) |
| `diagnosticos` | Relatório gerado em JSONB + scores individuais |
| `solicitacoes` | Leads captados pela landing page (status: pendente/aprovado/rejeitado) |
| `listening_events` | Feed de menções e eventos de social listening (Pro+) |
| `sentiment_snapshots` | Snapshots diários de sentiment por workspace |
| `concorrentes` | Concorrentes monitorados por workspace (Pro+) |
| `diagnosticos_concorrentes` | Scores de concorrentes ao longo do tempo |
| `alertas` | Alertas gerados automaticamente por workspace |

Migration completa em `supabase/migrations/001_initial_schema.sql`.

## Planos

| Plano | Preço | Diagnósticos/mês | Monitor | Concorrentes | Membros | Social Listening |
|---|---|---|---|---|---|---|
| Trial | grátis | 1 | — | 0 | 1 | não |
| Starter | R$ 490 | 1 | mensal | 0 | 1 | não |
| Pro | R$ 1.490 | 3 | semanal | 2 | 3 | sim |
| Enterprise | R$ 3.990 | ilimitado | diário | 5 | ilimitado | sim |

## Como a geração funciona

1. **Formulário** — usuário preenche empresa + contexto opcional, clica em "Gerar"
2. **Salva solicitação** no Supabase com `status: "processando"`
3. **`runStream()`** (`api.js`) envia request para `/.netlify/functions/anthropic` (produção) ou `/api/v1/messages` (dev via Vite proxy)
4. **Netlify Function** (`anthropic.js`) injeta `ANTHROPIC_KEY` server-side e faz proxy para a API Anthropic
5. **SSE stream** chega em chunks; parser lê eventos:
   - `content_block_start` com `tool_use` → busca web iniciada → incrementa contador
   - `content_block_delta` com `text_delta` → acumula texto → chama `onText()`
   - `message_stop` → `tryParseJSON()` extrai JSON → chama `onDone()`
6. **`StreamingView`** exibe progresso em 5 fases: inicializando → buscando (1–5) → gerando → skeleton → dados parciais
7. **`onDone`** salva diagnóstico no Supabase e redireciona para o relatório

### Fluxo de retry (rate limit)

- HTTP 429 → aguarda `RATE_LIMIT_WAIT` = 65s com countdown visual
- Máximo `MAX_RETRIES` = 3 tentativas
- Cooldown entre aprovações no admin: `COOLDOWN_ENTRE_APROVACOES` = 120s

## Estrutura do JSON gerado

```json
{
  "empresa": "Nome",
  "dominio": "dominio.com.br",
  "setor": "Setor",
  "porte": "Startup|PME|Médio|Grande",
  "momento_atual": "...",
  "frase_diagnostico": "...",
  "resumo_executivo": "...",
  "identidade_declarada": "...",
  "identidade_percebida": "...",
  "gap_identidade": "...",
  "praticas_loudr": {
    "inteligencia_singularidade": { "score": 6, "diagnostico": "...", "evidencias": "...", "oportunidade": "..." },
    "experiencia_expressao":      { "score": 5, "diagnostico": "...", "evidencias": "...", "oportunidade": "..." },
    "plataformas_ecossistemas":   { "score": 7, "diagnostico": "...", "evidencias": "...", "oportunidade": "..." },
    "futuro_escala":              { "score": 4, "diagnostico": "...", "evidencias": "...", "oportunidade": "..." }
  },
  "score_singularidade": 6,
  "score_consistencia": 7,
  "score_posicionamento": 5,
  "justificativa_scores": "...",
  "sinais_cultura": "...",
  "sinais_investimento": "...",
  "evolucao_marca": "...",
  "gap_ads_vs_site": "...",
  "diferenciais_ativos": ["..."],
  "zona_ruido": ["..."],
  "territorio_inexplorado": "...",
  "pergunta_provocativa": "...",
  "concorrentes": [
    { "nome": "...", "diferencial": "...", "ameaca": "baixa|media|alta", "sinal": "..." }
  ],
  "oportunidades": [
    { "titulo": "...", "descricao": "...", "pratica_loudr": "...", "impacto": "alto|medio|baixo", "prazo": "imediato|curto|médio prazo" }
  ],
  "quick_wins": ["..."],
  "porta_entrada_loudr": "..."
}
```

Scores das práticas: 1–3 crítico · 4–6 em desenvolvimento · 7–8 sólido · 9–10 referência.

## Design system

Tokens em `DS` em `src/lib/constants.js`, mapeados no tema MUI em `src/lib/theme.js`. Todo estilo via `sx prop`, `styled()` ou `theme` — nunca inline style.

```js
DS.navy       // #0D1B2A — fundo principal
DS.navyMid    // #162840 — cards escuros (paper)
DS.navyLight  // #1E3550 — bordas escuras / divider
DS.green      // #0D9E7A — cor primária / sucesso
DS.pink       // #E8185A — prática Experiência & Expressão
DS.purple     // #7F77DD — prática Plataformas & Ecossistemas
DS.amber      // #EF9F27 — prática Futuro & Escala / avisos
DS.text       // #0D1B2A — texto principal
DS.textMid    // #4A5A6A — texto secundário
DS.gray       // #8A9AB0 — texto terciário
DS.border     // #E2EBE8 — bordas claras
```

Font: `Cairo` — pesos 400–900. Constante `F = "'Cairo', sans-serif"`.

## Custo por diagnóstico

| Configuração | Custo estimado |
|---|---|
| claude-sonnet-4-5, 5 buscas web, max_tokens 5500 | ~$0.45–0.60 |

Principal alavanca de custo: número de buscas web. Prompt caching (`anthropic-beta: prompt-caching-2024-07-31`) reduz custo de input em chamadas repetidas.

## Compartilhamento de relatórios

Cada diagnóstico tem um UUID do Supabase. O `SharePanel` em `RelatorioCompleto.jsx` oferece:
- **Copiar link:** `#/relatorio/:id` — carregado por `RelatorioPublico.jsx` com leitura anônima (RLS pública)
- **Enviar por email:** abre `mailto:` com assunto e corpo formatado

## Notas para desenvolvimento

- **MUI obrigatório** — nunca instalar outra biblioteca de componentes nem usar inline style.
- **Sem react-router** — não instalar. Navegação é `window.location.hash`.
- **`tryParseJSON`** em `helpers.js` é tolerante: remove fences de markdown e busca o JSON dentro da resposta. Não substituir por `JSON.parse` direto.
- **Vite proxy** só funciona em dev (`npm run dev`). Em produção, o proxy é a Netlify Function `anthropic.js`.
- **`TOTAL_SEARCHES = 5`** em `constants.js` deve bater com o número de buscas no `SYSTEM_PROMPT`.
- **`system` deve ser string simples** (não array com `cache_control`) ao usar `web_search_20250305` — formato array conflita com a beta de web search.
- **Git:** commitar sempre na branch `dev`. Merge para `main` só após validação completa. Nunca commitar direto na `main`.
