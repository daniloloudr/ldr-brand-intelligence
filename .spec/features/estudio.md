# estudio.md — br4ndcode

**Documento vivo · v2 · 2026-08-30 (§12 em 31/08) · Owner: Danilo Silva**
*Especificação do módulo Estúdio: estrutura, fluxos, agentes, juiz e copiloto como camada.*

> **Canônica desde 31/08/2026.** Substitui `features/studio.md`, que desceu para
> [`arquivo/studio-v1-2026-08-31.md`](../arquivo/studio-v1-2026-08-31.md).
> O § 12 (lacunas e de-para com o banco) foi levantado contra o schema real e
> **reordena a construção do § 10 por custo de reversão**.

---

## 0. Sobre este documento

**Não há questões em aberto.** Tudo aqui é direcional e pronto para implementação. Onde houve decisão, ela está escrita como decisão, com o motivo ao lado.

**Escopo:** o módulo **Estúdio**. Estratégia e Inteligência aparecem apenas como blocos fechados no menu — a estrutura interna deles não muda e não é tratada aqui.

**Nenhuma decisão é eterna**, mas revisão é reescrita neste arquivo, com data e motivo — nunca resolvida em conversa paralela.

---

# 1 · A arquitetura

## 1.1 O problema que ela resolve

Os quatro módulos atuais — Estratégia, Inteligência, Estúdio, Copiloto — são apresentados como iguais, mas não são coisas do mesmo tipo. Os três primeiros são **lugares onde se trabalha**; o quarto é um **ator que atravessa os três**.

Enquanto o Copiloto for uma página, ele é um chatbot: o usuário sai do que está fazendo para consultá-lo e volta com a resposta na memória, não no contexto.

A mesma confusão aparecia dentro do Estúdio, onde verbo, contêiner, ator e ferramenta conviviam no mesmo nível: gerar é verbo, campanha é escopo, agente é ator, editor é ferramenta. Quando o topo mistura naturezas, o usuário não consegue prever onde as coisas moram e o código herda a confusão.

## 1.2 A arquitetura

**Três pilares — onde se trabalha**
Estratégia · Inteligência · **Estúdio**

**Duas camadas — quem atua**
**Copiloto**, invocado: o usuário pergunta, ela responde com o contexto do lugar.
**Agentes**, autônomos: ninguém pergunta, eles agem por gatilho ou agenda.

**Um portão — a regra que tudo cumpre**
**O juiz.** Toda peça gerada, por quem quer que seja, recebe parecer antes de chegar ao humano.

> Três lugares, dois atores, um portão.

---

# 2 · O juiz

## 2.1 Parecer, não veredito

O juiz **não decide**. Analisa, emite parecer escrito e entrega ao humano, que aprova, recusa ou corrige. É suporte à decisão, nunca substituição dela.

**A função real é ordenar a fila, não cortá-la.** Sem parecer, mil peças chegam ao time como mil decisões idênticas. Com parecer, chegam ordenadas por atenção necessária.

**Consequência direta:** se o juiz nunca aprovou, um agente também não pode. A regra "agente gera, humano julga" não é permissão — é consequência da natureza do juiz.

## 2.2 O parecer

O juiz sempre analisa toda peça. Não existe geração sem parecer.

**Saída do parecer:**

| Campo | Valor |
|---|---|
| **Veredito** | `aprovado` · `rechecar` · `reprovado` |
| **Texto** | até **300 caracteres**, escrito, explicando o veredito |

**Sem número, sem score.** Não existe constructo validado para converter análise de peça em nota, e inventar um seria precisão falsa. O veredito é categórico e o texto explica.

**Ordenação da fila**, do que exige mais atenção para o que exige menos:

```
1 · reprovado    exige decisão
2 · rechecar     exige olho
3 · aprovado     pode ir em lote
```

## 2.3 O que o juiz verifica

Quatro eixos fixos, mais os customizados.

**Fidelidade** — o que foi inserido continua igual. O insumo não mudou entre gerações: a modelo é a mesma, a peça está correta, os acessórios são os certos. É comparação com o material de entrada.

*É o eixo mais forte em catálogo de varejo, porque é onde a geração falha de um jeito que ninguém percebe até estar publicado.*

**Marca** — atende ao que o cérebro já aprendeu, a partir de aprovações e recusas anteriores.

**Escopo** — atende ao direcional e ao objetivo do escopo. Quando a peça pertence a uma campanha, o objetivo da campanha entra na verificação.

**Execução** — o que foi pedido foi feito. Verificação de instrução cumprida.

**Critérios customizados — opcionais, por fluxo.** O usuário pode declarar o que quer que seja verificado com atenção especial naquele fluxo. Campo vazio por padrão. O juiz analisa a peça de qualquer forma, com os quatro eixos fixos; o customizado adiciona verificação, nunca a substitui.

## 2.4 De onde vem a análise

A avaliação combina:

- **o aprendizado acumulado** da marca: aprovações, recusas e o que delas foi destilado
- **as regras locais do escopo**: objetivo e direcional da campanha, quando houver
- **o material de entrada**: o still, o produto, as referências que alimentaram a geração
- **a instrução dada**: o que foi pedido naquela execução

---

# 3 · A estrutura do Estúdio

## 3.1 O menu

```
┌──────────────────────────────────────────────┐
│  BR4NDCODE            [ Hering ▾ ]           │
├──────────────────────────────────────────────┤
│                                              │
│  ▸ Estratégia                                │
│                                              │
│  ▸ Inteligência                              │
│                                              │
│  ▾ Estúdio                                   │
│      · Criar                                 │
│      · Campanhas                             │
│      · Fluxos                                │
│      · Biblioteca                            │
│                                              │
│  ─────────────────────────────               │
│                                              │
│  ◷ Agentes                                   │
│                                              │
├──────────────────────────────────────────────┤
│  ⌘K  Copiloto                                │
└──────────────────────────────────────────────┘
```

**Estratégia e Inteligência** permanecem como estão. Fora do escopo deste documento.

**Agentes fica fora dos pilares** porque atravessa os três: um agente que checa concorrentes é Inteligência, um que reavalia peças quando o manual muda é Estratégia, um que gera a partir de SKU novo é Estúdio.

**O Copiloto não é item de menu.** É invocado, não visitado: atalho global mais botão persistente e discreto no canto.

**Formato não é menu.** Imagem, vídeo, texto e áudio são escolhas dentro de Criar. Se fossem menu, o Estúdio teria oito itens de topo e a mesma lógica de julgamento replicada quatro vezes.

**O editor não é menu.** É um modo em que se entra a partir de uma peça.

## 3.2 A peça e seus formatos

A unidade de trabalho é a **peça**, em quatro formatos: **imagem, vídeo, texto, áudio**.

São formatos de um mesmo objeto, não quatro entidades. Todos têm as mesmas propriedades: escopo, origem, versão, parecer, julgamento, proveniência.

**Nomenclatura:** o formato de áudio chama-se **Áudio**, nunca "Voz" — tom de voz já existe em Estratégia, e a colisão de nome custa caro depois.

## 3.3 Escopo

Toda peça nasce em um escopo, e só existem dois.

**Marca** — o escopo padrão, permanente. Herda tudo de Estratégia.
**Campanha** — agrupador de informação e definidor de guideline, sob a marca.

**Alinhamento, não uniformidade.** A campanha não precisa repetir o visual da marca; pode ter direcional visual próprio. O que precisa estar alinhado é a **informação**: objetivo, proposta de valor, mensagem e o que está escrito. Campanha com objetivo que contradiz a marca é erro; campanha com outra paleta não é.

**Escopo não é filtro de visualização.** É propriedade da peça, definida no nascimento, que determina quais regras se aplicam a ela.

## 3.4 Criar

A bancada. O usuário escolhe escopo, formato e gera.

Três caminhos de entrada, porque as intenções são incompatíveis e um formulário universal serve mal aos três:

**Do produto** — tenho um SKU e preciso dele em contexto.
**Da ideia** — tenho um conceito e quero ver.
**Do fluxo** — já sei o jeito de fazer, quero rodar de novo.

## 3.5 Campanhas

Lista de escopos. Cada campanha tem ficha com objetivo, proposta de valor, vigência, direcional, peças e fluxos.

**A campanha é agrupador e definidor de guideline. A peça carrega mais informação que a campanha** — ela tem formato, versão, parecer, julgamento e proveniência, que a campanha não tem.

**Ciclo de vida:** `rascunho` → `ativa` → `encerrada`.

### Ao encerrar, o aprendizado fica na campanha

O que a campanha aprendeu permanece nela: **consultável, mas inativo.** Não é descartado e não sobe para a marca.

| | Ativa | Encerrada |
|---|---|---|
| Alimenta o parecer de peça nova | sim | **não** |
| Aparece em busca e consulta | sim | sim |
| Serve ao copiloto quando perguntado | sim | sim, se o usuário citar a campanha |
| Pode ser reaberta | — | sim, voltando a ativa |

**Por quê.** Aprendizado de campanha é datado por natureza: o que funcionou no Natal não é regra em março. Promover automaticamente contaminaria a marca com preferência sazonal; descartar jogaria fora referência histórica.

**Implementação:** o aprendizado é indexado com escopo e vigência. O parecer filtra por escopo ativo; a busca não filtra. Reabrir reativa.

**Como vira regra de marca:** só por caminho manual e explícito, em Estratégia. Não existe promoção automática nem sugerida a partir do encerramento.

## 3.6 Biblioteca

Duas visões sobre o mesmo acervo.

```
BIBLIOTECA
│
├── Peças          todas, filtráveis
│
└── Execuções      agrupadas por rodada
      ├── "Produto em contexto" · 12/09 · 200 peças · agente Foto E-commerce
      ├── "Produto em contexto" · 10/09 · 45 peças · manual (João)
      └── "Banner campanha" · 09/09 · 12 peças · manual (Ana)
```

**A execução é a pasta.** Toda rodada de fluxo — por agente ou manual — cria uma execução que contém as peças que saíram dela. A biblioteca só a exibe.

**Por que execução e não pasta física:** pasta como hierarquia criaria órfãos, porque nem toda rodada vem de agente. Com execução como entidade, a "pasta do agente" vira um filtro, e ganham-se de graça a pasta do fluxo, a da campanha e a do período — sem nenhuma rodada ficar de fora.

**Nome da execução:** auto-gerado a partir de fluxo e data, editável quando o usuário quiser nomear pelo objetivo.

**Filtros:** agente, fluxo, campanha, período, quem disparou, veredito do parecer, estado.

**Fora de escopo:** nenhuma marcação de peça como referência canônica na v1. A biblioteca é acervo, filtro e busca.

## 3.7 O editor

Modo em que se entra a partir de uma peça.

**Decisão de escopo: última prioridade.** A construção de um editor com camadas para imagem e vídeo é a maior linha de esforço deste documento, provavelmente maior que Fluxos, Agentes e Copiloto somados — e é o terreno onde ferramentas horizontais competem por distribuição. **Fica por último, e a decisão de construí-lo ou não é revisitada quando chegar a vez.**

Quando for construído, duas regras não se quebram:

**Toda edição reabre o julgamento.** Peça aprovada que é editada gera versão nova em `gerada`, que recebe parecer e volta para a fila. Se alguém edita e publica, a peça que saiu não é a peça que foi julgada, e a trilha de auditoria mente.

**A edição é versionada, nunca destrutiva.** Cada save gera versão; a original permanece; a trilha registra o que mudou, quando e por quem.

---

# 4 · Papéis e permissões

Dois papéis. Não há mais.

## 4.1 Dono

- Usa tudo o que o utilizador usa
- **Julga peças** — aprova e recusa
- **O julgamento dele treina o cérebro**
- Pode **encaminhar uma decisão do utilizador** para o aprendizado da máquina
- Cria e versiona fluxos
- Promove fluxo a agente, suspende agente, define tetos
- Cria e encerra campanhas
- Configura critérios customizados do juiz

## 4.2 Utilizador

- Cria peças
- Roda fluxos existentes
- Vê a biblioteca e as execuções
- Marca preferência nas peças
- **O julgamento dele não treina o cérebro sozinho**

## 4.3 O encaminhamento

**A regra central de permissão: uso não é julgamento.**

O utilizador trabalha e opina; o cérebro só aprende quando um dono valida. Quando o utilizador marca uma preferência, ela vai para uma fila do dono, que decide se aquilo vira aprendizado.

**Por quê.** Protege o cérebro de ruído e mantém autoridade de marca com quem tem autoridade de marca. Um time de quinze pessoas gera peça; duas ou três definem o que a marca é.

**Implementação:** o julgamento registra sempre quem julgou e o papel. Só julgamento de dono, ou encaminhado por dono, alimenta o aprendizado. O registro do que o utilizador marcou permanece na trilha em qualquer caso.

---

# 5 · Estados da peça

Os estados pertencem à **versão da peça**, não à peça. A peça é a linhagem; a versão é o arquivo.

> **Reescrito em 01/set/2026 (decisão do Danilo, E2).** A versão anterior tinha cinco
> estados e cobria só o ciclo de vida — o que o humano decide. Faltavam os dois estados
> do MOTOR: geração em andamento e geração que falhou. Não é detalhe de implementação:
> ao confrontar com o banco, **37 das 927 gerações estavam em `error`** e nenhuma delas
> tinha estado válido no modelo. Peça que não existe precisa de um lugar tanto quanto
> peça aprovada, senão o de-para inventa um.
>
> **A decisão foi um eixo só, com sete valores** — não dois eixos convivendo em colunas
> separadas. Custo assumido: mistura "o motor está rodando" com "o humano aprovou" num
> campo só. Ganho: uma pergunta, uma coluna, uma consulta — e ninguém precisa lembrar
> qual dos dois eixos olhar para saber se a peça está pronta.

```
   gerando ──┬──▶ gerada ──▶ analisada ──┬──▶ aprovada ──▶ arquivada
             │                           │
             │                           └──▶ recusada ──▶ arquivada
             │
             └──▶ falhou
```

| Estado | O que é | Quem move |
|---|---|---|
| **gerando** | o motor está rodando; ainda não há arquivo | sistema |
| **falhou** | a geração não completou | sistema |
| **gerada** | saiu do motor, ainda sem parecer | sistema |
| **analisada** | tem parecer, está na fila humana | sistema |
| **aprovada** | um dono julgou e liberou | dono |
| **recusada** | um dono julgou e barrou | dono |
| **arquivada** | fora de circulação, preservada | dono |

**Os dois primeiros são do MOTOR, os cinco seguintes são do CICLO DE VIDA.** A distinção
não desaparece por morarem na mesma coluna — ela deixa de precisar de duas colunas.

**`falhou` é terminal e não é `recusada`.** Peça que não saiu não é peça que o humano
barrou, e confundir as duas envenenaria o aprendizado: `recusada` é o sinal mais forte
que a marca tem, e diluí-lo com erro de infraestrutura ensinaria a marca a evitar o que
o provedor não conseguiu desenhar naquele dia.

**Não existe estado "publicada".** A publicação acontece fora da plataforma: a peça sai para finalização e postagem em outro lugar. Registrar um estado que não se controla criaria dado falso.

**Regras:**

- `gerando` e `gerada` são transitórios: toda peça que completa recebe parecer.
- `falhou` é terminal. Reprocessar cria **versão nova** em `gerando`, não reabre a antiga.
- Editar cria **versão nova** em `gerada`. A versão anterior mantém seu estado e seu histórico.
- `recusada` nunca é apagada. É o sinal mais forte de aprendizado.
- `arquivada` tira de circulação sem apagar. Reversível.
- **Só o ciclo de vida conta para a fila e para o aprendizado.** `gerando` e `falhou` não
  entram na fila do §2.2 nem viram sinal para a destilação.

---

# 6 · Modelo de dados

As entidades e como se ligam. Campos essenciais, não exaustivos.

## 6.1 Entidades

**Marca** — o tenant. Contém tudo. Nada atravessa marcas.

**Campanha** — `marca`, nome, objetivo, proposta de valor, vigência, direcional, estado (`rascunho`/`ativa`/`encerrada`).

**Peça** — a linhagem. `marca`, `campanha` opcional, formato, `execução` opcional, criada em, criada por.

**Versão da peça** — o arquivo. `peça`, número da versão, arquivo, estado, criada em, criada por, o que mudou.

**Fluxo** — a receita. `marca`, `campanha` opcional, nome, versão, variáveis do fluxo, definição das variáveis do produto, formatos de saída, critérios customizados do juiz (opcional), estado.

**Execução** — a rodada. `fluxo`, versão do fluxo, `agente` opcional, disparada por (pessoa ou agente), gatilho, iniciada em, concluída em, variáveis do lote, custo, contagem por veredito.

**Agente** — `fluxo`, gatilho, escopo, `dono`, tetos (execuções por janela, crédito por ciclo), estado (`ativo`/`suspenso`).

**Parecer** — `versão da peça`, veredito (`aprovado`/`rechecar`/`reprovado`), texto até 300 caracteres, eixos verificados, gerado em.

**Julgamento** — `versão da peça`, decisão (`aprovar`/`recusar`), `usuário`, papel do usuário, se treina o cérebro, motivo opcional, modo (`individual`/`lote`), decidido em.

**Usuário** — `marca`, papel (`dono`/`utilizador`).

## 6.2 As ligações que importam

```
Marca
 ├── Campanha ──────┐
 ├── Fluxo ─────────┼── Execução ──── Peça ──── Versão ──┬── Parecer
 ├── Agente ── Fluxo┘                                     └── Julgamento
 └── Usuário
```

- Uma **peça** tem muitas **versões**. Cada versão tem **um parecer** e **zero ou um julgamento**.
- Uma **execução** tem muitas **peças**. Uma **peça** pertence a **zero ou uma execução** — peça criada à mão não tem.
- Um **fluxo** tem muitas **execuções**. Um **agente** tem **um fluxo**.
- **Campanha** é opcional em peça e em fluxo. Sem campanha, o escopo é a marca.

## 6.3 A pergunta que este modelo responde

Seis meses depois, alguém abre uma peça e pergunta de onde ela veio.

Com a **execução** como entidade, ela responde: veio do fluxo "Produto em contexto" versão 3, disparado pelo agente Foto E-commerce na terça, junto com outras 199, com este parecer e este julgamento, e depois foi editada duas vezes.

Sem ela, a peça é órfã e a trilha de auditoria não fecha.

---

# 7 · Fluxos

## 7.1 A origem

**O que a Hering aprovou não foi uma peça. Foi um processo.** Este tipo de produto, neste tipo de cena, com este enquadramento e esta luz.

Se isso vive como prompt colado num campo de texto, não escala, não se audita e não aprende. Como objeto versionado, cada rodada reforça a própria receita.

## 7.2 As três camadas de variável

**A parte que decide se o fluxo escala.** Se as três moram no mesmo campo, cada rodada é um prompt novo, o aprendizado não acumula e não há como atribuir acerto.

**Do produto** — vêm do catálogo, preenchem sozinhas por SKU: still, categoria, cor, material, dimensões.

**Do fluxo** — a receita, fixas: cenário, enquadramento, luz, estilo, formato de saída. **É isto que a Hering aprovou.**

**Do lote** — mudam a cada rodada: quais SKUs, qual campanha, qual data.

**Por que separar:** com as camadas distintas, é possível atribuir o resultado. Foi a receita que funcionou, ou aquele produto específico? Sem separação, toda aprovação é ruído.

## 7.3 O fluxo herda o escopo

O mesmo fluxo rodado em campanhas diferentes produz resultados diferentes, porque o direcional herdado muda. É feature, não efeito colateral.

## 7.4 O batch

Batch é **um fluxo rodado sobre um conjunto**.

```
Fluxo  ×  Lote de SKUs
      ↓
  Execução criada
      ↓
  N peças geradas
      ↓
  juiz emite parecer em cada uma
      ↓
  fila ordenada: reprovado → rechecar → aprovado
      ↓
  aprovar em lote o que está aprovado
  olhar caso a caso o resto
```

### O peso do julgamento

**Aprovação em lote pesa menos que individual.** Aprovar duzentas peças com um clique é confirmação da receita, não julgamento de cada peça. Se pesassem igual, o cérebro aprenderia que quase tudo está ótimo.

**Recusa dentro de um lote pesa mais.** A pessoa parou, olhou e discordou.

| Ação | Alimenta o cérebro | Alimenta o histórico do fluxo |
|---|---|---|
| Aprovação em lote | não | sim |
| Aprovação individual | sim | sim |
| Recusa, individual ou em lote | sim | sim |

**Implementação:** o julgamento grava o modo (`individual`/`lote`) e a flag de treino. Aprovação em lote grava `treina = falso`; recusa grava `treina = verdadeiro` sempre.

---

# 8 · Agentes

## 8.1 O que é

A camada autônoma. Executa **um** fluxo por gatilho ou agenda.

**Um agente, um fluxo.** Orquestração de vários fluxos fica fora de escopo: exige estado entre passos, tratamento de falha parcial e retomada — outra ordem de complexidade, que só se paga com o modelo simples estável e em uso. Composição, quando vier, acontece **dentro** do fluxo.

## 8.2 A promoção: peça → fluxo → agente

Nada nasce automático. Toda promoção é ato humano, explícito e reversível.

**Degrau 1 · Peça vira fluxo.** Quando uma peça dá certo e o jeito de fazer merece se repetir, o dono promove: as instruções viram receita e as três camadas de variável são separadas nesse momento. **É onde a Hering está.**

**Degrau 2 · Fluxo vira agente.** **Promoção sempre manual, sem critério automático de elegibilidade.**

Qualquer fluxo pode ser promovido a qualquer momento por um dono. O sistema **não** bloqueia por taxa de aprovação, **não** sugere candidatos e **não** exige mínimo de execuções.

**Por quê.** Limiar automático seria régua inventada antes de existir dado real. Régua errada trava fluxo bom ou libera fluxo ruim, sem ninguém ter decidido nenhum dos dois. Quem conhece o fluxo é quem o roda.

**O que o sistema faz:** mostra o histórico na tela de promoção, como informação.

```
┌──────────────────────────────────────────────┐
│  Promover a agente                           │
│  Fluxo "Produto em contexto" · v3            │
├──────────────────────────────────────────────┤
│  Execuções               42                  │
│  Aprovadas na 1ª          78%                │
│  Recusa mais comum        fundo saturado     │
│  Última versão            v3, há 6 dias      │
├──────────────────────────────────────────────┤
│  Gatilho    [ escolher ]                     │
│  Dono       [ escolher ]                     │
│  Tetos      [ execuções · crédito · janela ] │
│                                              │
│              [ Cancelar ]  [ Promover ]      │
└──────────────────────────────────────────────┘
```

**Requisito:** o botão de promover está **sempre habilitado**. O histórico é informação, nunca condição.

## 8.3 Suspensão

**Manual, a qualquer momento, por um dono.** Suspender não apaga: histórico, versões e execuções permanecem, e o agente pode ser reativado.

**Não existe suspensão automática por degradação.** Pelo mesmo princípio: a máquina informa, a pessoa decide. O sistema **alerta o dono** quando a taxa de aprovação cai de forma relevante entre versões; suspender é decisão dele.

## 8.4 Gatilhos: os três estágios

**Manual.** Alguém roda o fluxo quando quer. Não é agente — é o fluxo sendo usado. **É onde a Hering está hoje.**

**Local.** O gatilho nasce dentro do produto. Vocês controlam o evento, então controlam a confiabilidade. **É onde a camada agêntica deve nascer.**

| Gatilho local | Pilar que atravessa |
|---|---|
| SKU novo no catálogo | Estúdio |
| Manual de marca atualizado → reavaliar peças aprovadas | Estratégia |
| Campanha criada → gerar o kit inicial | Estúdio |

**Capturado.** O gatilho vem de fora: webhook do e-commerce, mudança detectada em concorrente, alerta de escuta.

**O salto do local para o capturado é o perigoso, porque evento externo não tem contrato.** O sistema do cliente muda um campo, dispara duzentas vezes, ou para de disparar sem avisar.

**Três pré-requisitos antes de existir gatilho capturado:**

1. **Idempotência.** O mesmo evento recebido duas vezes não gera duas execuções.
2. **Teto por janela.** Limite rígido por período, independente de quantos eventos cheguem.
3. **Detecção de silêncio.** Alerta quando um agente para de receber evento. **Agente que morre em silêncio é pior que agente que erra alto**, porque ninguém percebe até a falta fazer falta.

## 8.5 A página do agente

Cada agente tem página própria. É a prestação de contas dele.

```
┌────────────────────────────────────────────────────┐
│  AGENTE · Foto de produto · e-commerce             │
│  Escopo: Hering        Dono: [nome]                │
│  Status: ativo         Desde: 12/09                │
├────────────────────────────────────────────────────┤
│  EXECUTA    Fluxo "Produto em contexto" · v3       │
│  GATILHO    SKU novo no catálogo                   │
│  LIMITES    50 execuções/dia · teto de crédito     │
├────────────────────────────────────────────────────┤
│  DESEMPENHO                                        │
│  Aprovação na 1ª tentativa   [gráfico no tempo]    │
│  Execuções no período                              │
│  Peças na fila agora                               │
│  Custo acumulado                                   │
│                                                    │
│  RECUSAS MAIS COMUNS                               │
│  · motivo, com frequência                          │
├────────────────────────────────────────────────────┤
│  EXECUÇÕES                                         │
│  data · gatilho · peças · vereditos · custo        │
└────────────────────────────────────────────────────┘
```

**As recusas recorrentes são o bloco mais valioso da página.** É o que aponta a correção da próxima versão do fluxo.

## 8.6 As regras duras

1. **Agente gera. Humano julga.** Sempre.
2. **Um agente, um fluxo.**
3. **Agente opera dentro de um escopo.** Nunca atravessa marcas.
4. **Agente tem teto** de execuções por janela e de crédito por ciclo. Agente sem teto é conta inesperada.
5. **Agente tem dono.** Uma pessoa nomeada responde por ele, e a fila cai para ela.
6. **Degradação gera alerta, nunca suspensão automática.**
7. **Toda execução é auditável:** fluxo, versão, gatilho, peças, vereditos, custo.

---

# 9 · Copiloto como camada

## 9.1 O que muda

Deixa de ser página. Passa a ser **invocável de qualquer lugar**, sempre com o contexto do lugar onde foi chamado.

## 9.2 O contexto é o que dá valor

| Onde é invocado | O que sabe | O que consegue fazer |
|---|---|---|
| Criar | escopo, formato, produto em tela | sugerir direção, escrever o pedido, disparar geração |
| Sobre uma peça | a peça, o parecer, o histórico | explicar o parecer, propor correção |
| Campanha | objetivo, vigência, direcional | avaliar aderência, sugerir desdobramento |
| Biblioteca | o acervo e as execuções | encontrar referência, comparar com anteriores |
| Fluxos | a receita e o histórico dela | explicar desempenho, sugerir ajuste |
| Agentes | gatilho, execuções, recusas comuns | explicar comportamento, propor nova versão do fluxo |

**Sem contexto é chatbot. Com contexto é a marca respondendo.**

## 9.3 Comportamento

- **Invocação:** atalho global e botão persistente discreto no canto.
- **Painel lateral**, nunca modal — o usuário precisa ver o que está fazendo.
- **Contexto declarado e editável:** o painel mostra sobre o que está falando ("Campanha Verão · peça #142"); o usuário pode ampliar ou reduzir.
- **Ação com confirmação.** Propõe; o usuário confirma. Nada executa sozinho.
- **Toda peça gerada pelo copiloto entra pelo mesmo caminho:** escopo, parecer, fila. Sem atalho.
- **Continuidade por escopo.** Mudou de marca, mudou de conversa.

## 9.4 O que nunca faz

Julgar peça. Alterar Estratégia sem confirmação explícita. Agir fora do escopo em que foi invocado. Atravessar marcas.

---

# 10 · Ordem de construção

| # | O quê | Por quê |
|---|---|---|
| 1 | **Modelo de dados** — peça, versão, fluxo, execução, parecer, julgamento | tudo depende |
| 2 | **Estados da versão** | define o ciclo inteiro |
| 3 | **Papéis dono/utilizador + encaminhamento** | governa quem treina o cérebro |
| 4 | **Fluxo como objeto versionado + três camadas de variável** | destrava a Hering |
| 5 | **Juiz: parecer com veredito e texto** | é o portão |
| 6 | **Batch + fila ordenada + execução como pasta** | a entrega concreta da PoC |
| 7 | **Pesos de julgamento (lote × individual)** | evita envenenar o cérebro |
| 8 | **Promoção peça → fluxo** | o primeiro degrau |
| 9 | **Biblioteca: peças e execuções** | onde tudo aparece |
| 10 | **Campanha como escopo** | pedido estrutural da Worten |
| 11 | **Copiloto contextual** | maior ganho de uso percebido |
| 12 | **Promoção fluxo → agente + gatilho local + página do agente** | a camada agêntica |
| 13 | **Gatilho capturado** | exige idempotência, teto e detecção de silêncio |
| 14 | **Editor** | maior esforço do documento; decisão de construir é revisitada aqui |

**A regra de sequência que não se inverte: Fluxos antes de Agentes.** Agente sem fluxo versionado é automação de prompt solto, e isso não se audita.

---

# 11 · Resumo das decisões

| # | Decisão |
|---|---|
| D1 | Três pilares, duas camadas (Copiloto, Agentes), um portão (juiz) |
| D2 | O juiz dá parecer, não veredito. Ordena a fila, nunca corta |
| D3 | Parecer = veredito (`aprovado`/`rechecar`/`reprovado`) + texto de até 300 caracteres. Sem número |
| D4 | O juiz verifica quatro eixos fixos: fidelidade, marca, escopo, execução |
| D5 | Critérios customizados são opcionais por fluxo e adicionam, nunca substituem |
| D6 | O juiz sempre analisa toda peça. Não há geração sem parecer |
| D7 | Copiloto é invocável de qualquer lugar. Não é página |
| D8 | Agentes ficam fora dos pilares, porque atravessam os três |
| D9 | Estúdio tem quatro itens: Criar, Campanhas, Fluxos, Biblioteca |
| D10 | Formato é escolha dentro de Criar, não item de menu |
| D11 | A peça tem quatro formatos: imagem, vídeo, texto, áudio |
| D12 | Escopo é propriedade da peça: marca ou campanha |
| D13 | Campanha exige alinhamento de informação, não de visual |
| D14 | Aprendizado de campanha encerrada fica nela, consultável e inativo |
| D15 | Cinco estados na versão: gerada, analisada, aprovada, recusada, arquivada |
| D16 | Não existe estado "publicada" — a publicação acontece fora da plataforma |
| D17 | Dois papéis: dono e utilizador. Só julgamento de dono treina o cérebro |
| D18 | O dono pode encaminhar a marcação do utilizador para o aprendizado |
| D19 | A execução é a entidade que agrupa uma rodada. A biblioteca a exibe como pasta |
| D20 | Fluxo é objeto versionado com três camadas de variável separadas |
| D21 | Aprovação em lote não treina o cérebro; recusa treina sempre |
| D22 | Um agente executa um fluxo. Sem orquestração |
| D23 | Promoção a agente é sempre manual, sem critério automático |
| D24 | Suspensão é manual. Degradação gera alerta, nunca suspensão |
| D25 | Teto por agente: execuções por janela e crédito por ciclo |
| D26 | Gatilho capturado exige idempotência, teto e detecção de silêncio |
| D27 | Editor é última prioridade; construir ou não é revisitado na vez dele |
| D28 | Sem marcação de referência canônica na biblioteca na v1 |

---

# 12 · Lacunas: o de-para com o banco que existe

> Levantado em 31/08/2026 contra o schema real (migrations 018–053). Este capítulo
> não decide produto — mede distância. Ele existe porque **a linha que separa o que
> precisa de migration do que não precisa é a linha que decide a ordem de
> construção**, e ela não coincide com a ordem do §10.

## 12.1 O critério de corte

Quatro faixas, por custo de reversão — não por tamanho de código:

| Faixa | O que é | Se der errado |
|---|---|---|
| **A · sem banco** | frontend e functions | `git revert` + redeploy |
| **B · migration aditiva** | tabela nova, ou coluna nova anulável | drop da tabela / da coluna; nada existente muda de sentido |
| **C · migration com backfill** | dado que existe precisa ser transformado | restore de dump; a janela entre migration e correção é dado de cliente errado na tela |
| **D · substituição de conceito** | dado que existe passa a **significar outra coisa** | restore, e ainda assim alguém já leu o número errado |

A regra que sai disso: **A e B podem subir a qualquer momento e em qualquer ordem.
C e D exigem janela, dump pré-migration e `guarda:esquema`** — e cada um deles é uma
release própria, nunca de carona.

## 12.2 O que JÁ existe e o documento pode assumir de graça

Antes das lacunas, o que não é lacuna. Cerca de 40% da fundação está de pé:

| §  do doc | Já existe | Onde |
|---|---|---|
| §2 o juiz | ✅ com `criterio` customizado (D5) e eixo de fidelidade (D4) | `art-review.js` |
| §4 dono × utilizador | ✅ `pode_aprovar_pecas`, `pode_aprovar_aprendizado` | migration 052 |
| §4.3 "uso não é julgamento" | ✅ a capacidade existe separada do papel | migration 052 |
| §7 fluxo como objeto | 🟡 existe, sem versão nem camadas de variável | `studio_workflows` |
| §7.4 batch | 🟡 fan-out existe no modo `adapt` | `_studio.js` |
| "treina o cérebro" | ✅ sinal → destilação → dataset, com pesos | `brand_signals`, `brand_dataset` |
| §8.6.4 teto de crédito | ✅ débito e refund por geração | `_credits.js` |
| §3.6 biblioteca | 🟡 pastas e tags; falta a visão de execução | `pasta` em generations e pecas_escritas |
| §9 copiloto com ação confirmada | ✅ tools + portão de confirmação | `BrandAssistant` |

**`custo_estimado` é o caso mais barato do documento inteiro: a coluna já existe em
`studio_generations` e nunca é escrita.** O teto de crédito por agente (D25) e o campo
`custo` da execução (§6.1) dependem dela. Fechar isso é **faixa A** — não precisa de
migration nenhuma, só passar a gravar.

## 12.3 Faixa A — constrói sem tocar no banco

| Item do doc | O que é |
|---|---|
| §3.1 menu novo (Criar · Campanhas · Fluxos · Biblioteca; Agentes fora; Copiloto invocável) | navegação e shell |
| §3.4 três caminhos de entrada em Criar | UI sobre o que já gera |
| §2.2 formato do parecer: veredito + 300 caracteres, sem score | prompt e retorno do `art-review.js` |
| §2.3 os quatro eixos fixos | prompt do juiz |
| §9 Copiloto como camada, painel lateral, contexto declarado e editável | UI + composição de contexto |
| §9.4 o que nunca faz | guardas no system prompt e nas tools |
| D10 formato é escolha dentro de Criar | UI |
| **gravar `custo_estimado`** | a coluna já existe |

**Isto é metade da percepção de mudança do documento e não custa uma migration.**
O menu novo e o Copiloto contextual são o que o cliente vê primeiro, e nenhum dos dois
depende do modelo de dados.

## 12.4 Faixa B — migration aditiva, risco baixo

Tabelas que **não existem**. Nascer é aditivo: nada que já está gravado muda de sentido.

| Entidade | Estado hoje | Observação |
|---|---|---|
| **`parecer`** | ❌ **não é persistido em lugar nenhum** | o `art-review.js` devolve o parecer e emite sinal `art_review` — não faz `insert`. Sem esta tabela, a fila ordenada do §2.2 não tem de onde ler |
| **`execucao`** | ❌ não existe | backfill é **opcional**: o próprio doc diz que peça criada à mão não tem execução, então nulo é legítimo para todo o histórico |
| **`agente`** | ❌ não existe | nada hoje se parece com isso |

Colunas novas, anuláveis ou com default:

| Tabela | Colunas | Para |
|---|---|---|
| `studio_workflows` | `versao`, `variaveis_fluxo`, `variaveis_produto`, `criterios_juiz` | §7.2 três camadas · D20 · D5 |
| `studio_campaigns` | `objetivo`, `proposta_valor`, `vigencia_inicio`, `vigencia_fim`, `direcional` | §3.5 |

⚠️ **A tabela `parecer` é aditiva, mas torná-la obrigatória (D6) não é.** A migration é
barata; a consequência — uma chamada multimodal por peça gerada, síncrona, em todo lote —
é o item não precificado do documento. Medir antes de prometer.

## 12.5 Faixa C — migration com backfill, risco médio-alto

Aqui o dado existe e precisa ser **transformado**. Cada linha destas é uma release
própria, com dump antes e `guarda:esquema` obrigatório.

### C1 · Peça × Versão — a migration mais cara do documento

Hoje `studio_generations` é **plano**: uma linha por geração, sem linhagem e sem versão.
O §5 e o §6 pedem `peca` (a linhagem) + `versao_peca` (o arquivo).

**Backfill:** cada geração vira 1 peça + 1 versão `v1`. Mecânico, mas o volume é todo o
histórico de todos os clientes.

**O custo real não é a migration — é o raio de alcance.** Todo caminho que hoje lê
`studio_generations` passa a ler duas tabelas: canvas (semeadura de outputs, preview,
voto, salvar), biblioteca, campanhas, `/admin` → Custos e Cérebros, `finalizeGeneration`,
`studio-webhook`, `studio-poll-background`, `diagnostico-reaper`. É a entidade central do
módulo.

**Consequência de ordem:** D19 (execução como pasta), §5 (estados), §7.4 (peso do
julgamento) e §3.7 (edição versionada) **todos dependem desta**. Ela é o gargalo real do
§10, não o passo 1 genérico "modelo de dados".

### C2 · Estados — hoje há dois eixos numa coluna só

`studio_generations.status` é `processing | done | error`. Isso é **estado de execução**,
não ciclo de vida. Os cinco estados do §5 (`gerada`, `analisada`, `aprovada`, `recusada`,
`arquivada`) são outro eixo.

De-para possível:

| Hoje | Vira |
|---|---|
| `done` + `feedback='up'` | `aprovada` |
| `done` + `feedback='down'` | `recusada` |
| `done` sem feedback | `analisada` se houver parecer; senão `gerada` |
| `processing` | **não tem lugar no modelo do doc** |
| `error` | **não tem lugar no modelo do doc** |

✅ **DECIDIDO em 01/set (E2): um eixo só, com sete valores.** O §5 foi reescrito e passa
a incluir `gerando` e `falhou`. O de-para fica:

| Hoje | Vira |
|---|---|
| `processing` | `gerando` |
| `error` | `falhou` |
| `done` + `feedback='up'` | `aprovada` |
| `done` + `feedback='down'` | `recusada` |
| `done` + tem parecer | `analisada` |
| `done` sem nada | `gerada` |

Medido no banco antes de decidir: 890 `done`, 37 `error`, 0 `processing`. Os 4% em
`error` eram exatamente as linhas sem lugar no modelo antigo.

### C3 · Julgamento como entidade

Hoje é `feedback` ('up'|'down') + `feedback_at`, **colunas na geração**. Falta tudo o que
o §4.3 e o §7.4 exigem: quem julgou, o papel de quem julgou, o modo (`individual`/`lote`)
e a flag `treina`.

**Backfill:** os feedbacks existentes viram julgamentos **sem autor** — `usuario` nulo,
`papel` desconhecido, `treina` indefinido. Dado histórico degradado, mas preservável, e é
honesto que fique explícito em vez de ser inventado.

**Por que isso importa mais do que parece:** D21 diz que aprovação em lote **não** treina.
Sem a coluna `modo`, o primeiro lote de 200 peças aprovado com um clique entra no
`brand_dataset` como 200 aprovações individuais. **Este repo já foi envenenado uma vez por
dado que entrou sem julgamento** (a escuta, jul/2026, 122 eventos inventados que ainda
estão na memória de três marcas). C3 tem que estar de pé **antes** do batch do §7.4, não
depois — o §10 coloca o batch no passo 6 e os pesos no 7, e essa ordem é perigosa.

### C4 · Texto como formato da mesma peça

`pecas_escritas` é tabela separada, com forma própria (`titulo`, `conteudo`, `origem`,
`pasta`). D11 diz que texto é formato da peça, não outra entidade. Unificar é backfill
sobre dado real de cliente, e a Biblioteca lê as duas hoje.

**Alternativa mais barata a considerar:** manter `pecas_escritas` e dar a ela as mesmas
propriedades (versão, parecer, julgamento) por referência polimórfica, em vez de fundir.
Perde-se elegância, ganha-se uma migration inteira. Decisão de produto, não de banco.

⏸️ **ADIADO em 01/set (E2), com motivo medido — não é indecisão.** Antes de escolher a
modelagem, medimos o uso do formato texto:

| | |
|---|---|
| peças escritas salvas | **6**, todas `carrossel`, a última em 19/ago |
| imagens no mesmo período | **800** |
| `writing_edit` (o time reescrevendo copy) | **1** |

Texto tem **0,7% do volume de imagem**, usa um framework de sete, e quase ninguém edita o
que sai. Fundir custa a faixa mais cara do documento (migration com backfill) para dar
versão, parecer e julgamento a um caminho que produziu seis peças em dois meses; manter
separado com referência polimórfica duplica a lógica de julgamento **para sempre**, pelo
mesmo motivo.

**Gatilho para revisitar:** volume de texto passar de ~10% do de imagem, OU alguém pedir
parecer sobre copy. Antes disso, a pergunta certa não é como modelar — é **por que
Redação não pegou**: sete frameworks disponíveis, um usado.

⚠️ **C4 NÃO bloqueia o C1/E3.** Quem bloqueava era o C2, e ele está decidido.

## 12.6 Faixa D — substituição de conceito, risco alto

### D1 · Campanha significa outra coisa hoje

| | `studio_campaigns` hoje | Campanha no §3.5 |
|---|---|---|
| O que é | um **job de produção** (brief + formatos + fan-out) | um **escopo** (objetivo, vigência, direcional) |
| Campos | `conceito`, `formatos`, `workflow_id`, `hero_generation_id`, `adapt_started` | objetivo, proposta de valor, vigência, direcional |
| Estados | `rascunho \| gerando \| concluida \| aprovada` | `rascunho \| ativa \| encerrada` |

**Os estados colidem de frente.** `gerando` e `concluida` descrevem produção; `ativa` e
`encerrada` descrevem vigência de escopo. E o motor de fan-out (`onGenerationSettled` em
`_studio.js`) **lê esses estados para decidir despachar as adaptações** — mudar o
vocabulário quebra a geração de campanha em produção.

Não se estende: substitui. E exige decidir, campanha a campanha, o que cada registro
existente vira.

### D2 · Aprendizado com escopo e vigência

§3.5 decide que campanha encerrada **não alimenta parecer de peça nova**, mas continua
consultável. Hoje `brand_signals` e `brand_dataset` **não têm escopo de campanha nem
vigência** — o destilador lê todo sinal com `consumido_em is null`, sem noção de escopo.

Implementar isso significa:
1. escopo e vigência no sinal e no exemplo do dataset (aditivo, faixa B);
2. **o filtro por escopo ativo dentro da destilação** — e isso é `_brain.js`, que é
   **núcleo**. Commit separado, com justificativa escrita, `npm run guarda` e
   `guarda:ao-vivo` antes de subir (ver `nucleo-ia.md`).

É a única parte do documento que atravessa o núcleo de inteligência.

## 12.7 O que o documento não modela

Lacunas da spec, levantadas ao confrontar com o código. Nenhuma invalida o documento;
todas custam decisão antes da implementação.

1. **Geração em andamento e geração que falhou** (ver C2). Os cinco estados não as cobrem.
2. **Falha do juiz.** D6 diz que não existe geração sem parecer. E quando o juiz falhar —
   timeout, 429, saldo? A peça fica presa em `gerada` para sempre, ou existe um estado de
   parecer indisponível? Hoje o `art-review` é opcional, então falhar é inofensivo;
   obrigatório, vira caminho crítico.
3. **Custo e latência do juiz obrigatório.** Uma chamada multimodal por peça, síncrona.
   Num lote de 200, são 200 chamadas extras. Não aparece no documento.
4. **Áudio não existe no código.** D11 lista áudio como par de imagem, vídeo e texto —
   não há provedor, TTS, storage de áudio nem player. É integração inteira, tratada como
   formato gratuito.
5. **`media_type`** hoje é `image | video`. Texto está em outra tabela; áudio em lugar
   nenhum. Os "quatro formatos do mesmo objeto" são hoje três lugares diferentes.

## 12.8 O que isso muda na ordem de construção

O §10 ordena por dependência conceitual. Esta análise ordena por **custo de reversão**, e
as duas não coincidem:

| Fase | O quê | Faixa | Por quê nesta ordem |
|---|---|---|---|
| **0** | gravar `custo_estimado` · menu novo · parecer com veredito+texto · Copiloto contextual | **A** | metade da percepção de mudança, zero migration, reversível com revert |
| **1** | `parecer` · `execucao` · `agente` · colunas novas em fluxo e campanha | **B** | tabela nova não quebra o que existe; a partir daqui a fila ordenada e a proveniência funcionam |
| **2** | **decidir os dois eixos de estado** (C2) e o destino de `pecas_escritas` (C4) | — | decisão, não código. Bloqueia a fase 3 |
| **3** | peça × versão (C1) + estados (C2) + julgamento (C3), **juntos** | **C** | são a mesma migration na prática; separar cria janelas onde metade do módulo lê o modelo velho |
| **4** | campanha como escopo (D1) | **D** | precisa do fan-out desacoplado dos estados antes |
| **5** | escopo e vigência no aprendizado (D2) | **D + núcleo** | último, porque toca `_brain.js` |
| **6** | agentes, gatilho local, gatilho capturado | B (já criado na 1) | o §10 está certo: fluxos antes de agentes |
| **7** | editor | — | o próprio doc adia e manda revisitar |

**Duas inversões em relação ao §10, e as duas por segurança de dado:**

- **Os pesos de julgamento (§10 passo 7) sobem para junto do batch (passo 6), não depois.**
  Batch aprovando em lote sem a coluna `modo` envenena o cérebro no primeiro uso, e o
  estrago não se desfaz apagando linha — a memória destilada já incorporou.
- **C1+C2+C3 são uma release, não três.** Peça/versão sem estado novo, ou estado novo sem
  julgamento, deixa o módulo lendo dois modelos ao mesmo tempo.

