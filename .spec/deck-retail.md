# DECK RETAIL — s1ngulr para Hering & Worten
### Deck master de venda enterprise retail · criado 2026-07-14
> Um deck, dois deals: o caso de uso é o mesmo (visual de produto fidedigno, em escala, on-brand).
> Blocos variantes marcados **[HERING]** / **[WORTEN]**. Nas notas: o que falar, não o que está no slide.
> Regra do deck: nunca citar a Fullsix pelo nome na Worten — posicionar contra "o modelo agência".
> Fontes: `produto.md` v7.1 · `precificacao.md` §Benchmark · `features/piloto-hering.md` · memória `project_concorrente_fullsix`.

---

## SLIDE 01 — Capa

# {MARCA}.s1ngulr
**O cérebro da sua marca, operando a criação.**

Visual de produto fidedigno, on-brand e aprovado — em escala, dentro da sua operação.

> **Nota:** abrir com o lockup da marca deles (`hering.s1ngulr` / `worten.s1ngulr`) já montado. O primeiro slide É a demo: a marca deles no centro, não a nossa.

---

## SLIDE 02 — O problema

# O ciclo inverteu. A produção não acompanhou.

- O digital precisa da imagem **antes** do produto existir em estúdio
- Milhares de SKUs × N canais × campanhas semanais = demanda que produção manual não alcança
- Foto de estúdio: **R$50–300 por foto**, semanas de fila
- IA genérica resolve volume — e cria outro problema: **peças fora da marca e produto infiel**

> **[HERING]** usar a dor literal do Rafael: guia de compras precisa de imagem fidedigna a partir de foto no cabide + ficha técnica — antes do estúdio.
> **[WORTEN]** enquadrar em catálogo/campanha: produto-em-contexto para e-commerce, CRM e social, por SKU, toda semana.

---

## SLIDE 03 — A tese

# Gerar imagem virou commodity.
# O que vale é o que a máquina **sabe da sua marca**.

Os modelos de geração são os mesmos para todo mundo — e trocam de líder a cada 3 meses.
A diferença entre volume e valor está em duas coisas que não se compram prontas:

1. **Memória de marca** — o que é (e o que nunca foi) a {MARCA}
2. **Julgamento** — quem aprova, com que critério, antes de qualquer peça aparecer

> **Nota:** este slide desarma tanto o "vamos usar o ChatGPT internamente" quanto a proposta de agência. Os dois têm geração; nenhum tem memória + julgamento da marca.

---

## SLIDE 04 — O que é o s1ngulr

# Não é um gerador de imagens.
# Não é uma agência com IA.
# É a sua marca operando a própria criação.

| | Gerador genérico | Agência com IA | **s1ngulr** |
|---|---|---|---|
| Quem conhece a marca | ninguém | a equipe deles | **o cérebro da {MARCA}** |
| Quem julga cada peça | ninguém | humanos deles, por peça | **o juiz da marca, automático** |
| Quem fica com o aprendizado | — | a agência | **a {MARCA}** |
| Custo por peça | baixo, sem controle | alto, para sempre | **centavos, só o aprovado** |
| Velocidade | instantânea, sem critério | dias/semanas | **minutos, com critério** |

> **Nota:** a coluna "agência com IA" é a Fullsix sem dizer o nome. Na Hering, a coluna vale pro status quo (estúdio + agências).

---

## SLIDE 05 — O cérebro

# Um modelo vivo da sua marca. Que aprende.

- **Ingestão:** manual da marca, referências visuais aprovadas, território, tom de voz, ficha de produto
- **Sinais:** cada aprovação, rejeição, regeneração, edição e parecer vira aprendizado
- **Destilação:** o cérebro versiona — v3, v4, v5… — e cada versão julga e cria melhor que a anterior
- **Prova:** taxa de aprovação por versão, medida no painel — não é promessa, é gráfico

> **Nota:** aqui entra a demo da rede neural viva (IA LOUDR) com dados reais. Frase-chave: "todo uso da sua equipe deixa o sistema mais SEU — o ativo se valoriza com o tempo, não deprecia".

---

## SLIDE 06 — O juiz

# Nenhuma peça sai sem passar pelo julgamento da marca.

- **Diretor de arte embutido:** toda geração recebe parecer — VEREDITO · o que sustenta · o que foge · ajustes
- **Portão nos fluxos:** peça reprovada não segue no processo — corta o ramo sozinha
- **Coerência total:** o sistema não gera o que reprovaria — conceito confrontado com os padrões reprovados da marca ANTES de gerar
- **Modo FIDELIDADE:** julga a peça gerada contra a foto real do produto — estampa, cor, modelagem

> **Nota:** este é o slide que nenhum concorrente consegue copiar. O QA humano de agência revisa por peça e cobra por peça; o juiz julga a peça nº 10.000 com o mesmo rigor da 1ª, em segundos, por centavos.

---

## SLIDE 07 — Fidelidade de produto (o caso retail)

# Da foto no cabide à peça vendável.

**Entrada:** foto simples do produto (cabide/flat-lay) + ficha técnica
**Saídas:** still fiel em contexto · manequim fantasma · **try-on em modelo real** · variações A/B de modelo · close de detalhe

- Try-on validado: **~90% de fidelidade** vestindo a peça REAL a partir da foto no cabide
- Juiz de fidelidade reprova alucinação de estampa/cor antes de você ver
- Produto completo (4 saídas): **≈ R$1–2 de custo de insumo**

> **[HERING]** mostrar o teste real da jaqueta de zodíaco (~90% fiel). É o slide-âncora da conversa com o Rafael.
> **[WORTEN]** adaptar às categorias deles: eletro em contexto de casa, gadget em uso, moda/acessório com try-on. Referência de mercado: cases de agência fazem "600 imagens de 25 referências" — nós fazemos isso num fim de semana, com o juiz no meio.

---

## SLIDE 08 — Como funciona na prática

# Um fluxo, milhares de produtos.

1. **Lote entra** — planilha/CSV ou pasta (foto + ficha por SKU)
2. **Fluxo roda** — template "Guia de Compras": still → fantasma → try-on → close, por produto
3. **Juiz filtra** — modo fidelidade + on-brand; reprovadas nem chegam a você
4. **Fila de aprovação** — sua equipe bate o martelo; cada decisão ensina o cérebro
5. **Biblioteca** — tudo organizado, com trilha completa por peça

Guardas de operação: teto de créditos por lote · custo visível em cada nó · API para integrar ao PIM/e-commerce na fase 2.

> **Nota:** desenhar como pipeline horizontal. A mensagem: "a sua equipe não vira operadora de prompt — ela vira curadora".

---

## SLIDE 09 — Além do visual

# A plataforma inteira vem junto.

O mesmo cérebro que gera e julga a imagem também opera:

- **Inteligência:** escuta do consumidor → insights nomeados · radar de tendências ("como a {MARCA} surfa isso") · dossiê de concorrentes com alerta de colisão de território · síntese de mercado do ciclo
- **Criação:** redação on-brand (7 frameworks) · campanhas · fluxos com agentes · Copiloto com mãos (pede a peça no chat, recebe julgada)
- **Governança:** fila de aprovações · biblioteca · créditos e consumo transparentes

> **Nota:** contraste implícito com proposta de agência: "pelo cheque mensal de um pacote de imagens, a {MARCA} leva a operação completa". Não listar tudo — escolher 3 que conversam com quem está na sala.

---

## SLIDE 10 — Confiança & rastreabilidade

# Cada peça tem certidão.

- **Trilha completa por asset:** que modelo gerou, com que prompt, sob qual versão do cérebro, quais julgamentos passou — auditável a qualquer momento
- **Seus dados são seus:** assets e briefings da {MARCA} **nunca treinam modelos externos**; isolamento por workspace
- **Modelos com licença comercial validada** em toda a stack
- **LGPD:** dados no perímetro, política documentada para jurídico e procurement

> **Nota:** slide-escudo — neutraliza o argumento de compliance do modelo agência ANTES de ser levantado. Pré-requisito: dossiê de compliance pronto (frente 1 do backlog).

---

## SLIDE 11 — Economia

# Pague pelo aprovado. Não pela fábrica.

| Modelo | Custo por visual utilizável | O que você está pagando |
|---|---|---|
| Estúdio tradicional | R$50–300 | logística física |
| Produção de agência com IA + QA humano | **R$600–1.300** (€95–210, mercado 2026) | os humanos entre a IA e você |
| **s1ngulr** | **fração disso — e só a peça APROVADA** | o cérebro e o julgamento da sua marca |

- Geração reprovada = custo nosso (centavos), não seu
- Usuários ilimitados — pague pelo que cria, não por cadeira
- Regeneração custa centavos: revisar deixa de ser um item de contrato

> **Nota:** NÃO cravar preço aqui — ancorar o benchmark e deixar o número para a proposta pós-calibração. A linha de agência cita "mercado 2026" sem nomear ninguém.

---

## SLIDE 12 — Modelo comercial

# Três passos. O primeiro prova; o piloto define o preço.

**1 · PILOTO DE CALIBRAÇÃO** — escopo fechado, preço fixo
Produtos reais seus → lote completo → medimos JUNTOS: taxa de aprovação, fidelidade, custo por peça, tempo de ciclo.

**2 · CONTRATO CALIBRADO** — o piloto define a banda
Preço por **asset aprovado** com bandas de volume + plataforma completa inclusa. Sem surpresa: o número sai da SUA taxa de aprovação medida, não de tabela genérica.

**3 · OPERAÇÃO CONTÍNUA** — o cérebro no meio
Lotes recorrentes, agentes por gatilho, API no seu PIM/e-commerce. E o cérebro cada mês mais seu.

> **Nota:** estrutura espelhada na melhor ideia do modelo agência (calibração define tier) — mas aqui a calibração joga A FAVOR do cliente: quanto melhor o cérebro aprende, mais barata fica a peça. Lá, o humano no meio nunca fica mais barato.

---

## SLIDE 13 — O piloto proposto

# Começamos com as suas peças. Números na mesa em 2 semanas.

- **Entrada:** 5–10 produtos reais (foto atual + ficha técnica)
- **Saída:** o pacote completo por produto (still, fantasma, try-on, close) + parecer do juiz por peça
- **Medimos:** % de fidelidade · % aprovação de marca · custo real por peça · tempo por lote
- **Você recebe:** as peças, o relatório e a proposta de contrato calibrada nos SEUS números

> **[HERING]** este é o F0.3 do protocolo já escrito — o duelo de fidelidade em 3 modelos + try-on. Gatilho: agenda com o Rafael.
> **[WORTEN]** propor com categorias distintas (eletro + acessório + moda) para provar amplitude no mesmo piloto.

---

## SLIDE 14 — Visão

# A marca no meio da operação.

Hoje: o cérebro da {MARCA} criando e julgando dentro do s1ngulr.
Em breve: o mesmo cérebro dentro das SUAS ferramentas — Figma, Canva, seu e-commerce — via API/MCP.
Sempre: aprendendo com cada peça, cada campanha, cada decisão da sua equipe.

**O ativo que você constrói aqui não é um banco de imagens. É a memória criativa da sua marca — e ela é sua.**

> **Nota:** um slide só de visão, curto. Se a conversa estiver técnica, pular direto pro 15.

---

## SLIDE 15 — Fecho

# Vamos ligar o cérebro da {MARCA}?

**01 — Piloto de calibração** · produtos reais, 2 semanas, números na mesa
**02 — Contrato calibrado** · preço por aprovado, definido pelos seus números
**03 — Operação contínua** · a criação com a sua marca no meio

`{MARCA}.s1ngulr`

> **Nota:** fechar pedindo UMA coisa só: a data do piloto e quem manda as peças/fichas.

---

## Apêndice (ter na manga, não apresentar)

- **A1 · Prova de aprendizado:** gráfico taxa de aprovação por versão do cérebro + métrica de convergência (tentativas até aprovação caindo)
- **A2 · Certidão do asset:** print da trilha completa de uma peça real
- **A3 · Stack e segurança:** arquitetura, isolamento por workspace, licenças dos modelos (dossiê de compliance)
- **A4 · Tabela de referência de mercado:** benchmark €95–210/visual de produção com QA humano (usar se pressionarem em preço)
- **A5 · [WORTEN] Objeções prováveis do modelo agência:** "quem assina?" → tier curadoria + fila de aprovação · "IP/GDPR?" → A3 · "e formatos de canal?" → roadmap do motor de formatos (frente 5), entrega faseada no contrato
