# LOUDR — Visão, Arquitetura & Tese de Negócio
**Documento vivo · jul/2026 · Owner: Danilo Silva**
*Serve a dois públicos: (a) pitch de venda/investimento; (b) referência de arquitetura e produto. Detalhes de implementação nas specs de feature (`studio.md`, `brand-intelligence.md`, `planos.md`).*

---

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
- **Evolução natural:** re-derivar os chunks a partir do modelo vivo — o RAG passa a indexar não só o digitado, mas o **aprendido**. Os dois cérebros viram um só.

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
- **Próximos:** re-derivar RAG do modelo vivo · `assistant_correction` como sinal · Stripe live · recarga avulsa de créditos.

---

## Resumo de bolso (para o pitch)

> As IAs de borda são commodity. O LOUDR captura o que **não se copia**: um **modelo vivo da marca** que aprende de cada avaliação, aplica sozinho em tudo que gera, e **prova em gráfico** que fica mais assertivo. É a diferença entre **vender uma ferramenta** e **ser a infraestrutura de marca** de uma indústria inteira.
