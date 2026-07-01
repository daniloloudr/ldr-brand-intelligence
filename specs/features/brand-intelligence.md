# LOUDR Brand Intelligence — Camada de Inteligência da Marca
**Versão:** 1.0 · Junho–Julho 2026
**Status:** ✅ **IMPLEMENTADA (Fases 0–3)** em 2026-07-01. O ciclo de aprendizado está fechado: avaliar → destilar → aprender → realimentar (Studio + Assistant) → medir. Validada com dado real (v1 de 19 sinais, confiança 0.77). Migrations 025 (`brand_signals`) e 026 (`brand_intelligence`) aplicadas.
**Owner:** Danilo Silva · LOUDR
**Relação com o SPECS principal:** é o **núcleo** do LOUDR OS — o que dá nome ao produto. As demais features (Studio, Assistant, Posicionamento, Listening) são *produtoras e consumidoras* desta camada.

---

## Princípio fundador

> **As IAs de borda (fal.ai, Anthropic) são commodity, trocáveis e sem memória. Elas só precisam receber input super correto.** O que compõe valor e não se copia é a camada que **aprende a marca**. Essa camada *é* o LOUDR Brand Intelligence — o resto é encanamento.

Inversão de modelo mental que atravessa toda a spec:

- **Borda = stateless.** Nano Banana, GPT Image, Seedream, Sonnet, Opus — entram e saem sem deixar rastro. Trocar de modelo de borda **nunca** pode tocar na inteligência.
- **Núcleo = stateful e cumulativo.** Um **modelo vivo da marca** que se realimenta de toda avaliação e leitura, ficando **cada vez mais assertivo** — e provando isso com métrica.
- O aprendizado **não** é fine-tuning dos modelos de borda (não temos os pesos e nem queremos). É a construção de **conhecimento estruturado da marca**, nosso, versionado, com confiança e proveniência.

---

## O problema hoje

O "contexto da marca" é montado na hora, só a partir de dado **estático e digitado à mão** (`brand_books` + `design_tokens`), por `resolveBrandContext` em `netlify/functions/_studio.js`. Cada feature lê isso à sua maneira; nada que o usuário **avalia** (votos de imagem, verdicts de campanha, diagnósticos, sentiment, correções no Assistente) **volta** para enriquecer a marca. Os sinais são gravados e esquecidos. **O ciclo de aprendizado está aberto.**

---

## Arquitetura: 1 entrada · 1 cérebro · 1 estado · 1 saída

```
   features (Studio, Assistant, Posicionamento, Listening, Campaigns)
        │ emitem                                   ▲ consomem
        ▼                                          │
  ┌─────────────┐   destila   ┌──────────────┐   serve   ┌────────────────────────┐
  │brand_signals│ ──────────▶ │ DESTILADOR   │ ────────▶ │   brand_intelligence   │
  │ (append-only)│  (LLM pass) │ (Sonnet/Opus)│  versão N │ (modelo vivo, JSON)    │
  └─────────────┘             └──────────────┘           └────────────────────────┘
                                                                     │
                                                          resolveBrandIntelligence()
                                                                     │  (porta única)
                                                                     ▼
                                          toda IA de borda recebe "informação super correta"
```

### 1. Sinais (entrada) — `brand_signals`
Tabela **append-only**. Toda avaliação/leitura emite um sinal **tipado**. Nada se perde; é a matéria-prima do aprendizado.

| campo | tipo | nota |
|---|---|---|
| `id` | uuid pk | |
| `brand_id` | uuid fk | |
| `workspace_id` | uuid fk | RLS por workspace |
| `tipo` | text | `image_vote` · `campaign_verdict` · `diagnostic` · `listening_sentiment` · `assistant_correction` · `brandbook_edit` · … |
| `fonte` | text | feature/função de origem |
| `ref_id` | uuid | id do registro de origem (ex.: `studio_generations.id`) |
| `payload` | jsonb | dados do sinal (voto, prompt, provider, texto, score…) |
| `peso` | numeric | quão forte é o sinal (voto explícito > leitura passiva) |
| `created_at` | timestamptz | |
| `consumido_em` | timestamptz null | marca quando o destilador já o incorporou |

**Primeiros emissores (reaproveitam o que já existe):**
- `studio_generations.feedback` (👍/👎) → `image_vote` *(já capturamos o dado; falta emitir o sinal)*
- `campaigns` verdict → `campaign_verdict`
- `diagnosticos` (cron + manual) → `diagnostic`
- `sentiment_snapshots` / `listening_events` → `listening_sentiment`
- correções/reformulações no Brand Assistant → `assistant_correction`

### 2. O cérebro (destilador) — função LLM
Uma passada de IA que lê **sinais recentes não-consumidos + a versão atual do modelo** e produz a **próxima versão**. Guarda *conhecimento destilado*, nunca log cru.

- **Modelo:** Sonnet 4.6 padrão; Opus para destilações sensíveis/grandes.
- **Gatilhos:** cadência (reaproveitar o cron de segunda, `cron-monitor`) **+** limiar de volume de sinais novos.
- **Saída:** novo registro versionado em `brand_intelligence`, com diff em relação à versão anterior.
- **Idempotência:** marca `consumido_em` nos sinais incorporados; destilação é resiliente a retry (padrão da [arquitetura de IA] do projeto).

### 3. O estado (modelo vivo) — `brand_intelligence`
JSON **estruturado e versionado** por marca. Cada item de conhecimento carrega **confiança + proveniência**; a confiança sobe quando vários sinais corroboram.

| campo | tipo | nota |
|---|---|---|
| `id` | uuid pk | |
| `brand_id` | uuid fk | |
| `versao` | int | incremental por marca |
| `modelo` | jsonb | estrutura abaixo |
| `confianca_media` | numeric | métrica de assertividade |
| `gerado_de` | jsonb | ids/contagem de sinais usados (proveniência) |
| `created_at` | timestamptz | |

Esboço de `modelo` (jsonb):
```json
{
  "posicionamento": { "valor": "...", "confianca": 0.0, "fontes": ["diagnostic", "..."] },
  "voz":            { "valor": "...", "confianca": 0.0, "fontes": [] },
  "preferencias_visuais": {
    "aprovado":  [ { "padrao": "...", "confianca": 0.0, "exemplos": ["gen_id"] } ],
    "reprovado": [ { "padrao": "...", "confianca": 0.0 } ],
    "modelo_preferido": { "provider": "fal-ai/...", "win_rate": 0.0 }
  },
  "do_dont": { "do": [], "dont": [] },
  "fatos": [ { "fato": "...", "confianca": 0.0, "fontes": [] } ]
}
```

### 4. Porta de saída única — `resolveBrandIntelligence()`
Evolução do `resolveBrandContext` atual. **A única** função que qualquer IA de borda chama para obter contexto de marca. Imagem, Assistente, diagnóstico, conteúdo — todos passam por aqui. Trocar modelo de borda nunca toca nisso.
- Retorna o contexto destilado **+** (opcional) os trechos crus ainda relevantes, no formato que cada consumidor precisa (prefixo de prompt, chunks de RAG, etc.).
- O **RAG do Brand Assistant** (`brand_book_chunks`) passa a ser **re-derivado a partir do modelo vivo**, não só do brand book digitado.

### 5. Métrica de evolução (assertividade)
Como o modelo é **versionado** e os votos viram **approval-rate**, a evolução é demonstrável:
- `confianca_media` por versão (sobe ao longo do tempo).
- approval-rate de imagens por marca por período (de X% → Y%).
- win-rate por provider/modelo de borda.

O produto **prova** que está ficando mais inteligente — não é promessa, é gráfico.

---

## Faseamento — status de implementação (2026-07-01)

- **Fase 0 — Espinha dorsal ✅** `brand_signals` (append-only, RLS) + emissão via **triggers no banco** (image_vote, campaign_verdict, diagnostic, listening_sentiment, brandbook_edit) + backfill dos votos/campanhas existentes. Porta única `resolveBrandIntelligence()` em `_studio.js`; generate/video/campaign/prompt roteados por ela. Migration `025_brand_signals.sql`.
- **Fase 1 — Modelo vivo + destilador ✅** `brand_intelligence` versionado (migration `026`). Destilador `brand-distill-background.js` (Sonnet, idempotente via `consumido_em`). `resolveBrandIntelligence` realimenta a geração com o modelo destilado. Automação: `brand-distill-cron.js` (netlify.toml `0 7 * * *`, limiar `BRAND_DISTILL_THRESHOLD`).
- **Fase 2 — Realimentar o Assistente ✅** `BrandAssistant.jsx` carrega a última versão e injeta o bloco "Inteligência da marca (aprendido com o uso)" no system prompt (preferências visuais, do/don't, win-rate por provider, fatos). *(RAG re-derivado dos chunks fica como aprofundamento opcional — o modelo destilado é compacto e vai direto no contexto.)*
- **Fase 3 — Métricas e proveniência ✅** Painel `BrandIntelligence.jsx`: confiança média + evolução por versão (recharts), approval-rate, win-rate por provider, modelo vivo legível, proveniência por tipo de sinal.

### Acesso e UX (2026-07-01)
- **Onde:** entrada **"IA LOUDR"** no menu de Configurações do usuário (`USER_MENU` em AppShell — depois de Alertas, antes de Sair da conta). NÃO fica na nav lateral da marca. Rota de workspace `#/app/ia-loudr` (route `ia-loudr`); a página resolve a marca pelo workspace (um acesso = uma marca). "Informação relevante, mas não precisa ficar à mostra" (decisão do Danilo).
- **Princípio de copy — didático, sem entregar o negócio:** a tela EXPLICA claramente o que é a Camada, o que cada métrica significa e para que serve (card de topo + tooltips "?" por seção + estado vazio explicativo + rótulos de benefício: "Sinais"→"Evidências", "win-rate por provider"→"Desempenho por modelo"). Mas NUNCA revela o mecanismo (destilador/LLM, brand_signals, triggers, limiar, como o modelo é computado). Só benefício e significado. Regra permanente ao mexer nesta tela.

### Emissores implementados (triggers, Fase 0)
| trigger | tabela | sinal |
|---|---|---|
| `trg_signal_image_vote` | `studio_generations` (feedback) | `image_vote` (peso 2) |
| `trg_signal_campaign_verdict` | `studio_campaigns` (status) | `campaign_verdict` (aprovada=3) |
| `trg_signal_diagnostic` | `diagnosticos` | `diagnostic` |
| `trg_signal_listening` | `sentiment_snapshots` | `listening_sentiment` |
| `trg_signal_brandbook` | `brand_books` | `brandbook_edit` (peso 2) |

`assistant_correction` (não é evento de tabela) fica como emissão explícita futura.

### Próximos (opcionais)
- RAG do Assistant re-derivado do modelo vivo (embeddings do destilado).
- Diff visual entre versões no painel.
- `assistant_correction` explícito no chat.

---

## Regras herdadas (não quebrar)
- Padrão de IA: **background functions + polling + `aiConfig(tier)` centralizado** (ver arquitetura de IA do projeto).
- API key nunca no frontend; tudo via Netlify Function.
- RLS por workspace em `brand_signals` e `brand_intelligence` (espelhar policy `for all` de `studio_generations`).
- Idempotência no destilador (retry automático do Netlify não pode duplicar incorporação de sinal).
- Escopo **por-marca** (um acesso = uma marca).
