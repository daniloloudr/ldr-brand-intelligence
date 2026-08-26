// PROCESSO DE CATÁLOGO EM 4 ETAPAS — fluxo montado a partir do processo que o
// Danilo fechou em 21/08/2026, depois de três dias no piloto KH6V.
// Doutrina em .spec/features/piloto-hering.md § F0.6.
//
// O que este fluxo faz diferente do t01–t05, e por quê:
//
//  · A PEÇA É ESCRITA UMA VEZ. Nos fluxos anteriores ela estava descrita em
//    quatro contextos, e eles se contradisseram: um dizia "solta", outro
//    "slim"; um afirmava uma fenda lateral que não existe. Aqui PECA é uma
//    constante injetada em todos os contextos — trocar de produto é trocar UM
//    bloco.
//  · CONTEXTO = o constante (câmera/ângulo + peça). PROMPT = específico por
//    foto. É a regra do processo, e é o que faltava para saber o que mora onde.
//  · CADA ETAPA COME A SAÍDA DA ANTERIOR. A base aprovada alimenta a etapa 1,
//    a imagem aprovada alimenta as poses, as que deram certo alimentam as
//    livres. Qualidade compõe em vez de recomeçar do zero.
//  · TETO DE REFERÊNCIAS COM FOLGA. Nenhum gerador passa de 3 refs (o teto é
//    5). Ontem dois nós recebiam 7 e 8, e o que caía fora era justamente o
//    still — o gerador desenhava a peça sem nunca ter visto a peça.
//
// TROCAR DE PRODUTO: mude PECA, os stills e o look. O resto do grafo serve.
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const B = `${process.env.SUPABASE_URL}/storage/v1/object/public/brand-assets/09f3d65b-07d9-46c9-b6e7-f878377dd7c2/workflow`

const IMG = {
  casting:      `${B}/1787175296596-1339-imagem_1_modelo.jpg`,
  stillFrente:  `${B}/1787160605941-x3im-KH6V_still_frente.jpg`,
  stillCostas:  `${B}/1787169467391-r3ke-KH6V_still_costas.jpg`,
  look:         `${B}/1787319468613-ref0-calca_referencia_limpa.jpg`,
}

// nano banana 2.5 na etapa 0 (foca em pessoa/casting), seedream 5 no resto
// (fidelidade de peça). Não existe "o melhor modelo": existe o melhor por etapa.
const PESSOA = 'fal-ai/gemini-25-flash-image'
const PRODUTO = 'bytedance/seedream/v5/pro/text-to-image'

// ═══════════════════════════════════════════════════════════════════════
// A PEÇA — fonte única. Verificada contra os stills em aumento (21/08).
// ═══════════════════════════════════════════════════════════════════════
const PECA = `═══ A PEÇA — FIDELIDADE É O CRITÉRIO PRINCIPAL ═══
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
SEM bolso, recorte decorativo, aplicação, bordado ou logotipo.`

const LOOK = `═══ O LOOK — DE ONDE VEM CADA PARTE ═══
• PARTE DE CIMA: a camiseta, 100% do still. É o produto.
• PARTE DE BAIXO: da referência de look — calça jeans de algodão em AZUL MÉDIO,
  lavagem uniforme com desbotado suave nas coxas e joelhos, cintura alta, cinco
  bolsos, perna larga e reta caindo solta até o tornozelo, barra reta e acabada.
  Mocassim de couro marrom-caramelo, salto baixo. Bolsa tote de couro caramelo
  com alças e vivo em preto.
• IDENTIDADE (rosto, pele, cabelo, biotipo): da referência de casting.`

const ACABA = `═══ ACABAMENTO ═══
Proporções humanas corretas, mãos íntegras, pose natural de catálogo de moda.
Rosto nítido e sem deformação: traços limpos, pele uniforme, sem manchas, sem
borrão, sem assimetria. Foco preciso nos olhos.
Fundo cinza claro neutro sólido #F2F2F2. Luz de estúdio suave e difusa, que
revele o relevo do canelado sem estourar o off-white.
Imagem limpa: sem texto, sem etiqueta, sem logotipo, sem marca d'água.`

// Câmera é parte do CONTEXTO, não do prompt — é o que o processo pede.
const CAMERA = txt => `═══ VISÃO DE CÂMERA E ÂNGULO ═══\n${txt}`

// ═══ ETAPAS ════════════════════════════════════════════════════════════
const ETAPAS = [
  {
    id: 'e0', titulo: 'ETAPA 0 · BASE DE CASTING LIMPA', modelo: PESSOA,
    nota: `ETAPA 0 — BASE DE CASTING LIMPA

Três versões da modelo SEM os adereços de roupa dela, numa malha colada ao corpo.
Gerado com nano banana 2.5, que foca melhor em pessoa e casting.

POR QUE: a roupa do casting vaza na peça gerada. Contaminação visual não se
resolve no prompt (modelo de imagem não obedece negação) — se resolve tirando
o dado da referência.

Escolha UMA das três e ligue na etapa 1.`,
    contexto: `BASE DE CASTING LIMPA — referência permanente da modelo

A imagem de entrada serve exclusivamente para preservar a IDENTIDADE da modelo:
rosto, tom de pele, cabelo e sua textura, biotipo, proporções corporais e
expressão. Nada da roupa que ela veste deve ser preservado.

Remova completamente a roupa original — modelagem, gola, alças, mangas,
costuras, barras, recortes, fendas, textura, estampa e caimento. Vista a modelo
com uma SEGUNDA PELE neutra: colada ao corpo, lisa, sem costura aparente, sem
textura, sem recorte, sem detalhe construtivo, sem transparência e sem volume.
Cor neutra próxima ao tom da pele ou cinza-claro uniforme, sem contraste.
Ela não deve sugerir NENHUMA categoria de produto — só cobrir o torso.

A malha precisa sair LISA e UNIFORME: sem ponto, sem relevo, sem trama visível.
(Na primeira tentativa saiu com piquê sutil, e modelo que copia textura copia
isso também.)

${CAMERA(`Corpo inteiro, modelo em pé de frente, câmera na altura do peito,
enquadramento vertical com folga acima e abaixo. Sem distorção de lente.`)}

${ACABA}`,
    entradas: [['casting', IMG.casting, 'Casting aprovado']],
    saidas: [
      ['Base 1', 'Primeira versão. Postura em pé, natural, braços soltos ao lado do corpo.'],
      ['Base 2', 'Segunda versão, mesma pessoa: peso numa perna, quadril levemente deslocado.'],
      ['Base 3', 'Terceira versão, mesma pessoa: tronco levemente girado, três quartos.'],
    ],
  },
  {
    id: 'e1', titulo: 'ETAPA 1 · PRIMEIRA IMAGEM INTEIRA', modelo: PRODUTO,
    nota: `ETAPA 1 — PRIMEIRA IMAGEM INTEIRA

Corpo inteiro com acessórios e a peça em CAIMENTO REAL. Gerado com Seedream 5.0,
que foi o que leu a peça com fidelidade no bake-off.

Referências: base limpa escolhida (identidade) · still (a peça) · look
(calça, calçado e bolsa). Três — o teto é cinco, e a folga é proposital.

A imagem aprovada aqui alimenta as etapas 2 e 4.`,
    contexto: `PRODUÇÃO DE CATÁLOGO — PRIMEIRA IMAGEM INTEIRA

${PECA}

${LOOK}

${CAMERA(`Corpo inteiro, da cabeça aos pés, com folga acima e abaixo. Câmera na
altura do peito, lente de retrato (equivalente a 85 mm), sem distorção nas
extremidades. Modelo centralizada. A silhueta inteira precisa ser legível —
sobretudo o comprimento na altura do quadril e a linha reta e fechada da barra.`)}

${ACABA}`,
    entradas: [
      ['still', IMG.stillFrente, 'Still · frente'],
      ['look', IMG.look, 'Look (calça · calçado · bolsa)'],
    ],
    comeDe: 'e0',
    saidas: [
      ['Frontal', 'De frente, em pé, peso distribuído, braços soltos. A leitura mais neutra e completa da peça — é a imagem-âncora da série.'],
      ['Peso numa perna', 'De frente, peso numa perna, quadril deslocado, uma das mãos segurando a alça da bolsa. Postura relaxada de catálogo.'],
      ['Três quartos', 'Corpo girado a três quartos, ombros em diagonal, rosto para a câmera. Mostra como a peça acompanha o corpo de lado.'],
    ],
    portao: 'A camiseta está idêntica ao still: canelado contínuo, listras finas azul-marinho no corpo e ao longo do braço na manga, gola alta canelada, barra reta e FECHADA sem fenda. Modelagem SLIM rente ao corpo, nunca oversized. Comprimento na altura do quadril. Rosto nítido, sem mancha nem deformação. Fundo #F2F2F2. Nenhum texto.',
  },
  {
    id: 'e2', titulo: 'ETAPA 2 · POSES', modelo: PRODUTO,
    nota: `ETAPA 2 — POSES DIFERENTES

Pedido da Hering (e-mail 21/08): "usar o casting apenas como referência para a
modelo, mas ter mais dinamismo... sem que as imagens fiquem muito semelhantes
entre si no site."

Aqui muda SÓ O ÂNGULO FOTOGRÁFICO. A identidade e a peça vêm prontas da etapa 1.

⚠️ SUBA UMA REFERÊNCIA DE POSE no nó vazio — é a entrada que faz esta etapa
funcionar. Sem ela a pose vem só do texto, e o resultado converge para poses
parecidas.`,
    contexto: `PRODUÇÃO DE CATÁLOGO — POSES

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

${PECA}

${CAMERA(`Varia por saída — está escrito no prompt de cada uma. Lente de retrato
(equivalente a 85 mm) em todas, sem distorção. Quando a câmera baixa, ela baixa
de verdade: contra-plongée suave, não recorte da mesma foto.`)}

${ACABA}`,
    entradas: [
      ['pose', null, 'Referência de POSE ← suba aqui'],
      ['still', IMG.stillFrente, 'Still · frente'],
    ],
    comeDe: 'e1',
    saidas: [
      ['Caminhando', 'A modelo CAMINHANDO em direção à câmera: uma perna adiantada em meio passo, peso na perna de trás, braços em movimento natural e assimétrico. Câmera na altura do peito.'],
      ['Contra-plongée', 'De frente, peso numa perna, quadril deslocado. Câmera BAIXA, na altura da cintura, apontando levemente para cima — alonga a silhueta e muda a leitura do comprimento.'],
      ['Ombro', 'Três quartos DE COSTAS, cabeça girada por cima do ombro para a câmera. Mostra a lateral da peça e o alinhamento das listras na costura lateral. Câmera na altura do peito.'],
      ['Aproximada', 'MEIO CORPO, do topo da cabeça até o quadril. O assunto é o TECIDO: canelado, cruzamento com as listras, gola e arremate das mangas legíveis em escala real. Foco nítido na superfície, fundo levemente desfocado.'],
    ],
    portao: 'É a MESMA modelo da referência (rosto, pele, cabelo, biotipo) e a MESMA peça do still, sem deriva de identidade. A pose é claramente diferente das outras saídas. Peça fiel: barra reta e fechada, modelagem slim, listras da manga ao longo do braço. Rosto nítido. Fundo #F2F2F2.',
  },
  {
    id: 'e3', titulo: 'ETAPA 3 · COSTAS', modelo: PRODUTO,
    nota: `ETAPA 3 — COSTAS

Versão da modelo de costas + still da peça de costas.

⚠️ SUBA A VERSÃO DE COSTAS da modelo no nó vazio (base limpa de costas, gerada
na etapa 0 com prompt de costas).

Foi a imagem que o cliente mais criticou na 1ª rodada — saiu oversized porque
a NOSSA descrição dizia "solta". A ficha da Hering diz slim; o texto abaixo já
está corrigido.`,
    contexto: `PRODUÇÃO DE CATÁLOGO — COSTAS

${PECA}

═══ COMO A PEÇA SE LÊ POR TRÁS ═══
As costas são contínuas, com as listras horizontais atravessando de lateral a
lateral e ALINHANDO com as listras da frente. A gola alta canelada aparece por
trás com costura central e a listra contornando a base. A costura lateral é
visível, corre reta da cava até a barra e é FECHADA em toda a extensão — a barra
dobra o canto sem interrupção, sem fenda e sem abertura.
Vestida, a peça é rente às costas: a malha estica e acompanha o corpo.

${LOOK}

${CAMERA(`Corpo inteiro, modelo DE COSTAS para a câmera, câmera na altura do peito,
lente de retrato sem distorção. Evidencia o caimento rente nas costas, a gola
por trás, a barra reta e fechada e o comprimento no quadril.`)}

${ACABA}`,
    entradas: [
      ['modelo', null, 'Modelo de costas ← suba aqui'],
      ['still', IMG.stillCostas, 'Still · costas'],
    ],
    saidas: [
      ['Costas', 'De costas para a câmera, corpo inteiro, em pé, braços soltos ao lado do corpo. Leitura limpa e completa das costas da peça.'],
      ['Costas · três quartos', 'Três quartos de costas, corpo levemente girado, mostrando ao mesmo tempo as costas e a lateral com a costura fechada.'],
    ],
    portao: 'As costas correspondem ao still de costas: listras alinhadas com a frente, gola com costura central, costura lateral FECHADA sem fenda, barra reta. Modelagem slim rente às costas, nunca oversized. Comprimento no quadril. Fundo #F2F2F2. Nenhum texto.',
  },
  {
    id: 'e4', titulo: 'ETAPA 4 · FOTOS LIVRES', modelo: PRODUTO,
    nota: `ETAPA 4 — FOTOS LIVRES

Aqui as referências são as fotos QUE DERAM CERTO — as aprovadas das etapas 1 e 2.
Sobre elas, poses novas.

É onde a qualidade compõe: em vez de recomeçar do zero, cada imagem nova parte
do melhor que já saiu. É o mesmo mecanismo que a Worten pediu como estrela/cânone.`,
    contexto: `PRODUÇÃO DE CATÁLOGO — FOTOS LIVRES

As referências são imagens JÁ APROVADAS desta mesma série: delas vêm a
identidade da modelo, o look completo e o padrão de luz e cor. Mantenha tudo —
a única coisa que muda é a pose, escrita no prompt de cada saída.

${PECA}

${CAMERA(`Varia por saída — está escrito no prompt de cada uma. Lente de retrato
(equivalente a 85 mm) em todas. Mesma luz e mesmo fundo das imagens aprovadas.`)}

${ACABA}`,
    entradas: [['still', IMG.stillFrente, 'Still · frente']],
    comeDe: 'e1',
    comeTambemDe: 'e2',
    saidas: [
      ['Sentada', 'SENTADA num cubo neutro cinza claro, pernas cruzadas, tronco ereto levemente inclinado à frente, mãos apoiadas na perna. Mostra como a peça se comporta sentada. Câmera na altura do rosto dela, sentada.'],
      ['Braços cruzados', 'De frente, braços cruzados na altura da cintura, peso numa perna, quadril deslocado. O cruzamento deixa ver as mangas e as listras que correm ao longo do braço.'],
      ['Movimento', 'Gesto natural, como num intervalo entre poses: uma das mãos passando pelo cabelo, rosto levemente virado e olhar FORA da câmera. Enquadramento de meio corpo.'],
    ],
  },
]

// ═══ MONTAGEM ══════════════════════════════════════════════════════════
const nodes = [], edges = []
const liga = (a, b) => edges.push({ id: `e-${a}-${b}`, source: a, target: b })
const ALTURA = 380
let y = 0
const primeiraSaida = {}

nodes.push({
  id: 'nota_geral', type: 'note', style: { width: 420, height: 300 }, position: { x: -1780, y: -420 },
  data: { text: `PROCESSO DE CATÁLOGO — 4 ETAPAS
Hering · KH6V · montado em 21/08/2026

Cada etapa come a saída da anterior. Rode na ordem, aprove, siga.

A REGRA DOS DOIS NÓS:
· CONTEXTO = o constante — câmera/ângulo + a descrição da peça.
· PROMPT = específico daquela foto.

A PEÇA ESTÁ ESCRITA UMA VEZ e repetida em todos os contextos. Para trocar de
produto, troque esse bloco, os stills e o look — o resto do grafo serve.

TETO DE 5 REFERÊNCIAS por gerador. Aqui nenhum passa de 3, de propósito: o que
excede é descartado em silêncio, e foi assim que um gerador ficou desenhando a
camiseta sem nunca ter visto o still.` },
})

for (const et of ETAPAS) {
  const n = et.saidas.length
  const alturaBanda = n * ALTURA

  nodes.push({ id: `${et.id}_nota`, type: 'note', style: { width: 380, height: 300 },
    position: { x: -1780, y }, data: { text: et.nota } })

  et.entradas.forEach(([chave, url, rotulo], i) => {
    nodes.push({ id: `${et.id}_in_${chave}`, type: 'imageInput', style: { width: 250, height: 250 },
      position: { x: -1340, y: y + i * 290 }, data: { ...(url ? { urls: [url] } : {}), rotulo } })
  })

  nodes.push({ id: `${et.id}_ctx`, type: 'context', style: { width: 300, height: 260 },
    position: { x: -960, y }, data: { text: et.contexto } })
  nodes.push({ id: `${et.id}_fmt`, type: 'formato', style: { width: 250, height: 140 },
    position: { x: -960, y: y + 300 }, data: { formato: 'custom', width: 1720, height: 2432 } })

  et.saidas.forEach(([nome, texto], i) => {
    const p = `${et.id}_p${i + 1}`, g = `${et.id}_g${i + 1}`
    nodes.push({ id: p, type: 'prompt', style: { width: 250, height: 250 },
      position: { x: -600, y: y + i * ALTURA },
      data: { text: `${nome.toUpperCase()}\n\n${texto}` } })
    nodes.push({ id: g, type: 'generate', style: { width: 250, height: 330 },
      position: { x: -260, y: y + i * ALTURA },
      data: { status: 'idle', model: et.modelo } })

    // Ordem das ligações = ordem das referências. Identidade primeiro, peça
    // depois, look por último — e nunca mais de 3.
    if (et.comeDe) liga(primeiraSaida[et.comeDe], g)
    if (et.comeTambemDe) liga(primeiraSaida[et.comeTambemDe], g)
    for (const [chave] of et.entradas) liga(`${et.id}_in_${chave}`, g)
    liga(p, g); liga(`${et.id}_ctx`, g); liga(`${et.id}_fmt`, g)

    if (i === 0) primeiraSaida[et.id] = g
  })

  if (et.portao) {
    const gate = `${et.id}_portao`
    nodes.push({ id: gate, type: 'artGate', style: { width: 250, height: 220 },
      position: { x: 100, y }, data: { status: 'idle', modo: 'fidelidade', criterio: et.portao } })
    liga(primeiraSaida[et.id], gate)
    const refStill = et.entradas.find(([c]) => c === 'still')
    if (refStill) liga(`${et.id}_in_still`, gate)
  }

  y += alturaBanda + 340
}

const { data: ws } = await sb.from('workspaces').select('id').ilike('nome', 'hering').single()
const { data: brand } = await sb.from('brands').select('id').eq('workspace_id', ws.id).limit(1).single()
const { data, error } = await sb.from('studio_workflows').insert({
  workspace_id: ws.id, brand_id: brand.id, is_template: false,
  nome: 'PROCESSO · Catálogo em 4 etapas — Hering KH6V',
  nodes, edges,
}).select('id').single()
if (error) { console.error('ERRO:', error.message); process.exit(1) }

console.log('fluxo criado:', data.id)
console.log('url:', `/app/brands/${brand.id}/studio/workflow/${data.id}`)
console.log('nós:', nodes.length, '| ligações:', edges.length)
for (const et of ETAPAS) console.log(' ', et.titulo, '·', et.saidas.length, 'saídas ·', et.modelo.split('/').pop())
