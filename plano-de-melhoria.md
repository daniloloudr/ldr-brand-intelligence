# Plano de Desenvolvimento — LOUDR Brand Intelligence

> Reescrito a partir do **discurso de negócio** (apresentação VHITA, 03/07/2026). Ordena o desenvolvimento por **valor de negócio validado por comprador real**, não por pureza técnica. Estado atual ancorado no código (não especulativo).

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

### P2 — Content Hub dentro do cérebro (fechar o gap mais claro)
- **O que construir:** Content Hub passa a **ler** (`resolveBrandIntelligence` como o Studio) e **escrever** (emitir sinal de conteúdo aprovado/usado).
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
- **Workstream a iniciar:** schema versionado de coleta do dataset a partir do uso + avaliações (é a maior alavancagem e não depende de mais nada).
- **Gatilho pra reabrir fine-tune/SLM:** volume alto + custo de API pesando + dataset limpo/validado + tarefa ESTREITA (classificação/tag/dedup de sinais), nunca raciocínio aberto.

---

## 5. Arquitetura alvo (3 blocos)

- **(a) Superfícies (App Netlify)** — Brand Book, Posicionamento, Studio, Content, painéis. Clientes finos que chamam o cérebro.
- **(b) Borda (`_ai.js`)** — fina, única porta pra LLM/embeddings de terceiros, trocável.
- **(c) Cérebro de Marca** — a camada de inteligência como **serviço próprio** (ingest / distill / search / buildContext), o IP. Hoje mora dentro do `_studio.js` (`resolveBrandIntelligence`); a evolução é **extrair pra um módulo/serviço único** que toda superfície usa. Extração incremental do que já existe — não greenfield.

---

## Ordem sugerida (negócio primeiro)
1. **Segurança #3** (chave no bundle) — baixo esforço, risco real.
2. **P1 — loop de criativo on-brand** (killer app, fecha venda).
3. **P2 — Content Hub no cérebro** (fecha o gap pitch↔código mais claro).
4. **P3 — Inteligência Competitiva** (promessa de 2 semanas).
5. **P4 — painel de memória** (ativo comercial, em paralelo).
6. **Workstream do dataset** (contínuo, destrava o futuro).
7. **Isolamento por tenant + flywheel completo** — endurecer conforme as contas crescem.
