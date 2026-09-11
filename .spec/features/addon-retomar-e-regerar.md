# Addon de Catálogo · retomar a rodada e regerar a peça certa

Decidido em 11/set. **Não aplicado** — é código, precisa de deploy.

Duas dores levantadas pelo Danilo durante o ensaio da Hering:
1. "quando dá erro, seria legal rodar só a linha e não tudo de novo"
2. "quando dá erro e para, poderíamos continuar de onde parou"

**São o mesmo conserto.** E há um defeito de correção ativo junto.

---

## O DEFEITO (ativo hoje, silencioso)

`AddonCatalogo.jsx`, dentro de `rodar()`:

```js
for (const l of prontas) {              // uma volta por SKU
  const roteiro = roteiroDaPeca({ ..., linha: l, ... })
  const saidas  = {}
  setUltima({ roteiro, saidas, auth })  // ← DENTRO do laço
```

Ao fim do lote, `ultima` guarda só o roteiro do **último** SKU. E `regerar()` busca:

```js
const passo = ultima.roteiro.passos.find(p => p.genId === job.__no)
```

`job.__no` é o id do NÓ (`e0_g5`), e os SKUs compartilham o mesmo grafo — então o
`find` sempre acha, e devolve o passo do último SKU. Clicar "GERAR DE NOVO" numa
imagem da sku122 regenera com peça, acessórios, elenco e contexto da sku124, e
grava o resultado como sku122. O `saidas` também é o do último, então uma vista
de entrega herdaria a base de casting do outro SKU.

Não há erro na tela. O resultado só parece "alucinação".

**Contorno enquanto não sobe:** planilha com UMA linha. Aí o último SKU é o único.

---

## O CONSERTO

A causa dos três problemas é a mesma: o roteiro vive num estado volátil único em
vez de ser reconstruído do que já está gravado.

### O dado já existe — não precisa persistir nada novo

| o que | onde já está |
|---|---|
| a linha da planilha (contexto, refs, vistas) | `lote_peca.linha` |
| o fluxo usado | `lote_peca.workflow_id` |
| o agrupamento do ato | `lote_peca.rodada` |
| o que já ficou pronto | `studio_generations` (`node_id` → `image_url`, `status`) |

E `saidas` é exatamente `{ [node_id]: image_url }` — a mesma forma que
`esperarOnda` monta em memória (`saidas[job.__no] = e.url`).

### `retomarPeca(sku)`

1. Lê a linha de `lote_peca` por `(brand_id, pasta, sku)`.
2. Reconstrói `roteiro = roteiroDaPeca({ nodes, edges, vistas, escolhidas:
   linha.vistasPedidas, linha, contextoDaPeca: montarContexto({ aPeca:
   linha.contexto }), ... })`.
3. Reconstrói `saidas` de `studio_generations` onde `pasta = pastaDoLote(sku)` e
   `status = 'done'`.
4. Percorre `roteiro.ondas`; **pula todo `genId` que já está em `saidas`** e
   dispara só o que falta, com a mesma espera por onda.

Resultado: erro na etapa 0 não custa mais o lote inteiro — e sobrevive a F5, a
aba fechada e ao dia seguinte, que é o que a migration 061 já perseguia.

### `regerar(job)` passa a usar o mesmo caminho

Reconstrói roteiro + saidas para `job.sku` (não para "o último") e procura o
passo por `(sku, genId)`. Correto por construção: o roteiro vem do dado
persistido daquela linha, não de um estado que só lembra do último.

Mantém `regen: true` / `regen_of`, que o backend usa para emitir `image_regen`.

### Guardas de teste

- regerar imagem da linha A com a linha B processada por último → usa refs de A
- retomar peça com etapa 0 pronta e etapa 1 faltando → dispara só a etapa 1
- retomar peça completa → não dispara nada, não cobra crédito
- `lote_peca` ausente → mensagem clara, não crash

---

## Ordem sugerida

Isto vem **antes** da arquitetura B: é correção, não melhoria. E barateia B —
retomar significa que um 422 da 180° não obriga a refazer a cadeia toda.
