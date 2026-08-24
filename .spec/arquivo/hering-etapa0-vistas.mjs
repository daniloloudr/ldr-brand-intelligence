// A etapa 0 vira TURNAROUND: cinco vistas da mesma modelo (21/08).
//
// Defeito apontado pelo Danilo: a base limpa saía com três versões TODAS DE
// FRENTE — "Base 1 / peso numa perna / três quartos" são variações de postura,
// não de vista. Sem costas e sem perfil não há como compor as etapas seguintes:
// a etapa 3 (costas) tinha que INVENTAR as costas da modelo a partir de uma foto
// frontal, e é aí que a identidade escapa — cabelo, nuca e biotipo viram chute.
//
// A própria nota da etapa 3 já denunciava o buraco: "suba a versão de costas da
// modelo (gerada na etapa 0 com prompt de costas)". Um passo manual, fora do
// fluxo, para um dado que o fluxo deveria produzir.
//
// Segundo defeito, encontrado ao ler o grafo: `e3_in_modelo` está VAZIO e ligado
// aos dois geradores da etapa 3. Um generate só dispara quando todas as
// referências de imagem conectadas estão prontas, e um imageInput vazio nunca
// fica pronto — então a etapa 3 não roda, e não roda em silêncio: nenhum erro,
// nenhum job, a fila simplesmente pula. A vista de costas da etapa 0 ocupa esse
// lugar e o nó vazio sai.
//
// Rodar da raiz:  node --env-file=.env .spec/arquivo/hering-etapa0-vistas.mjs
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const FLUXO = '7bc39bb5-d1be-43d9-9900-a80b8d717512'
const ALTURA = 380          // espaçamento vertical entre saídas, igual ao da montagem
const NOVAS = 2             // g4 e g5 — o quanto as etapas seguintes descem

// ── As cinco vistas ────────────────────────────────────────────────────
// A vista é o que VARIA por foto, então mora no prompt. O que trava o
// turnaround (altura de câmera, distância, escala, luz, malha) é constante e
// mora no contexto — é a regra dos dois nós aplicada a este caso.
//
// Os graus são a mesma volta em torno de um eixo fixo: a câmera anda, a modelo
// não muda de lugar. Dito assim o modelo mantém escala e enquadramento; dito
// como "pose de lado" ele reenquadra e as vistas deixam de ser componíveis.
const VISTAS = [
  ['VISTA 0° · FRENTE', `Modelo DE FRENTE para a câmera (0°), corpo inteiro, em pé, peso
distribuído igualmente nos dois pés, braços soltos ao lado do corpo, mãos
relaxadas, ombros nivelados, olhar direto para a lente.

Esta é a VISTA-ÂNCORA do turnaround: as outras quatro precisam parecer a mesma
pessoa, no mesmo lugar, no mesmo instante — só a câmera anda em volta.`],

  ['VISTA 45° · TRÊS QUARTOS', `A modelo girada 45° em relação à câmera (três quartos),
ombro esquerdo mais próximo da lente, ombros em diagonal, rosto voltado para a
câmera. Pés no mesmo ponto do chão, peso ainda distribuído, braços soltos.

Mesma escala e mesmo enquadramento da vista 0°: a cabeça e os pés na mesma
altura do quadro. O que mudou foi o ângulo, não a distância.`],

  ['VISTA 90° · PERFIL', `PERFIL EXATO (90°): a modelo de lado para a câmera, ombros
alinhados um atrás do outro, rosto de perfil com o olhar à frente — NÃO para a
câmera. Braços soltos, o braço da frente rente ao corpo, sem cobrir a silhueta.

É a vista que informa a linha do ombro, a curva das costas, a projeção do
quadril e o comprimento real do tronco. A silhueta lateral precisa sair limpa e
legível contra o fundo.`],

  ['VISTA 135° · TRÊS QUARTOS DE COSTAS', `A modelo girada 135°, quase de costas, ombro
direito mais próximo da lente, rosto NÃO voltado para a câmera — vê-se no
máximo o contorno da bochecha e a linha da mandíbula. Braços soltos.

Mostra ao mesmo tempo as costas e a lateral: é a vista que a etapa 2 usa para a
pose por cima do ombro, e a que revela a costura lateral em diagonal.`],

  ['VISTA 180° · COSTAS', `Modelo DE COSTAS para a câmera (180°), corpo inteiro, em pé,
peso distribuído nos dois pés, braços soltos ao lado do corpo, cabeça ereta e
olhar à frente. O rosto não aparece.

O CABELO é a informação crítica desta vista: mesmo comprimento, mesmo volume e
mesmo penteado das outras quatro, caindo naturalmente nas costas como cairia na
pessoa real — sem mudar de corte, sem prender, sem encurtar. A nuca, a linha
dos ombros e a largura das costas precisam ser as MESMAS da vista 135°.`],
]

// ── O contexto novo ────────────────────────────────────────────────────
// O que muda em relação ao anterior: a câmera não trava mais a modelo "em pé de
// frente" (era isso que fazia toda saída sair frontal, por mais que o prompt
// pedisse outra coisa), e entra o bloco de turnaround — sem ele as cinco vistas
// saem parecidas mas não IGUAIS, e uma base que não casa com as outras não
// serve para compor.
const CTX = `BASE DE CASTING LIMPA — as cinco vistas da modelo

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
Imagem limpa: sem texto, sem etiqueta, sem logotipo, sem marca d'água.`

const NOTA0 = `ETAPA 0 — BASE DE CASTING LIMPA (TURNAROUND)

Cinco vistas da modelo SEM os adereços de roupa dela, numa malha colada ao corpo:
0° frente · 45° três quartos · 90° perfil · 135° três quartos de costas · 180° costas.
Gerado com nano banana 2.5, que foca melhor em pessoa e casting.

POR QUE CINCO: a roupa do casting vaza na peça gerada, e contaminação visual não
se resolve no prompt — se resolve tirando o dado da referência. E porque sem
costas e sem perfil as etapas seguintes têm que INVENTAR a modelo por trás: era
o que acontecia, e é onde a identidade escapava.

PARA ONDE VAI CADA UMA:
· 0° FRENTE → etapa 1 (é a âncora; sai daqui o resto da série).
· 180° COSTAS → etapa 3, automático. Não precisa mais subir nada à mão.
· 45°, 90° e 135° → base para as poses da etapa 2 e as livres da etapa 4.

As cinco precisam casar entre si. Se uma sair com outro cabelo ou outra escala,
regere SÓ ela — o contexto já trava o que tem que ser igual.`

// ═══ APLICAÇÃO ═════════════════════════════════════════════════════════
const { data: f, error: eRead } = await sb.from('studio_workflows')
  .select('nodes,edges').eq('id', FLUXO).single()
if (eRead) { console.error('ERRO ao ler o fluxo:', eRead.message); process.exit(1) }

const g1 = f.nodes.find(n => n.id === 'e0_g1')
if (!g1) { console.error('ERRO: e0_g1 não existe — fluxo errado?'); process.exit(1) }
const p1 = f.nodes.find(n => n.id === 'e0_p1')
const MODELO = g1.data?.model

// 1. As etapas 1-4 descem para abrir espaço para as duas saídas novas.
let nodes = f.nodes.map(n => /^e[1-4]_/.test(n.id)
  ? { ...n, position: { ...n.position, y: n.position.y + NOVAS * ALTURA } }
  : n)

// 2. Prompts das vistas: reescreve p1..p3, cria p4/p5 no mesmo padrão.
//    Os geradores 1-3 ficam onde estão (e1 já come de e0_g1); só o pedido muda.
nodes = nodes.map(n => {
  const m = n.id.match(/^e0_p([1-5])$/)
  if (m) {
    const [nome, texto] = VISTAS[Number(m[1]) - 1]
    return { ...n, data: { ...n.data, text: `${nome}\n\n${texto}` } }
  }
  if (n.id === 'e0_ctx') return { ...n, data: { ...n.data, text: CTX } }
  if (n.id === 'e0_nota') return { ...n, data: { ...n.data, text: NOTA0 } }
  return n
})

// 3. As duas saídas novas, no mesmo espaçamento das existentes.
const yBase = p1.position.y
for (const i of [3, 4]) {                       // índices 0-based → g4 e g5
  const [nome, texto] = VISTAS[i]
  const p = `e0_p${i + 1}`, g = `e0_g${i + 1}`
  if (nodes.some(n => n.id === g)) continue     // idempotente: já rodou
  nodes.push(
    { id: p, type: 'prompt', style: { width: 250, height: 250 },
      position: { x: p1.position.x, y: yBase + i * ALTURA },
      data: { text: `${nome}\n\n${texto}` } },
    { id: g, type: 'generate', style: { width: 250, height: 330 },
      position: { x: g1.position.x, y: yBase + i * ALTURA },
      data: { status: 'idle', model: MODELO } },
  )
}

// 4. Ligações. Mesma ordem da montagem original: entrada, prompt, contexto, formato.
const edges = [...f.edges]
const liga = (a, b) => { if (!edges.some(e => e.source === a && e.target === b)) edges.push({ id: `e-${a}-${b}`, source: a, target: b }) }
for (const i of [4, 5]) {
  liga('e0_in_casting', `e0_g${i}`); liga(`e0_p${i}`, `e0_g${i}`)
  liga('e0_ctx', `e0_g${i}`); liga('e0_fmt', `e0_g${i}`)
}

// 5. A etapa 3 passa a comer a vista de costas — e o nó vazio que a travava sai.
//    Identidade primeiro na ordem das referências, como no resto do processo.
const antes = edges.length
let arestas = edges.filter(e => e.source !== 'e3_in_modelo' && e.target !== 'e3_in_modelo')
const removidas = antes - arestas.length
nodes = nodes.filter(n => n.id !== 'e3_in_modelo')

for (const g of ['e3_g1', 'e3_g2']) {
  if (!nodes.some(n => n.id === g)) continue
  const resto = arestas.filter(e => e.target === g)
  arestas = arestas.filter(e => e.target !== g)
  arestas.push({ id: `e-e0_g5-${g}`, source: 'e0_g5', target: g }, ...resto)
}

// 6. Confere o teto de 5 referências de imagem antes de gravar — estourar é
//    falha silenciosa: o excedente é descartado e o gerador trabalha cego.
const tipoDe = Object.fromEntries(nodes.map(n => [n.id, n.type]))
const EH_IMAGEM = new Set(['imageInput', 'generate', 'app', 'artGate', 'preview'])
for (const g of nodes.filter(n => n.type === 'generate')) {
  const refs = arestas.filter(e => e.target === g.id && EH_IMAGEM.has(tipoDe[e.source]))
  if (refs.length > 5) {
    console.error(`ERRO: ${g.id} ficaria com ${refs.length} referências (teto 5):`, refs.map(r => r.source).join(', '))
    process.exit(1)
  }
}

// O Supabase é único: gravar aqui é gravar em produção. `--simular` roda a
// transformação inteira e mostra o resultado sem tocar no banco.
const SIMULAR = process.argv.includes('--simular')
if (!SIMULAR) {
  const { error } = await sb.from('studio_workflows').update({ nodes, edges: arestas }).eq('id', FLUXO)
  if (error) { console.error('ERRO ao gravar:', error.message); process.exit(1) }
} else {
  console.log('«SIMULAÇÃO — nada foi gravado»\n')
}

console.log('etapa 0 → turnaround de 5 vistas')
for (const [nome] of VISTAS) console.log('  ·', nome)
console.log(`\netapa 3: ${removidas} ligação(ões) do nó vazio removidas — agora come de e0_g5 (costas)`)
console.log('etapas 1-4 descidas', NOVAS * ALTURA, 'px para abrir a banda da etapa 0')
console.log('nós:', nodes.length, '| ligações:', arestas.length)
