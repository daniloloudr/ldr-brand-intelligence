# Plano de Desenvolvimento — LOUDR Brand Intelligence

> Reescrito a partir do **discurso de negócio** (apresentação VHITA, 03/07/2026). Ordena o desenvolvimento por **valor de negócio validado por comprador real**, não por pureza técnica. Estado atual ancorado no código (não especulativo).
>
> **⚠️ Tarefas vivem no [`BACKLOG.md`](./BACKLOG.md) (canônico desde 06/07/2026).** Este documento é estratégia e contexto.

---

## 0. North star (o discurso, virado em princípio)

**Existe UM cérebro de marca vivo, e ele é o CHÃO — não um componente.** Todo pilar (Brand Book, Posicionamento/Diagnóstico, Listening, Content, Studio, Inteligência Competitiva) **alimenta e bebe** desse mesmo cérebro. Ele fica mais assertivo com o uso. **Isso é o moat e é o "pump" (flywheel): mais uso → mais sinal → cérebro mais assertivo → mais valor → mais uso.**

- **Borda (`_ai.js`) = commodity, trocável, longe.** LLMs/embeddings de terceiros são meio, não fim. Nunca amarrar o produto a um provider.
- **O cérebro = o produto.** É o que não se copia. Toda decisão serve pra **isolar, alimentar e fazer crescer** essa camada.
- **Ciclo de vida:** **prospect (frio)** — sem dados da marca ainda, Diagnóstico roda em web search, é arma comercial de topo de funil; **cliente (quente)** — tudo passa a retroalimentar e a consumir o cérebro da marca.

Validação do comprador (Raquel, VHITA), nas palavras dela: *"guardar o aprendizado é um dos principais valores, senão fica na cabeça da pessoa"*. O cliente já nomeou o moat.

---

## 1. Estado atual real (ancorado no código)

| Elo do flywheel | Estado |
|---|---|
| **Ingestão / sinais (write)** | ✅ Amplo: `diagnostic`, `listening_sentiment`, `image_vote`, `campaign_verdict`, `brandbook_edit`, `assistant_correction` emitem `brand_signals` (triggers no banco) |
| **Destilação (cérebro)** | ✅ `brand-distill-background` (LLM) → `brand_intelligence` versionado + re-embed RAG (`_embed.js`, Voyage) |
| **Consumo do cérebro (read)** | ⚠️ Estreito: só **Studio** (`resolveBrandIntelligence` no `_studio.js`) e **Assistant** |
| **Content Hub** | 🔴 **Fora do loop dos dois lados** — não lê nem escreve o cérebro |
| **Inteligência Competitiva** | 🟡 UI real (`Concorrentes.jsx`, tabelas `concorrentes`/`diagnosticos_concorrentes`), mas **não alimenta o cérebro**; território/ameaças = "em construção" |

**A divergência que importa: o pitch está à frente do código.** Você vende (com precisão) "tudo retroalimenta o cérebro", mas hoje só Studio+Assistant *consomem* o cérebro. **Fechar esse gap = fazer o produto entregar a visão já vendida.**

---

## 2. Roadmap por prioridade de negócio (validado pela compradora)

### P1 — Loop de criativo on-brand em escala 🎯 (killer app)
**Dor #1 da Raquel:** 400-600 criativos/mês pra Meta Ads, ~50% do tempo iterando o que já funciona, ~10 pessoas. Ela quer *"pegar o que funciona, entender a lógica e desdobrar em versões mantendo o conceito"*.
- **O que construir:** fluxo no Studio "criativo vencedor → entende a lógica → desdobra em N variações on-brand", com o cérebro da marca injetado como referência. Iteração barata em crédito (ver P5).
- **Por que:** é onde o Studio + cérebro brilham juntos e onde está o ROI do cliente (liberar 50% do time). É o que fecha venda.
- **Extensão (quando houver integração):** conectar com a biblioteca de ads pra saber o que performou e usar o vencedor como referência automática (ela pediu; hoje falta a integração, a inteligência já suporta).

### P2 — Content Hub dentro do cérebro ✅ (2026-07-06)
- **Entregue:** Content Hub **lê** o cérebro (análise server-side via `resolveBrandIntelligence`; briefing no drawer via `compileIntel` compartilhado) e **escreve** (copiar briefing → sinal `content_used`, peso 1.5). Destilador e painel IA LOUDR entendem o sinal novo.
- **Por que:** hoje o cliente pagante recebe conteúdo com voz/território diferentes do Studio — corrói o "uma marca coerente em tudo" que é o valor. Fechar isso é entregar o pitch.

### P3 — Inteligência Competitiva (promessa de 2 semanas a prospect vivo)
- **O que construir:** mapa de território + gaps + ameaças/movimentos recentes dos concorrentes → **alimentar o vetor/cérebro** (hoje só fica em tabela). Conectar com Listening + clipping semanal (visão do Rogério).
- **Por que:** compromisso com prazo atrelado a um deal em andamento. E vira insumo do cérebro competitivo — diferencia no discurso comercial.

### P4 — Memória institucional VISÍVEL (ativo comercial)
- **O que construir:** afiar o painel `BrandIntelligence` (confiança subindo, "o que mudou na vN", win-rate por provider, cérebro por marca) como **prova viva** do aprendizado.
- **Por que:** a compradora nomeou "guardar o aprendizado" como principal valor. O painel é material de venda: o prospect *vê* o cérebro ficando mais assertivo.

### P5 — Crédito como narrativa de valor (não só limitador)
- **O que construir:** iteração/exploração barata ou grátis; cobrar o "profundo" (super-botão). Danilo define planos/créditos manualmente (customer-facing de preço já escondido).
- **Por que (Rogério):** todas as ferramentas queimam 30-40% de crédito iterando pra chegar num output usável. O cérebro **reduz desperdício** aprendendo o que não presta (hailuo, win-rate por provider) → argumento de valor exclusivo.

---

## 3. Fundamentos que sustentam o pump (não negociáveis com o comercial esquentando)

1. **Isolamento por tenant** — cada cérebro de marca isolado, versionado e com backup próprio. Zero vazamento/corrupção entre marcas. É confiança do cliente; obrigatório antes de escalar contas.
2. **Completude do flywheel** — toda superfície de **cliente** escreve+lê o mesmo cérebro (P2 é o primeiro passo). Sem isso, o pump gira só em parte do produto.
3. **Performance — bundle monolítico 2,1 MB sem code-splitting.** Um único `index-*.js`; páginas pesadas (`StudioCanvas`, `AppInterno`, `Posicionamento`) e libs de export (html2canvas, jspdf, pptxgenjs) entram todas de uma vez. **Fix:** `React.lazy` por rota + `manualChunks` pras libs pesadas. Ganho direto de load. É o fix de sustentação #1 verificado.
4. **Segurança — chave Anthropic no bundle: ✅ já tratado (verificado).** Os 3 pontos (`BrandAssistant`/`ContentGerarDrawer`/`CampaignNew`) setam `x-api-key` só dentro de `if (import.meta.env.DEV)`; em prod o dead-code elimination remove a referência — build com chave-sentinela confirmou que NÃO vaza. Manter só o cuidado de confirmar `ANTHROPIC_KEY` em todos os contextos do Netlify.
5. ~~Teto de 15 min do Netlify~~ — **resolvido** (era env var faltando). Fora da lista.

---

## 4. Estratégia de modelo: RAG + dataset primeiro, SLM adiado (DECISÃO firmada)

- **Não** construir SLM/modelo próprio como núcleo. O ativo é o **cérebro (dados + loop)**, não os pesos. Aposta = **frontier LLM (borda trocável) + RAG eficaz sobre dataset proprietário**.
- **O dataset é o fio central** — `(contexto de marca → output → avaliação humana)`. Valor duplo: melhora o RAG **agora** e destrava fine-tune de pesos **depois**, sem retrabalho.
- **"Fine-tuning" neste estágio = afinar o SISTEMA** (retrieval + montagem de contexto + prompts), não pesos.
- **Workstream ✅ v1 (2026-07-06):** tabela `brand_dataset` (migration `029`) — exemplos canônicos `(contexto → output → avaliação)` com `schema_versao`, capturados 100% via triggers (votos, verdicts de campanha, correções do Assistant, conteúdos adotados) + backfill do histórico. Leitura via `fetchDataset()` no `_brain.js`. Contínuo: novas superfícies julgadas entram como novas capturas.
- **Gatilho pra reabrir fine-tune/SLM:** volume alto + custo de API pesando + dataset limpo/validado + tarefa ESTREITA (classificação/tag/dedup de sinais), nunca raciocínio aberto.

---

## 5. Arquitetura alvo (3 blocos)

- **(a) Superfícies (App Netlify)** — Brand Book, Posicionamento, Studio, Content, painéis. Clientes finos que chamam o cérebro.
- **(b) Borda (`_ai.js`)** — fina, única porta pra LLM/embeddings de terceiros, trocável.
- **(c) Cérebro de Marca** — a camada de inteligência como **serviço próprio** (ingest / distill / search / buildContext), o IP. **✅ Extraído (2026-07-06) para `netlify/functions/_brain.js`**: `emitSignal` / `distillBrand` / `searchBrandKnowledge` / `resolveBrandIntelligence`. `brand-distill-background.js` e `brand-book-search.js` viraram wrappers HTTP finos; `_studio.js` voltou a ser só Studio. Próxima evolução: serviço com fila/estado durável fora do teto do Netlify, quando o volume pedir.

---

## Ordem de execução (revista 06/07 — cérebro consolidado, evoluções de produto na fila)

**Feito:** sustentação ✅ · P3 Competitiva ✅ · P2 Content Hub ✅ · `_brain.js` extraído ✅ · dataset (`brand_dataset`) ✅ · painel admin Cérebros ✅ · enriquecimento do modelo vivo (taxonomia + territorio/conteudo + métricas por versão) ✅

### Evoluções de produto (gap analysis vs Pupila, 06/07/2026)

Contexto: **Pupila** (pupila.ai, SP, US$ 1M, 2024) = "nosso Studio como produto inteiro", com DNA de marca **estático** (configuração, sem aprendizado). Regra: fechar primeiro os gaps que **fortalecem o cérebro**; nunca deixar o pitch virar "gerador de imagem on-brand".

1. **E1 — Writing Room on-brand** (porta de entrada do P1). Superfície dedicada de copy de marketing (legenda, headline, mensagem de campanha) injetando o cérebro (voz aprendida + territorio + conteudo.temas) e emitindo sinal de adoção. Consumidor E produtor de inteligência — a nossa versão nasce melhor que a deles por design.
2. **E2 — P1: loop de criativo on-brand** (killer app). "Criativo vencedor → entende a lógica → N variações on-brand" com o cérebro como referência. **Extensão creative testing:** conectar performance real (Meta Ads / biblioteca de ads — a Raquel pediu) como o sinal mais valioso do dataset.
3. **E3 — Edit & Enhance na galeria.** Os apps Ampliar/Remover fundo/Variação JÁ existem (nós do Workflow) — expor com 1 clique na página Imagem/galeria. Polimento que neutraliza o argumento de demo deles.
4. **E4 — Biblioteca de assets (F12).** `brand_assets` já grava; falta frontend com pastas, tags e busca.
5. **P4 — painel de memória como material comercial** (em paralelo; a série de aprovação por versão já é argumento).
6. **Contínuos:** dataset (export fine-tune quando volume crescer) · isolamento por tenant conforme contas crescem · cérebro como serviço próprio quando o volume pedir.

**📌 ANOTADO para decisão futura (não é corrida agora):** trial self-service (Pupila tem; LOUDR é invite-only por decisão). Reavaliar quando o modelo comercial/pricing estiver validado.

## Inteligência Competitiva — plano de entrega (2 semanas)

**Já existe:** página `Concorrentes.jsx` (CRUD + scatter de scores), tabelas `concorrentes`/`diagnosticos_concorrentes`, diagnóstico de concorrente via `cron-monitor`, e território + ameaça já saem do prompt do diagnóstico (`territorios_possiveis`, `concorrentes[].ameaca/sinal`).

**Falta (o entregável):**
1. **Mapa de território integrado** — sua marca vs. concorrentes num mesmo mapa (territórios ocupados, espaços livres, sobreposições) + **análise de gaps**.
2. **Ameaças & movimentos recentes** — nível de ameaça por concorrente + o que mudou desde o último ciclo (diff de re-diagnóstico/listening).
3. **Feed do cérebro** — território/gaps/ameaças viram `brand_signals` (novo tipo, ex. `competitive_move`) → distiller → `brand_intelligence`. Fecha o flywheel na competitiva.
4. **Conexão com Listening/clipping** — clipping semanal dos concorrentes puxado do social listening, alimentando o tracking (fase 2 se o prazo apertar).

**Sequência sugerida:** (a) mapa de território + gaps a partir do que o diagnóstico já gera (entrega visível rápido) → (b) tracking de movimentos (diff entre ciclos) → (c) feed do cérebro → (d) clipping/listening.
