# s1ngulr — Custos & Créditos (modelo revisto)

> **🔄 PIVÔ DE MODELO (Danilo, 2026-07-12): NÃO é SaaS self-service.**
> A venda é direta/negociada. O **crédito virou REPASSE DE CUSTO** (sem margem) —
> o ganho está na inteligência, na revisão e na redução de horas, precificadas em contrato.
>
> **A BALIZA: 1 crédito = R$0,33 de custo de insumo de IA.** ✅ decidida em 2026-07-13.
> **Fórmula de manutenção/cliente:** `custo/mês = créditos consumidos × 0,33 + fair-use de IA (~R$50–150) + infra fixa` — teto de exposição = pool × 0,33; margem típica de contrato 80–90%, pior caso ~65%.
> Matemática: o mapa de créditos segue `créditos = ⌈18 × custo_USD⌉`; com o crédito a
> R$0,33, 18 × 0,33 = R$5,94/USD — o repasse cobre o custo real com proteção de câmbio
> até R$5,94, sem retocar nenhum mapa. (Se preferir baliza R$0,30: multiplicador ×20 e
> recalibrar os vídeos ~+10%.)
>
> **As duas visões de custo:**
> 1. **Uso (cliente):** créditos por geração visíveis no nó Gerar, na página Imagem,
>    no card do Copiloto e na página Créditos & Consumo (tabela por modelo + extrato).
> 2. **Dona (Danilo):** custo TOTAL do sistema =
>    (a) fal/geração → rastreado em `studio_generations` + dashboard admin ✅;
>    (b) LLM Anthropic → rastreado em `ai_usage` (migration 039) com tag por operação
>        (distill, diagnostico, sintese-mercado, tendencias, insights, clipping,
>        diretor-de-arte, home-reco…) ✅ desde 2026-07-12;
>    (c) embeddings Voyage → hook pendente (barato: ~$0,06/M tokens);
>    (d) fixos: Netlify + Supabase + R2 (anotar valores mensais no dashboard).
>    Pendente: painel admin "custo por workspace/mês" somando (a)+(b) — dados já gravam.
>
> O documento abaixo é o modelo ANTERIOR (planos SaaS) — mantido como referência
> histórica dos custos por modelo e da regra ×18.

---

## 📊 Benchmark de mercado + camada enterprise "por asset aprovado" (2026-07-14)

Fonte: decks do **Fullsix AI Creative Engine** (Havas CX) em `.spec/competitors/` — concorrente
direto na conta Worten. O modelo comercial deles é a referência do que procurement de marca
grande já aceita pagar:

**A tabela deles (indicativa, ex-VAT):**
- Portas de entrada: **Sprint** desde €9.500 (fixo, testar) · **Visual Bank** 50 KVs €12,5k /
  100 KVs €22,5k (biblioteca) · **Always-On** setup €7,5k–35k + preço por asset (recorrente)
- **Preço por visual APROVADO** (não por geração/teste): Minimal €79–105 · Standard €105–140 ·
  Complex €158–210, com bandas de volume (400+ KVs/mês → €79/€105/€158)
- Exemplo deles: 120 KVs standard/mês = **€14.280/mês** (~R$85k)
- Adaptação de formato à parte: template €500 · estático €30 · animado €150 · HTML5 €250
- **Protocolo de calibração**: o 1º lote mede a taxa real de retoque da marca e define o tier
  definitivo (Minimal 0–15% de trabalho manual · Standard 15–40%) — o setup vira instrumento
  de pricing, não só onboarding

**O que absorver (frentes 2 e 3 do backlog):**
1. **Camada enterprise por asset aprovado** — em deal grande (Worten/Hering), oferecer POR CIMA
   do repasse de créditos uma tabela por imagem aprovada com bandas de volume. Nosso custo por
   produto completo ≈ **R$1–2** (mapa Hering) vs €95–210 deles: qualquer preço na casa de
   R$40–120/imagem aprovada fica 5–15× abaixo do benchmark E com margem de 95%+. O benchmark
   deles é o teto de referência na negociação — não precisamos ser baratos, precisamos ser
   *obviamente* melhores em preço com a mesma garantia.
2. **Cobrar só o aprovado** — encaixa com o que já temos: o juiz (artGate/auto-julgamento)
   filtra antes, o voto do cliente define "aprovado", a métrica de convergência (regens até
   aprovação) prova a eficiência. Geração reprovada = custo nosso (centavos), não do cliente.
3. **Setup pago que calibra o contrato** — formalizar o pilotinho como "setup de cérebro"
   (linha de contrato, referência deles €7,5k): ingestão de marca + 1º lote + medição da taxa
   de aprovação → define a banda de preço do recorrente.

> Guarda-chuva: isso NÃO reabre o SaaS. A base segue contrato + créditos-repasse; a camada
> por asset aprovado é EMBALAGEM comercial p/ enterprise que pensa em "custo por peça"
> (como a Worten, educada pela tabela da Fullsix).

---

# LOUDR — Modelo de Precificação (créditos)

> Definido jun/2026, revisto e IMPLEMENTADO jul/2026. Custos de insumos em `custos.csv`.
> Câmbio de referência: R$5,50/USD (colchão R$6,00 na regra). Custo por crédito
> **varia por modelo** (ver regra ×18 abaixo) — não é mais um valor fixo.

> **Status: IMPLEMENTADO (2026-07-01).** Ledger + débito nas functions + página
> de cobrança + Stripe validado (test mode). Mapa de crédito: `src/lib/credits.js`
> + `netlify/functions/_credits.js` (manter sincronizados). Ledger: migration 023.

## Princípio (regra travada)

**Crédito varia por modelo** — quanto mais caro o modelo de borda, mais créditos
custa. Regra: **créditos = arredonda↑(18 × custo_USD)**. O ×18 = 2 (dobro, p/ 50%
de margem) × 6,00 (câmbio com colchão) ÷ 0,73 (crédito mais barato) → garante
**≥50% de margem de contribuição LÍQUIDA de Stripe** no pior caso. Custo fixo
(dev) NÃO entra no crédito — vive no break-even.

## Planos (REVISTO)

| | Essencial | Pro | Premium | Custom |
|---|---|---|---|---|
| Preço/mês | **R$1.500** | **R$3.000** | **R$5.000** | a negociar |
| Créditos | 750 | 2.000 | 5.000 | negociável |
| R$/crédito | R$2,00 | R$1,50 | R$1,00 | ~R$0,73 piso |
| Modelos e funcionalidades | **todos** | **todos** | **todos** | **todos** |
| Brand Intelligence | incluída | incluída | incluída | incluída |

> A única diferença entre planos é a **quantidade de créditos**. Todo modelo (imagem/vídeo) e toda funcionalidade (Studio, Workflow, Campanhas, Listening, Content Hub) estão disponíveis em qualquer plano.

Código: `constants.js PLANOS` mantém as CHAVES `trial/starter/pro/enterprise`
(starter=Essencial, pro=Pro, enterprise=Premium) p/ não quebrar banco/admin.
Todos os planos pagos têm `studio:true`.

- **Sem gating (2026-07-01):** TODO plano acessa TODOS os modelos e TODAS as funcionalidades. A **única** diferença entre planos é a **quantidade de créditos**. Não há mais `MODEL_MIN_PLAN` nem `UpgradeGate` — o acesso é universal; o que limita o uso é o saldo.
- **Cap rígido**: saldo zerado → bloqueia geração (402) até o próximo ciclo (refill
  mensal automático). Recarga avulsa (overage) = pendente (depende do Stripe).
- **platform_admin bypassa** o débito (gera de graça p/ suporte/teste).

## Custo de crédito por operação (regra ×18, custos fal reais jun/2026)

**Imagem** — 1 crédito (Nano Banana, GPT Image 2, Seedream, FLUX dev/.2/Pro1.1,
Recraft, Qwen) · 2 (FLUX Ultra, Ideogram v3) · **3 (Nano Banana Pro)**.

**Vídeo** (escala com duração, 5s/10s salvo indicado):
| Modelo | Créditos |
|---|---|
| Hailuo 02 | 5 / 9 |
| Kling 2.5 Turbo | 7 / 13 |
| Seedance 1.0 Pro | 14 / 27 |
| Seedance 2.0 Fast | 22 / 44 |
| Seedance 2.0 | 28 / 55 |
| Veo 3 Fast (4/6/8s) | 29 / 44 / 58 |
| Veo 3 (4/6/8s) | 54 / 81 / 108 |

**Outras:** Content Hub = 2 · Campanha = nº formatos × crédito/imagem · Upscale/Variação/Remove BG = 1.

**FAIR-USE (0 crédito):** Brand Intelligence inteira — diagnóstico, social listening
e Brand Assistant não consomem crédito.

> Vídeo é o risco de margem — tabelar crédito por modelo e travar quais entram por plano.

## Margem interna (custo R$0,22/crédito, full burn)

| Plano | Receita | Custo máx | Margem-piso |
|---|---|---|---|
| Essencial | R$1.000 | R$143 | 86% |
| Pro | R$3.000 | R$528 | 82% |
| Premium | R$5.000 | R$1.100 | 78% |

Uso real (~50% do pool) eleva todas pra ~88–92%.

### Custom — trava de negociação (piso de R$/crédito)

| R$/crédito | Margem |
|---|---|
| R$0,90 | 76% |
| **R$0,73** | **70% (piso recomendado)** |
| R$0,55 | 60% |
| R$0,44 | 50% (limite absoluto) |

Regra: não vender crédito abaixo de **~R$0,73** sem motivo estratégico.

## Estrutura de custos

- **Variável (cobre pelos créditos):** fal.ai (imagem/vídeo/apps) · Anthropic
  (LLM + web search) · Voyage (embeddings) · R2 (storage; egress zero) ·
  Stripe (~4% por cobrança). ≈ R$0,22/crédito.
- **Fixo (diluído na base):** Dev R$15.000/mês + Supabase ~$20 + Netlify ~$20 +
  Voyage ~$20 = **R$15.330/mês**. O dev é 98% do fixo.

### Escala de infra (degraus pequenos vs dev)
- **R2**: cresce do dia 1, linear e trivial (centavos); resolver com TTL/lifecycle.
- **Netlify**: primeiro a estourar (~10–30 clientes ativos, invocações de function) → $20 → ~$99.
- **Supabase**: ~20–50 clientes (DB/compute) → $25 → $100+.
- Todos irrelevantes perto do dev; o salto se paga sozinho.

## Break-even

```
Custo fixo ÷ margem média (~80%) = 15.330 ÷ 0,80 ≈ R$19.000/mês de receita
```

≈ **4 clientes Premium**, ou ~6–7 Pro, ou um mix. Do break-even em diante, cada
cliente novo é quase tudo lucro (só sobe o variável dele, ~R$0,22/crédito usado).
