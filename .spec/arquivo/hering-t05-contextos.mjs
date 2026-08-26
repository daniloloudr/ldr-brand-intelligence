// t05 — corrige os contextos do KH6V com o material da Hering (21/08/2026).
//
// Origem: e-mail de retorno do time da Hering sobre a 1ª rodada. Quatro pontos:
// poses pouco variadas, nitidez/rosto, textura do tecido e MODELAGEM oversized.
//
// O que a inspeção do still (em aumento) provou, e que muda o texto:
//  1. NÃO EXISTE fenda lateral. A barra é faixa acabada contínua que dobra no
//     canto e fecha. O contexto de costas afirmava uma "pequena abertura" —
//     era falso, e o modelo estava sendo fiel à minha descrição errada.
//  2. A MANGA tem as listras giradas 90°: correm ao longo do braço,
//     perpendiculares às do corpo, e mais próximas entre si. Assinatura da peça.
//  3. O still está fotografado DEITADO. Ribana relaxada na mesa lê como larga —
//     foi daí que saiu "levemente ampla" na ficha, e daí o oversized gerado.
//
// A ficha da Hering diz o contrário: modelagem SLIM, rente ao corpo. E as
// medidas provam: 39 cm de largura deitada = 78 cm de circunferência contra um
// busto P de ~86 cm. A peça é MENOR que o corpo — a malha veste esticada.
// Centímetro não diz nada a um modelo de imagem; âncora visual diz.
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const ID = 'b3d8baf2-583a-4e92-9e71-c8206890b917'

// ── O bloco de verdade sobre a peça, idêntico em todos os contextos ──────
// Fonte única: ficha técnica da Hering + inspeção do still. Se divergir do
// still, o still manda no que é visível; a ficha manda no que é modelagem.
const PECA = `═══ A PEÇA — FIDELIDADE É O CRITÉRIO PRINCIPAL ═══
Camiseta feminina de manga curta em RIBANA (poliamida + elastano): malha
canelada fina, off-white quente de creme, com listras horizontais finas em
azul-marinho de fio tinto.

MODELAGEM — SLIM, RENTE AO CORPO. Este é o ponto que mais erra, leia com
atenção: no still a peça está DEITADA sobre a mesa, e ribana relaxada parece
larga. Ela NÃO é larga. Tamanho P mede 39 cm de largura deitada, ou seja 78 cm
de circunferência, contra um busto de cerca de 86 cm — a peça é MENOR que o
corpo e a malha veste ESTICADA. O canelado abre sobre o busto e a silhueta do
corpo aparece. Nada de folga nas laterais, nada de volume, nada de oversized.

COMPRIMENTO — 54,5 cm no P: a barra termina na ALTURA DO OSSO DO QUADRIL,
cobrindo o cós da calça e nada além. Não é cropped e não passa do quadril.
A peça é mais alta que larga (proporção aproximada de 1,4 para 1).

MANGA — 18,5 cm: termina no MEIO DO BÍCEPS, bem acima do cotovelo. Rente ao
braço, acompanhando o contorno; não é ampla nem solta.

TEXTURA — o canelado é a assinatura e cobre a peça INTEIRA: frente, costas,
mangas, ombros, barra e gola. Nervuras verticais finas, muito próximas, de
relevo baixo. As listras NÃO interrompem o canelado: a nervura continua
visível por baixo do azul. Ler como microcanelado vertical contínuo COM
listras horizontais por cima — nunca como jersey liso com linhas pintadas.

LISTRAS DA MANGA — detalhe distintivo, não erre: na manga as listras correm
AO LONGO DO BRAÇO, perpendiculares às listras horizontais do corpo, e ficam
mais próximas entre si. O canelado da manga corre cruzando essas listras.

GOLA — alta e canelada (mock neck), curta, com uma listra azul-marinho
contornando a base. Vista por trás tem costura central. Sem colarinho.

BARRA — RETA e no mesmo nível em toda a volta, acabada com uma faixa contínua
e uma listra correndo rente a ela. A costura lateral é fechada de ponta a
ponta e a barra dobra o canto sem interrupção: NÃO HÁ fenda, abertura, vento
nem racho lateral em nenhum dos lados. A barra é uma linha reta e fechada.

OMBRO — costura visível descendo do pescoço para o braço; a listra acompanha.
SEM bolso, sem recorte decorativo, sem aplicação, sem bordado, sem logotipo.`

const ORIGEM = ori => `═══ DE ONDE VEM CADA ELEMENTO ═══
• A CAMISETA (tronco inteiro): 100% do ${ori}. Nenhum detalhe da parte de cima
  vem da foto de casting — ali a modelo veste outra peça, que deve ser ignorada.
• ROSTO, CABELO, TOM DE PELE, BIOTIPO: da foto de casting ligada a este ramo.
• CALÇA, CALÇADO, BOLSA: das referências de acessório e da foto de casting.
• FUNDO E LUZ: especificados no fim.`

const ACABA = `═══ ACABAMENTO ═══
Proporções humanas corretas, mãos íntegras, pose natural de catálogo.
Rosto nítido e sem deformação: traços limpos, pele uniforme, sem manchas,
sem borrão e sem assimetria. Foco preciso nos olhos.
Fundo cinza claro neutro sólido #F2F2F2. Luz de estúdio suave e difusa, que
revele o relevo do canelado sem estourar o off-white.
Imagem limpa: sem texto, sem etiqueta, sem logotipo, sem marca d'água.`

const CTX = {
  // CORPO INTEIRO
  'ctx': `PRODUÇÃO DE CATÁLOGO — HERING · produto KH6V · CORPO INTEIRO

${ORIGEM('STILL DE FRENTE')}

${PECA}

═══ ENQUADRAMENTO — CORPO INTEIRO ═══
Modelo em pé, de frente, da cabeça aos pés, com folga acima e abaixo. Vestida
por completo: camiseta KH6V, calça jeans reta de lavado médio e calçado.
A silhueta inteira precisa ser legível — sobretudo o comprimento na altura do
quadril e a linha reta e fechada da barra.

${ACABA}`,

  // MEIO CORPO — o enquadramento que existe para provar TEXTURA
  'context-1787168153329': `PRODUÇÃO DE CATÁLOGO — HERING · produto KH6V · MEIO CORPO

${ORIGEM('STILL DE FRENTE')}

${PECA}

═══ ENQUADRAMENTO — MEIO CORPO ═══
Do topo da cabeça até o quadril, de frente. O ASSUNTO É O TECIDO: este
enquadramento existe para provar a textura. O canelado, o cruzamento com as
listras, a gola e o arremate das mangas precisam ficar legíveis em escala
real, com foco nítido na superfície e fundo levemente desfocado.
Como a peça veste esticada, o canelado abre sobre o busto — mostre isso.

${ACABA}`,

  // COSTAS
  'context-1787169515682': `PRODUÇÃO DE CATÁLOGO — HERING · produto KH6V · COSTAS

${ORIGEM('STILL DE COSTAS')}

${PECA}

═══ COMO A PEÇA SE LÊ POR TRÁS ═══
As costas são contínuas, com as listras horizontais atravessando de lateral a
lateral e ALINHANDO com as listras da frente. A gola alta canelada aparece por
trás com costura central e a listra contornando a base. A costura lateral é
visível, corre reta da cava até a barra e é FECHADA em toda a extensão — a
barra dobra o canto sem interrupção, sem fenda e sem abertura.
Vestida, a peça é rente às costas: a malha estica e acompanha o corpo.

═══ ENQUADRAMENTO — COSTAS ═══
Modelo DE COSTAS para a câmera, corpo inteiro. Evidencia o caimento rente nas
costas, a gola por trás, a barra reta e fechada e o comprimento no quadril.
Mesma modelo, mesma calça, mesmo calçado, mesma luz e mesmo fundo da série.

${ACABA}`,
}

const { data: f } = await sb.from('studio_workflows').select('nodes').eq('id', ID).single()
const nodes = f.nodes.map(n => {
  if (CTX[n.id]) return { ...n, data: { ...n.data, text: CTX[n.id] } }
  // O teto do Seedream 5 Pro é ~4,19 MP: pedir 1920×2720 (5,22 MP) faz ele
  // REDUZIR CALADO para 1720×2432. Pedir o nativo tira a redução silenciosa
  // do caminho — a subida para 1920×2720 vira passo de ampliação depois.
  if (n.type === 'formato' && n.data?.width === 1920)
    return { ...n, data: { ...n.data, width: 1720, height: 2432 } }
  return n
})

// A ficha técnica visual foi deduzida das FOTOS, e foto de peça deitada mente
// sobre modelagem. Corrige só o que a ficha da Hering contradiz — o resto
// (textura, construção) foi lido certo e continua valendo.
const FICHA = 'context-1787176925574'
const TROCAS = [
  ['Camiseta de **modelagem reta**, sem acinturamento aparente.',
   'Camiseta de **modelagem SLIM**, rente ao corpo (confirmado pela ficha técnica da Hering).'],
  ['O corpo mantém largura relativamente constante entre a região do busto e a barra, formando uma silhueta limpa e levemente ampla.',
   'ATENÇÃO — no still a peça está DEITADA, e ribana relaxada parece larga. Vestida ela é rente: 39 cm de largura deitada = 78 cm de circunferência contra um busto P de ~86 cm, ou seja a malha veste ESTICADA e a silhueta do corpo aparece.'],
  ['- mangas relativamente amplas, sem ajuste ao braço;',
   '- mangas rentes ao braço, terminando no meio do bíceps (18,5 cm);'],
  ['- comprimento regular;',
   '- comprimento 54,5 cm no P: a barra termina na altura do osso do quadril;'],
]
const idx = nodes.findIndex(n => n.id === FICHA)
if (idx >= 0) {
  let t = nodes[idx].data.text
  for (const [de, para] of TROCAS) {
    if (!t.includes(de)) { console.log('⚠️  não achei na ficha:', de.slice(0, 50)); continue }
    t = t.replace(de, para)
  }
  nodes[idx] = { ...nodes[idx], data: { ...nodes[idx].data, text: t } }
}

const { error } = await sb.from('studio_workflows').update({ nodes }).eq('id', ID)
if (error) { console.error('ERRO:', error.message); process.exit(1) }
for (const id of Object.keys(CTX)) console.log('contexto atualizado:', id, '·', CTX[id].length, 'chars')
console.log('formatos → 1720×2432 (nativo do Seedream 5 Pro)')
console.log('ficha técnica: modelagem corrigida')
