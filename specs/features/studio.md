# LOUDR Studio — Geração Visual On-Brand
**Versão:** 1.1 · Junho 2026
**Status:** Especificação de novo módulo — controle de versão próprio
**Owner:** Danilo Silva · LOUDR
**Relação com o SPECS principal:** complementa o LOUDR OS (SPECS v5.8). Herda stack, padrões e regras. Este documento evolui de forma independente.
**Changelog v1.1:** Decisões de arquitetura travadas. **Escopo por-marca** — Studio vive dentro da marca (`#/app/brands/:id/studio`), como Brand Assistant e Campaigns; um acesso = uma marca, sem seletor. **Provider de imagem: gateway fal.ai** (vários modelos atrás de uma key, precificação no gateway), abstraído em `_image.js`. Nova seção **Arquitetura de Escala**: geração via **fila + webhook** (não background bloqueante), **fan-out** de campanha, status via **Supabase Realtime**, storage abstraído em `_storage.js`. **Storage = Cloudflare R2** (egress zero, ~$3.75/250GB; Supabase permanece só como banco; DO Spaces/S3 trocável via env var) com thumbnails, lifecycle de descarte e WebP. Quota por workspace e idempotência viram requisito. Imprecisões corrigidas: FK `studio_campaigns` criada antes de `studio_generations`; `studio_campaigns` (agrupamento de peças) separada de `campaigns` do F15 (aprovação); flag de plano `studio` própria.

---

## Visão

**LOUDR Studio** é o módulo de criação visual da plataforma. Um canvas nodal — no espírito do ComfyUI — onde a marca não é um parâmetro a configurar, mas o ponto de partida. Como o Brand System já está estruturado (identidade verbal, identidade visual, design tokens, assets, RAG), cada geração nasce on-brand: puxa o tom, as cores, a tipografia e as referências da própria marca.

**O diferencial:** no ComfyUI genérico você carrega um modelo e escreve o prompt do zero. No Magnific você organiza um workflow visual mas a consistência de marca é configurada manualmente. No LOUDR, o contexto de marca já existe e é injetado automaticamente em cada nó de geração. A campanha sai coerente porque toda peça bebe da mesma fonte.

**Foco da primeira versão:** campanhas completas — múltiplas peças visuais coerentes a partir de um conceito, adaptadas para formatos diferentes (feed, story, banner) mantendo o mesmo DNA.

### Pergunta principal do módulo

| Módulo | Pergunta que responde |
|--------|----------------------|
| Studio | Como transformo a minha marca em peças e campanhas prontas? |

---

## Posição na Navegação

Studio é **por-marca** — vive dentro do contexto da marca, ao lado de Brand Book, Brand Assistant e Campaigns (mesmo padrão de rota nested `#/app/brands/:id/...`). Como **um acesso = uma marca** (sem multi-marca, sem seletor), o `brand_id` vem direto da rota e o Studio está sempre a um clique da marca ativa. Estilo: Content cuida de texto e temas, Studio cuida de visual — os dois braços de produção da marca.

```
Brand OS (a marca do acesso)
├── Brand Book
├── Brand Assistant
├── Campaigns (aprovações)        Pro+
└── Studio                        Pro+   ← NOVO · visual
```

**Rotas** (nested na marca, como assistant/campaigns — exige parsing em `helpers.js getRoute()` + branch em `AppShell.jsx renderPage()` dentro de `<UpgradeGate planoNecessario="pro">`):

| Hash | Componente | Acesso |
|------|-----------|--------|
| `#/app/brands/:id/studio` | StudioCanvas (lista + canvas) | auth + Pro+ |
| `#/app/brands/:id/studio/:workflowId` | StudioCanvas (workflow aberto) | auth + Pro+ |
| `#/app/brands/:id/studio/campanhas` | StudioCampaigns | auth + Pro+ |

`brand_id` resolvido por `getBrandId()`; um `getWorkflowId()` (espelhando o helper existente) extrai o `:workflowId`. Plano: flag própria `studio: true` nos tiers pro/enterprise em `constants.js` (não reaproveitar `social_listening`).

---

## Arquitetura do Canvas

### Biblioteca do canvas nodal

O canvas usa **React Flow** (`@xyflow/react`) — é o padrão de mercado para editores nodais em React, encaixa com React 19 e MUI, e gerencia pan/zoom/conexões/seleção sem reinventar a roda. Cada nó é um componente React customizado estilizado com MUI, respeitando o tema da marca ativa via `buildBrandTheme()`.

```
@xyflow/react   — canvas, nós, arestas, pan/zoom, minimap
  ↳ nós customizados (MUI) por tipo
  ↳ estado do grafo (nodes + edges) no React state local
  ↳ ao salvar: serializa para jsonb em studio_workflows
```

Mantém o stack atual: sem Zustand (estado do grafo vive no componente do canvas e persiste no Supabase), supabase-js direto, MUI sempre.

### Execução do grafo

Quando o usuário roda o workflow:

```
1. Validação    Resolve ordem topológica dos nós (entrada → geração → saída)
                Detecta ciclos e nós desconectados — bloqueia run com aviso
2. Contexto     Nós de marca resolvem seu conteúdo (RAG, tokens, assets) antes de gerar
3. Disparo      Cada nó de geração submete um job no fal (function síncrona <1s)
                e grava studio_generations(status='processing') — ver Arquitetura de Escala §1
4. Status       Frontend assina Supabase Realtime em studio_generations (por workflow_id)
                Cada nó mostra estado: idle → running → done | error (polling 3s = fallback)
5. Encadeamento Nó seguinte só dispara quando a dependência está done
                Campanha = fan-out: aguarda todas as peças antes de marcar concluída
```

A geração nunca bloqueia compute — submete no gateway e é avisada pelo webhook (Arquitetura de Escala §1).

---

## Biblioteca de Nós

Os nós são agrupados por categoria. A cor de cada categoria segue o design system da plataforma.

### Contexto de marca (entrada) — roxo

| Nó | O que faz | Fonte de dados |
|----|-----------|---------------|
| **Brand DNA** | Injeta tom de voz, personalidade e vocabulário | RAG em `brand_book_chunks` (verbal_identity) |
| **Brand Visual** | Injeta paleta de cores, tipografia e estética | `design_tokens` + `visual_identity` |
| **Brand Assets** | Disponibiliza logos e elementos como imagem de referência | `brand_assets` (bucket brand-assets) |
| **Referência** | Moodboard ou imagens externas como guia estético | upload temporário ou assets |

### Input — cinza

| Nó | O que faz |
|----|-----------|
| **Prompt** | Texto livre do que o usuário quer criar |
| **Formato** | Define proporção e tamanho (feed 1:1, story 9:16, banner, etc.) |
| **Imagem base** | Upload de imagem para editar ou variar |

### Geração — teal

| Nó | O que faz | Function |
|----|-----------|----------|
| **Generate** | Gera uma peça com contexto de marca + prompt injetados | `studio-generate.js` |
| **Variation** | Gera variações de uma imagem existente | `studio-generate.js` (modo variação) |
| **Edit / Inpaint** | Edita região específica da imagem | `studio-edit.js` |
| **Campaign Brief** | Recebe um conceito e gera N peças coerentes | `studio-campaign.js` |
| **Format Adapter** | Adapta uma peça para múltiplos formatos mantendo coerência | `studio-campaign.js` |

### Refinamento — cinza

| Nó | O que faz | Function |
|----|-----------|----------|
| **Upscale** | Aumenta resolução para qualidade de impressão | `studio-upscale.js` |
| **Remove BG** | Remove fundo, isola o objeto | `studio-edit.js` |
| **Apply Brand** | Overlay de logo ou elementos da marca | client-side (canvas) |

### Saída — coral

| Nó | O que faz |
|----|-----------|
| **Preview** | Visualiza a peça no canvas |
| **Save to Assets** | Salva no `brand_assets` da marca |
| **Send to Approval** | Envia para o fluxo de aprovação (F15 do SPECS principal) |
| **Export** | Baixa nos formatos selecionados |

---

## Injeção de Contexto de Marca

O coração do diferencial. Como design system + referências + tom viram parte da geração.

### Compilação

Quando um nó de geração roda, ele recebe um **brand context** compilado a partir dos nós de marca conectados a ele:

```
Brand DNA      → RAG search no brand book → trechos de tom, personalidade, vocabulário
Brand Visual   → design_tokens → cores hex, fontes, estética descrita textualmente
Brand Assets   → URLs dos assets selecionados (logos, elementos)
Referência     → URLs das imagens de moodboard
```

Isso vira dois tipos de entrada para o modelo de imagem:

**1. Prefixo de prompt estruturado** (texto)
```
[BRAND CONTEXT]
Marca: {nome}
Estética: {estilo visual descrito a partir do visual_identity}
Paleta: {cores hex dos design_tokens} — usar como cores dominantes
Tipografia: {fontes} — se houver texto na peça
Tom: {personalidade da marca} — a peça deve transmitir {adjetivos}
Evitar: {o que não combina com a marca}

[PEDIDO DO USUÁRIO]
{prompt do nó Prompt}

[FORMATO]
{proporção e uso do nó Formato}
```

**2. Imagens de referência** (para modelos que aceitam)
Os assets e referências viram image inputs — o modelo usa como guia de estilo, cor e composição. Modelos como Gemini 2.5 Flash Image e Flux com IP-adapter mantêm consistência visual entre peças a partir dessas referências.

### Por que isso garante coerência de campanha

Todas as peças de uma campanha compartilham o mesmo brand context. Mesmo que os prompts individuais variem (um post sobre produto, outro sobre valores), o prefixo de marca e as imagens de referência são idênticos. O resultado é uma campanha que parece ter saído da mesma direção de arte.

---

## Provider de Geração de Imagem

**Decisão travada (v1.1): gateway fal.ai.** A Anthropic não gera imagens, então o Studio usa um provider externo. Optou-se por um **gateway** (fal.ai) em vez de integração direta: dá acesso a vários modelos (Flux, Gemini/Nano Banana, Ideogram, Recraft) atrás de uma única key, com precificação consolidada no próprio gateway. A abstração `_image.js` permanece — trocar o provider concreto ou combinar modelos por etapa continua sendo mudança de config, não de código.

### Abstração

```js
// netlify/functions/_image.js
// Espelha o padrão do aiConfig(tier) — troca de provider sem mudar as functions
export async function generateImage({ provider, prompt, references, format, mode }) {
  const client = IMAGE_PROVIDERS[provider]
  return client.generate({ prompt, references, format, mode })
}

export const IMAGE_PROVIDERS = {
  gemini:   { /* Gemini 2.5 Flash Image — Nano Banana */ },
  flux:     { /* Flux via fal.ai ou Replicate */ },
  ideogram: { /* Ideogram — forte em texto na imagem */ },
  recraft:  { /* Recraft — feito para design/branding */ },
}
```

### Comparativo para a decisão

| Provider | Força | Quando escolher |
|----------|-------|-----------------|
| **Gemini 2.5 Flash Image** (Nano Banana) | Consistência entre peças, edição precisa, aceita múltiplas referências | Recomendado para o MVP — campanha coerente é o foco |
| **Flux** (via fal.ai / Replicate) | Qualidade fotográfica, controlável, IP-adapter | Alternativa forte, ecossistema maduro |
| **Ideogram** | Renderiza texto dentro da imagem com fidelidade | Quando as peças têm muito texto/copy |
| **Recraft** | Estilo de marca consistente, exporta SVG, controle de design | Quando o foco é design gráfico e vetorial |

**Modelo inicial dentro do gateway:** Gemini 2.5 Flash Image (Nano Banana) pela consistência entre peças (essencial para campanhas) e capacidade de usar assets da marca como referência. Como o acesso é via fal.ai, trocar/combinar modelos depois (gerar no Flux, refinar texto no Ideogram) é só parâmetro — sem nova integração.

**Gateway escolhido: fal.ai.** Key única, vários modelos, e — crítico para escala — **queue API com webhook** (ver Arquitetura de Escala): submete o job e é avisado quando termina, sem segurar a function aberta esperando.

---

## Arquitetura de Escala

Geração de imagem é cara (custo por chamada) e lenta (30–90s). Vendendo para cliente e mirando volume, o Netlify **não** é o gargalo de capacidade — Functions são Lambda e escalam horizontalmente. O risco real é **bloquear compute esperando o provider** e **egress de banda** ao servir as peças. Cinco disciplinas resolvem isso. Netlify permanece como camada de orquestração; o que muda é o padrão assíncrono.

### 1. Geração via fila + webhook — nunca background bloqueante

O fal.ai tem queue API com webhook. Em vez de uma background function parada 60s esperando (paga Lambda ocioso + segura slot de concorrência), o fluxo é:

```
Function A (síncrona, <1s)
  → valida auth + quota → compila brand context → submete job no fal (queue)
  → grava studio_generations(status='processing', provider_request_id)
  → retorna

fal.ai processa (fora da nossa infra)

Function B = webhook (studio-webhook.js, <2s)
  → fal chama de volta com o resultado
  → baixa a imagem → grava no storage (Cloudflare R2) → update status='done', image_url
  → erro do fal → status='error'
```

Isso **elimina a background function de 15min** para imagem. Nenhuma Lambda fica presa.

> **Dev local:** webhook não alcança `localhost`. Espelhar o padrão `isDev()` já usado no `_ai.js`: produção = webhook; dev = poll do status endpoint do fal dentro de uma background function. Mesma lógica do Haiku-local/Sonnet-prod.

### 2. Campanha = fan-out, não loop

`studio-campaign.js` **não** gera N peças num loop (1 função segurando N×60s). Ele **enfileira N jobs independentes** (N linhas em `studio_generations` + N submissões ao fal), cada peça concluindo sozinha via webhook. Campanha de 4 formatos = 4 jobs de <1s de compute, não 1 função de 4 minutos. `studio_campaigns.status` vira `concluida` quando a última peça reporta `done`.

### 3. Status via Supabase Realtime — polling só como fallback

Polling 3s funciona para 1 job pontual, mas com muitos usuários × muitos nós em execução vira leitura repetida em massa. O canvas assina **Supabase Realtime** em `studio_generations` (filtrado por `workflow_id`) e recebe `done`/`error` por websocket — menos requests, UI mais viva. Polling 3s permanece como degradação graciosa.

### 4. Storage abstraído + entrega por CDN — proteção de custo

Binário de imagem **nunca** passa por Netlify Function (bandwidth é o maior risco de fatura). As peças vão para object storage com CDN, abstraído para não prender a nenhum provedor:

```js
// netlify/functions/_storage.js — espelha a filosofia do _image.js
// cliente S3-compatível: serve DO Spaces, Cloudflare R2 ou S3 sem mudar negócio
export async function putObject(key, buffer, contentType) { /* ... */ }
export function publicUrl(key) { /* CDN do provedor */ }
export async function deleteObject(key) { /* ... */ }
```

**Decisão (v1.1): Cloudflare R2.** ~$0.015/GB-mês (250GB ≈ $3.75) e **egress ZERO** — banda não tem teto de custo, eliminando o risco de torneira aberta por definição. Operações têm free tier generoso (1M Class A / 10M Class B por mês); no volume inicial é desprezível. S3-compatível (`@aws-sdk/client-s3` com endpoint do R2), com CDN da Cloudflare na frente do bucket (domínio custom) para cache e latência. **Supabase permanece só como banco** (Postgres + Auth + RLS + pgvector); sem migração. Trocar para DO Spaces ou S3 depois é mudança de env var, não de código. `studio_generations.image_url` aponta para o CDN do R2.

**Cortes de egress/storage (de graça):**
- **Thumbnail + full-res separados** — a galeria carrega thumbnails (~50KB), full-res só sob demanda. Derruba egress em ~90% no uso real.
- **Lifecycle de descarte** — geração é rascunho; só "Save to Assets" merece vida longa. Regra de lifecycle apaga gerações não-salvas após N dias (nativo no DO/R2).
- **WebP** onde possível — metade do tamanho, metade da banda.

### 5. Idempotência + quota por workspace (server-side)

Background functions do Netlify **fazem retry automático** em falha — e geração custa dinheiro, então retry cego cobra duas vezes. O `provider_request_id` do fal serve de chave de idempotência: checar status antes de re-submeter. E, requisito de robustez (não "depois"): **quota de gerações/campanhas por workspace aplicada no servidor**, limitando custo por cliente. Alertas de billing no DO e no fal fecham a quinta camada de teto.

### Fora do Studio — mapear

- **Streaming SSE (`anthropic.js`, Brand Assistant):** SSE sobre Lambda segura a conexão durante todo o stream (mesmo "slot preso"). Candidato natural a migrar para **Edge Functions (Deno)** — feitas para streaming — quando o volume de chat subir. Já antecipado no SPECS principal.
- **Functions finas:** orquestração pura (auth + dispatch + CRUD leve). Trabalho pesado mora no fal.ai e no Supabase — mantém cold start e bundle baixos.

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
  nodes         jsonb default '[]'::jsonb,   -- nós do React Flow
  edges         jsonb default '[]'::jsonb,   -- conexões
  thumbnail_url text,
  is_template   boolean default false        -- workflow reutilizável (futuro)
);

alter table studio_workflows enable row level security;
create index on studio_workflows (workspace_id, brand_id);

-- Campanha do Studio: AGRUPAMENTO de peças geradas a partir de um conceito.
-- NÃO confundir com a tabela `campaigns` do F15 (fluxo de aprovação) — são coisas
-- distintas. "Send to Approval" grava em `campaigns` (F15), não aqui.
-- Criada antes de studio_generations porque esta a referencia (FK).
create table studio_campaigns (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  workspace_id  uuid references workspaces(id) on delete cascade,
  brand_id      uuid references brands(id) on delete cascade,
  workflow_id   uuid references studio_workflows(id),
  nome          text not null,
  conceito      text,                          -- o brief da campanha
  formatos      jsonb default '[]'::jsonb,     -- formatos solicitados
  status        text default 'rascunho'        -- rascunho | gerando | concluida | aprovada
);

alter table studio_campaigns enable row level security;
create index on studio_campaigns (workspace_id, status);

-- Cada imagem gerada (também serve de registro do job — ver Arquitetura de Escala)
create table studio_generations (
  id                  uuid default gen_random_uuid() primary key,
  created_at          timestamptz default now(),
  workspace_id        uuid references workspaces(id) on delete cascade,
  brand_id            uuid references brands(id) on delete cascade,
  workflow_id         uuid references studio_workflows(id) on delete cascade,
  node_id             text,                       -- id do nó no grafo
  campaign_id         uuid references studio_campaigns(id),
  prompt_final        text,                       -- prompt completo enviado (com brand context)
  brand_context       jsonb,                      -- snapshot do contexto usado
  provider            text,                       -- fal:flux | fal:gemini | fal:ideogram | ...
  provider_request_id text,                       -- id do job no fal — webhook + idempotência
  formato             text,                       -- 1:1 | 9:16 | 16:9 | etc.
  image_url           text,                       -- CDN do Cloudflare R2 (full-res)
  thumbnail_url       text,                       -- thumbnail (~50KB) p/ galeria — corta egress
  status              text default 'processing',  -- processing | done | error
  error               text,
  custo_estimado      numeric                     -- alimenta dashboard de custos de IA (futuro)
);

alter table studio_generations enable row level security;
create index on studio_generations (workspace_id, status);
create index on studio_generations (workflow_id, node_id);
```

### Storage

As peças geradas vão para **Cloudflare R2** (bucket `studio-generations`), não para o Supabase Storage — ver Arquitetura de Escala §4. Acesso via `_storage.js` (S3-compatível), entrega pelo CDN da Cloudflare (domínio custom na frente do bucket). Estrutura de chave sugerida: `{workspace_id}/{brand_id}/{generation_id}.webp` (+ `..._thumb.webp`). Lifecycle: gerações não salvas em assets expiram após N dias. Supabase Storage segue usado apenas para o que já existe (brand-assets, manuais) — sem migração agora.

### RLS

Padrão workspace_id em todas as tabelas, idêntico ao resto do produto. Membro acessa só os dados do seu workspace. Platform admin acessa via `is_platform_admin()`.

---

## Functions

Padrão **fila + webhook** (ver Arquitetura de Escala §1) — a function de disparo é síncrona e retorna em <1s; o trabalho pesado roda no fal.ai e volta por webhook. Nada de Lambda parada esperando.

```
studio-generate.js                (síncrona, dispatch)
  → recebe: workflow_id, node_id, brand context, prompt, formato, modelo
  → valida auth + quota → compila prefixo + referências → submete job no fal (queue)
  → grava studio_generations(status='processing', provider_request_id) → retorna <1s

studio-campaign.js                (síncrona, fan-out)
  → recebe: conceito, formatos[], brand context
  → enfileira N jobs independentes (N linhas + N submissões ao fal), mesmo brand context
  → cada peça conclui sozinha pelo webhook; studio_campaigns.status = concluida no último done

studio-webhook.js                 (webhook do fal, <2s)
  → fal chama de volta com o resultado do job
  → baixa imagem → gera thumbnail → grava no Cloudflare R2 (via _storage.js)
  → update studio_generations: status='done', image_url, thumbnail_url
  → falha do fal → status='error', error
  → idempotente por provider_request_id (ignora callback duplicado)

studio-edit.js / studio-upscale.js   (síncronas, dispatch — mesmo padrão fila+webhook)
  → edição/inpaint/remove-bg · upscale para impressão
```

> **Dev local:** sem webhook em `localhost`. Espelhar `isDev()`: em dev, um `studio-poll-background.js` polla o status do fal e faz o mesmo trabalho do webhook. Em prod, webhook.

**Brand context resolvido server-side:** as functions de dispatch chamam o RAG (`match_brand_book_chunks` — reusa `brand-book-search.js`) e leem `design_tokens` / `brand_assets` para montar o contexto, garantindo que a chave do fal e a lógica de marca nunca vão para o frontend.

---

## Geração de Campanha

O fluxo principal da primeira versão.

```
1. Usuário monta o workflow:
   Brand DNA + Brand Visual + Brand Assets → Campaign Brief → Format Adapter → Saída

2. No nó Campaign Brief, descreve o conceito:
   "Campanha de lançamento da coleção de inverno, tom acolhedor, foco em conexão"

3. No nó Format Adapter, escolhe os formatos:
   feed 1:1, story 9:16, banner 16:9, capa de e-mail

4. Run:
   studio-campaign.js gera 4 peças coerentes
   Todas com o mesmo brand context (cores, tom, referências da marca)
   Cada formato adaptado mantendo a identidade

5. Resultado:
   Galeria da campanha — peças lado a lado, visivelmente da mesma marca
   Ações: aprovar (F15), salvar em assets, exportar tudo
```

A coerência vem do brand context compartilhado, não de o usuário reescrever o prompt para cada formato.

---

## Faseamento

A visão é grande. O módulo entrega valor cedo e cresce em camadas.

| Fase | Escopo | Entrega |
|------|--------|---------|
| **A — Geração on-brand** | Canvas básico: Brand DNA, Brand Visual, Prompt, Formato, Generate, Preview, Save | Uma peça on-brand por vez, provando a injeção de contexto |
| **B — Campanha** | Campaign Brief + Format Adapter + galeria de campanha | Múltiplas peças coerentes — o foco principal |
| **C — Refinamento** | Variation, Edit/Inpaint, Upscale, Remove BG, Apply Brand | Controle fino sobre cada peça |
| **D — Templates / Apps** | Salvar workflow como template reutilizável (estilo "Apps" do Magnific) | Um workflow on-brand vira botão de um clique para a equipe |

Começar pela Fase A valida a parte mais arriscada — se a injeção de contexto produz peças que parecem da marca — antes de investir na orquestração de campanha.

---

## Integração com o Resto do Produto

| Integra com | Como |
|-------------|------|
| **Brand System** | Fonte de todo o contexto — verbal_identity, visual_identity, design_tokens, brand_assets |
| **RAG (brand_book_chunks)** | Brand DNA usa `match_brand_book_chunks()` para puxar tom e vocabulário |
| **Aprovações (F15)** | Nó Send to Approval cria uma campanha no fluxo de aprovação existente |
| **Brand Assets** | Nó Save to Assets grava peças geradas na biblioteca da marca |
| **Brand Assistant** | Pode sugerir abrir o Studio a partir de uma ideia de conteúdo (Content → Studio) |
| **Dashboard de custos** | `custo_estimado` por geração alimenta o controle de custos de IA por workspace |

---

## Regras de Desenvolvimento (específicas do Studio)

Herda todas as regras do SPECS principal. Reforços do módulo:

1. **Brand context é obrigatório na geração** — nenhum nó Generate roda sem ao menos um nó de marca conectado. Geração genérica não é o produto
2. **Provider abstraído** — toda chamada de imagem passa por `generateImage()` do `_image.js`. Nunca chamar um provider direto na page ou na function de negócio
3. **Fila + webhook para tudo que gera** — geração, campanha, edição, upscale submetem job no fal e retornam <1s; webhook conclui. Nunca segurar Lambda esperando o provider. Status via Realtime (polling 3s = fallback). Ver Arquitetura de Escala
4. **Brand context resolvido server-side** — RAG e tokens lidos na function, nunca expor lógica ou chave no frontend
5. **Estado do grafo persiste** — o canvas salva nodes/edges em `studio_workflows` (jsonb). Não depender de estado só em memória
6. **Custo registrado** — toda geração grava `custo_estimado` e `provider` para o dashboard de custos
7. **Tema da marca no canvas** — os nós respeitam `buildBrandTheme()` da marca ativa
8. **Campanha compartilha contexto** — todas as peças de uma campanha usam o mesmo brand context snapshot, garantindo coerência
9. **MUI + React Flow** — canvas com `@xyflow/react`, nós estilizados com MUI. Sem outra lib de UI
10. **Git: commit + push por nó/funcionalidade** — branch dev, nunca main

---

## Checklist de QA

- [ ] Canvas abre, permite arrastar nós e conectá-los
- [ ] Run resolve ordem topológica e bloqueia ciclos/nós soltos
- [ ] Nó Generate não roda sem contexto de marca conectado
- [ ] Brand context aparece no prompt final (verificável em studio_generations.prompt_final)
- [ ] Peça gerada reflete cores e estética da marca
- [ ] Campanha gera N peças visivelmente coerentes entre si
- [ ] Cada formato sai na proporção correta
- [ ] Polling 3s atualiza estado dos nós (running → done)
- [ ] Erro de geração mostra mensagem no nó, não trava o canvas
- [ ] Save to Assets grava no brand_assets do workspace correto
- [ ] Send to Approval cria item no fluxo de aprovação (F15)
- [ ] RLS: workspace A não vê workflows nem gerações do workspace B
- [ ] custo_estimado e provider gravados em cada geração
- [ ] Workflow salvo e reaberto mantém nodes e edges

---

## Decisões em Aberto — para validar

1. ~~Provider de imagem~~ **RESOLVIDO (v1.1):** gateway fal.ai, modelo inicial Gemini 2.5 Flash Image, abstraído em `_image.js`.
2. **Limites por plano** (agora requisito, não opcional): quantas gerações/campanhas por mês em cada tier? Precisa de número para a quota server-side que protege custo (Arquitetura de Escala §5). Definir junto ao modelo comercial, mas a quota entra mesmo com valores provisórios.
3. **Vídeo no futuro** (referência Runway): o canvas nodal comporta um nó de vídeo depois. Decisão de roadmap, não bloqueia o MVP.

---

*LOUDR Studio · SPEC v1.1 · Junho 2026*
*Documento independente — complementa o LOUDR OS SPECS v5.8.*