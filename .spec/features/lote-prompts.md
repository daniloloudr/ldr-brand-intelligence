# Prompts e contextos — Catálogo em 4 etapas

Estado em 04/set, na cópia do tenant de teste. Os 5 prompts marcados ✏️ foram
neutralizados hoje: eles descreviam a peça do KH6V e contaminavam todo SKU novo.

**A regra:** o prompt diz a POSE e onde olhar. O contexto diz o que a peça É.

---


## ETAPA 0 — base de casting limpa (nano banana · fala da PESSOA)

### CONTEXTO · `e0_ctx`

```
BASE DE CASTING LIMPA — as cinco vistas da modelo

A imagem de entrada serve exclusivamente para preservar a IDENTIDADE da modelo:
rosto, tom de pele, cabelo e sua textura, biotipo, proporções corporais e
expressão. Nada da roupa que ela veste deve ser preservado. remova os sapatos.

Remova completamente a roupa original — modelagem, gola, alças, mangas,
costuras, barras, recortes, fendas, textura, estampa e caimento. Vista a modelo
com uma SEGUNDA PELE neutra: colada ao corpo, lisa, sem costura aparente, sem
textura, sem recorte, sem detalhe construtivo, sem transparência e sem volume.
Cor neutra próxima ao tom da pele ou cinza-claro uniforme, sem contraste.
Ela não deve sugerir NENHUMA categoria de produto — só cobrir o torso.

A malha precisa sair LISA e UNIFORME: sem ponto, sem relevo, sem trama visível.
(Na primeira tentativa saiu com piquê sutil, e modelo que copia textura copia
isso também.)

═══ TURNAROUND — AS CINCO VISTAS SÃO A MESMA FOTO, GIRADA ═══
Estas saídas não são cinco fotos parecidas: são UMA sessão vista de cinco
ângulos. O que precisa ser idêntico em todas, porque é o que permite usá-las
como base uma da outra:
• A MESMA malha: mesma cor, mesmo caimento, mesma altura de gola e de barra.
• O MESMO cabelo: mesmo corte, mesmo comprimento, mesmo volume, mesma repartição.
• A MESMA escala no quadro: topo da cabeça e solado dos pés na mesma altura em
  todas as cinco. A modelo não chega mais perto nem mais longe.
• A MESMA luz e o MESMO fundo, com a sombra caindo do mesmo lado.
• A MESMA postura neutra: em pé, ereta, braços soltos, pés paralelos. O corpo
  não muda de pose entre as vistas — só a posição da câmera muda.

═══ VISÃO DE CÂMERA E ÂNGULO ═══
Corpo inteiro, da cabeça aos pés, com folga acima e abaixo, enquadramento
vertical. Câmera na altura do peito, lente de retrato (equivalente a 85 mm), sem
distorção de lente e sem inclinação. Modelo centralizada, à mesma distância em
todas as vistas.

O GIRO — o quanto o corpo está voltado para a câmera — é a única coisa que muda
entre as saídas, e está escrito no prompt de cada uma.

Fundo cinza claro neutro sólido #F2F2F2. Luz de estúdio suave e difusa.
Imagem limpa: sem texto, sem etiqueta, sem logotipo, sem marca d'água.
```

### PROMPT · `e0_p1`

```
VISTA 0° · FRENTE

Modelo DE FRENTE para a câmera (0°), corpo inteiro, em pé, peso
distribuído igualmente nos dois pés, braços soltos ao lado do corpo, mãos
relaxadas, ombros nivelados, olhar direto para a lente.

Esta é a VISTA-ÂNCORA do turnaround: as outras quatro precisam parecer a mesma
pessoa, no mesmo lugar, no mesmo instante — só a câmera anda em volta.
```

### PROMPT · `e0_p2`

```
VISTA 45° · TRÊS QUARTOS

A modelo girada 45° em relação à câmera (três quartos),
ombro esquerdo mais próximo da lente, ombros em diagonal, rosto voltado para a
câmera. Pés no mesmo ponto do chão, peso ainda distribuído, braços soltos.

Mesma escala e mesmo enquadramento da vista 0°: a cabeça e os pés na mesma
altura do quadro. O que mudou foi o ângulo, não a distância.
```

### PROMPT · `e0_p3`

```
VISTA 90° · PERFIL

PERFIL EXATO (90°): a modelo de lado para a câmera, ombros
alinhados um atrás do outro, rosto de perfil com o olhar à frente — NÃO para a
câmera. Braços soltos, o braço da frente rente ao corpo, sem cobrir a silhueta.

É a vista que informa a linha do ombro, a curva das costas, a projeção do
quadril e o comprimento real do tronco. A silhueta lateral precisa sair limpa e
legível contra o fundo.
```

### PROMPT · `e0_p4`

```
VISTA 135° · TRÊS QUARTOS DE COSTAS

A modelo girada 135°, quase de costas, ombro
direito mais próximo da lente, rosto NÃO voltado para a câmera — vê-se no
máximo o contorno da bochecha e a linha da mandíbula. Braços soltos.

Mostra ao mesmo tempo as costas e a lateral: é a vista que a etapa 2 usa para a
pose por cima do ombro, e a que revela a costura lateral em diagonal.
```

### PROMPT · `e0_p5`

```
VISTA 180° · COSTAS

Modelo DE COSTAS para a câmera (180°), corpo inteiro, em pé,
peso distribuído nos dois pés, braços soltos ao lado do corpo, cabeça ereta e
olhar à frente. O rosto não aparece.

O CABELO é a informação crítica desta vista: mesmo comprimento, mesmo volume e
mesmo penteado das outras quatro, caindo naturalmente nas costas como cairia na
pessoa real — sem mudar de corte, sem prender, sem encurtar. A nuca, a linha
dos ombros e a largura das costas precisam ser as MESMAS da vista 135°.
```


## ETAPA 1 — primeira imagem inteira (Seedream 5 Pro)

### CONTEXTO · `e1_ctx`

```
PRODUÇÃO DE CATÁLOGO — PRIMEIRA IMAGEM INTEIRA

═══ A PEÇA — FIDELIDADE É O CRITÉRIO PRINCIPAL ═══
Camiseta feminina de manga curta em RIBANA (poliamida + elastano): malha
canelada fina, off-white quente de creme, com listras horizontais finas em
azul-marinho de fio tinto.

MODELAGEM — SLIM, RENTE AO CORPO. É o ponto que mais erra, leia com atenção:
no still a peça está DEITADA sobre a mesa, e ribana relaxada parece larga. Ela
NÃO é larga. O tamanho P mede 39 cm de largura deitada, ou seja 78 cm de
circunferência, contra um busto de cerca de 86 cm — a peça é MENOR que o corpo
e a malha veste ESTICADA. O canelado abre sobre o busto e a silhueta aparece.
Sem folga nas laterais, sem volume, nunca oversized.

COMPRIMENTO — 54,5 cm no P: a barra termina na ALTURA DO OSSO DO QUADRIL,
cobrindo o cós da calça e nada além. Não é cropped e não passa do quadril.
A peça é mais alta que larga (proporção aproximada de 1,4 para 1).

MANGA — 18,5 cm: termina no MEIO DO BÍCEPS, bem acima do cotovelo, rente ao
braço e acompanhando o contorno. Não é ampla nem solta.

TEXTURA — o canelado é a assinatura e cobre a peça INTEIRA: frente, costas,
mangas, ombros, barra e gola. Nervuras verticais finas, muito próximas, de
relevo baixo. As listras NÃO interrompem o canelado: a nervura continua
visível por baixo do azul. Ler como microcanelado vertical contínuo COM
listras horizontais por cima — nunca como jersey liso com linhas pintadas.

LISTRAS DA MANGA — detalhe distintivo, não erre: na manga as listras correm
AO LONGO DO BRAÇO, perpendiculares às listras horizontais do corpo, e ficam
mais próximas entre si. O canelado da manga cruza essas listras.

GOLA — alta e canelada (mock neck), curta, com uma listra azul-marinho
contornando a base. Vista por trás tem costura central. Sem colarinho.

BARRA — RETA e no mesmo nível em toda a volta, acabada com uma faixa contínua
e uma listra correndo rente a ela. A costura lateral é fechada de ponta a
ponta e a barra dobra o canto sem interrupção: NÃO HÁ fenda, abertura nem
racho lateral em nenhum dos lados.

OMBRO — costura visível descendo do pescoço para o braço; a listra acompanha.
SEM bolso, recorte decorativo, aplicação, bordado ou logotipo.

═══ O LOOK — DE ONDE VEM CADA PARTE ═══
Cada item vem da SUA PRÓPRIA referência de produto. Reproduza fielmente cor,
material, formato e acabamento de cada uma — não substitua por item parecido.
• PARTE DE CIMA: a camiseta, 100% do still. É o produto principal.
• CALÇA: da referência de calça — jeans de algodão em AZUL MÉDIO, lavagem
  uniforme com desbotado suave nas coxas e joelhos, cintura alta, cinco bolsos,
  perna larga e reta caindo solta até o tornozelo, barra reta e acabada.
• CALÇADO: da referência de calçado — SAPATILHA PRETA, rasteira
  (sem salto), em camurça preta com recorte em couro liso preto na lateral e no
  calcanhar, e abertura em V no peito do pé. Preta por inteiro, sola fina.
• BOLSA: da referência de bolsa — TOTE PRETA em camurça/nobuck, estruturada, de
  corpo trapezoidal com base larga; duas alças curtas de ombro e uma alça longa
  transversal ajustável com fivela DOURADA (o único metal, e é discreto).
  Preta por inteiro, sem vivo em cor contrastante.
• IDENTIDADE (rosto, pele, cabelo, biotipo): da referência de casting.

═══ VISÃO DE CÂMERA E ÂNGULO ═══
Corpo inteiro, da cabeça aos pés, com folga acima e abaixo. Câmera na
altura do peito, lente de retrato (equivalente a 85 mm), sem distorção nas
extremidades. Modelo centralizada. A silhueta inteira precisa ser legível —
sobretudo o comprimento na altura do quadril e a linha reta e fechada da barra.

═══ ACABAMENTO ═══
Proporções humanas corretas, mãos íntegras, pose natural de catálogo de moda.
Rosto nítido e sem deformação: traços limpos, pele uniforme, sem manchas, sem
borrão, sem assimetria. Foco preciso nos olhos.
Fundo cinza claro neutro sólido #F2F2F2. Luz de estúdio suave e difusa, que
revele o relevo do canelado sem estourar o off-white.
Imagem limpa: sem texto, sem etiqueta, sem logotipo, sem marca d'água.
```

### PROMPT · `e1_p1`

```
FRONTAL

De frente, em pé, peso distribuído, braços soltos. A leitura mais neutra e completa da peça — é a imagem-âncora da série.
```

### PROMPT · `e1_p2` ✏️ *neutralizado hoje*

```
PESO NUMA PERNA

De frente, peso numa perna, quadril deslocado, uma das mãos junto ao corpo na altura do quadril e a outra solta. Postura relaxada de catálogo.
```

### PROMPT · `e1_p3`

```
TRÊS QUARTOS

Corpo girado a três quartos, ombros em diagonal, rosto para a câmera. Mostra como a peça acompanha o corpo de lado.
```


## ETAPA 2 — poses (consome a etapa 1)

### CONTEXTO · `e2_ctx`

```
PRODUÇÃO DE CATÁLOGO — POSES

O QUE TRAVA E O QUE VARIA:
• TRAVA: a IDENTIDADE da modelo e o LOOK COMPLETO, que vêm da imagem aprovada
  da etapa 1 — mesma pessoa, mesma camiseta, mesma calça, mesmo calçado.
• TRAVA: a peça, com a fidelidade descrita abaixo.
• TRAVA: fundo cinza claro neutro #F2F2F2 e luz de estúdio suave.
• VARIA: pose, gesto, ângulo do corpo, direção do olhar e altura da câmera.
  Cada saída precisa ser visivelmente diferente das outras — duas imagens
  parecidas são falha, não acerto.

A REFERÊNCIA DE POSE mostra a POSTURA a reproduzir: dela vem só a pose e o
enquadramento. Pessoa, roupa, luz e fundo dela devem ser ignorados por completo.

═══ A PEÇA — FIDELIDADE É O CRITÉRIO PRINCIPAL ═══
Camiseta feminina de manga curta em RIBANA (poliamida + elastano): malha
canelada fina, off-white quente de creme, com listras horizontais finas em
azul-marinho de fio tinto.

MODELAGEM — SLIM, RENTE AO CORPO. É o ponto que mais erra, leia com atenção:
no still a peça está DEITADA sobre a mesa, e ribana relaxada parece larga. Ela
NÃO é larga. O tamanho P mede 39 cm de largura deitada, ou seja 78 cm de
circunferência, contra um busto de cerca de 86 cm — a peça é MENOR que o corpo
e a malha veste ESTICADA. O canelado abre sobre o busto e a silhueta aparece.
Sem folga nas laterais, sem volume, nunca oversized.

COMPRIMENTO — 54,5 cm no P: a barra termina na ALTURA DO OSSO DO QUADRIL,
cobrindo o cós da calça e nada além. Não é cropped e não passa do quadril.
A peça é mais alta que larga (proporção aproximada de 1,4 para 1).

MANGA — 18,5 cm: termina no MEIO DO BÍCEPS, bem acima do cotovelo, rente ao
braço e acompanhando o contorno. Não é ampla nem solta.

TEXTURA — o canelado é a assinatura e cobre a peça INTEIRA: frente, costas,
mangas, ombros, barra e gola. Nervuras verticais finas, muito próximas, de
relevo baixo. As listras NÃO interrompem o canelado: a nervura continua
visível por baixo do azul. Ler como microcanelado vertical contínuo COM
listras horizontais por cima — nunca como jersey liso com linhas pintadas.

LISTRAS DA MANGA — detalhe distintivo, não erre: na manga as listras correm
AO LONGO DO BRAÇO, perpendiculares às listras horizontais do corpo, e ficam
mais próximas entre si. O canelado da manga cruza essas listras.

GOLA — alta e canelada (mock neck), curta, com uma listra azul-marinho
contornando a base. Vista por trás tem costura central. Sem colarinho.

BARRA — RETA e no mesmo nível em toda a volta, acabada com uma faixa contínua
e uma listra correndo rente a ela. A costura lateral é fechada de ponta a
ponta e a barra dobra o canto sem interrupção: NÃO HÁ fenda, abertura nem
racho lateral em nenhum dos lados.

OMBRO — costura visível descendo do pescoço para o braço; a listra acompanha.
SEM bolso, recorte decorativo, aplicação, bordado ou logotipo.

═══ VISÃO DE CÂMERA E ÂNGULO ═══
Varia por saída — está escrito no prompt de cada uma. Lente de retrato
(equivalente a 85 mm) em todas, sem distorção. Quando a câmera baixa, ela baixa
de verdade: contra-plongée suave, não recorte da mesma foto.

═══ ACABAMENTO ═══
Proporções humanas corretas, mãos íntegras, pose natural de catálogo de moda.
Rosto nítido e sem deformação: traços limpos, pele uniforme, sem manchas, sem
borrão, sem assimetria. Foco preciso nos olhos.
Fundo cinza claro neutro sólido #F2F2F2. Luz de estúdio suave e difusa, que
revele o relevo do canelado sem estourar o off-white.
Imagem limpa: sem texto, sem etiqueta, sem logotipo, sem marca d'água.
```

### PROMPT · `e2_p1`

```
CAMINHANDO

A modelo CAMINHANDO em direção à câmera: uma perna adiantada em meio passo, peso na perna de trás, braços em movimento natural e assimétrico. Câmera na altura do peito.
```

### PROMPT · `e2_p2`

```
CONTRA-PLONGÉE

De frente, peso numa perna, quadril deslocado. Câmera BAIXA, na altura da cintura, apontando levemente para cima — alonga a silhueta e muda a leitura do comprimento.
```

### PROMPT · `e2_p3` ✏️ *neutralizado hoje*

```
OMBRO

Três quartos DE COSTAS. Mostra a lateral da peça e o alinhamento das costuras laterais. Câmera na altura do peito.
```

### PROMPT · `e2_p4` ✏️ *neutralizado hoje*

```
APROXIMADA

MEIO CORPO, do topo da cabeça até o quadril. O assunto é a SUPERFÍCIE da peça: textura, padronagem, costuras e acabamentos legíveis em escala real. Foco nítido na superfície, fundo levemente desfocado.
```


## ETAPA 3 — costas (consome a base de costas)

### CONTEXTO · `e3_ctx`

```
PRODUÇÃO DE CATÁLOGO — COSTAS

═══ A PEÇA — FIDELIDADE É O CRITÉRIO PRINCIPAL ═══
Camiseta feminina de manga curta em RIBANA (poliamida + elastano): malha
canelada fina, off-white quente de creme, com listras horizontais finas em
azul-marinho de fio tinto.

MODELAGEM — SLIM, RENTE AO CORPO. É o ponto que mais erra, leia com atenção:
no still a peça está DEITADA sobre a mesa, e ribana relaxada parece larga. Ela
NÃO é larga. O tamanho P mede 39 cm de largura deitada, ou seja 78 cm de
circunferência, contra um busto de cerca de 86 cm — a peça é MENOR que o corpo
e a malha veste ESTICADA. O canelado abre sobre o busto e a silhueta aparece.
Sem folga nas laterais, sem volume, nunca oversized.

COMPRIMENTO — 54,5 cm no P: a barra termina na ALTURA DO OSSO DO QUADRIL,
cobrindo o cós da calça e nada além. Não é cropped e não passa do quadril.
A peça é mais alta que larga (proporção aproximada de 1,4 para 1).

MANGA — 18,5 cm: termina no MEIO DO BÍCEPS, bem acima do cotovelo, rente ao
braço e acompanhando o contorno. Não é ampla nem solta.

TEXTURA — o canelado é a assinatura e cobre a peça INTEIRA: frente, costas,
mangas, ombros, barra e gola. Nervuras verticais finas, muito próximas, de
relevo baixo. As listras NÃO interrompem o canelado: a nervura continua
visível por baixo do azul. Ler como microcanelado vertical contínuo COM
listras horizontais por cima — nunca como jersey liso com linhas pintadas.

LISTRAS DA MANGA — detalhe distintivo, não erre: na manga as listras correm
AO LONGO DO BRAÇO, perpendiculares às listras horizontais do corpo, e ficam
mais próximas entre si. O canelado da manga cruza essas listras.

GOLA — alta e canelada (mock neck), curta, com uma listra azul-marinho
contornando a base. Vista por trás tem costura central. Sem colarinho.

BARRA — RETA e no mesmo nível em toda a volta, acabada com uma faixa contínua
e uma listra correndo rente a ela. A costura lateral é fechada de ponta a
ponta e a barra dobra o canto sem interrupção: NÃO HÁ fenda, abertura nem
racho lateral em nenhum dos lados.

OMBRO — costura visível descendo do pescoço para o braço; a listra acompanha.
SEM bolso, recorte decorativo, aplicação, bordado ou logotipo.

═══ COMO A PEÇA SE LÊ POR TRÁS ═══
As costas são contínuas, com as listras horizontais atravessando de lateral a
lateral e ALINHANDO com as listras da frente. A gola alta canelada aparece por
trás com costura central e a listra contornando a base. A costura lateral é
visível, corre reta da cava até a barra e é FECHADA em toda a extensão — a barra
dobra o canto sem interrupção, sem fenda e sem abertura.
Vestida, a peça é rente às costas: a malha estica e acompanha o corpo.

═══ O LOOK — DE ONDE VEM CADA PARTE ═══
Cada item vem da SUA PRÓPRIA referência de produto. Reproduza fielmente cor,
material, formato e acabamento de cada uma — não substitua por item parecido.
• PARTE DE CIMA: a camiseta, 100% do still. É o produto principal.
• CALÇA: da referência de calça — jeans de algodão em AZUL MÉDIO, lavagem
  uniforme com desbotado suave nas coxas e joelhos, cintura alta, cinco bolsos,
  perna larga e reta caindo solta até o tornozelo, barra reta e acabada.
• CALÇADO: da referência de calçado — SAPATILHA PRETA
• IDENTIDADE (rosto, pele, cabelo, biotipo): da referência de casting.

═══ VISÃO DE CÂMERA E ÂNGULO ═══
Corpo inteiro, modelo DE COSTAS para a câmera, câmera na altura do peito,
lente de retrato sem distorção. Evidencia o caimento rente nas costas, a gola
por trás, a barra reta e fechada e o comprimento no quadril.

═══ ACABAMENTO ═══
Proporções humanas corretas, mãos íntegras, pose natural de catálogo de moda.
Rosto nítido e sem deformação: traços limpos, pele uniforme, sem manchas, sem
borrão, sem assimetria. Foco preciso nos olhos.
Fundo cinza claro neutro sólido #F2F2F2. Luz de estúdio suave e difusa, que
revele o relevo do canelado sem estourar o off-white.
Imagem limpa: sem texto, sem etiqueta, sem logotipo, sem marca d'água.
```

### PROMPT · `e3_p1`

```
COSTAS

De costas para a câmera, corpo inteiro, em pé, braços soltos ao lado do corpo. Leitura limpa e completa das costas da peça.
```

### PROMPT · `e3_p2` ✏️ *neutralizado hoje*

```
COSTAS · TRÊS QUARTOS

Três quartos de costas, corpo levemente girado, mostrando ao mesmo tempo as costas e a lateral da peça.
```


## ETAPA 4 — fotos livres (consome as etapas 1 e 2)

### CONTEXTO · `e4_ctx`

```
PRODUÇÃO DE CATÁLOGO — FOTOS LIVRES

As referências são imagens JÁ APROVADAS desta mesma série: delas vêm a
identidade da modelo, o look completo e o padrão de luz e cor. Mantenha tudo —
a única coisa que muda é a pose, escrita no prompt de cada saída.

═══ A PEÇA — FIDELIDADE É O CRITÉRIO PRINCIPAL ═══
Camiseta feminina de manga curta em RIBANA (poliamida + elastano): malha
canelada fina, off-white quente de creme, com listras horizontais finas em
azul-marinho de fio tinto.

MODELAGEM — SLIM, RENTE AO CORPO. É o ponto que mais erra, leia com atenção:
no still a peça está DEITADA sobre a mesa, e ribana relaxada parece larga. Ela
NÃO é larga. O tamanho P mede 39 cm de largura deitada, ou seja 78 cm de
circunferência, contra um busto de cerca de 86 cm — a peça é MENOR que o corpo
e a malha veste ESTICADA. O canelado abre sobre o busto e a silhueta aparece.
Sem folga nas laterais, sem volume, nunca oversized.

COMPRIMENTO — 54,5 cm no P: a barra termina na ALTURA DO OSSO DO QUADRIL,
cobrindo o cós da calça e nada além. Não é cropped e não passa do quadril.
A peça é mais alta que larga (proporção aproximada de 1,4 para 1).

MANGA — 18,5 cm: termina no MEIO DO BÍCEPS, bem acima do cotovelo, rente ao
braço e acompanhando o contorno. Não é ampla nem solta.

TEXTURA — o canelado é a assinatura e cobre a peça INTEIRA: frente, costas,
mangas, ombros, barra e gola. Nervuras verticais finas, muito próximas, de
relevo baixo. As listras NÃO interrompem o canelado: a nervura continua
visível por baixo do azul. Ler como microcanelado vertical contínuo COM
listras horizontais por cima — nunca como jersey liso com linhas pintadas.

LISTRAS DA MANGA — detalhe distintivo, não erre: na manga as listras correm
AO LONGO DO BRAÇO, perpendiculares às listras horizontais do corpo, e ficam
mais próximas entre si. O canelado da manga cruza essas listras.

GOLA — alta e canelada (mock neck), curta, com uma listra azul-marinho
contornando a base. Vista por trás tem costura central. Sem colarinho.

BARRA — RETA e no mesmo nível em toda a volta, acabada com uma faixa contínua
e uma listra correndo rente a ela. A costura lateral é fechada de ponta a
ponta e a barra dobra o canto sem interrupção: NÃO HÁ fenda, abertura nem
racho lateral em nenhum dos lados.

OMBRO — costura visível descendo do pescoço para o braço; a listra acompanha.
SEM bolso, recorte decorativo, aplicação, bordado ou logotipo.

═══ VISÃO DE CÂMERA E ÂNGULO ═══
Varia por saída — está escrito no prompt de cada uma. Lente de retrato
(equivalente a 85 mm) em todas. Mesma luz e mesmo fundo das imagens aprovadas.

═══ ACABAMENTO ═══
Proporções humanas corretas, mãos íntegras, pose natural de catálogo de moda.
Rosto nítido e sem deformação: traços limpos, pele uniforme, sem manchas, sem
borrão, sem assimetria. Foco preciso nos olhos.
Fundo cinza claro neutro sólido #F2F2F2. Luz de estúdio suave e difusa, que
revele o relevo do canelado sem estourar o off-white.
Imagem limpa: sem texto, sem etiqueta, sem logotipo, sem marca d'água.
```

### PROMPT · `e4_p1`

```
SENTADA

SENTADA num cubo neutro cinza claro, pernas cruzadas, tronco ereto levemente inclinado à frente, mãos apoiadas na perna. Mostra como a peça se comporta sentada. Câmera na altura do rosto dela, sentada.
```

### PROMPT · `e4_p2` ✏️ *neutralizado hoje*

```
BRAÇOS CRUZADOS

De frente, braços cruzados na altura da cintura, peso numa perna, quadril deslocado. O cruzamento deixa ver a parte superior da peça e a lateral do tronco.
```

### PROMPT · `e4_p3`

```
MOVIMENTO

Gesto natural, como num intervalo entre poses: uma das mãos passando pelo cabelo, rosto levemente virado e olhar FORA da câmera. Enquadramento de meio corpo.
```
