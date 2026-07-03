# Plano de Melhoria — LOUDR Brand Intelligence

> Documento de trabalho. Prioriza **onde está o valor do negócio** (a Camada de Inteligência de Marca), sem quebrar o que já funciona. Fases pensadas pra serem incrementais — nada de big-bang.

## 0. Princípio norteador

O diferencial da LOUDR **não é o Studio** (geração visual é commodity). É o Studio **alimentado pela Camada de Inteligência de Marca**: ingerir tudo da marca → transformar em contexto → banco vetorial que **retroalimenta** → base de toda criação. Toda decisão de arquitetura abaixo serve pra **proteger, isolar e fazer crescer essa camada**.

Duas camadas distintas — não confundir:
- **Camada de borda (`_ai.js`)** — chama LLM/embeddings de terceiros. Hoje Anthropic + Voyage; tem que continuar **trocável a qualquer momento**. Importante, mas não é o produto.
- **Camada de Inteligência de Marca** — o cérebro proprietário. É o produto. É o que precisa virar bloco próprio, versionável e evolutivo.

---

## 1. Camada de Inteligência de Marca (PRIORIDADE MÁXIMA)

### Estado atual (já existe — não é do zero)
- **Ingestão:** `brand-manual-extract-background` (PDF→estruturado), brand book digitado, `brand_signals` (sinais crus).
- **Destilação (o cérebro):** `brand-distill-background` lê `brand_signals` não-consumidos + versão atual do modelo vivo → destila próxima versão via LLM → grava em `brand_intelligence` → marca sinais consumidos. Loop de retroalimentação via `brand-distill-cron` (diário).
- **Embedding:** `_embed.js` (Voyage voyage-3, 1024 dims) → `brand_book_chunks` ("os dois cérebros": brand book digitado + modelo vivo aprendido).
- **Retrieval:** `brand-book-search` (busca vetorial).
- **Consumo:** Studio (`_studio`), BrandAssistant, e (a validar) diagnóstico/content-hub.

### Problemas a resolver
1. **Sem fronteira formal.** O pipeline está espalhado em várias functions Netlify, misturado com CRUD/app. Não há um "SDK interno da inteligência" — cada consumidor conhece as tabelas e o fluxo por dentro.
2. **Preso ao teto de 15 min do Netlify.** Destilação, re-embedding, ingestão de fontes externas (o que você quer expandir) são cargas longas/multi-passo. O runtime efêmero é o substrato errado — a saga do diagnóstico já provou isso.
3. **Retrieval/contexto não padronizado.** Cada consumidor monta o contexto de marca do seu jeito; não há um "montador de contexto" único e testável.
4. **Observabilidade zero.** Não dá pra ver qualidade da destilação, deriva do modelo vivo, custo por marca, o que foi recuperado numa geração.

### Alvo (faseado)
- **Fase 1 — Fronteira lógica, sem mover infra.** Criar um módulo único `brand-intelligence/` (ainda no repo) que exponha uma API interna: `ingest(signal)`, `distill(brand_id)`, `search(brand_id, query)`, `buildContext(brand_id, purpose)`. Todo consumidor (Studio, Assistant, diagnóstico) passa a usar SÓ essa API — ninguém toca tabela de vetor direto. **80% do benefício, 20% do custo.**
- **Fase 2 — Extrair pra serviço dedicado.** Mover a camada pra um worker de longa duração (container/serviço) com **fila + estado durável**, exposto por API interna autenticada. Migrar primeiro o que é longo: `brand-distill`, re-embedding, ingestão externa. Some o teto de 15 min; ganha deploy/escala/observabilidade próprios. O app Netlify vira **cliente**.
- **Fase 3 — Crescer o cérebro.** Fontes externas (notícias, redes, reviews, dados de mercado) como novos tipos de `brand_signals`; versionamento do modelo vivo com histórico/diff; métricas de qualidade; feedback loop das avaliações humanas realimentando a destilação.

### Guardrails
- Camada de borda (`_ai.js`) permanece a ÚNICA porta pra LLM/embeddings de terceiros — a Inteligência de Marca chama a borda, nunca a API do provider direto. Isso mantém a troca de provider barata.
- Vetor e modelo vivo são o ativo: backup/versionamento próprios, isolados do banco de app.

---

## 2. Segurança (rápido, alto impacto)

1. **🔴 Chave Anthropic no bundle do frontend.** `BrandAssistant.jsx`, `ContentGerarDrawer.jsx`, `CampaignNew.jsx` setam `x-api-key = import.meta.env.VITE_ANTHROPIC_KEY`. Como a var existe no build do Netlify, o Vite **inlina a chave no JS de produção**. Em prod o caminho já usa o proxy `/.netlify/functions/anthropic` (chave própria no servidor), então o header do cliente é desnecessário. **Ação:** só setar `x-api-key` quando `import.meta.env.DEV`; conferir o bundle publicado; rotacionar a chave depois. **Confirmar `ANTHROPIC_KEY` em todos os contextos do Netlify** (regressão recente foi essa var sumindo → hang de 15 min).
2. **Supabase único dev+prod.** Teste local grava direto em prod. Separar instâncias (ou ao menos schema/projeto de staging) antes de escalar.
3. **`SUPABASE_SERVICE_KEY` em 30+ functions.** Cada function tem poder total. Ao extrair a Inteligência de Marca (Fase 2), reduzir a superfície: functions de app com chave de menor privilégio; service key só no worker.
4. **Positivo:** RLS presente (13 migrations, ~84 policies). Manter e cobrir tabelas novas.

## 3. Performance

1. **Bundle monolítico 2,1 MB** num único `index-*.js`, sem code-splitting. Páginas grandes (`AppInterno` 1232, `StudioCanvas` 1198, `PaginaPublica` 1177) entram todas juntas. **Ação:** lazy-load por rota (`React.lazy`/dynamic import) — ganho imediato de load.
2. **Padrão background+polling+reaper** é remendo do teto de 15 min. Resolve-se de vez na Fase 2 (worker + fila).
3. **`fail-fast` de `ANTHROPIC_KEY` já aplicado** (`_ai.js`) — erro em ms em vez de pendurar 15 min. Manter esse padrão pra toda dependência externa crítica.

## 4. Estrutura / organização

- Hoje **apresentação + inteligência + infra** no mesmo deploy. Meta: **3 blocos claros** — (a) App/UI (Netlify), (b) Borda LLM (`_ai.js`, fina, trocável), (c) Inteligência de Marca (bloco próprio, o IP).
- Quebrar arquivos-monstro (`AppInterno` 1232, `StudioCanvas` 1198) em componentes — reduz risco e acelera manutenção.

## 5. Precificação (em andamento)

- **Modelo muda:** provavelmente deixa de ser SaaS self-service. Venda sob demanda; **créditos continuam existindo pra limitar consumo**, mas plano/créditos definidos manualmente pelo Danilo.
- **Agora:** esconder só o customer-facing (menu "Plano e cobrança" + rota `#/app/plano`). **Manter** `PLANOS`, `CreditBadge`, gating e `stripe-checkout` intactos por baixo. ✅ feito neste ciclo.
- **Depois:** repensar a modelagem de créditos pra refletir custo real por tipo de geração/uso de inteligência.

---

## Ordem sugerida
1. Segurança #1 (chave no bundle) + confirmar env — baixo esforço, risco real.
2. Esconder customer-facing de preço — feito.
3. Camada de Inteligência Fase 1 (fronteira lógica) — destrava o resto.
4. Performance (lazy-load) — ganho rápido em paralelo.
5. Camada de Inteligência Fase 2 (worker + fila) — quando a dor do teto justificar (já está justificando).
6. Fase 3 (crescer o cérebro) — contínuo, é o roadmap de valor.
