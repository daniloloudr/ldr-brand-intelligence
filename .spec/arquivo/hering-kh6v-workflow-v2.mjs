import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const WF = '5de24372-a3ab-43d6-afec-c0960125aa59'

const { data: atual } = await sb.from('studio_workflows').select('nodes').eq('id', WF).single()
// Preserva o que já foi carregado — refazer o grafo não pode custar re-upload.
const urlDe = {}
for (const n of atual.nodes.filter(n => n.type === 'imageInput')) {
  const u = n.data?.imageUrl || n.data?.urls?.[0]
  if (u) urlDe[n.id] = n.data
}

const P = (x, y) => ({ x, y })
const nota = (id, x, y, text, w = 380, h = 300) => ({ id, type: 'note', data: { text }, style: { width: w, height: h }, position: P(x, y) })
const entrada = (id, x, y, herdaDe) => ({ id, type: 'imageInput', data: herdaDe ? { ...urlDe[herdaDe] } : {}, style: { width: 250, height: 250 }, position: P(x, y) })
const prompt = (id, x, y, text) => ({ id, type: 'prompt', data: { text }, style: { width: 250, height: 250 }, position: P(x, y) })
const contexto = (id, x, y, text) => ({ id, type: 'context', data: { text }, style: { width: 280, height: 220 }, position: P(x, y) })
const formato = (id, x, y, width, height) => ({ id, type: 'formato', data: { formato: 'custom', width, height }, style: { width: 250, height: 140 }, position: P(x, y) })
const gerar = (id, x, y, model) => ({ id, type: 'generate', data: { status: 'idle', model }, style: { width: 250, height: 140 }, position: P(x, y) })
const portao = (id, x, y, criterio) => ({ id, type: 'artGate', data: { status: 'idle', modo: 'fidelidade', criterio }, style: { width: 250, height: 200 }, position: P(x, y) })
const recorte = (id, x, y, width, height) => ({ id, type: 'app', data: { op: 'crop', label: 'Recortar', status: 'idle', width, height, focal: 'attention' }, style: { width: 250, height: 160 }, position: P(x, y) })
const previa = (id, x, y) => ({ id, type: 'preview', data: { imageUrl: null }, style: { width: 250, height: 250 }, position: P(x, y) })
const liga = (a, b) => ({ id: `e-${a}-${b}`, source: a, target: b })

// A regra que faltava na v1 e produziu três reprovações: a foto de casting é
// uma foto de CATÁLOGO — a modelo está vestindo OUTRA peça. Sem dizer isso, o
// modelo copia a roupa dela (saiu regata creme no lugar da camiseta listrada).
const CONTEXTO = `PRODUÇÃO DE CATÁLOGO — HERING · produto KH6V

A PEÇA VEM DO STILL, E SÓ DELE. O still é o produto real fotografado em estúdio:
camiseta de manga curta, off-white, listras horizontais finas azul-marinho, gola
alta canelada. Estampa, cor, modelagem, gola, mangas, costuras e comprimento saem
IDÊNTICOS ao still. Não reinterprete, não "melhore", não ajuste caimento.

⚠️ A FOTO DE CASTING É REFERÊNCIA DE PESSOA, NUNCA DE ROUPA. Nela a modelo aparece
vestindo outra peça (uma regata clara) — IGNORE COMPLETAMENTE essa roupa. Dela
aproveite apenas: rosto, tom de pele, cabelo, biotipo e pose. A roupa é a do still.

Fundo: cinza claro neutro sólido #F2F2F2, sem gradiente, sem textura, sem sombra
projetada dura. Luz de estúdio suave e difusa, sem estourar os brancos da peça.

SEM NENHUM TEXTO, letra, número, etiqueta legível, logotipo aplicado ou marca
d'água na imagem.`

const nodes = [
  nota('nota', -420, -460,
`TESTE KH6V — HERING · v2 (corrigida)

O QUE MUDOU depois da 1ª rodada, em que os 3 portões reprovaram:
· A modelo agora tem DUAS entradas — frente e costas. Antes era uma só, e a foto
  de costas alimentava também as linhas de frente: o try-on não tinha como vestir.
· O STILL passou a ser referência DIRETA também nas composições finais (antes elas
  recebiam só a saída do try-on e perdiam a peça de vista).
· O contexto agora diz explicitamente que a roupa da foto de casting é para ser
  IGNORADA — foi ela que virou "regata creme" no lugar da camiseta listrada.

SUBA: imagem 1 ou 2 do casting no nó "Modelo (FRENTE)". Os demais já estão lá.

Entrega: 1920×2720, fundo #F2F2F2.
⚠️ 350 KB ainda não é garantido pelo nó Recortar — confira no final.`, 400, 380),

  nota('nota_in', -420, -40, 'ENTRADAS\n\nOrdem das ligações importa:\nno try-on a 1ª referência é a MODELO\ne a 2ª é a PEÇA (o still).', 250, 160),
  entrada('in_modelo_frente', -420, 160),                    // vazio: subir imagem 1 ou 2
  entrada('in_modelo_costas', -420, 440, 'in_modelo'),       // herda a imagem 3 já carregada
  entrada('in_frente',        -420, 720, 'in_frente'),
  entrada('in_costas',        -420, 1000, 'in_costas'),
  entrada('in_bolsa',         -420, 1280, 'in_bolsa'),
  entrada('in_calcado',       -420, 1560, 'in_calcado'),

  contexto('ctx', -80, -160, CONTEXTO),

  // 1 · PLANO INTEIRO
  prompt('p1', -80, 140,
`Plano inteiro de catálogo: a modelo em pé, DE FRENTE, corpo inteiro da cabeça aos
pés com folga acima e abaixo, vestindo a camiseta listrada KH6V do still.

Look completo: a peça como protagonista, com a bolsa e o calçado das referências —
acessórios nítidos, sem competir com a peça.

Enquadramento vertical, modelo centralizada, distância que permita ler a silhueta
inteira do produto.`),
  formato('f1', 240, 140, 1920, 2720),
  gerar('g1_tryon', 240, 360, 'fal-ai/fashn/tryon/v1.6'),
  gerar('g1_look',  560, 240, 'fal-ai/nano-banana-pro'),
  portao('gate1', 880, 240, 'A peça está idêntica ao still: listras horizontais azul-marinho, gola alta canelada, manga curta, off-white. NÃO pode ser regata nem decote em V. Acessórios presentes. Fundo #F2F2F2. Nenhum texto.'),
  recorte('crop1', 1200, 240, 1920, 2720),
  previa('pv1', 1520, 240),

  // 2 · APROXIMADA
  prompt('p2', -80, 700,
`Imagem aproximada da peça KH6V vestida: enquadramento do tórax à cintura, mostrando
TECIDO e ACABAMENTO em detalhe — canelado do material, textura, costuras, barra e as
listras horizontais em escala real.

Foco nítido na superfície do tecido, profundidade de campo curta ao fundo.
Não é close de rosto: o assunto é a peça.`),
  formato('f2', 240, 700, 1920, 2720),
  gerar('g2', 560, 700, 'fal-ai/nano-banana-pro'),
  portao('gate2', 880, 700, 'Textura canelada e listras horizontais azul-marinho correspondem ao still, sem inventar trama nem alterar cor. Gola alta visível se entrar no enquadramento. Fundo #F2F2F2. Nenhum texto.'),
  recorte('crop2', 1200, 700, 1920, 2720),
  previa('pv2', 1520, 700),

  // 3 · COSTAS
  prompt('p3', -80, 1200,
`Vista de costas: a modelo de costas para a câmera, corpo inteiro, vestindo a camiseta
listrada KH6V, evidenciando como a peça é ATRÁS — caimento nas costas, gola alta por
trás, costuras e comprimento.

Mesma modelo, mesma luz e mesmo fundo das outras imagens.`),
  formato('f3', 240, 1200, 1920, 2720),
  gerar('g3_tryon', 240, 1420, 'fal-ai/fashn/tryon/v1.6'),
  gerar('g3_look',  560, 1300, 'fal-ai/nano-banana-pro'),
  portao('gate3', 880, 1300, 'As costas da peça correspondem ao still de costas: listras, gola alta, caimento, comprimento e cor. NÃO pode ser regata de alça. Fundo #F2F2F2. Nenhum texto.'),
  recorte('crop3', 1200, 1300, 1920, 2720),
  previa('pv3', 1520, 1300),
]

const edges = [
  // 1 · try-on: modelo de FRENTE + still de frente
  liga('in_modelo_frente', 'g1_tryon'), liga('in_frente', 'g1_tryon'),
  // composição: o STILL entra de novo, para a peça não se perder
  liga('g1_tryon', 'g1_look'), liga('in_frente', 'g1_look'),
  liga('in_bolsa', 'g1_look'), liga('in_calcado', 'g1_look'),
  liga('p1', 'g1_look'), liga('ctx', 'g1_look'), liga('f1', 'g1_look'),
  liga('g1_look', 'gate1'), liga('in_frente', 'gate1'),
  liga('gate1', 'crop1'), liga('crop1', 'pv1'),

  // 2 · aproximada: still primeiro (referência dominante), modelo de frente depois
  liga('in_frente', 'g2'), liga('in_modelo_frente', 'g2'),
  liga('p2', 'g2'), liga('ctx', 'g2'), liga('f2', 'g2'),
  liga('g2', 'gate2'), liga('in_frente', 'gate2'),
  liga('gate2', 'crop2'), liga('crop2', 'pv2'),

  // 3 · costas: modelo de COSTAS + still de costas
  liga('in_modelo_costas', 'g3_tryon'), liga('in_costas', 'g3_tryon'),
  liga('g3_tryon', 'g3_look'), liga('in_costas', 'g3_look'),
  liga('p3', 'g3_look'), liga('ctx', 'g3_look'), liga('f3', 'g3_look'),
  liga('g3_look', 'gate3'), liga('in_costas', 'gate3'),
  liga('gate3', 'crop3'), liga('crop3', 'pv3'),
]

const { error } = await sb.from('studio_workflows')
  .update({ nome: 'Hering · KH6V — 3 imagens de catálogo (v2)', nodes, edges }).eq('id', WF)
if (error) { console.error('ERRO:', error.message); process.exit(1) }

const herdadas = nodes.filter(n => n.type === 'imageInput' && (n.data?.imageUrl || n.data?.urls?.[0]))
console.log('workflow v2 gravado ·', nodes.length, 'nós ·', edges.length, 'ligações')
console.log('entradas preservadas:', herdadas.map(n => n.id).join(', '))
console.log('entrada a preencher :', nodes.filter(n => n.type==='imageInput' && !(n.data?.imageUrl||n.data?.urls?.[0])).map(n=>n.id).join(', ') || 'nenhuma')
