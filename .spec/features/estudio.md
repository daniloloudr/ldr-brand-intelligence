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

## 7.5 A unificação do lote (03/set/2026)

O backlog registrou em 31/ago que "batch de produtos por SKU" estava escrito em **três
lugares com nomes diferentes**, e parou a implementação até alguém unificar. Feita a
leitura das três (mais duas que ninguém tinha contado), o diagnóstico muda:

**Não eram três desenhos concorrentes. Era UM motor, DUAS entradas, e um eixo diferente
arquivado com o nome errado.**

| Origem | O que pedia | Veredito |
|---|---|---|
| **§7.4** (esta spec) | fluxo × conjunto → execução → parecer → fila ordenada | ✅ **é o MOTOR — manda** |
| **F2 Hering** (backlog) | CSV/planilha/pasta do Drive → fila com progresso + teto | ✅ **é a ENTRADA** do motor, não outro motor |
| **SLIDE 08** (`deck-retail.md`) | os 5 passos já VENDIDOS ao cliente | ✅ o mesmo motor + a mesma entrada, em linguagem comercial — **é o contrato** |
| **F3 Studio** (backlog) | "nó de lote" DENTRO do fluxo | ❌ **perde** — contradiz o §7.4 |
| **R4 Worten** (backlog) | 1 peça × N formatos, com preview | ⚠️ **não é lote** — é outro eixo |

### Decisão 1 · o lote é EXECUÇÃO, não NÓ

E não é questão de gosto: **`execucao.variaveis_lote` já existe em produção** (E1 · 054,
aplicada 01/set) e codifica exatamente o §7.4. O "nó de lote" do F3 colocaria a iteração
**dentro** do grafo, e aí a execução perde a unidade — não daria para dizer *"esta rodada
custou X e teve Y aprovadas"*, porque a rodada seria uma só com N ramos internos.

O §7.2 exige as três camadas separadas, e **a camada "do lote" só existe se o lote for a
rodada**. Um nó dissolveria a camada que a spec criou para poder atribuir resultado.

### Decisão 2 · o R4 sai da conversa de lote

`N produtos × 1 fluxo` **não é** `1 peça × N formatos`. São dois fan-outs em eixos
diferentes, e chamar os dois de "lote" foi o que criou a ilusão de três specs.

O R4 já está meio construído por outro caminho (nó **Recortar** a 0 crédito + template
"1 peça → 6 formatos"). Ele volta para a fila dele, como **fan-out de formato**.

### O risco de ordem já foi pago

A §10 deste documento avisava que os pesos de julgamento (`modo`, `treina`) tinham que
estar de pé **antes** do batch — senão o primeiro lote de 200 peças aprovado num clique
entra no cérebro como 200 aprovações individuais e **envenena o modelo sem desfazer**.

**Conferido no banco em 03/set: `julgamento.modo` e `julgamento.treina` existem em
produção** (E3 · 056). A dependência perigosa está paga. O batch pode ser construído.

### O que sobra para construir, na ordem

1. **A entrada** — CSV/planilha → `execucao.variaveis_lote`
2. **A execução** — roda o fluxo N vezes, grava `creditos` e as contagens por veredito
3. **A fila ordenada** — reprovado → rechecar → aprovado
4. **A aprovação em lote** — grava `modo = 'lote'`, `treina = falso` (o §7.4 já manda)

### As três decisões de 04/set (anotadas pelo Danilo sobre o desenho)

**1 · O elenco é uma BASE NA BIBLIOTECA, e escolher dela pula o portão.**

> *"ter uma base na biblioteca com os castings aprovados, para que a pessoa escolha o
> casting para o shooting. Ou usar um novo — se usar o novo processamos e salvamos; se
> escolher um, pulamos o portão."*

Isto **responde a pergunta que estava aberta** desde 19/ago (*"a base regerada continua
aprovada?"*): o portão da etapa 0 não é fixo, é **condicional à origem**.

```
casting NOVO      → gera base neutra → PORTÃO (alguém confere) → salva na biblioteca
casting DA CASA   → já foi conferido uma vez → segue direto
```

O portão passa a existir **uma vez por modelo**, não por rodada e não por SKU — e a
"biblioteca de bases neutras" deixa de ser refinamento futuro para virar a estrutura que
torna o lote viável. Cada base aprovada é um portão que nunca mais se paga.

**2 · Prompt é padrão; CONTEXTO é onde mora o valor.**

> *"adiciona still + contexto (muiiito importante). Os prompts precisam ser padrão, mas o
> contexto da peça precisa ser foda, conforme o que fizemos no fluxo."*

É a regra da §F0.6 dita do lado do produto: **CONTEXTO** = o constante (visão de câmera,
ângulo, descrição da peça); **PROMPT** = específico por foto. A consequência para o addon
é direta: a planilha não alimenta um prompt — alimenta o **contexto por SKU**, e é ele que
carrega o still e a ficha. Prompt padronizado é o que faz a receita acumular; contexto
rico é o que faz a peça sair fiel. Trocar os papéis quebra os dois.

**3 · O juiz PROPÕE. O portão mostra os dois lados, e a pessoa reverte.**

> *"o juiz precisa mostrar o que foi aprovado e não aprovado. O usuário pode mudar as
> decisões."*

O portão **não filtra fora da vista**: reprovado aparece junto do aprovado, e qualquer
decisão do juiz é reversível por quem olha. Isso é a §2.1 (*parecer, não veredito*) valendo
em lote, e corrige uma leitura que o SLIDE 08 do deck induz — *"reprovadas nem chegam a
você"*. Chegam; só chegam **ordenadas** e já com o argumento do juiz ao lado.

⚠️ E tem consequência de aprendizado: **reverter o juiz é sinal forte**. Aprovar o que ele
reprovou, ou reprovar o que ele aprovou, é ensino direto sobre o próprio juiz — mais
valioso que uma aprovação em lote, que a §7.4 já manda não treinar.

### 4 · A ficha não é coluna — é o CONTEXTO, e o gabarito já existe

> *"essa parte será uma parte de contexto da peça, não separado. Precisamos gerar um modelo
> de contexto a ser seguido, que já estamos usando."* — Danilo, 04/set, sobre as colunas
> `cor · material · categoria`.

Ele está certo, e o gabarito **não precisa ser inventado**: está escrito nos nós do fluxo
"Catálogo em 4 etapas — Hering KH6V", ~4 KB por peça, com esta estrutura:

```
PRODUÇÃO DE CATÁLOGO — <ETAPA>

═══ A PEÇA — FIDELIDADE É O CRITÉRIO PRINCIPAL ═══
    composição · material · cor · padronagem
    MODELAGEM   — medida real + O ERRO COMUM, nomeado
    COMPRIMENTO — medida + onde termina no corpo
    MANGA · TEXTURA · GOLA · BARRA · OMBRO · detalhes distintivos

═══ O LOOK — DE ONDE VEM CADA PARTE ═══
    • PARTE DE CIMA · CALÇA · CALÇADO · BOLSA · IDENTIDADE
      cada item aponta QUAL referência o alimenta

═══ VISÃO DE CÂMERA E ÂNGULO ═══
═══ ACABAMENTO ═══

(nas etapas de pose, entra também:)
O QUE TRAVA E O QUE VARIA:
    • TRAVA: identidade, look completo, a peça, fundo e luz
    • VARIA: pose, gesto, ângulo, olhar, altura da câmera
```

**O que faz esse texto funcionar não é descrever a peça — é ANTECIPAR O ERRO.** *"É o ponto
que mais erra, leia com atenção: no still a peça está DEITADA e a ribana relaxada parece
larga. Ela NÃO é larga."* Isso é conhecimento de produção, e é o que a §7.1 chama de
receita que merece se repetir.

#### O que isso muda na planilha

`cor`, `material` e `categoria` **saem como colunas**. Entra **um campo `contexto` por SKU**,
escrito no gabarito.

E há uma divisão de trabalho que cai de graça: a seção **§O LOOK é exatamente o papel por
referência** que as colunas de arquivo já declaram. Então o addon **gera §O LOOK sozinho**, a
partir das colunas — e o humano escreve só **§A PEÇA**, que é a parte que exige a ficha
técnica e o olho.

| Seção do contexto | Quem escreve |
|---|---|
| §A PEÇA | **pessoa** — é onde mora a fidelidade, e onde o erro comum é antecipado |
| §O LOOK | **o addon**, das colunas de arquivo da planilha |
| §VISÃO DE CÂMERA · §ACABAMENTO · §TRAVA/VARIA | **o fluxo** — são constantes da receita (§7.2 "do fluxo") |

Isso encaixa nas três camadas da §7.2 sem forçar: §A PEÇA é *do produto*, §O LOOK é *do
lote*, e o resto é *do fluxo*.

### ⚠️ A lacuna que a unificação encontrou

**`execucao` não tem teto de crédito.** Ela grava `creditos` (o que foi gasto), mas não
tem coluna de limite. O teto existe só no **agente** (`agente.teto_creditos_ciclo`) —
então um lote disparado por uma **pessoa** (`agente_id` nulo) roda sem freio.

E o `deck-retail.md` **já vendeu** "teto de créditos por lote" como guarda de operação.
É uma coluna a mais na `execucao`, e ela entra no passo 2, não depois.


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


---

# 13 · Addons — miniapps sobre o fluxo

## 13.1 De onde veio

Levantada pelo Danilo em 03/set, saindo de dois impasses no mesmo dia. A frase foi:
*"e se, ao invés de eu querer automatizar o fluxo — que já funciona bem — usar ele como
base pra criar um addon, que é uma tela nova? Meu bloqueio acho que está em não querer
mudar o objetivo das coisas."*

O bloqueio estava certo. O canvas resolve o problema dele; transformá-lo em máquina de
lote custaria o que ele já entrega. **A saída não é mudar o fluxo — é construir por cima.**

E é a mesma hipótese escrita em 13/jul sobre campanha (*"o usuário NÃO deveria ver o
canvas; canvas = bastidores opcional"*). Chegar nela de novo, por outro caminho, é o
argumento mais forte de que está certa.

## 13.2 A linha que separa addon de feature

**Um addon existe quando o vocabulário do cliente não cabe no do produto.**

O LOUDR fala marca, peça, campanha, parecer. A Hering fala SKU, guia de compras, elenco,
still, ficha técnica. "Guia de compras" não é feature de um produto de inteligência de
marca — construí-la no núcleo dobraria o produto para a operação de catálogo de **um**
varejista, e todo mundo pagaria o inchaço.

O teste, nesta ordem:

1. **O caso se resolve com um fluxo?** Se não, não é addon — é feature, ou não é nosso.
2. **O nome que o cliente usa já existe no produto?** Se existe, é feature.
3. **Serve a outro cliente sem tradução?** Se serve, é feature.

Duas respostas "não" → é addon.

## 13.3 O que um addon é

Uma **tela** mais um **contrato com um fluxo**. Ela fixa a versão do fluxo, entrega as
variáveis, roda, e apresenta o resultado no vocabulário do cliente.

**Ela nunca gera.** O fluxo gera.

## 13.4 O que todo addon herda de graça

É por isso que um addon é barato — ele não reconstrói nada disto:

| Herda | De onde |
|---|---|
| contexto de marca | `resolveBrandIntelligence` |
| o juiz, nos quatro eixos | `art-review` → `parecer` |
| a casa da peça, com trilha | `studio_generations` + Biblioteca |
| crédito, teto, débito e estorno | `_credits.js` |
| a rodada auditável | `execucao` |
| o aprendizado | `julgamento` + sinais |

## 13.5 As regras duras

1. **Addon não gera. O fluxo gera.**
2. **A peça nasce em `studio_generations`**, com `generation_id`, parecer e trilha. Addon
   com casa de peça própria é um fork do produto.
3. **Addon não inventa aprovação.** Usa `julgamento`, com `modo` e `treina` — senão o peso
   do §7.4 se perde e o primeiro lote grande envenena o cérebro.
4. **Addon é por marca, não global.** Instalado para quem precisa. É o que impede o
   produto de inchar para todos — e é o que um contrato compra.
5. **O canvas é bastidor, não pré-requisito.** Um link, para quem quiser ver por que a
   peça saiu assim.
6. **Addon não cria schema para o que já existe.**

## 13.6 O risco, nomeado

**Addon virando produto paralelo.** Todo addon que guarda peça própria é um fork, e forks
divergem calados. A guarda é a regra 2: peça sem `generation_id` não tem parecer, não vira
sinal, e o aprendizado — que é o produto — para naquele addon sem ninguém notar.

## 13.7 A fila de candidatos

| Candidato | De quem | Situação |
|---|---|---|
| **Lote de catálogo** | Hering | o primeiro; entrada e saída desenhadas na §7.5 |
| Fan-out de formato (R4) | Worten | meio construído — nó Recortar + template "1 peça → 6 formatos" |
| Campanha | — | E5b estacionado 03/set; **volta como addon, não como página do núcleo** |
| Editor (§3.7) | — | o próprio documento adia e manda revisitar; forte candidato |

## 13.8 O fluxo é a referência do addon

A §8.2 tem uma escada — peça → fluxo → agente — e o addon **não é um degrau novo. É um
ramo**, no mesmo ponto:

```
peça  →  fluxo  ─┬→  agente   o fluxo roda sozinho      (automação de TEMPO)
                 └→  addon    o fluxo ganha uma tela    (interface no VOCABULÁRIO)
```

Valem as mesmas regras da promoção a agente: **ato humano, explícito e reversível**, botão
sempre habilitado, histórico como informação e nunca como condição.

**E a promoção não é embalar o fluxo.** Duas coisas o grafo não carrega:

- **o vocabulário** — SKU, elenco, guia de compras, ficha técnica
- **os portões** — onde a rodada para e espera alguém olhar

Essas duas são o addon. O resto ele lê do fluxo.

### O que dá para derivar de verdade

`studio_workflows` já declara `variaveis_fluxo` e `variaveis_produto` (E1 · 054). A camada
**"do produto"** da §7.2 é exatamente o que o fluxo espera receber por item — ou seja,
**`variaveis_produto` É o esquema da planilha do lote**.

Isso fecha uma lacuna que o backlog marcou aberta na E1: *"`variaveis_produto` nasce sem
catálogo para preenchê-la"*. O catálogo é a planilha do addon. As colunas não são
inventadas na tela — são **lidas da receita**, e o preflight confere contra elas.

## 13.9 A prateleira, e por que ainda não é loja

O destino é uma **vitrine de addons**: a marca instala o que precisa, e o que ela instalou
é o que um contrato compra. A semente já existe — `studio_workflows.is_template`.

⚠️ **Mas construir a vitrine antes do primeiro addon é o erro que acabou de custar a
campanha:** muita obra para um resultado que ainda não serve. Hoje existem **zero** addons
construídos. Loja com prateleira vazia não ensina nada, e "loja" arrasta consigo publicação
por terceiros, versionamento, cobrança, revisão e isolamento — um negócio de plataforma,
não uma tela.

A ordem que evita a armadilha — **corrigida em 03/set**, porque o addon não pode vir
ligado por padrão e portanto a instalação deixa de ser passo posterior:

1. **A instalação mínima, junto com o addon 1.** Uma tabela, uma tela, uma fila de
   liberação. Sem ela o primeiro addon teria de ser cravado no menu, que é exatamente o
   que não se quer. Detalhe na §13.10.
2. **Um addon.** O lote de catálogo (§7.5). Construir revela o que um addon precisa de verdade.
3. **O segundo.** É ele que mostra o que os dois têm em comum — e **isso** é o contrato do
   addon. Antes do segundo, qualquer "contrato" é chute.
4. **A loja de verdade.** Só se um dia alguém de fora publicar. É outra decisão, e é de negócio.

**Regra:** nada de abstração de addon antes do segundo addon. O primeiro é código concreto
de lote de catálogo, e tem que poder ser feio.

## 13.10 A loja e a instalação

**Nenhum addon vem ligado.** A marca não enxerga o que não pediu, e pedir não instala:
**o cliente solicita, o br4ndcode libera.** É portão comercial — a §13.5 já diz que addon
é o que um contrato compra — e tem um efeito colateral bom: **a fila de pedidos mede a
demanda antes de o addon existir.**

### O catálogo é código; a instalação é banco

O que existe para pedir mora numa lista **no código**, porque cada addon É uma tela — não
faz sentido o banco anunciar algo sem implementação. Addon fora do registro não pode ser
solicitado, e assim nunca há linha apontando para o vazio.

### Os dois níveis, porque são duas perguntas

| Nível | Pergunta | Onde vive |
|---|---|---|
| **Workspace** | o contrato cobre? | é onde já moram `plano`, `creditos_saldo` — quem libera é `platform_admins` |
| **Marca** | aparece em qual? | a §13.5 regra 4: addon é por marca, não global |

Uma linha por `(workspace, addon, marca)`, com a marca **nula significando "todas as do
workspace"**. Índice único com `nulls not distinct`, o mesmo recurso usado na 058 para o
escopo do aprendizado.

### Os estados

```
        solicitar              liberar
 —— →  pedido  ─────────────→  ativo  ⇄  suspenso
                   │
                   └─ recusado (com motivo)
```

**Suspender não apaga** — mesma regra da §8.3 para agentes. O histórico permanece e o
addon volta sem novo pedido.

### As telas, e são duas

**A loja**, para o cliente: os addons do catálogo com o estado de cada um — *Disponível ·
Pedido enviado · Ativo · Recusado*. Um botão, "Solicitar", e o motivo aparece quando foi
recusado.

**A fila**, no painel admin que já existe: os pedidos abertos, com liberar e recusar.

**O menu lê as instalações ativas.** É isso que faz "por padrão não vem" ser verdade, e não
uma promessa.

### As guardas

1. **Só `platform_admins` move `pedido → ativo`.** Nenhum papel de workspace consegue se
   auto-liberar. Isso é RLS, e vai para o ensaio da `guarda:rls`.
2. **Addon ativo num workspace nunca aparece em marca de outro.** Mesmo isolamento do resto.
3. **Nada de versionamento, cobrança ou publicação por terceiros.** Existe **um** addon.
   Cada uma dessas é um produto próprio e nenhuma se paga com um item na prateleira.

## 13.11 O fluxo fica no Fluxos — e o addon consome a estrutura

Confirmado pelo Danilo ao fechar o primeiro addon (04/set): *"o fluxo fica no
fluxo, usamos e criamos lá por referência. Se no background usamos eles por
estrutura, porque já tem tudo construído, não tem problema."*

O que está FORA do Fluxos é a **tela**: rota própria, vocabulário do cliente
(SKU, peça, acessório, modelo), tabelas próprias, portão de instalação. Ninguém
abre o canvas para usar o addon.

O que está DENTRO, de propósito, é o **motor**. O addon lê o grafo pela mesma
função que o canvas (`lib/studioGrafo.js`) e chama o mesmo `studio-generate`. As
peças caem em `studio_generations`, com trilha e parecer, como qualquer outra.
Fosse completamente fora, teria um segundo motor — e a fidelidade voltaria a ser
promessa.

### ⚠️ A dependência que isso cria: a convenção de id dos nós

O addon descobre o que é casting, peça, acessório e pose pelo **id do nó**:
`e0_in_casting`, `e1_in_still`, `e2_in_pose`, `e1_g1`. O prefixo `eN` dá a etapa;
o sufixo dá o papel.

**Fluxo que não segue a convenção não roda no addon.** O `Hering - 49FP (Brasil)`
é o caso real: os nós dele são `imageInput-1787690734467`, sem rótulo — ali o
addon classificaria tudo como acessório e não acharia etapa nenhuma. Foi por isso
que, no teste de 04/set, dele saíram só os DADOS para a planilha, e a execução
correu sobre a cópia do "Catálogo em 4 etapas".

Hoje isso é aceitável: `addon_instalacao.workflow_id` amarra o addon a UM fluxo,
escolhido por quem libera — coerente com *"é um produto com base num fluxo
específico e só vai fazer isso"*.

Quando precisar servir a fluxos que não sigam a convenção, o caminho não é o
addon adivinhar melhor: é o **fluxo declarar o papel de cada entrada**, em vez de
escondê-lo no id. Papel implícito num identificador é convenção que ninguém vê e
qualquer renomeação quebra.
