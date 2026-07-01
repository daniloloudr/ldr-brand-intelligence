# LOUDR Studio — Plataforma Generativa de Marca
**Versão:** 2.1 · Junho 2026
**Status:** Especificação de novo módulo — controle de versão próprio
**Owner:** Danilo Silva · LOUDR
**Relação com o SPECS principal:** complementa o LOUDR OS (SPECS v5.8). Herda stack, padrões e regras. Evolui de forma independente.
**Changelog v2.1 (2026-06-28) — Bloco Workflow maduro + refinos do Bloco Imagem.** Ver seção "Workflow — implementado (v2.1)" e "Modelos — referência (i2i) por modelo". Resumo: canvas nodal robusto (nome persistente, autosave pós-run, dirty-state, thumbnail, run seletivo, regerar 1 nó estilo n8n, sticky notes, grupos, alinhar/distribuir, resize em todos os nós, entrada+saída em todos, continuar a partir do Preview, feedback de tempo, nós em PT, boxes 250×250); 12 templates prontos + "criar workflow por prompt" (Sonnet 4.6); referência image-to-image roteada para o endpoint de edição **de cada modelo** do fal; nó Imagem com até 5 referências; reidratação de imagens da fonte de verdade ao reabrir; upload R2 resiliente a TLS; default Nano Banana (sem Auto/ID custom na UI do nó).
**Changelog v2.0:** Repensado como **plataforma de criação visual generativa** em **3 blocos — Imagem · Vídeo · Workflow** (sem bloco de Áudio). Benchmark: mescla de **Magnific** (geração com seletor de modelo, referências e templates) + **Runway** (workflow nodal com apps e encadeamento), com o **DNA LOUDR** (brand intelligence) costurado em qualquer ponto. **Mudança de princípio:** a **marca é referência OPCIONAL**, não um gate — gera-se com ou sem a base da marca. **Dois paradigmas** convivem: *geração autônoma* (rápida, 1 clique) e *workflow estruturado* (vários inputs → um ou vários outputs). **Seletor de modelo** de imagem (Auto + escolher). Bloco Imagem ganha referências (Style/Character/Add) + galeria de templates on-brand. Bloco Vídeo (image/text-to-video) entra por último. O que foi construído (Fases A/B/Format Adapter/fechar-o-ciclo) vira a fundação do bloco Workflow + motor de geração.
**Changelog v1.1:** Escopo por-marca; gateway fal.ai; Arquitetura de Escala (fila+webhook, fan-out, Realtime, R2); imprecisões de schema corrigidas.
**Changelog v1.0:** Spec inicial do módulo (canvas nodal on-brand).

---

## Visão

**LOUDR Studio** é a plataforma de criação visual generativa da LOUDR. Não é um gerador de imagem a mais nem um clone de ComfyUI — é a mescla do melhor do mercado (Magnific, Runway) com o diferencial que só a LOUDR tem: **a marca como contexto vivo, disponível em qualquer geração**.

O usuário pode **gerar imagens e vídeos de forma autônoma** (rápido, direto) **ou construir um workflow estruturado** com vários inputs encadeados até um ou vários outputs. Em ambos, a base da marca (identidade verbal, visual, tokens, assets) está **disponível como referência — opcional, nunca obrigatória**.

**O diferencial:** no Magnific/Runway você configura consistência de marca manualmente a cada peça. No LOUDR, o contexto de marca já existe, é estruturado, e pode ser injetado com um toque — ou ignorado quando a criação é livre. A marca é uma *fonte*, não uma *prisão*.

---

## Os dois paradigmas

O Studio é generativo por natureza e atende dois modos de trabalho que convivem:

| Paradigma | O que é | Quando usar | Inspiração |
|-----------|---------|-------------|------------|
| **Geração autônoma** | Gerar imagem/vídeo direto: prompt + modelo + (opcional) referências/marca → output | Rápido, exploratório, 1 peça ou um lote | Magnific |
| **Workflow estruturado** | Canvas nodal: vários inputs (marca, imagem, prompt, modelo, apps) encadeados → um ou vários outputs | Processo repetível, multi-etapa, campanhas, pipelines | Runway |

Os dois compartilham o mesmo motor (modelos, fila+webhook, R2, brand context) e os mesmos blocos de saída (Save to Assets, Export, Approval).

---

## Princípio: a marca é referência opcional

Regra que atravessa todo o módulo: **brand context nunca bloqueia a geração.** É um *interruptor*, não um *portão*.

- Geração **com marca** → injeta identidade verbal/visual + tokens + assets como referência (texto + imagens). On-brand por padrão quando ligado.
- Geração **sem marca** → criação livre, igual a qualquer gerador de mercado.
- O toggle "Usar marca como referência" aparece em todos os pontos de geração (autônomo e nós de workflow), **ligado por padrão** (é o nosso diferencial), mas desligável.

> Mudança vs v1.x: removido o gate "Generate não roda sem nó de marca". A marca passa a ser uma referência conectável/desligável.

---

## Navegação

Studio é **por-marca** (vive dentro da marca, `#/app/brands/:id/studio/...`, como Brand Assistant e Campaigns). Um acesso = uma marca. Dentro do Studio, **3 blocos**:

```
Brand OS (a marca do acesso)
└── Studio                              Pro+
    ├── 🖼️  Imagem      geração autônoma de imagem (Magnific-style)
    ├── 🎬  Vídeo       geração de vídeo (Runway-style)         [fase final]
    └── 🔀  Workflow    canvas nodal de processo (Runway-style)
```

**Rotas:**

| Hash | Bloco | Acesso |
|------|-------|--------|
| `#/app/brands/:id/studio` | Imagem (default) | auth + Pro+ |
| `#/app/brands/:id/studio/video` | Vídeo | auth + Pro+ |
| `#/app/brands/:id/studio/workflow` | Workflow (lista + canvas) | auth + Pro+ |
| `#/app/brands/:id/studio/workflow/:workflowId` | Workflow aberto | auth + Pro+ |

`brand_id` por `getBrandId()`. Gate Pro+ por `<UpgradeGate>` + flag de plano `studio`.

---

## 🖼️ Bloco Imagem (geração autônoma)

Estilo Magnific. Painel de geração + galeria de templates.

**Painel de geração:**
- **Modelo** — seletor "Auto" + escolher modelo específico (ver Modelos & Provider). Auto = a LOUDR escolhe o melhor por tarefa.
- **Referências** — *Style*, *Character*, *Add* (imagens de referência, até N) → viram `image_urls` no modelo. Mais o toggle **"Usar marca como referência"** (assets/tokens da marca).
- **Prompt** — texto livre, com `@` para puxar referências.
- **Formato** (1:1, 9:16, 16:9, 4:5, custom) + **nº de imagens**.
- **Gerar** → fan-out de N imagens (mesma fundação assíncrona).

**Templates on-brand** — galeria agrupada por categoria, presets que já nascem com a marca:
- Branding: *Moodboard de identidade*, *Mockup de embalagem*, *Hero shot de produto*
- Social Media: *Post editorial*, *Story de campanha*, *Foto de perfil*
- Advertising: *Foto real para campanha*, *Anúncio de produto premium*
- Cada template = `{ modelo, prompt base, referências, formato }` + injeção da marca. Clicar pré-preenche o painel.

> A **campanha** (fan-out de N formatos coerentes + Format Adapter, já construída) vira um **template/modo** dentro de Imagem ("Campanha multi-formato").

---

## 🎬 Bloco Vídeo — implementado (2026-06-30)

Estilo Runway. Geração de vídeo curto a partir de imagem ou texto, sobre a **mesma fundação async da Imagem** (fila fal + webhook/poll-dev + R2 + `studio_generations`).

- **Text-to-video (t2v)** — prompt → vídeo.
- **Image-to-video (i2v)** — imagem de origem (upload na tela, ou nó upstream no Workflow) → vídeo.
- **Entregue em dois lugares:**
  - **Página standalone** `#/app/brands/:id/studio/video` (`StudioVideo.jsx`): seletor de modelo (com rótulo do modo: *texto+imagem / só imagem / só texto*), prompt + "Melhorar", origem i2v opcional, duração e formato dependentes do modelo, galeria com player `<video>` + lightbox, votação 👍/👎, baixar, salvar nos assets.
  - **Nó `videoGen` no Workflow** (`StudioCanvas.jsx`, cor índigo): recebe imagem de um nó upstream (PRODUCES_IMAGE) como origem i2v, ou faz t2v só com o Prompt; player inline; integrado ao executor (`dispatchVideoNode`, `run`/`pollEngine`, regenerar 1 nó, reidratação ao reabrir). Vídeo é saída terminal (não vira referência de imagem a jusante).

**Modelos (fal, verificados jun/2026) — `videoModels.js` (UX) + `_video.js` (endpoints + adaptador de params por família, pois divergem):**

| key | Modelo | Modos | Notas de param |
|-----|--------|-------|----------------|
| `veo3` / `veo3-fast` | Google Veo 3 / Fast | t2v | `duration` `4s/6s/8s`, `aspect_ratio` 16:9·9:16 |
| `kling-25-turbo` | Kling 2.5 Turbo Pro | i2v | `duration` `5/10`, enquadramento da imagem |
| `hailuo-02` | Minimax Hailuo 02 | t2v+i2v | `duration` `6/10` |
| `seedance-1-pro` | Seedance 1.0 Pro | t2v+i2v | `duration` `5/10`, `aspect_ratio` |
| `wan-22` | Wan 2.2 | t2v+i2v | usa `num_frames` (sem duração em s) |

- Fundação compartilhada: `submitVideoGeneration` insere `media_type='video'`; `image_url`/`thumbnail_url` reusados como URL da mídia; `extractMediaUrl` escolhe vídeo×imagem no webhook/poll; EXT ganhou mp4/webm/mov.
- Backend: `studio-generate-video.js` (auth + gate Pro/enterprise + quota), valida modo i2v/t2v vs imagem de origem.
- Schema: migration `022_studio_video.sql` adiciona `studio_generations.media_type` (default `'image'`).
- **Teste real OK:** Seedance i2v gerou vídeo (~64s p/ 5s).

Bloco mais caro (modelos de vídeo custam mais e demoram ~1 min). Pendências: conectar nó **Formato** ao t2v (hoje usa o aspect padrão do modelo); variantes extras (Seedance v5 Lite, GPT Image 1.5).

---

## 🔀 Bloco Workflow (processo estruturado)

Canvas nodal (React Flow) estilo Runway/ComfyUI. O que já existe (`StudioCanvas`) é a fundação; o v2.0 expande os nós e o encadeamento.

**Categorias de nó:**

| Categoria | Nós | Cor |
|-----------|-----|-----|
| **Marca** (opcional) | Brand DNA, Brand Visual, Brand Assets, Referência | roxo |
| **Input** | Prompt, Formato, Imagem (upload), Imagem (de outro nó) | cinza |
| **Modelo** | Generate (com seletor de modelo por nó), Variation | teal |
| **Apps / Ferramentas** | Upscale, Remove BG, Mockup, Expand, Change Camera, Relight, Stylize, Vary, Scene Builder, Story Panels, Character (consistência), Product Reshoot | cinza |
| **Saída** | Preview, Save to Assets, Export, Send to Approval | coral |

**Encadeamento:** a saída de um nó alimenta o input do próximo. Constrói-se em pedaços, reusa-se em momentos diferentes, **um workflow pode ter vários outputs**. Tudo pode (não precisa) partir dos nós de marca e crescer conforme a necessidade.

**Workflows como Apps/Templates:** salvar um workflow on-brand como **template reutilizável** (`is_template`) → vira "App" de 1 clique para a equipe (estilo Runway Apps / Starter Kits).

### Workflow — implementado (v2.1, `StudioCanvas.jsx`)

**Nós (todos em PT, todos com entrada+saída, todos redimensionáveis):** Prompt (textarea preenche o box; botão "Melhorar" via Sonnet 4.6), Formato (altura fixa 250×116), Gerar (seletor de modelo segmentado, default **Nano Banana**, sem Auto/ID custom na UI; altura 250×140), Prévia (clique abre lightbox do R2; 👍/👎 grava `studio_generations.feedback`), Imagem (upload de **até 5 referências**), Voz da marca / Visual da marca (injetam facetas distintas via `brand_facets`), Apps Ampliar/Remover fundo/Variação. Tamanho padrão **250×250**; cantos 5px.

**Organização visual:** Sticky notes (atrás dos nós), Grupos (container que move os filhos juntos — parentId do React Flow; desagrupar/excluir), alinhar (esq/centro/dir, topo/meio/base) e distribuir (H/V) com toolbar contextual ao selecionar 2+ nós. Rail vertical de ações à esquerda (estilo Runway). Nome do workflow como título da página, editável.

**Execução:** **Gerar** (tudo), **Rodar este** (nó + jusante) e **Regerar** (só este nó, reusando o que já veio antes — estilo n8n). Motor: dispatch + encadeamento (apps e generates a jusante disparam quando o upstream conclui), poll concorrente com **feedback de tempo** ("gerando… 1:23") e aviso após 90s; **continuar a partir de um Preview** (handle de saída + `PRODUCES_IMAGE` inclui preview). **Autosave após cada run.**

**Persistência:** nome, posições, tamanho (`style`), vínculo de grupo (`parentId`/`extent`) salvos; estados transitórios (running/loading/elapsed) **não** persistem. Ao reabrir, imagens são **reidratadas da fonte de verdade** (`studio_generations` por `workflow_id`+`node_id`) e estados presos viram idle.

**Criação rápida:** **12 templates prontos** (`studioWorkflowTemplates.js`, grade 4 col: Social/Advertising/Branding/Mockup) que clonam o grafo num novo workflow; e **"Criar workflow por prompt"** (`studio-workflow-build.js`, Sonnet 4.6) que monta o grafo a partir da intenção, validado contra o schema (tipos/formatos/ops) com fallback seguro.

---

## Modelos & Provider — catálogo aberto

**Gateway: fal.ai** — queue API + webhook. Como a fila é chamada por `queue.fal.run/{model-id}`, o Studio dá acesso a **qualquer modelo de imagem do fal**: o **`model` é um parâmetro por request** (não um enum fixo), especialmente no Workflow, para testar construções livremente.

**Três camadas de seleção:**
1. **Catálogo curado** (`IMAGE_MODELS` em `_image.js`) — só para UX rápida (nomes amigáveis, marca quais aceitam referência). Não limita o que dá pra usar.
2. **ID custom** — campo livre para colar qualquer id do fal (`fal-ai/flux/dev`, `fal-ai/flux-pro/v1.1`, `fal-ai/recraft-v3`, `fal-ai/ideogram/v2`, `fal-ai/gemini-25-flash-image`, `fal-ai/stable-diffusion-v35-large`, `fal-ai/bytedance/seedream/...`, etc.).
3. **Params extras (JSON)** — no nó de modelo do Workflow, escape hatch para parâmetros específicos do modelo.

```js
// netlify/functions/_image.js — model id vem do request; catálogo é só UX
export const IMAGE_MODELS = [
  { id: 'fal-ai/gemini-25-flash-image', label: 'Nano Banana (Gemini)', refs: true },
  { id: 'fal-ai/flux/dev',              label: 'Flux dev',             refs: false },
  { id: 'fal-ai/flux-pro/v1.1',         label: 'Flux Pro 1.1',         refs: false },
  { id: 'fal-ai/ideogram/v2',           label: 'Ideogram v2 (texto)',  refs: false },
  { id: 'fal-ai/recraft-v3',            label: 'Recraft v3 (design)',  refs: false },
  // … lista cresce; qualquer id do fal pode ser usado via "ID custom"
]
// submitImageJob({ model, prompt, references, format, extra }) — model = endpoint exato
```

**Payload tolerante (compatível com modelos diversos):** sempre envia `prompt`; imagem de referência quando há; `aspect_ratio` best-effort (omitido no modo edição — o tamanho herda da imagem); mescla `extra` (JSON) por cima. Modelo que não aceita um param ignora ou erra — tradeoff aceito para "testar tudo".

**Referência (image-to-image) por modelo — `modelFor`/`imageField` em `_image.js` (v2.1):** com referência, o text-to-image **ignora a imagem**; por isso cada modelo é roteado para o seu endpoint de edição/i2i, com o campo de imagem correto. Mapa `I2I`:

| Modelo | Endpoint com referência | Campo |
|---|---|---|
| Nano Banana | `…/gemini-25-flash-image/edit` | `image_urls` |
| GPT Image 2 | `openai/gpt-image-2/edit` | `image_urls` |
| Seedream 4.0 / 4.5 | `…/bytedance/seedream/v4(.5)/edit` | `image_urls` |
| Flux.1 dev | `…/flux/dev/image-to-image` | `image_url` |
| Flux Pro 1.1 / Ultra | `…/flux-pro/v1.1(-ultra)/redux` | `image_url` |
| Ideogram v2 | `…/ideogram/v2/remix` | `image_url` |
| Recraft v3 | `…/recraft/v3/image-to-image` | `image_url` |

Ressalvas: **Flux Pro (Redux)** é variação, não edição por instrução (para edição guiada no Flux usar **FLUX Kontext**, ainda fora do catálogo). Edição guiada por prompt funciona bem em Nano Banana, GPT Image 2 e Seedream.

**Dev poll (`studio-poll-background.js`):** fallback de localhost (webhook não chega no dev). Limite **10 min** — GPT Image/Seedream passam de 3 min. Em produção o webhook resolve sem esse limite. Usa a `status_url`/`response_url` que o fal devolve no submit (evita 405 em endpoints multi-path). **Upload R2 resiliente a TLS** (`bad record mac`): `putObject` tenta 3× descartando a conexão a cada falha.

- O `model` é threaded: frontend → `studio-generate`/`studio-campaign`/nó → `submitGeneration` → `submitImageJob`.
- Cada geração grava `provider` (model id usado) + `custo_estimado` → dashboard de custos.
- Modelos de **vídeo** seguem o mesmo padrão (`VIDEO_MODELS` + id custom) no bloco Vídeo.

---

## Injeção de Contexto de Marca (opcional)

Quando o toggle "usar marca" está ligado, o `_studio.js resolveBrandContext` compila — server-side — a partir de `brand_books.verbal_identity/visual_identity` + `design_tokens` + `brand_assets`:

- **Prefixo estruturado** `[BRAND CONTEXT]` (tom, personalidade, paleta, tipografia, estética, o que evitar) no prompt.
- **Imagens de referência** (logos/assets selecionados) como `image_urls` (endpoint `/edit`).

Resolvido sempre no servidor — a chave do fal e a lógica de marca nunca vão ao frontend. Desligado, o prompt é enviado puro.

---

## Arquitetura de Escala

Geração é cara e lenta (30–90s). O Netlify **não** é o gargalo (Functions = Lambda, escalam). O risco é **bloquear compute** esperando o provider e **egress** ao servir as peças. Cinco disciplinas (valem para os 3 blocos):

### 1. Geração via fila + webhook — nunca background bloqueante
Function síncrona (<1s) submete o job no fal (queue) e grava `studio_generations(status='processing', provider_request_id)`; o webhook (`studio-webhook.js`) baixa o resultado → R2 → `done`. Nenhuma Lambda presa.
> **Dev local:** webhook não alcança `localhost` → `isDev()` faz poll do status do fal num background function.

### 2. Lote / campanha = fan-out, não loop
N peças = N jobs independentes (N linhas + N submissões), cada uma concluindo sozinha. Nunca 1 função segurando N×60s.

### 3. Status via Supabase Realtime — polling como fallback
Frontend assina Realtime em `studio_generations` (por `workflow_id`/`campaign_id`); polling 3s é degradação graciosa.

### 4. Storage abstraído + entrega por CDN — proteção de custo
Binário **nunca** passa por Function. `_storage.js` (S3-compatível) → **Cloudflare R2** (egress ZERO, ~$0.015/GB-mês). Cortes: thumbnail+full-res, lifecycle de descarte de não-salvos, WebP. `image_url`/`media_url` apontam pro CDN do R2.

### 5. Idempotência + quota por workspace (server-side)
`provider_request_id` = chave de idempotência (retry do Netlify não cobra 2x). Quota mensal por workspace aplicada no servidor + alertas de billing.

### Fora do Studio
- SSE do Brand Assistant (`anthropic.js`) → candidato a Edge Functions (Deno) quando o volume subir.
- Functions finas (orquestração); trabalho pesado no fal + Supabase.

---

## Banco de Dados

```sql
-- ═══════════════════════════════════
-- STUDIO
-- ═══════════════════════════════════

-- Workflow salvo: o grafo nodal serializado
create table studio_workflows (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id) on delete cascade,
  brand_id      uuid references brands(id) on delete cascade,
  nome          text not null,
  nodes         jsonb default '[]'::jsonb,
  edges         jsonb default '[]'::jsonb,
  thumbnail_url text,
  is_template   boolean default false        -- workflow vira "App" reutilizável
);

-- Campanha/lote: agrupamento de peças (NÃO confundir com campaigns do F15)
create table studio_campaigns (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id) on delete cascade,
  brand_id      uuid references brands(id) on delete cascade,
  workflow_id   uuid references studio_workflows(id),
  nome          text not null,
  conceito      text,
  formatos      jsonb default '[]'::jsonb,
  mode          text default 'independent',   -- independent | adapt (migration 020)
  hero_generation_id uuid,
  adapt_started boolean default false,
  status        text default 'rascunho'       -- rascunho | gerando | concluida | aprovada
);

-- Cada geração (imagem OU vídeo) + registro do job
create table studio_generations (
  id                  uuid default gen_random_uuid() primary key,
  created_at          timestamptz default now(),
  workspace_id        uuid references workspaces(id) on delete cascade,
  brand_id            uuid references brands(id) on delete cascade,
  workflow_id         uuid references studio_workflows(id) on delete cascade,
  node_id             text,
  campaign_id         uuid references studio_campaigns(id),
  prompt_final        text,
  brand_context       jsonb,                  -- snapshot (null se gerado sem marca)
  media_type          text default 'image',   -- image | video  (v2.0)
  provider            text,                   -- modelo usado (fal-ai/...)
  provider_request_id text,                   -- webhook + idempotência
  references          jsonb default '[]',     -- image_urls usadas (v2.0)
  formato             text,
  image_url           text,                   -- (renomear p/ media_url no futuro)
  thumbnail_url       text,
  status              text default 'processing',
  error               text,
  custo_estimado      numeric
);
-- RLS por workspace + is_platform_admin() em todas (migrations 018–020 já aplicadas).
-- v2.0 adiciona: studio_generations.media_type + references (migration 021).
-- Templates da galeria: tabela studio_templates (ou seed em código) — a definir.
```

---

## Functions (fila + webhook)

```
studio-generate.js     dispatch síncrono de 1 geração (imagem) — marca opcional
studio-campaign.js     fan-out de N peças (lote/campanha) + modo adapt
studio-webhook.js      callback do fal → baixa → R2 → done/error (idempotente)
studio-poll-background.js   fallback dev (sem webhook em localhost)
_image.js              gateway fal + registro de modelos (IMAGE_MODELS / VIDEO_MODELS)
_storage.js            R2 (S3-compatível)
_studio.js             resolveBrandContext + submitGeneration + finalize + conclusão de campanha

v2.0 adiciona:
studio-video.js        dispatch de vídeo (image/text-to-video)
studio-edit.js         apps de edição (upscale, remove-bg, expand, relight, …) por modelo
```

Brand context resolvido server-side (`_studio.js`), só quando o toggle de marca está ligado.

---

## Faseamento v2.0

| Fase | Escopo | Status |
|------|--------|--------|
| **Fundação** | geração on-brand, fila+webhook, R2, campanha fan-out, Format Adapter, Save/Export/histórico | ✅ feito |
| **1 — Bloco Imagem** | nav 3 blocos; seletor de modelo (registro `IMAGE_MODELS`); referências Style/Character/Add; toggle marca opcional; galeria de templates on-brand; campanha como template | a fazer |
| **2 — Workflow rico** | expandir o canvas: nós de modelo (seletor por nó), apps (Upscale, Remove BG, Mockup, Expand, Vary, Relight, Change Camera, Scene Builder, Character, Story Panels), múltiplos outputs, workflows como Apps/templates | a fazer |
| **3 — Bloco Vídeo** | image/text-to-video via gateway; `media_type=video`; entrega R2 | a fazer (último) |
| **Pré-produção** | blindar entrega de imagens (bucket privado + Worker), thumbnails reais, quotas por plano, dashboard de custos | a fazer |

Ordem recomendada: **Imagem → Workflow → Vídeo**.

---

## Regras de Desenvolvimento (específicas do Studio)

Herda as regras do SPECS principal. Reforços:

1. **Marca é referência opcional** — toggle, nunca gate. Geração roda com ou sem marca.
2. **Provider abstraído** — toda chamada de imagem/vídeo passa pelo registro em `_image.js`. Nunca chamar modelo direto na página/negócio.
3. **Fila + webhook para tudo que gera** — submete e retorna <1s; webhook conclui. Nunca segurar Lambda.
4. **Brand context resolvido server-side** — chave e lógica de marca nunca no frontend.
5. **Estado de workflow persiste** — nodes/edges em `studio_workflows` (jsonb).
6. **Custo registrado** — toda geração grava `provider` + `custo_estimado`.
7. **Storage por CDN** — binário nunca por Function; R2 abstraído (trocável por env).
8. **MUI + React Flow** — canvas com `@xyflow/react`, nós em MUI.
9. **Git:** commit + push por bloco/funcionalidade, branch dev.

---

## Decisões em Aberto — para validar

1. ~~Modelos de imagem do MVP~~ **RESOLVIDO (v2.0):** catálogo aberto — qualquer modelo do fal via `model` por request + ID custom + params extras. O `IMAGE_MODELS` curado é só atalho de UX, não limite. Catálogo inicial: Nano Banana, Flux dev/Pro, Ideogram, Recraft (cresce conforme uso).
2. **Modelos de vídeo** (bloco 3): Veo / Kling / Seedance via fal? Definir antes da Fase 3.
3. **Templates**: tabela `studio_templates` no banco vs. seed em código. Sugestão: seed em código no MVP, tabela quando houver edição via admin.
4. **Limites por plano**: nº de gerações/campanhas por tier — requisito da quota server-side.

---

*LOUDR Studio · SPEC v2.0 · Junho 2026*
*Documento independente — complementa o LOUDR OS SPECS v5.8.*
