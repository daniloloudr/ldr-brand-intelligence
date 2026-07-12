# s1ngulr — Arquitetura de Tecnologia
### O documento-fonte para os slides/PPTs de tecnologia · atualizado 2026-07-12
### Convenção de status em todo o documento: ✅ em produção · 🔜 em breve (gatilho definido) · 🔭 visão (rota pavimentada)
*Par narrativo: [`pitch-futuro.md`](pitch-futuro.md) (o discurso hoje → em breve → futuro).*

> **A tese técnica em uma frase:** construímos uma **camada de inteligência de marca** — um cérebro
> por tenant que aprende com o uso — e tratamos os modelos de IA (LLMs, geradores de imagem/vídeo)
> como **borda commodity trocável**. O valor não está no modelo; está nos **dados proprietários que
> cada marca acumula** e em como eles realimentam toda geração.

---

## 1 · O diagrama macro (4 camadas)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SUPERFÍCIES (o produto que o cliente vê)                                │
│  Estratégia · Inteligência (Mercado/Insights/Concorrentes/Tendências)    │
│  Estúdio (Imagem/Vídeo/Redação/Fluxos) · Home adaptativa                 │
│  Copiloto: chat que ensina a marca ✅ → diretor de arte (julga peças,    │
│  internas e externas) 🔜 → agentes de produção em massa nos Fluxos 🔜    │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │  toda leitura/escrita de inteligência
                               │  passa por UMA porta (módulo _brain)
┌──────────────────────────────▼──────────────────────────────────────────┐
│  🧠 CÉREBRO DE MARCA (o IP — 1 por tenant)                               │
│  sinais → destilação → modelo vivo versionado → RAG → dataset            │
│  emitSignal · distillBrand · resolveBrandIntelligence ·                  │
│  searchBrandKnowledge · fetchDataset                                     │
│                                                                          │
│  ──► 🔌 INTEGRAÇÕES 🔜🔭 — o cérebro FORA do produto:                    │
│      MCP (Figma · Canva · qualquer ferramenta de criação) + API in/out  │
│      (piloto Hering) — de produto fechado a INFRAESTRUTURA de marca     │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │  o cérebro NÃO conhece fornecedor de IA
┌──────────────────────────────▼──────────────────────────────────────────┐
│  BORDA DE IA (commodity — troca sem tocar o cérebro)                     │
│  LLMs: Anthropic (Sonnet/Haiku, tiers por ambiente + web search)         │
│  Visual: fal.ai multi-modelo (FLUX, Gemini, Seedance…)                   │
│  Embeddings: Voyage voyage-3 (1024 dims)                                 │
└──────────────────────────────┬──────────────────────────────────────────┘
┌──────────────────────────────▼──────────────────────────────────────────┐
│  INFRA                                                                   │
│  SPA React 19 + MUI · Netlify Functions (Node 20: 50 functions,          │
│  background jobs, 6 crons) · Supabase (Postgres + RLS multi-tenant +     │
│  pgvector + Realtime + Storage) · Stripe (créditos)                      │
└──────────────────────────────────────────────────────────────────────────┘
```

**A regra de ouro da arquitetura:** superfícies são clientes finos; a borda é trocável;
o cérebro é a única fonte de inteligência. Trocar de LLM ou de gerador de imagem
não toca uma linha do aprendizado.

---

## 2 · O flywheel de dados (como a marca aprende)

```
   USO DO PRODUTO                    DESTILAÇÃO (cron diário)
   votos 👍👎 · regenerações          LLM lê sinais novos + modelo atual
   copy reeditada · correções   ──►  e produz a PRÓXIMA VERSÃO do modelo
   no chat · diagnósticos            (taxonomia garantida por código,
   escuta social · clipping          não pelo LLM)
   de concorrentes · tendências              │
        ▲                                    ▼
        │                            MODELO VIVO v1 → v2 → … → vN
   PEÇAS MELHORES                    7 facetas: posicionamento · voz ·
   toda geração (imagem,             território · preferências visuais ·
   vídeo, copy, resposta)      ◄──   do/don't · conteúdo · fatos
   recebe o contexto             — cada faceta com CONFIANÇA própria (0–1)
   aprendido automaticamente         calibrada por recência × peso × corroboração
```

- **11 tipos de sinal**, cada um com peso próprio: voto explícito, veredicto de campanha,
  regeneração (reprovação implícita), copy reescrita (ensino de voz), correção no Copiloto
  (ensino explícito — peso máximo), diagnóstico, sentimento da escuta, edição do brand book,
  conteúdo adotado, movimento competitivo, tendência de setor.
- **Resolução de contradição no destilador:** sinais que se contradizem não viram média —
  vence recência × peso × ensino humano; o lado perdedor tem a confiança rebaixada, não apagado.
- **Métrica que prova a tese:** a cada versão medimos a **taxa de aprovação das peças criadas
  sob a versão anterior** — a série mostra o cérebro *melhorando*, não só mudando.
- Sinais nascem de **triggers no banco** (não dependem de código de aplicação lembrar de emitir).
- **Sinais que chegam em breve 🔜:** performance real de mídia (`ad_performance`, E2/Meta — o sinal
  mais valioso do dataset), referências subidas como ensino (`reference_upload` — "isto É a marca"),
  parecer do diretor de arte (julgamento automático, peso menor que humano).

---

## 3 · Embeddings & RAG (a memória semântica)

```
  Brand book digitado ──┐
                        ├──► chunks → Voyage voyage-3 (1024 dims) → pgvector
  Modelo vivo (a cada  ─┘         └── busca semântica (RPC match)
  destilação, o que a                       │
  marca APRENDEU é                          ▼
  re-derivado em chunks          Copiloto responde citando o que a
  "intel:")                      marca É (digitado) + o que APRENDEU
```

- **Dois cérebros na mesma memória:** o brand book que o time escreveu **e** o conhecimento
  destilado do uso — o RAG recupera os dois com a mesma busca.
- A cada nova versão do modelo vivo, os chunks `intel:` são **re-derivados** — a memória
  semântica nunca fica para trás do aprendizado.
- Falha de embedding degrada graciosamente (retorna vazio, nunca quebra a geração).

---

## 4 · Dataset por tenant (o ativo de fine-tune)

```
  contexto (o que a IA sabia) → output (o que gerou) → avaliação (o que o humano disse)
```

- Cada marca acumula um **dataset canônico de exemplos julgados**: a peça, o contexto de marca
  usado na geração e o julgamento humano (aprovado/reprovado/reescrito/regenerado + ajuste).
- Captura **100% automática via triggers** — escrever no dataset por código de aplicação é proibido
  por design; unicidade por origem garante 1 exemplo por peça, e o **voto explícito sobrepõe**
  o sinal implícito (a última palavra é a mais forte).
- É o insumo direto de: painéis de qualidade, win-rate por modelo gerador, e o **export JSONL
  de fine-tune** (backlog H2).

---

## 5 · SLM por tenant (a rota para o modelo próprio de cada marca)

A visão declarada: **um modelo de linguagem individual por marca**. A rota é progressiva —
cada estágio já entrega valor e financia o próximo:

| Estágio | O que é | Status |
|---|---|---|
| **1. Prompt-layer aprendida** | modelo vivo (7 facetas + confiança) injetado em toda geração via porta única | ✅ **em produção** |
| **2. RAG re-derivado** | memória semântica do aprendido, atualizada a cada destilação | ✅ **em produção** |
| **3. Dataset por tenant** | exemplos julgados acumulando automaticamente | ✅ **em produção** |
| **4. Fine-tune leve (adapters/LoRA)** | dataset JSONL → adaptação por marca sobre modelo base | 📋 backlog (gatilho: volume de exemplos) |
| **5. SLM dedicado** | modelo pequeno da marca, servindo voz/decisões com custo mínimo | 🔭 visão H2/H3 |

**Por que essa ordem importa (o argumento para investidor):** os estágios 1–3 capturam os dados
*hoje*, sem custo de treino — quando o fine-tune vier, o dataset já existe e é proprietário.
O moat não é o modelo; é **a série temporal de julgamentos de cada marca**, que nenhum
concorrente consegue reconstruir.

---

## 5b · O arco de futuro (o mesmo cérebro, cada vez mais longe)

```
      HOJE ✅                      EM BREVE 🔜                     FUTURO 🔭
  ────────●────────────────────────────●────────────────────────────●──────────▶
  O cérebro que APRENDE        A marca que OPERA              A INFRAESTRUTURA
  flywheel autônomo,           diretor de arte julga,         MCP + API: o cérebro
  11 sinais, dataset por       agentes produzem em massa      dentro de Figma/Canva/
  tenant, aprovação            com portão on-brand,           qualquer ferramenta;
  medida POR VERSÃO            calendário editorial,          SLM por marca; rede
                               performance de ads como        de cérebros; a categoria
                               sinal, API (Hering)            "Smart Branding"
```

**O argumento anti-risco:** cada estágio se paga e financia o próximo; os dados que o
futuro exige (dataset julgado por tenant) **já estão sendo capturados hoje** — quem
começar depois não reconstrói a série. Detalhe narrativo completo: `pitch-futuro.md`.

---

## 6 · Borda de IA commodity (multi-modelo por desenho)

- **LLMs:** módulo central único (`aiConfig`) com *tiers* — fast (Haiku), standard
  (Sonnet + web search em produção), premium — e prompt caching; trocar de fornecedor = editar 1 arquivo.
- **Visual:** fal.ai como hub multi-modelo (FLUX, Gemini/Nano-Banana, Seedance para vídeo…) com
  **seleção de modelo por nó** no canvas de Fluxos e **custo medido por modelo e por conta**
  (dashboard admin) — sabemos qual modelo performa melhor para cada marca e a que custo.
- **Duelo de modelos** (backlog H1): mesma peça em 2–3 geradores + voto → **preferência pareada**,
  o dado mais valioso para win-rate e futuro fine-tune.

---

## 7 · Arquitetura de sistemas (como roda)

```
  Browser (SPA React 19 + MUI, hash-routing)
     │ HTTPS + JWT (Supabase Auth)
     ▼
  Netlify Functions (Node 20 · 50 functions)
  ├── síncronas (CRUD leve, recomendação da Home)
  ├── background (-background: geração, destilação, coletas — até 15 min)
  ├── 6 crons: destilação diária · diagnóstico de concorrentes ·
  │   clipping + síntese de mercado · tendências · monitor · reaper
  └── fila + webhook fan-out (geração visual: job → fal.ai → webhook → Realtime)
     ▼
  Supabase (instância única)
  ├── Postgres + RLS por workspace (multi-tenant: 1 acesso = 1 marca)
  ├── pgvector (RAG) · triggers (sinais + dataset) · Realtime (progresso)
  └── Storage (assets, peças geradas)
```

- **Padrões endurecidos por cicatriz** (documentados em spec): nunca fire-and-forget em Lambda
  (tudo `await`); background + polling para operações longas; fail-fast em chave ausente;
  taxonomia garantida por código, nunca pelo LLM; parsers tolerantes a web-search verboso.
- **Multi-tenant por RLS:** todo dado carrega `workspace_id`; a policy é o perímetro.
  Um cérebro por marca, zero vazamento entre tenants.
- **Créditos como unidade econômica:** cada operação debita créditos; usuários ilimitados —
  paga-se pelo que se cria, não por cadeira. Stripe validado (checkout em test mode; live 🔜
  no go-live comercial, com recarga avulsa).
- **Status honesto para diligência:** desktop-first (responsividade mobile 🔜 pré-produção);
  observabilidade (Sentry + alertas de cron) 🔜 pré-produção.

---

## 8 · Os números (para o rodapé do slide)

| Métrica | Valor |
|---|---|
| Functions em produção | 50 (síncronas + background + 6 crons) |
| Migrations de schema | 38 |
| Tipos de sinal de aprendizado | 11 |
| Facetas do modelo vivo | 7, cada uma com confiança própria |
| Embeddings | Voyage voyage-3, 1024 dims, pgvector |
| Modelos de IA plugados | Anthropic (3 tiers) + fal.ai multi-modelo (imagem/vídeo) |
| Aprendizado | 100% automático (triggers + cron diário) — zero curadoria manual |

---

## 9 · O slide-resumo (se for um só)

> **A marca no meio da operação — tecnicamente.**
> Um **cérebro por marca** que transforma cada uso em evidência, evidência em modelo vivo
> versionado, e modelo vivo em contexto de toda geração. LLMs e geradores são **borda
> trocável**; o **dataset julgado por tenant** é o ativo que nenhum concorrente reconstrói —
> e é a rampa pronta para o **modelo próprio de cada marca** (fine-tune → SLM).
> Infra serverless enxuta (Netlify + Supabase), multi-tenant por RLS, custo por crédito.
>
> **E o arco:** hoje o cérebro aprende ✅ · em breve a marca julga e produz em massa sozinha 🔜
> · depois ela vai junto para toda ferramenta onde a criação acontecer (MCP + API) 🔭.
> O mesmo cérebro — cada vez mais longe.

---

*Fontes internas: `features/brand-intelligence.md` (o cérebro em detalhe) ·
`produto.md` (changelog) · `pitch-deck.md` (narrativa de negócio) · `backlog.md` (roadmap).*
