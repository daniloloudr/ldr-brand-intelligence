# LOUDR — Modelo de Precificação (créditos)

> Definido jun/2026, revisto e IMPLEMENTADO jul/2026. Custos de insumos em `specs/custos.csv`.
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
