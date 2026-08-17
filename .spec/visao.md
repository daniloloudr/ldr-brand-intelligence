# brandcode (LOUDR) — Visão, Arquitetura & Tese de Negócio
**Documento vivo · jul/2026 · Owner: Danilo Silva**
*Serve a dois públicos: (a) pitch de venda/investimento; (b) referência de arquitetura e produto. Detalhes de implementação: [`features/`](features/) · precificação: [`precificacao.md`](precificacao.md) · tarefas vivem no [`backlog.md`](backlog.md) (canônico).*
*2026-07-12: absorveu as partes vivas do plano de desenvolvimento de 06/07 (§10–§11; histórico integral em [`arquivo/plano-de-melhoria-2026-07-06.md`](arquivo/plano-de-melhoria-2026-07-06.md)).*

---

> **North star (Danilo, jul/2026):** *"Revolucionar a indústria criativa com IA. Esse é o início do poder da marca no meio da operação."* — a indústria separa a marca (guideline, agência) da operação (produção diária); o LOUDR funde os dois: a inteligência da marca vive dentro do fluxo, aprende de cada peça e guia a próxima.

## Em uma frase

> **O LOUDR não é um gerador de conteúdo com IA — é o sistema operacional vivo da marca.** A geração (imagem, vídeo) é só uma das saídas. O ativo é uma **camada de inteligência que aprende a marca e fica mais assertiva a cada uso**, provando isso com métrica.

---

## 1. O princípio fundador: borda burra, núcleo inteligente

Toda a arquitetura nasce de uma inversão de modelo mental:

- **Borda = commodity, sem memória.** Nano Banana, GPT Image, Seedream, Veo, Kling, Sonnet, Opus — entram e saem sem deixar rastro. São **trocáveis**, ficam mais baratos toda semana, e qualquer concorrente usa os mesmos. Não têm os pesos, não têm a marca.
- **Núcleo = o que aprende a marca.** É o único ativo que **não se copia**, porque é construído com o *uso do cliente*. O aprendizado **não é fine-tuning** dos modelos de borda (não temos e nem queremos os pesos) — é **conhecimento estruturado da marca**, nosso, versionado, com confiança e proveniência.

**Regra permanente:** *trocar de modelo de borda nunca pode tocar na inteligência.* Quando surgir o próximo Nano Banana, a LOUDR **absorve** e o moat continua crescendo. Você é dono da camada que importa (a marca), não refém da camada que muda toda semana (os modelos).

---

## 2. Os dois cérebros do núcleo

Existem **dois mecanismos de conhecimento** complementares — não confundir:

| | **RAG semântico** | **Inteligência Viva** |
|---|---|---|
| Guarda | O que a marca **declarou** (brand book) | O que a marca **demonstrou** (avaliações reais) |
| Mecânica | Busca vetorial (recuperação) | Destilação por LLM (aprendizado cumulativo) |
| Responde | "O que ela escreveu sobre X?" | "O que ela *de fato* prefere, provado?" |
| Evolui com | Edição do brand book | Cada 👍/👎, campanha aprovada, diagnóstico |
| Natureza | Estático, recuperado sob demanda | Cumulativo, versionado, cresce sozinho |

---

## 3. Cérebro 1 — RAG semântico (Voyage · embeddings · chunks · pgvector)

Memória semântica **do que foi escrito**. Alimenta o Brand Assistant.

**Embedding.** Texto vira **vetor de 1.024 números** que captura *significado* — frases próximas em sentido ficam próximas nesse espaço, mesmo com palavras diferentes. A tradução texto→vetor é feita pelo **Voyage `voyage-3`** (modelo especializado em retrieval).

**Chunking semântico.** O brand book **não é picado por caractere** — é quebrado por **unidade de sentido** (missão, tom de voz, paleta, direção de fotografia, vocabulário…), cada uma virando seu próprio chunk/vetor. Chunks coerentes = busca boa.

**pgvector (Supabase).** Guarda os vetores e faz **busca por similaridade de cosseno**, com índice **HNSW** (aproximado, rápido em escala).

**Fluxo em runtime:**
```
pergunta do usuário → vira vetor (Voyage) → top 5 chunks mais próximos (similaridade > 0.5)
→ injeta SÓ esses trechos no prompt do Assistant
```
Em vez de despejar o brand book inteiro (caro, ruidoso), o LOUDR **puxa cirurgicamente o pedaço relevante** por pergunta. Mais preciso e mais barato.

*Stack:* migration `012_brand_book_chunks.sql` (`vector(1024)`, HNSW cosine) · `brand-book-embed-background.js` (chunking + embed ao salvar) · `brand-book-search.js` (embed da query + RPC `match_brand_book_chunks`).

---

## 4. Cérebro 2 — Inteligência Viva (o diferencial que não se copia)

Aqui **não tem recuperação — tem aprendizado por comportamento**, cumulativo e versionado. Arquitetura: **1 entrada · 1 cérebro · 1 estado · 1 saída.**

```
   features (Studio, Campanhas, Posicionamento, Listening, Assistant)
        │ emitem                                      ▲ consomem
        ▼                                             │
  ┌──────────────┐  destila  ┌──────────────┐  serve  ┌────────────────────────┐
  │ brand_signals│ ────────▶ │  DESTILADOR  │ ──────▶ │  brand_intelligence    │
  │ (append-only)│  (LLM)    │  (Sonnet)    │ versão N│  (modelo vivo, JSON)   │
  └──────────────┘           └──────────────┘         └────────────────────────┘
                                                                  │
                                                    resolveBrandIntelligence()
                                                                  │ (porta única)
                                                                  ▼
                              toda IA de borda recebe "informação super correta"
```

**1. Sinais (`brand_signals`).** Toda avaliação vira **evidência tipada, append-only** — capturada por **triggers no banco** (sem tocar em nenhuma feature): `image_vote` (👍/👎), `campaign_verdict`, `diagnostic`, `listening_sentiment`, `brandbook_edit`. Nada se perde.

**2. Destilador (LLM).** Lê **sinais novos + versão atual** e destila a **próxima versão**. Ponto crucial: **não guarda log cru — guarda conhecimento.** Dos votos deduz padrões visuais aprovados/reprovados, **win-rate por modelo de geração**, do/don't, fatos — cada item com **confiança + proveniência**. Idempotente (marca `consumido_em`).

**3. Modelo vivo (`brand_intelligence`).** JSON **versionado** por marca: posicionamento, voz, preferências visuais, do/don't, fatos. Cresce e fica mais assertivo. Assertividade é **medível** — não é promessa.

**4. Realimentação (`resolveBrandIntelligence`).** A **porta única** por onde toda IA de borda passa. Injeta o aprendizado em **toda geração** (Studio) e no **Assistant**. Os votos de ontem moldam as gerações de amanhã. **O ciclo fecha.**

*Stack:* migrations `025_brand_signals.sql` + `026_brand_intelligence.sql` · `brand-distill-background.js` (destilador Sonnet) · `brand-distill-cron.js` (cadência diária + limiar de volume) · `resolveBrandIntelligence()` em `_studio.js`.

---

## 5. Como os dois cérebros se encaixam

```
        DECLARADO ──────────────▶  RAG (Voyage/chunks) ─┐
   (brand book digitado)                                ├─▶ contexto do Assistant
                                                         │
        APRENDIDO ── signals ──▶ destilador ──▶ modelo vivo ──▶ resolveBrandIntelligence
   (avaliações reais)                                        (governa Studio + Assistant)
```

- **RAG** = memória do que foi **dito**. **Inteligência Viva** = memória do que a marca **é na prática**.
- Convergem no Assistant (chunks do brand book **+** bloco do modelo vivo). A Inteligência Viva já governa o Studio.
- **Os dois cérebros viraram um só ✅:** o RAG agora indexa **também o modelo vivo** — cada item destilado (posicionamento, voz, visual aprovado/reprovado, do/dont, fatos) é embeddado no mesmo índice (`section` prefixada `intel:`, sem sobrescrever o brand book). Uma pergunta ao Assistant recupera semanticamente o que a marca **declarou e o que aprendeu** de uma vez. *(Validado: pergunta de voz retorna o tom escrito no brand book **e** a voz reescrita pelo uso; "qual modelo performa melhor?" só o aprendido responde.)*

---

## 6. A prova: o produto mostra que fica mais inteligente

Porque o modelo é **versionado** e os votos viram **approval-rate**, a evolução é **demonstrável em gráfico** (tela IA LOUDR):
- **Confiança média** por versão (sobe ao longo do tempo).
- **Approval-rate** de peças por marca por período.
- **Win-rate por modelo de borda** (qual motor performa pra *aquela* marca).

Não é slide de "IA que aprende" — é **métrica auditável, com proveniência de cada versão**.

*(Validado em produção: primeira versão destilada de 19 sinais reais, confiança 0.77, aprendendo win-rate por provider, preferências visuais e do/don't.)*

---

## 7. A tese de negócio — por que é ruptura, e por que no Brasil

**1. O valor migrou de lugar.** Gerar imagem virou commodity. O que **ninguém copia** é o **modelo destilado da marca**, que só existe porque *o cliente avaliou*. A LOUDR não vende geração — vende **inteligência de marca acumulada**.

**2. Moat de dados com composição.** Cada avaliação **aprofunda um ativo proprietário e por-cliente**: quanto mais o cliente usa, (a) mais assertivo o sistema fica, (b) mais custoso é sair (o aprendizado não é portável). O oposto de uma ferramenta de IA descartável — é um **ativo que compõe juros**.

**3. Resolve uma dor crônica da indústria criativa.** Hoje o conhecimento da marca vive **na cabeça das pessoas e em PDFs mortos**. A cada job, freelancer, agência ou ferramenta nova, alguém **re-explica a marca do zero** — e ela sai inconsistente. A LOUDR transforma isso num **ativo vivo, versionado, que se aplica sozinho**: consistência de marca nível "grande agência", **democratizada** para qualquer empresa, sem time de branding.

**4. Timing e mercado (Brasil).** Branding estruturado é escasso e caro no Brasil. Entregar **inteligência de marca escalável e barata — que fica mais inteligente sozinha** — tem potencial de virar a **camada padrão da indústria criativa brasileira**. Quem só "gera imagem" briga por preço; a LOUDR briga por **profundidade proprietária que aumenta com o tempo**.

**5. Defensabilidade filosófica, não só técnica.** A borda é substituível por design; o núcleo é o ativo. A LOUDR sobe junto com o avanço das IAs de borda (absorve cada novo modelo) em vez de ser ameaçada por ele.

---

## 8. Modelo de monetização (alinhado ao valor)

- **Créditos** que precificam o **uso da borda** (imagem/vídeo/apps), com regra que garante ≥50% de margem (ver `planos.md`).
- **Brand Intelligence é fair-use (0 crédito)** — a inteligência **não** é o que se cobra por operação; é o que **prende e valoriza**. Cobra-se a borda; entrega-se o núcleo.
- Planos por volume (Essencial/Pro/Premium/Custom). O aprendizado acumulado é o que sustenta retenção e expansão.

---

## 9. Status (jul/2026)

- **Studio** (Imagem · Vídeo · Workflow) — ✅ maduro, catálogo amplo de modelos de borda.
- **Sistema de créditos + cobrança (Stripe)** — ✅ implementado e validado.
- **Camada de Inteligência da Marca (Fases 0–3)** — ✅ ciclo fechado: avaliar → destilar → aprender → realimentar → provar.
- **Aprofundamento do núcleo:**
  - ✅ **`assistant_correction`** — o Brand Assistant virou superfície de **ensino** ("Ensinar a marca"); a correção humana é sinal de altíssima prioridade que reescreve o modelo vivo.
  - ✅ **RAG re-derivado do modelo vivo** — os dois cérebros viraram um só: o RAG do Assistant recupera semanticamente não só o brand book digitado, mas o modelo **aprendido** (re-embeddado a cada nova versão destilada).
  - ✅ **Destilador mais esperto** — pondera **recência × peso**, resolve **contradições** sem apagar conhecimento (rebaixa a confiança do lado vencido) e calibra **confiança por faceta**. *(Validado: uma correção recente do time reverteu um "reprovado" antigo e refinou a regra em vez de apagá-la.)*
  - ✅ **Diff entre versões** — o painel IA LOUDR mostra "o que mudou na v{N}" (novos aprendizados, itens revistos, delta de confiança), tornando a evolução visível item a item.
- **Núcleo vivo aprofundado (A–D concluídos):** ensina → recupera o aprendido no RAG → destila com recência/contradição → prova a evolução versão-a-versão.
- **Cérebro como camada de verdade (06/jul):**
  - ✅ **`_brain.js`** — o cérebro extraído como módulo único (ingest · distill · search · context · dataset). As superfícies são clientes finos; a fronteira para virar serviço próprio está pronta.
  - ✅ **Flywheel COMPLETO** — Content Hub fechou o loop: **toda** superfície de cliente (Studio, Assistant, Posicionamento, Competitiva, Content) agora **lê e escreve** o mesmo cérebro. O pitch "tudo retroalimenta" é código, não promessa.
  - ✅ **Dataset canônico** — `brand_dataset`: exemplos julgados `(contexto → output → avaliação humana)` por marca, versionados, capturados 100% por triggers. É o embrião do modelo por tenant — melhora o RAG agora, destrava fine-tune depois, sem retrabalho.
  - ✅ **Taxonomia garantida + facetas novas** — `normalizeModelo()` (o LLM propõe, o código garante o shape); facetas `territorio` (derivada de diagnóstico × mapa competitivo — o cérebro aponta o espaço livre a reivindicar) e `conteudo` (temas/ângulos que o time realmente adota).
  - ✅ **Métrica de assertividade por versão** — cada destilação grava o approval observado sob a versão anterior; o gráfico mostra confiança **e** desempenho real. A evolução é medida, não narrada.
  - ✅ **Painel admin cross-tenant ("Cérebros")** — a LOUDR enxerga todos os cérebros: versão, confiança, sinais, dataset, approval, destilação sob demanda. A visão de operar uma **rede de inteligências de marca**.
- **Writing→Mídia (07–08/jul):** Writing Room (frameworks + blocos editáveis + compilador peça→workflow) · Biblioteca de assets · sinais `image_regen` e `writing_edit` (o produto aprende até com regenerações e edições de texto) · rede neural viva no painel · cron de destilação autônomo consertado. **Flywheel rodando 100% em produção** (v5 da LOUDR grounded no brand book real + inteligência competitiva da Pupila).
- **Fase atual (08/jul): GO-TO-MARKET.** Time de criação revê taxonomia+layout do Brand Book; criar a marca do produto e apresentar ao mercado. Em seguida: **rodada de investimento para expansão** — o material do pitch é o próprio flywheel medido (evidências→versões→assertividade, dataset proprietário, moat do cérebro).
- **Próximos técnicos:** Stripe live · recarga avulsa · E2 (loop criativo + Meta, gatilho: deal VHITA).

---

## 10. Estratégia de modelo: RAG + dataset primeiro, SLM adiado (decisão firmada)

- **Não** construir SLM/modelo próprio como núcleo agora. O ativo é o **cérebro (dados + loop)**, não os pesos. Aposta = **frontier LLM (borda trocável) + RAG eficaz sobre dataset proprietário**.
- **O dataset é o fio central** — `(contexto de marca → output → avaliação humana)`, capturado 100% via triggers (`brand_dataset`). Valor duplo: melhora o RAG **agora** e destrava fine-tune **depois**, sem retrabalho.
- **"Fine-tuning" neste estágio = afinar o SISTEMA** (retrieval + montagem de contexto + prompts), não pesos.
- **Gatilho para reabrir fine-tune/SLM:** volume alto + custo de API pesando + dataset limpo/validado + tarefa ESTREITA (classificação/tag/dedup), nunca raciocínio aberto. A rota completa em 5 estágios: [`pitch-tecnologia.md`](pitch-tecnologia.md) §5.

## 11. Fundamentos não-negociáveis (com o comercial esquentando)

1. **Isolamento por tenant** — cada cérebro isolado, versionado, com backup próprio. Zero vazamento entre marcas. Obrigatório antes de escalar contas (H2 do backlog).
2. **Completude do flywheel** — toda superfície de cliente escreve+lê o mesmo cérebro. ✅ Fechado em 06/07.
3. **Performance** — bundle monolítico ~2 MB sem code-splitting (`React.lazy` por rota + `manualChunks` para html2canvas/jspdf/pptxgenjs). Gap vivo de sustentação.
4. **Ciclo de vida do cliente:** prospect (frio) = diagnóstico via web search como arma de topo de funil; cliente (quente) = tudo retroalimenta o cérebro. Validação da compradora (Raquel, VHITA): *"guardar o aprendizado é um dos principais valores, senão fica na cabeça da pessoa"*.
5. **📌 Anotado para decisão futura:** trial self-service (Pupila tem; brandcode é invite-only por decisão). Reavaliar com pricing validado.

---

## 12. Meta operacional 2026 (declarada em 13/jul)

**30 marcas no produto até o fim de 2026.** O produto está completo para isso (v7.0); os
desbloqueadores são comerciais (pilotos Hering/VHITA, marca+site, INPI) e de INFRA — a maior
preocupação declarada do Danilo. Endurecimento em fases no [`backlog.md`](backlog.md) § Meta 30
marcas: fan-out dos crons (clipping tem teto global de 8 concorrentes; trends/sínteses seriais
estouram o teto de 15 min com ~15 workspaces), observabilidade (Sentry) antes de escalar,
tenant hardening (backup por cérebro), e o painel de custo por workspace (`ai_usage` já grava).
Custo projetado da meta: 30 × (consumo × R$0,33 + fair-use R$50–150) — margem de contrato 65–90%.

## Resumo de bolso (para o pitch)

> As IAs de borda são commodity. O LOUDR captura o que **não se copia**: um **modelo vivo da marca** que aprende de cada avaliação, aplica sozinho em tudo que gera, e **prova em gráfico** que fica mais assertivo. É a diferença entre **vender uma ferramenta** e **ser a infraestrutura de marca** de uma indústria inteira.
