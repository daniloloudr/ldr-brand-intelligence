# LOUDR Brand Intelligence

Ferramenta interna da LOUDR para geração automatizada de diagnósticos de marca usando o framework Smart Branding. O agente pesquisa a empresa na web, analisa identidade declarada vs percebida, e gera um relatório estruturado com scores, gaps e oportunidades.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React (Create React App) |
| Estilo | CSS-in-JS inline, sem biblioteca UI |
| Auth + DB | Supabase (auth + postgres) |
| AI | Anthropic API — `claude-sonnet-4-5` com `web_search_20250305` |
| Proxy dev | `http-proxy-middleware` em `src/setupProxy.js` |
| Font | Cairo via Google Fonts (carregada dinamicamente em App.js) |

## Configuração

### Variáveis de ambiente

Crie `.env` na raiz:

```
REACT_APP_ANTHROPIC_KEY=sk-ant-...
REACT_APP_SUPABASE_URL=https://<projeto>.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJ...
```

### Instalação e execução

```bash
npm install
npm start   # http://localhost:3000
```

## Estrutura de pastas

```
src/
  App.js                      # Router hash-based, carrega font, gerencia auth
  lib/
    constants.js              # DS (design tokens), SYSTEM_PROMPT, PRATICAS, STEPS
    helpers.js                # getRoute(), tryParseJSON(), sc() (cor por score)
    api.js                    # runStream() — chama Anthropic SSE com retry
    supabase.js               # Cliente Supabase inicializado
  components/
    GlobalStyle.js            # <style> global: keyframes, scrollbar, font-face
    Bar.js                    # Barra de score colorida
    Card.js                   # Card branco com borda
    Lbl.js                    # Label uppercase pequeno
    Tooltip.js                # Tooltip hover com delay de 120ms para esconder
  pages/
    PaginaPublica.js          # Landing page pública (rota padrão e #/)
    LoginPage.js              # Login via Supabase Auth
    AppInterno.js             # Shell da área interna: nav + roteamento de sub-páginas
    NovoManual.js             # Formulário de nova solicitação + orquestração da geração
    StreamingView.js          # Tela de loading rico durante geração (5 fases)
    RelatorioCompleto.js      # Relatório gerado: todas as seções + share panel
    DashboardHistorico.js     # Dashboard de inteligência de mercado + lista de diagnósticos
    RelatorioPublico.js       # Visualização pública de relatório por ID (sem auth)
    PaginaMetodologia.js      # Página pública explicando os scores e o framework
```

## Roteamento

Sem react-router. `getRoute()` em `helpers.js` lê `window.location.hash`:

| Hash | Rota retornada | Componente |
|---|---|---|
| `` (vazio) | `"public"` | `PaginaPublica` |
| `#/login` | `"login"` | `LoginPage` |
| `#/app` ou `#/app/*` | `"app"` | `AppInterno` |
| `#/relatorio/:id` | `"relatorio-publico"` | `RelatorioPublico` |
| `#/metodologia` | `"metodologia"` | `PaginaMetodologia` |

Navegação via `window.location.hash = "#/destino"`.

## Banco de dados (Supabase)

### Tabela `solicitacoes`

Registra cada pedido de diagnóstico antes da geração.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK auth.users |
| `empresa` | text | Nome da empresa |
| `contexto` | text | Contexto opcional |
| `status` | text | `pendente` / `processando` / `concluido` / `erro` |
| `created_at` | timestamptz | |

### Tabela `diagnosticos`

Armazena o JSON do relatório gerado.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid | PK |
| `solicitacao_id` | uuid | FK solicitacoes |
| `user_id` | uuid | FK auth.users |
| `empresa` | text | Nome da empresa |
| `dados` | jsonb | Relatório completo (estrutura abaixo) |
| `created_at` | timestamptz | |

### Políticas RLS necessárias

```sql
-- Usuários autenticados leem e escrevem os próprios registros
create policy "users own diagnosticos" on diagnosticos
  for all using (auth.uid() = user_id);

-- Leitura pública por ID (para links compartilháveis)
create policy "public read diagnosticos" on diagnosticos
  for select using (true);
```

## Como a geração funciona

1. **Formulário** (`NovoManual.js`) — usuário preenche empresa + contexto opcional, clica em "Gerar"
2. **Salva solicitação** no Supabase com `status: "processando"`
3. **`runStream()`** (`api.js`) envia request para `/api/v1/messages` (proxy → Anthropic)
4. **Proxy** (`setupProxy.js`) injeta `x-api-key`, headers de versão, caching beta e `anthropic-dangerous-direct-browser-access`
5. **SSE stream** chega em chunks; parser lê eventos:
   - `content_block_start` com `tool_use` → busca web iniciada → incrementa contador de pesquisas
   - `content_block_delta` com `text_delta` → acumula texto → chama `onText()`
   - `message_stop` → `tryParseJSON()` extrai JSON → chama `onDone()`
6. **`StreamingView`** exibe progresso em 5 fases: inicializando → buscando (1-5) → gerando → skeleton → dados parciais
7. **`onDone`** salva diagnóstico no Supabase e muda para `RelatorioCompleto`

### Fluxo de retry (rate limit)

- HTTP 429 → aguarda `RATE_LIMIT_WAIT` segundos (65s) mostrando countdown visual
- Máximo `MAX_RETRIES` tentativas (3)
- Cooldown entre aprovações: `COOLDOWN_ENTRE_APROVACOES` = 120s (controlado em `AppInterno`)

## Estrutura do JSON gerado

```json
{
  "empresa": "Nome",
  "dominio": "dominio.com.br",
  "setor": "Setor",
  "porte": "Startup/PME/Médio/Grande",
  "momento_atual": "...",
  "frase_diagnostico": "...",
  "resumo_executivo": "...",
  "identidade_declarada": "...",
  "identidade_percebida": "...",
  "gap_identidade": "...",
  "praticas_loudr": {
    "inteligencia_singularidade": { "score": 6, "diagnostico": "...", "evidencias": "...", "oportunidade": "..." },
    "experiencia_expressao":      { "score": 5, ... },
    "plataformas_ecossistemas":   { "score": 7, ... },
    "futuro_escala":              { "score": 4, ... }
  },
  "score_singularidade": 6,
  "score_consistencia": 7,
  "score_posicionamento": 5,
  "justificativa_scores": "...",
  "sinais_cultura": "...",
  "sinais_investimento": "...",
  "evolucao_marca": "...",
  "gap_ads_vs_site": "...",
  "diferenciais_ativos": ["...", "...", "..."],
  "zona_ruido": ["...", "...", "..."],
  "territorio_inexplorado": "...",
  "pergunta_provocativa": "...",
  "concorrentes": [
    { "nome": "...", "diferencial": "...", "ameaca": "baixa/media/alta", "sinal": "..." }
  ],
  "oportunidades": [
    { "titulo": "...", "descricao": "...", "pratica_loudr": "...", "impacto": "alto/medio/baixo", "prazo": "imediato/curto/médio prazo" }
  ],
  "quick_wins": ["...", "...", "..."],
  "porta_entrada_loudr": "..."
}
```

Scores das práticas: 1-3 crítico, 4-6 em desenvolvimento, 7-8 sólido, 9-10 referência.

## Design system

Todos os tokens estão em `DS` em `src/lib/constants.js`. Sem classes CSS — tudo é `style={{}}` inline.

```js
DS.navy       // #0D1B2A — fundo principal
DS.navyMid    // #162840 — cards escuros
DS.green      // #0D9E7A — cor primária / sucesso
DS.pink       // #E8185A — prática Experiência
DS.purple     // #7F77DD — prática Plataformas
DS.amber      // #EF9F27 — prática Futuro / avisos
DS.text       // #0D1B2A — texto principal
DS.textMid    // #4A5A6A — texto secundário
DS.gray       // #8A9AB0 — texto terciário
DS.border     // #E2EBE8 — bordas
```

Font: `Cairo` — pesos 400–900. Constante `F = "'Cairo', sans-serif"` usada em todo `fontFamily`.

Keyframes globais definidos em `GlobalStyle.js`:
- `pulse` — opacidade pulsante para indicadores de loading
- `fu` — fade-up (entrada de elementos)
- `spin` — rotação para spinner

## Custo por relatório

| Configuração | Custo estimado |
|---|---|
| Sonnet 4-5, 5 buscas, max_tokens 5500 | ~$0.45–0.60 |
| (anterior) Sonnet 4-5, buscas ilimitadas (~10) | ~$0.90 |

Principais alavancas de custo: número de buscas web (maior fator) e tokens de output. Prompt caching (`anthropic-beta: prompt-caching-2024-07-31`) reduz custo de input em chamadas repetidas.

**Importante:** `system` deve ser string simples (não array com `cache_control`) quando usado com `web_search_20250305` — o formato array conflita com a beta de web search e quebra a extração do JSON.

## Compartilhamento de relatórios

Cada relatório gerado tem um ID do Supabase. O `SharePanel` em `RelatorioCompleto.js` oferece:
- **Copiar link**: `#/relatorio/:id` — carregado por `RelatorioPublico.js` com leitura anon
- **Enviar por email**: abre `mailto:` com assunto e corpo formatado

Para funcionar, a política RLS de leitura pública deve estar ativa (ver SQL acima).

## Notas para desenvolvimento

- **Sem react-router**: não instalar. Navegação é `window.location.hash`.
- **Sem biblioteca de componentes**: não instalar. Tudo é inline style + DS tokens.
- **`tryParseJSON`** em `helpers.js` é tolerante — remove fences de markdown e busca o JSON dentro da resposta. Não substituir por `JSON.parse` direto.
- **`setupProxy.js`** só funciona em dev (`npm start`). Em produção, o proxy precisa ser implementado no servidor (ex: Vercel rewrites com serverless function que injeta a API key).
- **Cooldown de 120s** entre aprovações de diagnósticos é controlado em `AppInterno.js` para evitar rate limiting em uso intenso.
- **`TOTAL_SEARCHES = 5`** em `StreamingView.js` deve bater com o número de buscas no `SYSTEM_PROMPT`. Se mudar o prompt, atualizar os dois.
