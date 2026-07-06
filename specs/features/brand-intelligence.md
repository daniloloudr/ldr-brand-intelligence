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
- **Desde 2026-07-06 vive em `netlify/functions/_brain.js`** — o cérebro extraído como módulo único com as 4 operações: `emitSignal` (ingest), `distillBrand` (destilação; `brand-distill-background.js` é só wrapper HTTP), `searchBrandKnowledge` (busca semântica; `brand-book-search.js` é só wrapper HTTP) e `resolveBrandIntelligence` (contexto). `_studio.js` voltou a ser só Studio.
- Retorna o contexto destilado **+** (opcional) os trechos crus ainda relevantes, no formato que cada consumidor precisa (prefixo de prompt, chunks de RAG, etc.).
- O **RAG do Brand Assistant** (`brand_book_chunks`) passa a ser **re-derivado a partir do modelo vivo**, não só do brand book digitado. ✅ Implementado (trilho B) — ver abaixo.

### 5. Métrica de evolução (assertividade)
Como o modelo é **versionado** e os votos viram **approval-rate**, a evolução é demonstrável:
- `confianca_media` por versão (sobe ao longo do tempo).
- approval-rate de imagens por marca por período (de X% → Y%).
- win-rate por provider/modelo de borda.

O produto **prova** que está ficando mais inteligente — não é promessa, é gráfico.

---

## Faseamento — status de implementação (2026-07-01)

- **Fase 0 — Espinha dorsal ✅** `brand_signals` (append-only, RLS) + emissão via **triggers no banco** (image_vote, campaign_verdict, diagnostic, listening_sentiment, brandbook_edit) + backfill dos votos/campanhas existentes. Porta única `resolveBrandIntelligence()` (hoje em `_brain.js`); generate/video/campaign/prompt roteados por ela. Migration `025_brand_signals.sql`.
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
| `trg_signal_diagnostic` | `diagnosticos` | `diagnostic` (migration 027: captura `territorios_possiveis` + emite na conclusão `status='done'`) |
| `trg_signal_listening` | `sentiment_snapshots` | `listening_sentiment` |
| `trg_signal_brandbook` | `brand_books` | `brandbook_edit` (peso 2) |

### `assistant_correction` — o Assistant como superfície de ensino ✅ (2026-07-01)
Aprofundamento do núcleo (trilho "A"). No `BrandAssistant.jsx`, cada resposta tem um botão **"Ensinar a marca"** → o time corrige/ensina em texto → emite um sinal `assistant_correction` (insert direto em `brand_signals` via RLS do membro; `fonte='assistant'`, `ref_id`=conversa, payload `{pergunta, resposta, correcao}`, **peso 3**). O destilador trata como **ensino humano explícito de altíssima prioridade** (sobrepõe inferências fracas). Validado end-to-end: correção de tom → v2 com a voz reescrita, confiança 0.77→0.79. O Assistant deixa de ser só consumidor e vira **produtor** de inteligência.

### RAG re-derivado do modelo vivo — os dois cérebros viram um só ✅ (2026-07-01)
Aprofundamento do núcleo (trilho "B"). O RAG semântico do Brand Assistant deixava de fora tudo que a marca **aprendeu**: `brand_book_chunks` indexava só o brand book **digitado**. Agora o **modelo vivo destilado** também é chunked + embeddado, no mesmo índice, e recuperado por similaridade — o Assistant puxa o que a marca **demonstrou e foi ensinada**, não só o que escreveu.

- **Módulo compartilhado `_embed.js`** (os dois cérebros): `voyageEmbed()` (voyage-3, 1024d) + `intelChunks(modelo)` (transforma cada item acionável do modelo vivo — posicionamento, voz, cada visual aprovado/reprovado, modelo preferido, do/dont, cada fato — em uma **unidade de sentido auto-descritiva**) + `embedIntelChunks()` (re-deriva: limpa os `intel:` antigos e re-embeda, idempotente).
- **Convivência sem clobber:** os chunks do modelo vivo usam `section` com prefixo **`intel:`** (`intel:aprovado`, `intel:voz`, `intel:modelo`, `intel:fato`…). O embed do brand book passou a deletar **só os não-`intel:`**; o destilador deleta **só os `intel:`**. Cada cérebro tem ciclo de vida próprio no mesmo índice.
- **Gatilho automático:** ao gravar uma nova versão em `brand_intelligence`, o `brand-distill-background.js` re-deriva o RAG (não-fatal se o embed falhar — a destilação já está gravada).
- **Recuperação unificada:** `match_brand_book_chunks` (sem mudança de schema/RPC) já retorna o top-5 por similaridade cobrindo os dois cérebros; o Assistant injeta só `chunk_text` (auto-descritivo).
- **Validado end-to-end:** modelo v2 → 41 chunks `intel:` convivendo com 16 do brand book. Pergunta visual → 5/5 do modelo vivo; pergunta de voz → **mistura** o declarado (brand book) + o aprendido (`intel:voz`); "qual modelo performa melhor?" → só o modelo vivo responde (win-rate) e o RAG recupera.

*Stack:* `_embed.js` (novo) · `brand-distill-background.js` (passo 5: `embedIntelChunks`) · `brand-book-embed-background.js` (delete preserva `intel:`, usa `voyageEmbed`).

### Destilador mais esperto — recência, contradição e confiança por faceta ✅ (2026-07-01)
Aprofundamento do núcleo (trilho "C"). O destilador deixava as evidências "achatadas": não sabia qual sinal era mais novo nem mais forte, e a confiança tendia a um número global. Agora ele **pondera o tempo e resolve conflitos**.

- **Recência + peso na entrada:** cada sinal é anotado com `{quando, peso}` (idade em dias calculada no envio + `brand_signals.peso`). Os sinais vão do mais antigo ao mais recente, e o cabeçalho explica a anotação. `fmtSignal(s, now)` embrulha o corpo (`fmtSignalBody`) com esses metadados.
- **Regras novas no SYSTEM:**
  - *Confiança por faceta* — cada faceta (posicionamento, voz, cada preferência visual, cada do/dont, cada fato) tem confiança **própria**, calibrada pela força/quantidade/recência das evidências daquela faceta (nunca um número global).
  - *Recência* — sinais mais recentes e de maior peso têm precedência; pondera-se recência × peso.
  - *Contradição* — quando sinais se contradizem (ou contradizem o modelo atual), sem média cega: vence o mais recente + de maior peso + ensino explícito; ao lado perdedor, **rebaixa a confiança** e registra a ressalva, sem apagar conhecimento útil.
  - *Decaimento* — o que o modelo afirma mas os sinais novos contradizem (ou já não corroboram) tem a confiança **reduzida**; só permanece alta a confiança do recente e reforçado.
  - `assistant_correction` continua como ensino de altíssima prioridade e **vence empates de recência**.
- **Validado end-to-end (revertido):** correção recente (peso 3) contradizendo um fato antigo ("gpt-image-2 reprovado", conf 0.75) → o fato foi **atualizado** ("retestado com prompt bem especificado", conf 0.9) e o `dont` genérico foi **refinado** ("não usar *com prompt genérico/sem estrutura*") em vez de apagado. Recência venceu, contradição resolvida com nuance, conhecimento preservado.

*Stack:* `brand-distill-background.js` (`fmtSignalBody`/`fmtSignal(s, now)`, `created_at` no select, `now` no content, SYSTEM enriquecido).

### Diff entre versões no painel — "o que mudou" ✅ (2026-07-01)
Aprofundamento do núcleo (trilho "D"). O painel IA LOUDR mostrava só a foto do modelo atual; agora mostra também **o que a última versão aprendeu em relação à anterior** — a evolução fica visível item a item, reforçando a prova de que a marca fica mais assertiva.

- **100% client-side** (o painel já carregava todas as versões com `modelo` — zero backend/migration). Compara `versions[N]` vs `versions[N-1]`.
- **Diff semântico leve:** `diffList(curr, prev)` classifica cada item em **NOVO** (presente em N, não em N-1) ou **revisto** (em N-1, não em N). O match usa `similar(a,b)` — igualdade normalizada OU **Jaccard de palavras significativas ≥ 0.5** — para que reformulação de texto pelo destilador **não** conte como novidade (baixo ruído).
- **Facetas cobertas:** visual aprovado/reprovado, faça, não faça, fatos. Mais: delta de **confiança em pts** vs versão anterior, e sinalização "Posicionamento/Voz recalibrado" quando o texto muda de fato.
- **Card "O que mudou na v{N}"** entre "O que a marca já aprendeu" e a proveniência; só aparece com ≥2 versões e havendo mudança. `DiffBlock` renderiza NOVO (cor da faceta) e revisto (tachado/esmaecido).
- **Validado com dado real:** diff v1→v2 (dirigido pelo ensino de tom) apareceu como novos itens em Faça/Não faça/Fatos, +1 pt de confiança; a voz **não** foi marcada como recalibrada (foi refinada, não substituída) — sem falso positivo.

*Stack:* `BrandIntelligence.jsx` (`norm`/`wordSet`/`similar`/`diffList`, cálculo de `facetDiffs`/`confDelta`/`vozChanged`/`posChanged`, componente `DiffBlock`, card "O que mudou").

**CAMADA APROFUNDADA (trilhos A–D concluídos).** Núcleo vivo: ensina (A) · recupera o aprendido via RAG (B) · destila com recência/contradição/confiança-por-faceta (C) · mostra a evolução versão-a-versão (D).

---

## Regras herdadas (não quebrar)
- Padrão de IA: **background functions + polling + `aiConfig(tier)` centralizado** (ver arquitetura de IA do projeto).
- API key nunca no frontend; tudo via Netlify Function.
- RLS por workspace em `brand_signals` e `brand_intelligence` (espelhar policy `for all` de `studio_generations`).
- Idempotência no destilador (retry automático do Netlify não pode duplicar incorporação de sinal).
- Escopo **por-marca** (um acesso = uma marca).
