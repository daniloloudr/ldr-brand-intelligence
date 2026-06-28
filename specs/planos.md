# LOUDR — Modelo de Precificação (créditos)

> Definido em jun/2026. Custos de insumos em `specs/custos.csv`.
> Câmbio de referência: R$5,50/USD. Custo variável: **~R$0,22/crédito** (~$0.04).

## Princípio

**1 crédito = 1 imagem = ancoragem de R$1,00** (no plano topo). O crédito foi
desenhado pra custar **~$0.04 em qualquer operação** — imagem, app, diagnóstico,
listening, etc. caem todos em ~$0.04/crédito.

Modelo de **desconto por volume**: planos menores pagam o crédito mais caro;
planos maiores ganham desconto. Margem maior nos pequenos, escala nos grandes.

## Planos

| | Essencial | Pro | Premium | Custom |
|---|---|---|---|---|
| Preço/mês | R$1.000 | R$3.000 | R$5.000 | a negociar |
| Créditos | 650 | 2.400 | 5.000 | 10.000+ |
| R$/crédito | R$1,54 | R$1,25 | R$1,00 | negociável |
| ~Imagens | ~650 | ~2.400 | ~5.000 | sob medida |
| ~Vídeos básicos | ~80 | ~300 | ~625 | sob medida |
| ~Campanhas | ~160 | ~600 | ~1.250 | sob medida |
| Brand Intelligence | incluída | incluída | incluída | incluída |

- **Cap rígido**: ao zerar os créditos, bloqueia a geração até o próximo ciclo
  (reset mensal) ou compra de pacote avulso. Reaproveita `STUDIO_MONTHLY_LIMIT`
  (trocar contagem de gerações por contagem de créditos).
- **Brand Intelligence** (diagnóstico, assistant, listening) entra **incluída
  com fair-use** — não consome crédito, só evita abuso.

## Custo de crédito por operação

| Operação | Créditos |
|---|---|
| Imagem (Nano Banana / Flux) | 1 |
| Upscale / Variação | 1 |
| Remove BG | 1 |
| Content Hub (geração) | 2 |
| Campanha (4 formatos) | 4 |
| Diagnóstico | 5 |
| Social Listening (coleta) | 9 |
| Msg Brand Assistant | 1 |
| Vídeo — Kling/Seedance básico | 8 |
| Vídeo — qualidade média | 13 |
| Vídeo — premium (Veo) | 30 |

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
