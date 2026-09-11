# Etapa 0 · arquitetura B — âncora dupla, depois interpolação

Decidido em 11/set. **Não aplicado** — desenho para revisar depois da agenda da Hering.

## O problema que isto resolve

Os cinco nós de geração da etapa 0 recebem hoje exatamente a mesma coisa: a foto
de casting, o prompt da vista, o contexto e o formato. Nenhum vê a saída de
outro. Só que os prompts **mandam igualar as vistas irmãs** ("as mesmas da vista
135°", "mesmo penteado das outras quatro") — instrução impossível, e instrução
impossível vira licença. Foi assim que um casting de cabelo curto virou tranças.

O contexto já declarava a intenção: *"as cinco vistas são a mesma foto, girada …
é o que permite usá-las como base uma da outra"*. A fiação nunca implementou.

## Por que B e não a cadeia simples

A cadeia por rotação (0→45→90→135→180) tem desvio pequeno por passo, mas **o erro
acumula**: a 180° carrega os quatro saltos anteriores. B fixa os extremos com as
âncoras mais fortes e depois preenche o meio, de modo que cada intermediária fica
**presa entre duas vistas já congeladas**. O erro deixa de compor.

O perfil (90°) vira a segunda âncora porque é a vista que informa estrutura — o
próprio `e0_p3` diz: *"a linha do ombro, a curva das costas, a projeção do quadril
e o comprimento real do tronco"*. É exatamente o que falta para a nuca.

## A fiação

Arestas NOVAS a acrescentar (nenhuma é removida):

| alvo | vista | passa a receber também | total de refs |
|---|---|---|---|
| `e0_g1` | 0° FRENTE | — (só a foto) | 1 |
| `e0_g3` | 90° PERFIL | `e0_g1` | 2 |
| `e0_g5` | 180° COSTAS | `e0_g1`, `e0_g3` | 3 |
| `e0_g2` | 45° 3/4 | `e0_g1`, `e0_g3` | 3 |
| `e0_g4` | 135° 3/4 costas | `e0_g3`, `e0_g5` | 3 |

```
        foto de casting
              │
              ▼
    ┌──────► 0° ──────┬─────────┐
    │        │        │         │
    │        ▼        ▼         │
    │       90° ───► 45°        │
    │        │                  │
    │        ├────────► 180° ◄──┘
    │        │           │
    │        └──► 135° ◄─┘
```

É um DAG — sem ciclo, então `planoDeExecucao` resolve a ordem sozinho. A execução
passa a ser sequencial por dependência; com o `base_conferida` isso acontece uma
vez por casting, não por lote.

Todos ficam com a foto de casting na lista (é a fonte de identidade) e **nenhum
passa de 3 referências**, que é o teto que a receita se impõe.

⚠️ Definir `refOrder` em cada nó de geração: a ordem precisa ser determinística,
e a foto de casting deve vir **primeira** — modelos de endpoint singular usam só
a primeira e descartam o resto sem avisar.

## Os prompts que mudam

Agora as vistas irmãs EXISTEM como entrada, então a instrução deixa de ser cega:

- **`e0_p3` (90°)** — passa a dizer que gira a partir da vista 0° recebida:
  mesma pessoa, mesma escala, mesma altura de cabeça e pés.
- **`e0_p5` (180°)** — pode voltar a referenciar o perfil, agora legitimamente:
  *"a nuca e a largura das costas saem da vista 90° recebida"*. A âncora de
  cabelo escrita em 11/set continua, como piso.
- **`e0_p2` (45°)** — vira interpolação explícita: *"exatamente entre a 0° e a
  90° recebidas; nada que não esteja numa das duas"*.
- **`e0_p4` (135°)** — idem, entre 90° e 180°.

## O que NÃO muda

- O `e0_ctx` como está (âncora de fisionomia + segunda pele cobrindo pernas).
- Etapas 1–4: já encadeiam (`e1_g1 ← e0_g1`, `e3_g1 ← e0_g5`, etc.).
- A reescrita das entradas pelo addon (`entradasDoLote` + `comEntradas`): os nós
  de imagem continuam sendo sobrescritos por SKU.

## Depende de

**`base_conferida`** (hoje escrito no upload do casting e nunca lido). Sem ele, B
encarece o lote: gerar a 180° passa a exigir 0° e 90° antes, subindo de ~2 para
4–5 gerações de insumo por SKU. Com ele, o turnaround inteiro é gerado e
aprovado UMA vez por casting, e todo lote começa na etapa 1.

As duas mudanças se pagam mutuamente. Aplicar B sozinho é pior que o estado
atual em custo; aplicar as duas tira a etapa 0 do caminho crítico.

## Ordem sugerida

1. `base_conferida` (código, precisa de deploy) — o portão da etapa 0 passa a ser
   pulado para casting já conferido.
2. Fiação B + os quatro prompts (dado, não precisa de deploy).
3. Reextrair `addonReceitaCatalogo.js` do fluxo corrigido antes de mergear o
   branch `addon-receita-portavel` — senão a versão portável nasce com a fiação
   velha e a contaminação do KH6V.
