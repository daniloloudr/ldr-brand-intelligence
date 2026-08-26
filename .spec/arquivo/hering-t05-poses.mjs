// t05 — bloco de POSES DIVERSAS (21/08/2026).
//
// Pedido da Hering: "usar o casting apenas como referência para a modelo/persona,
// mas ter mais dinamismo na construção das imagens... vamos gerar diferentes
// looks com a mesma modelo, mas sem que as imagens fiquem muito semelhantes."
//
// É a contrapartida do método da base limpa: ela resolveu a fidelidade TRAVANDO
// tudo (pessoa, pose, calça, calçado, fundo). O cliente quer travar só a
// identidade. Este bloco separa os dois: a base limpa entra como ÂNCORA DE
// IDENTIDADE e a pose vem do prompt, uma por saída.
//
// Seis saídas, seis poses. Mesma modelo, mesma peça, mesmo fundo — leituras
// diferentes. Serve para responder à pergunta dela ("a ferramenta precisa de
// direcional específico ou consegue de forma mais fluida?") com imagem.
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const ID = 'b3d8baf2-583a-4e92-9e71-c8206890b917'
const MODEL = 'bytedance/seedream/v5/pro/text-to-image'

const { data: f } = await sb.from('studio_workflows').select('nodes,edges').eq('id', ID).single()

// Reaproveita a verdade sobre a peça já escrita no contexto de corpo inteiro —
// duplicar texto é convite a divergirem quando um for ajustado.
const base = f.nodes.find(n => n.id === 'ctx').data.text
const PECA = base.slice(base.indexOf('═══ A PEÇA'), base.indexOf('═══ ENQUADRAMENTO')).trim()

const Y = 3600                     // abaixo de tudo que já existe no canvas
const P = (x, y) => ({ x, y })
const liga = (a, b) => ({ id: `e-${a}-${b}-poses`, source: a, target: b })

const CONTEXTO = `PRODUÇÃO DE CATÁLOGO — HERING · KH6V · POSES DIVERSAS

O QUE TRAVA E O QUE VARIA — a regra deste bloco:
• TRAVA: a IDENTIDADE da modelo (rosto, tom de pele, cabelo e sua textura,
  biotipo e proporções) vem da 1ª referência e não muda entre as saídas.
  É a mesma pessoa em todas — reconhecível como a mesma no site.
• TRAVA: a PEÇA, que vem 100% do still, com a fidelidade descrita abaixo.
• TRAVA: fundo cinza claro neutro #F2F2F2 e luz de estúdio suave e difusa.
• VARIA: pose, gesto, ângulo do corpo, direção do olhar e enquadramento.
  Cada saída precisa ser visivelmente diferente das outras — é o objetivo
  deste bloco. Duas imagens quase iguais são falha, não acerto.

A 1ª referência é a foto de casting: dela aproveite SOMENTE a pessoa. A roupa
que ela veste ali, a pose e o enquadramento NÃO devem ser copiados — a pose
vem do texto de cada saída.

${PECA}

═══ ACABAMENTO ═══
Proporções humanas corretas, mãos íntegras, pose natural de catálogo de moda.
Rosto nítido e sem deformação: traços limpos, pele uniforme, sem manchas,
sem borrão, sem assimetria. Foco preciso nos olhos.
Fundo cinza claro neutro sólido #F2F2F2. Luz de estúdio suave e difusa, que
revele o relevo do canelado sem estourar o off-white.
Imagem limpa: sem texto, sem etiqueta, sem logotipo, sem marca d'água.`

// Seis poses de catálogo, escolhidas para serem DISTINTAS entre si em três
// eixos ao mesmo tempo: ângulo do corpo, altura da câmera e gesto das mãos.
// Variar só o gesto produz seis fotos parecidas — que é a queixa do cliente.
const POSES = [
  ['Caminhando', `Corpo inteiro, a modelo CAMINHANDO em direção à câmera: uma perna
adiantada em meio passo, o peso na perna de trás, os braços soltos em movimento
natural e assimétrico. O tecido acompanha o movimento. Olhar à frente, expressão
neutra e confiante. Câmera na altura do peito.`],

  ['Três quartos', `Corpo inteiro, corpo girado a três quartos para a esquerda, ombros
em diagonal para a câmera, rosto voltado para a lente. Peso numa perna só, quadril
deslocado, a outra perna relaxada à frente. Uma das mãos no bolso da calça.
Câmera na altura da cintura, leve contra-plongée.`],

  ['Ombro', `Corpo inteiro, a modelo de três quartos DE COSTAS, cabeça girada por cima
do ombro em direção à câmera. Mostra a lateral e parte das costas da peça, o
alinhamento das listras na lateral e o comprimento no quadril. Mãos soltas ao
lado do corpo. Câmera na altura do peito.`],

  ['Braços cruzados', `Corpo inteiro, de frente, braços cruzados na altura da cintura,
peso numa perna, quadril deslocado para o lado. Postura firme e relaxada, ombros
abertos. O cruzamento dos braços deixa ver as mangas e a manga onde as listras
correm ao longo do braço. Olhar direto para a câmera.`],

  ['Sentada', `Corpo inteiro, a modelo SENTADA num cubo neutro cinza claro, pernas
cruzadas, tronco ereto e levemente inclinado à frente, mãos apoiadas na perna.
Mostra como a peça se comporta sentada: a barra na altura do quadril e a malha
rente ao corpo. Câmera na altura do rosto dela, sentada.`],

  ['Movimento', `Meio corpo, do topo da cabeça até o quadril, a modelo em gesto natural:
uma das mãos passando pelo cabelo, o rosto levemente virado e o olhar FORA da
câmera, como num intervalo entre poses. Enquadramento mais próximo, que deixa o
canelado e o cruzamento das listras legíveis em escala real.`],
]

const novos = [
  { id: 'poses_nota', type: 'note', style: { width: 380, height: 260 }, position: P(-820, Y - 60),
    data: { text: `POSES DIVERSAS — resposta ao e-mail da Hering (21/08)

Ela perguntou se dá para variar pose mantendo a modelo. Este bloco existe para
responder com imagem, não com texto.

TRAVA: identidade + peça + fundo.
VARIA: pose, gesto, ângulo, olhar, enquadramento.

Cada saída varia em TRÊS eixos ao mesmo tempo (ângulo do corpo, altura da
câmera, gesto) — variar só o gesto devolve seis fotos parecidas, que é
exatamente a queixa dela.

1ª referência = base limpa (identidade) · 2ª = still (peça).` } },

  { id: 'poses_ctx', type: 'context', style: { width: 300, height: 240 }, position: P(-400, Y),
    data: { text: CONTEXTO } },

  { id: 'poses_fmt', type: 'formato', style: { width: 250, height: 140 }, position: P(-400, Y + 300),
    data: { formato: 'custom', width: 1720, height: 2432 } },

  ...POSES.flatMap(([nome, texto], i) => ([
    { id: `poses_p${i + 1}`, type: 'prompt', style: { width: 250, height: 230 },
      position: P(-40, Y + i * 380),
      data: { text: `POSE ${i + 1} — ${nome.toUpperCase()}\n\n${texto.trim()}` } },
    { id: `poses_g${i + 1}`, type: 'generate', style: { width: 250, height: 330 },
      position: P(300, Y + i * 380),
      data: { status: 'idle', model: MODEL } },
  ])),
]

// Ordem das ligações = ordem das referências: 1ª identidade, 2ª peça.
// (foi assim que o Seedream 5 deu 3/3 no teste de 19/08)
const novasEdges = POSES.flatMap((_, i) => {
  const g = `poses_g${i + 1}`
  return [
    liga('in_modelo1', g),     // base limpa — identidade
    liga('in_still', g),       // still de frente — a peça
    liga(`poses_p${i + 1}`, g),
    liga('poses_ctx', g),
    liga('poses_fmt', g),
  ]
})

const faltando = ['in_modelo1', 'in_still'].filter(id => !f.nodes.some(n => n.id === id))
if (faltando.length) { console.error('ERRO: nós de entrada ausentes:', faltando); process.exit(1) }

const nodes = [...f.nodes, ...novos]
const edges = [...f.edges, ...novasEdges]
const { error } = await sb.from('studio_workflows').update({ nodes, edges }).eq('id', ID)
if (error) { console.error('ERRO:', error.message); process.exit(1) }

console.log('bloco de poses criado:', POSES.length, 'saídas')
for (const [n] of POSES) console.log('  ·', n)
console.log('nós:', f.nodes.length, '→', nodes.length, '| ligações:', f.edges.length, '→', edges.length)
