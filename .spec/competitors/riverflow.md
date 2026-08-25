# Riverflow — o 5º arquétipo: gerador de imagem de produto, self-serve

> Análise do Danilo, 25/08/2026. Nome anotado nas duas grafias que apareceram
> (Riverstudio / Riverflow) — **confirmar a oficial antes de usar em material de venda.**
>
> Companheiros de prateleira: [`valometry.md`](valometry.md) (mede, não cria),
> Fullsix (fábrica com humanos), Pupila (Studio sem cérebro), Tess (horizontal).

## O que eles são

Gerador de imagem de produto para varejo, self-serve, com planos a partir de
US$ 39. Nº 1 em benchmark de edição de imagem. Onboarding por **URL**: importam
logo, cores, valores, público, categorias e catálogo de produtos em minutos.

O arquétipo é novo na nossa prateleira: os outros ou medem, ou produzem com
gente dentro, ou geram sem memória. Este **produz bem, barato e sozinho** — e é
por isso que ele aparece na mesma demo que a gente.

---

## Onde estamos de verdade (verificado no código, 25/08)

A checagem importa porque metade da lista já existe aqui, e escrever "não temos"
sobre o que temos leva a reconstruir coisa pronta.

| O que eles têm | Nosso estado real | Onde |
|---|---|---|
| **Onboarding por URL** | 🟡 **PARCIAL, e melhor do que parece.** A INTELIGÊNCIA já nasce só do domínio: `admin-create-workspace` dispara diagnóstico e mineração sem manual nenhum, e a trilha da marca fica em `waiting`. O que espera o PDF é a **identidade declarada** — logo, cores, tipografia | `_onboard.js`, `admin-create-workspace.js` |
| **Importação de catálogo** | 🔴 **Ausente.** Nenhuma integração Shopify/VTEX | — |
| **Conversão de formato em lote** | 🟡 **PARCIAL.** Nó Recortar (crop `sharp`, 0 crédito) + template "1 peça → 6 formatos". Falta o lote com preview e aprovação | `studioWorkflowTemplates.js` |
| **Prompt enhance** | ✅ **Existe** ("Melhorar prompt", com o aviso de conferir antes de gerar) | `StudioCanvas.jsx` |
| **Galeria de prompts** | 🔴 Ausente |  — |
| **Fundo transparente · 4K** | ✅ **Existem** como apps (`removebg`, `upscale`) — **confirmar** transparência real (alfa) e teto de resolução antes de afirmar em teste técnico | `_credits.js` |
| **Scenes / Styles reutilizáveis** | 🔴 Ausente como entidade | — |
| **Characters** | 🔴 Ausente. Caminho já mapeado: Kling custom elements (3º da varredura fal) | backlog § fal |
| **Juiz no portão do lote** | 🟡 **O juiz existe, a POSIÇÃO não.** `art-review` roda no nó de portão do fluxo e no Assistente — não no ponto de exportação em volume | `art-review.js`, `StudioCanvas.jsx` |
| **Rubrica de scoring** | ✅ **Melhor que a deles**: a nossa é **derivada** do cérebro, não configurada pelo usuário | `art-review.js` + `_brain.js` |
| **Trust Centre (página)** | 🟡 O dossiê existe (`compliance.md`); falta ser **página pública** | — |

**A leitura que isso muda:** a lacuna real não é "eles têm features que não temos".
É que **três coisas nossas estão no lugar errado ou pela metade** — a URL não
alimenta a identidade visual, o lote não tem portão, e o catálogo não entra.

---

## A lição de arquitetura (vale mais que qualquer feature)

**Photoshoots × Images — entrada por cena versus entrada por ideia.**

Eles perceberam que o usuário chega com duas intenções incompatíveis — *"tenho um
produto e preciso dele num cenário"* e *"tenho uma ideia e quero ver"* — e
separaram os fluxos em vez de fazer um formulário universal.

É de graça e é o mais inteligente do produto deles. Encaixa direto na tensão que
já está registrada aqui: *"o usuário de campanha NÃO deveria ver o canvas"*
(decisão em observação, 13/jul). É a mesma percepção, chegando por outro caminho.

---

## A torção — mesma feature, comportamento oposto

O que impede isso de virar cópia é que, na nossa arquitetura, cada item vira
**insumo do cérebro** em vez de biblioteca estática:

- **Scene/Style** — deles é preset salvo; nosso é **cânone**: a cena que produziu
  peça estrelada vira referência da marca, não item de uma lista.
- **Character** — deles é asset; nosso é **elenco aprovado**, que entra no cânone
  pela estrela e reaparece consistente entre campanhas. Com o argumento RGPD
  junto: pessoa sintética, zero direito de imagem.
- **Rubrica** — deles se configura; a nossa se **herda da Estratégia**.
  Configurar rubrica é trabalho; herdar rubrica é mágica. Mesmo campo, argumento
  invertido.
- **Juiz no lote** — copiar a POSIÇÃO, não a feature: é onde o volume dói. A
  diferença que já é nossa é que cada decisão ali **treina**.

---

## O que NÃO copiar

**Os planos self-serve baixos.** Starter de US$ 39 é a arma deles e seria suicídio
nosso: puxa a conversa para preço por imagem, que é exatamente onde perdemos.
Vendemos inteligência com produção inclusa — não o contrário. (Coerente com o
pivô de 12/jul: crédito = repasse, ganho no contrato.)

**A ambição de suíte horizontal de geração.** Cada feature nova precisa passar num
teste: *isso reforça o cérebro ou só aumenta a superfície de produção?* URL
onboarding reforça — alimenta o cérebro. Mais um modelo de vídeo não reforça.

**Competir em benchmark de modelo.** Eles são nº 1 em edição de imagem. Não é o
nosso campo, e disputar ali valida a régua errada — a nossa é convergência
(regens até aprovar), não fidelidade absoluta de pixel.
