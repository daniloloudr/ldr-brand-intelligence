# LOUDR Brand Intelligence — Pitch Deck (master em .md)

> **Uso deste documento:** matéria-prima completa para o deck visual (investidores) e para versões derivadas (venda, parceiros). Cada slide traz o conteúdo + *notas de apresentação* + *dados de apoio*. Itens `[A DEFINIR]` dependem de decisão do Danilo. Dados de produto/negócio verificados no código e docs em 09/jul/2026.

---

## Slide 1 — Capa

# A marca no meio da operação.
**LOUDR Brand Intelligence** — a plataforma onde a marca vive, aprende e cria.

*One-liner alternativo (mais provocador, na voz da marca):* **"Guideline não decide. Cérebro decide."**

> Notas: abrir com o north star. Danilo Silva, fundador · LOUDR · São Paulo/Brasil · jul/2026.

---

## Slide 2 — O Problema

**A indústria criativa separou a marca da operação — e paga caro por isso.**

- A marca vive num **PDF** (guideline), numa agência, num departamento que "revisa depois". A operação — as centenas de peças, copies e campanhas por mês — acontece **longe dela**.
- Resultado: cada canal soa como uma empresa diferente. Cada troca de agência recomeça do zero. O aprendizado sobre a marca **mora na cabeça das pessoas** — e vai embora com elas.
- Com a IA generativa, o problema **explodiu**: qualquer um gera 100 peças por dia — nenhuma delas *da marca*. Texto corrompido, tom emprestado, paleta ignorada.

**A dor em números (cliente real, VHITA — suplementos, e-commerce):**
- 400–600 criativos/mês para Meta Ads, ~10 pessoas no time
- **~50% do tempo** iterando o que já funcionou, manualmente
- Nas palavras da compradora (Raquel): *"guardar o aprendizado é um dos principais valores — senão fica na cabeça da pessoa"*

> Notas: a dor tem 2 camadas — inconsistência (marca) e retrabalho (operação). O mercado ataca a segunda e ignora a primeira.

---

## Slide 3 — Por que agora

**As IAs viraram commodity. A memória, não.**

1. **A borda é commodity comprovada:** a Tess AI (Pareto, BR) fatura projetados **R$ 550M/ano** vendendo acesso a 250+ modelos. Quando todo mundo tem todas as IAs, nenhuma IA é diferencial.
2. **Agentes chegaram à criação:** Figma, Canva e Adobe abriram MCPs/APIs — agentes criam peças dentro das ferramentas. **Falta a camada que diz o que é on-brand.**
3. **Guidelines morreram na prática:** documentos estáticos não guiam geração por IA. A marca precisa de um formato **vivo e legível por máquina**.
4. **O dado certo nasce agora:** cada avaliação humana de peça gerada é dado de treino proprietário — quem capturar primeiro, com estrutura, constrói o moat.

> Notas: o timing é "IA commodity + agentes + guidelines obsoletos". Nós somos a peça que falta nesse tabuleiro.

---

## Slide 4 — A Solução

**Um cérebro de marca vivo, no meio da operação criativa.**

O LOUDR é a plataforma onde a marca inteira acontece: diagnóstico, posicionamento, inteligência competitiva, listening, conteúdo, estúdio de criação (imagem/vídeo/copy) e assistente — **todos alimentando e bebendo do mesmo cérebro**, que fica mais assertivo a cada uso.

**O flywheel (nosso pump):**
```
mais uso → mais evidência → cérebro mais assertivo → criação melhor → mais uso
```

- Cada 👍/👎, campanha aprovada, texto reescrito e até cada **regeneração** vira evidência.
- Um destilador transforma evidências em **modelo vivo versionado** da marca (posicionamento, voz, território, preferências visuais, temas, fatos — com confiança e proveniência por faceta).
- Esse modelo é **injetado automaticamente** em tudo que a plataforma cria — e a evolução é **medida** (confiança e taxa de aprovação por versão), não prometida.

> Notas: enfatizar "1 entrada · 1 cérebro · 1 estado · 1 saída". A IA de borda (fal.ai, Anthropic, 250 modelos de imagem/vídeo) é trocável; o cérebro é o produto.

---

## Slide 5 — O Produto (funcionalidades)

**Uma plataforma, sete pilares — todos no mesmo cérebro:**

| Pilar | O que faz |
|---|---|
| **Diagnóstico & Posicionamento** | Framework proprietário **Smart Branding** (4 práticas → scores de Singularidade, Consistência e Posicionamento 1–10) com IA + web search; territórios possíveis com tese e confiança; evolução mensal automática; relatório público para prospecção |
| **Inteligência Competitiva** | Diagnóstico dos concorrentes, mapa de território (ocupado × livre), movimentos por ciclo, clipping semanal — tudo alimentando o cérebro para afiar a diferenciação |
| **Social Listening** | Sentimento do público como evidência contínua |
| **Content Hub** | Keywords/território SEO, ideias e briefings on-brand |
| **Brand Studio** | Geração de **imagem** (catálogo aberto: Nano Banana, FLUX, Seedream, GPT-Image…), **vídeo** (Veo 3, Kling, Seedance 2, Hailuo), **Writing Room** (copy em frameworks: legenda, carrossel, reel, anúncio, e-mail — com edição por seção), **Workflow** visual (canvas de nós encadeando texto→imagem→vídeo), **Campanhas** (1 conceito → N formatos), **Biblioteca** de assets (pastas/tags/busca) |
| **Brand Assistant** | Chat estratégico grounded na marca (RAG do declarado + do aprendido) — e que **ensina**: correções humanas viram aprendizado de altíssimo peso |
| **Brand Book vivo** | Identidade verbal/visual estruturada + importação de manual em PDF por IA + design tokens |

**Regras de produto que viram confiança:** imagem gerada nunca contém texto (tipografia = pós-produção guiada pelo bloco "Sugestão de imagem"); todo prompt melhorado pede conferência humana; nada gera sem revisão.

> Notas: a demo ao vivo vale mais que este slide — ver Slide 7.

---

## Slide 6 — Como o cérebro aprende (o diferencial técnico)

**10 fontes de evidência → 6 facetas de aprendizado → aplicação em toda criação.**

- **Evidências capturadas hoje:** avaliações de peças (👍/👎), regenerações (reprovação implícita — com o "ajuste" pedido como correção direcionada), campanhas aprovadas, conteúdos adotados, **copy reescrita pelo humano** (ensino de voz), ensinos explícitos no Assistant, edições de brand book, diagnósticos, movimentos de mercado, sentimento do público.
- **Destilação inteligente:** recência × peso, resolução de contradições sem apagar conhecimento (rebaixa confiança), confiança calibrada por faceta, ensino humano vence empates.
- **Dataset proprietário:** cada exemplo julgado vira `(contexto → output → avaliação humana)` — canônico, versionado, por marca. **É o embrião do fine-tune por tenant**, sem retrabalho futuro.
- **Visível para o cliente:** painel "IA LOUDR" com a **rede neural viva** (o que captura, o que aprendeu, onde aplica — com dados reais), evolução de confiança × aprovação por versão e "o que mudou" a cada versão.

> Notas: aqui mora o "não se copia". Concorrente copia a UI em semanas; não copia meses de julgamento humano estruturado por marca.

---

## Slide 7 — O momento demo (roteiro de 3 minutos)

1. **Writing Room:** "carrossel sobre X" → 8 slides na voz da marca (provocadora, direta — aprendida, não configurada). Reescrever o slide 3 na mão → *isso vira ensino*.
2. **"Criar workflow com as peças"** → o canvas nasce montado: um caminho de geração por slide, prompts já na estética da marca, Reel encadeando imagem→vídeo.
3. **Painel IA LOUDR:** a rede neural acesa — "essas 51 evidências viraram 5 versões; a aprovação das peças por versão está aqui". **Prova, não promessa.**
4. *(Fase MCP)* **O gran finale futuro:** um prompt no Claude cria a peça **dentro do Figma** usando a marca servida pelo nosso MCP — sem digitar uma linha de guideline.

> Notas: fechar a demo sempre no painel — é onde a compradora (Raquel) nomeou o valor: "guardar o aprendizado".

---

## Slide 8 — Tração & Prova (dados reais, jul/2026)

**Estágio:** produto completo em produção · modelo comercial implementado · vendas founder-led iniciando.

- **O flywheel roda sozinho em produção:** destilação autônoma diária por limiar; 5 versões do cérebro da marca-piloto em 8 dias; confiança 0,78; a v5 é grounded no brand book real e já sabe o território dos concorrentes.
- **Case interno (dogfooding total):** a própria LOUDR opera no produto — diagnóstico, competitiva (Pupila, HardCuore, Tátil, Ana Couto, Interbrand mapeados), copy de lançamento escrita pelo Writing Room na voz aprendida.
- **Validação de comprador real (VHITA):** a dor nomeada pela cliente é exatamente o produto; deal em andamento com o loop criativo integrado à Meta como próxima entrega condicionada.
- **Métricas que o produto expõe por design:** evidências, versões, confiança por faceta, approval-rate por versão, win-rate por modelo de borda — *a tração futura já tem instrumentação nativa.*
- Pipeline/receita atual: `[A DEFINIR — nº de propostas, MRR atual, lista de prospects]`

> Notas: honestidade vende — estamos em D0 comercial com produto D10. A instrumentação nativa significa que cada cliente novo gera prova nova automaticamente.

---

## Slide 9 — Mercado

**Onde o dinheiro está hoje:**
- **Branding/agências (BR):** projetos de identidade de R$ 50k–500k+ por marca, recorrência baixa, entregável estático (PDF). Nós transformamos o entregável em **assinatura viva**.
- **Criação de conteúdo com IA:** categoria em explosão — proxy local: Tess AI projeta **R$ 550M (2026)** em plataforma horizontal; Pupila levantou **US$ 1M** para criativos on-brand estáticos. O orçamento existe e está migrando.
- **Nosso comprador:** CMOs e heads de marketing de PMEs e mid-market que produzem volume (e-commerce, DTC, educação, saúde) + **agências** como canal (operam N marcas — cada uma um cérebro).
- TAM/SAM/SOM formais: `[A DEFINIR — recomendo: nº de empresas BR com time de mkt ≥3 pessoas × ticket médio R$ 3k/mês; depois LATAM]`

**A tese de expansão:** todo real gasto em "IA para criar" precisa de uma camada de marca. Nós não competimos por esse real — **cobramos o pedágio dele.**

> Notas: no fundo de venda usar o custo comparativo: 1 mês de Premium (R$ 5k) < 1 dia de agência.

---

## Slide 10 — Concorrência

| | Marca profunda? | Aprende com o uso? | Cria (imagem/vídeo/copy)? | Estratégia (diagnóstico/competitivo)? |
|---|---|---|---|---|
| **LOUDR** | ✅ núcleo | ✅ **único** | ✅ | ✅ **único** |
| Pupila (US$ 1M) | config estática | ❌ | ✅ | ❌ |
| Tess AI (R$ 550M proj.) | memória genérica | ❌ | ✅ genérico | ❌ |
| Canva/Figma AI | kit visual | ❌ | ✅ | ❌ |
| Agências tradicionais | ✅ | na cabeça das pessoas | manual | ✅ manual |

**Frases de combate:**
- *"O Tess te dá todas as IAs. O LOUDR faz as IAs conhecerem a SUA marca."*
- *"Não competimos com Canva e Figma — somos a memória de marca que eles não têm."* (e via MCP, viramos a camada deles — Slide 12)
- Pupila: *"eles preservam a identidade; nós aprendemos a marca."* DNA estático × curva que sobe.

**Risco assumido:** um grande (Tess/Canva) lançar "brand brain" como feature. **Defesa:** velocidade na categoria + dataset acumulado por marca (não replicável retroativamente) + prova visível de aprendizado.

---

## Slide 11 — Modelo de Negócio

**SaaS por assinatura + créditos de criação. Sem cobrança por assento.**

| Plano | Preço/mês | Créditos | R$/crédito |
|---|---|---|---|
| Essencial | **R$ 1.500** | 750 | 2,00 |
| Pro | **R$ 3.000** | 2.000 | 1,50 |
| Premium | **R$ 5.000** | 5.000 | 1,00 |
| Custom | negociado | — | piso R$ 0,73 |

- **Todo plano tem tudo** (todas as funcionalidades, todos os modelos) — a diferença é só volume de créditos. Sem gating, sem upsell de feature.
- **Inteligência é fair-use (0 crédito):** diagnóstico, listening, Assistant — o que faz o cérebro aprender é grátis; cobra-se a **criação** (imagem 1–3 créditos; vídeo 5–108 conforme modelo/duração).
- **Unit economics:** custo interno ~R$ 0,22/crédito → margem-piso **78–86%** com burn total dos créditos; uso real (~50% do pool) leva a **~88–92%**. Regra de precificação travada: crédito = ⌈18 × custo_USD do modelo⌉ (garante ≥50% de margem líquida no pior caso, com colchão cambial).
- **Break-even da operação atual: ~R$ 19k/mês** (≈ 4–6 clientes). Estrutura enxuta por design.
- **Argumentos de venda embutidos:** "usuários ilimitados — pague pelo que cria, não por cadeira" · o cérebro **reduz desperdício de créditos** (aprende o que não funciona — concorrentes queimam 30–40% em iteração cega).
- LTV/churn-alvo: `[A DEFINIR]` — tese de retenção: **o custo de troca cresce todo mês** (o cérebro acumulado não vai junto).

---

## Slide 12 — Visão de Futuro (a parte que escala)

**H1 — PROVAR (agora → 3 meses):** marca do produto + site (construídos pelo próprio produto) · ~10 clientes com case · deal VHITA → integração Meta Ads (performance real vira evidência — o sinal definitivo) · fundação de vendabilidade (observabilidade, testes, LGPD).

**H2 — A REDE DE CÉREBROS (3–12 meses · fase que a captação financia):** dezenas de marcas, cada uma com modelo vivo próprio — e o painel de todas · **MCP do Cérebro** (plano pronto): a marca dentro do **Figma, Canva e qualquer agente** — leitura (contexto/assets/copy) e escrita (uso externo vira evidência) · autopilot on-brand (o cérebro como juiz das gerações) · dataset por tenant no formato de fine-tune · cérebro como serviço próprio.

**H3 — A CATEGORIA (12+ meses):** **"Smart Branding" como termo do mercado** (o próprio cérebro identificou a janela: nenhum player colonizou) · API pública do cérebro — agências e ferramentas plugadas · fine-tune/NLP por tenant quando o volume justificar · **a infraestrutura de memória de marca da indústria criativa.**

> Notas: o MCP muda a natureza do negócio — de "app que compete por atenção" para "camada que todas as ferramentas consomem". Distribuição via ecossistema de agentes.

---

## Slide 13 — Roadmap 12 meses (construível aos poucos)

| Trimestre | Entregas-chave |
|---|---|
| T1 | Marca+site · 10 clientes · Duelo de Modelos (preferência pareada) · observabilidade/testes/LGPD · Stripe live |
| T2 | MCP Figma (teste T1–T7) · Meta Ads (se VHITA) · onboarding dia-1 · Brand Deck |
| T3 | MCP Canva/Adobe · autopilot on-brand · export de dataset (fine-tune) · hardening multi-tenant |
| T4 | API pública + registry MCP · cérebro como serviço · primeiros experimentos de fine-tune por tenant |

---

## Slide 14 — Time

- **Danilo Silva** — fundador. `[A DEFINIR — bio: trajetória em branding/criação, a LOUDR agência como origem do framework Smart Branding e do repertório de marca]`
- **Time de criação LOUDR** — `[A DEFINIR — quem revisa taxonomia/design]`
- Engenharia: plataforma completa construída com stack enxuta (React/Netlify/Supabase/Anthropic/fal.ai) e **desenvolvimento acelerado por IA** — velocidade de feature em dias, não meses (24 migrations e 7 superfícies novas em 3 dias na última sprint).
- `[A DEFINIR — advisors, contratações-chave planejadas com a rodada]`

---

## Slide 15 — O Ask

- **Rodada:** `[A DEFINIR — valor e instrumento]`
- **Uso dos recursos (proposta):** ~40% GTM/vendas (dos 10 primeiros aos 100) · ~40% produto/eng (H2: MCP, multi-tenant, cérebro como serviço) · ~20% operação/time.
- **Milestones da rodada:** `[A DEFINIR — ex.: X clientes / R$ Y MRR / MCP em 3 ferramentas / N marcas com cérebro v5+]`

---

## Slide 16 — Fechamento

# Toda empresa vai criar com IA.
# A pergunta é se a IA vai conhecer a marca dela.

**LOUDR — a marca no meio da operação.**
O cérebro já roda. A rede já aprende. `[contato]`

---

## Apêndice — Munição para perguntas

- **"Por que não fazem fine-tune logo?"** Decisão firmada: frontier LLM + RAG sobre dataset proprietário AGORA (barato, trocável); o dataset já nasce no formato de fine-tune — pesos por tenant quando volume/custo justificarem, sem retrabalho.
- **"E se a Anthropic/OpenAI fizerem isso?"** Eles vendem inteligência genérica; o valor aqui é o dado julgado POR marca + o workflow da indústria criativa. Somos cliente deles, não concorrente.
- **"Defensibilidade do dataset?"** `(contexto → output → avaliação humana)` versionado por marca, com trilha de proveniência — não existe atalho retroativo para um entrante.
- **Segurança/arquitetura:** RLS em todas as tabelas, chaves só server-side, isolamento por workspace, LGPD no roadmap T1.
- **Custos de IA sob controle:** dashboard interno de custo por modelo/conta; crédito indexado ao custo real do modelo com colchão cambial.
- **Pricing antigo (Starter R$ 490 etc.) foi substituído** em jul/2026 pelo modelo atual sem gating — não usar o antigo em material.
