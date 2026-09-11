# O lote sai da aba do navegador

Planejado em 11/set, **nada aplicado**. Decisão do Danilo durante o ensaio da Hering:
*"não dá pra deixar o processamento na tela — criar uma fila que vai rodando e a
pessoa vê depois."*

## O problema, medido

A rodada inteira vive na memória do React (`ultima`, `saidas`, `jobs`). O laço
`rodar()` dispara, espera a onda, dispara a próxima — tudo no `AddonCatalogo.jsx`.
Consequências, todas observadas hoje:

- F5, aba fechada, notebook dormindo ou rede caindo → perde-se o controle da
  rodada. As imagens ficam salvas; a capacidade de continuar, não.
- Uma onda que falha dá `break` e as seguintes **nunca são disparadas**: não há
  nem job para clicar "gerar de novo".
- O teto prático vira "o que couber numa sessão ininterrupta" — ~25 min para 10
  SKUs, ~4h para 100. Ninguém aposta 4 horas numa aba.

## O que NÃO precisa ser construído

Quase tudo já existe. A tarefa é **ligar**, não inventar.

| peça | onde já está | estado |
|---|---|---|
| o pedido por SKU | `lote_peca.linha` (+ `extras`, `workflow_id`, `rodada`) | ✅ gravado antes de gerar |
| o que já ficou pronto | `studio_generations` (`node_id` → `image_url`, `status`, `pasta`) | ✅ é a forma exata do `saidas` |
| **a rodada** | tabela **`execucao`** (055): `variaveis_lote`, `gatilho`, `iniciada_em`, `concluida_em`, `creditos`, `n_aprovado/rechecar/reprovado` | ⚠️ **existe e NENHUM código usa** |
| o planejador (ondas, montagem do pedido) | `src/lib/loteExecucao.js` + `studioGrafo.js` — puros, sem DOM | ✅ |
| function chamar `src/lib` | `_smartbrand.js` já importa `../../src/lib/campos.js` | ✅ precedente |
| porteiro de background | `_interno.js` (`autorizarBackground`, `internalHeaders`) | ✅ |
| padrão de cron que avança pipeline | `onboard-cron`, de minuto em minuto | ✅ mesmo problema, já resolvido |

O comentário da própria 055 antecipa este addon: *"`variaveis_produto` nasce SEM
catálogo para preenchê-la … quem as preenche por SKU entra quando o catálogo
entrar."* O catálogo entrou.

## O desenho: avanço SEM ESTADO

O cron não guarda nada. A cada tique ele **deriva** o que fazer do que já está no
banco — a mesma propriedade que torna o "retomar" correto.

```
lote-cron  (netlify.toml, "* * * * *")
  │
  ├─ pega execuções com concluida_em IS NULL
  │
  └─ para cada lote_peca da execução:
       1. roteiro ← roteiroDaPeca(fluxo, lote_peca.linha)
       2. saidas  ← { node_id: image_url } de studio_generations
                     where pasta = lote_peca.pasta and status = 'done'
       3. próxima onda = a primeira cujas dependências estão em `saidas`
          e cujos nós ainda não têm geração viva
       4. dispara só esses, via studio-generate, com internalHeaders()
       5. se todas as ondas estão em `saidas` → marca a peça pronta
  │
  └─ execução sem peça pendente → concluida_em = now()
```

**Idempotente por construção:** disparar duas vezes é impossível porque o passo 3
confere `studio_generations` antes. Um tique perdido não quebra nada — o
seguinte recalcula.

Isso substitui o `esperarOnda` do browser: ninguém "espera". O cron olha, avança
um degrau, e volta no minuto seguinte. É a mesma escolha do `onboard-cron`
(*"a latência entre etapas não importa — o que importa é que ande sozinho"*).

## O que falta nas tabelas

Pouco, e aditivo:

- `execucao`: usar de verdade. `gatilho = 'addon-catalogo'`, `variaveis_lote` com
  as vistas pedidas e os extras, `disparada_por` = quem clicou.
- `lote_peca`: ganhar `execucao_id` (hoje só tem `rodada`, que é um uuid solto) e
  um `processando_ate timestamptz` para a trava de corrida (abaixo).
- `studio_generations.execucao_id`: a coluna **já existe** e não é preenchida.

## As armadilhas conhecidas

**1 · O 401 silencioso.** Está documentado no `produto.md`: o dispatch do cron
mandava só `Content-Type`, e o worker começava com `if (!token) return 401`.
Recusa sem linha, sem erro, sem alerta — a etapa estourava o teto e virava
`expired`. Custou dias, e o irmão do arquivo consertado seguiu quebrado por mais
três. **O `lote-cron` tem que se identificar com `internalHeaders()`, e
`studio-generate` tem que aceitar chamada de servidor** (hoje exige bearer de
usuário). Já existe teste varrendo os 8 workers da trilha — este entra na mesma
varredura.

**2 · Corrida entre tiques.** Um tique que demora mais de um minuto encontra o
seguinte já rodando. Trava: `lote_peca.processando_ate = now() + interval '5 min'`
com update condicional; quem não conseguir o claim, pula. O `diagnostico-reaper`
(a cada 15 min) é o precedente para soltar claim de tique que morreu.

**3 · Geração presa.** `status = 'running'` para sempre trava a onda seguinte.
Precisa de reaper próprio, no molde do `diagnostico-reaper`: geração viva há mais
de N minutos vira `error`, e aí a peça pode ser retomada.

**4 · O crédito passa a debitar de verdade.** Hoje o Danilo roda como
`platform_admin` e `studio-generate` **pula o débito** (`if (!platformAdmin)`).
Com o cron, quem dispara não é operador — então a cobrança acontece. É o certo, mas
é mudança de comportamento visível na fatura do cliente. Decidir se o cron debita
do workspace (provável) e como o `execucao.creditos` é somado.

**5 · Saldo insuficiente no meio da rodada.** Hoje falha peça a peça. Com fila,
precisa parar a execução com estado explícito, não morrer calado.

## O que a tela passa a ser

Ela deixa de executar e vira **janela**. A aba LOTES já lê `lote_peca` e as
imagens por `pasta` (o `abrirLote` já faz isso). Passa a mostrar progresso da
execução e o botão vira "enfileirar", não "rodar".

Ganho colateral: fecha o defeito do `regerar` usar o SKU errado, porque não
existe mais `ultima` — tudo vem do banco.

**Aviso quando terminar:** `_email.js` + Resend já estão prontos. Uma rodada de
4 horas pede um e-mail no fim; é barato e é o que fecha o "a pessoa vê depois".

## Ordem sugerida

1. **`retomar` no `abrirLote`** (3 linhas, sem deploy de schema) — resolve o F5 já
   e é pré-requisito conceitual: é o mesmo cálculo que o cron faz.
2. **`studio-generate` aceitar chamada interna** + teste na varredura dos workers.
3. **`lote-cron` + `execucao_id` em `lote_peca`** — a fila propriamente dita.
4. **Reaper de geração presa.**
5. **E-mail de conclusão.**

Depois disso, a arquitetura B do turnaround e o `base_conferida` — que ficam
muito mais baratos quando a rodada é retomável.
