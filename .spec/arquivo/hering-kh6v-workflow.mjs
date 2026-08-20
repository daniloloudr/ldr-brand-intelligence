// Monta o workflow do teste KH6V (piloto Hering) direto no ambiente da marca.
//
// Base: o e-mail do time da Hering (19/08/2026) — stills de frente e costas do
// KH6V, casting de modelo IA aprovado pelo Marketing, referências de bolsa e
// calçado, fundo #F2F2F2, 1920×2720, até 350 KB.
//
// Convenções do canvas que este grafo respeita:
//  · a ORDEM DAS EDGES define a ordem das referências. No try-on, 1ª = modelo,
//    2ª = peça. Por isso as edges do try-on entram nessa sequência.
//  · o artGate pega como REFERÊNCIA o primeiro `imageInput` a montante — por
//    isso o still é ligado direto no portão, além de alimentar a geração.
//  · `formato: 'custom'` manda px exatos (image_size na fal) em vez de proporção.
//  · MAX_REF = 5.
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const P = (x, y) => ({ x, y })
const nota = (id, x, y, text, w = 380, h = 300) =>
  ({ id, type: 'note', data: { text }, style: { width: w, height: h }, position: P(x, y) })
const entrada = (id, x, y) => ({ id, type: 'imageInput', data: {}, style: { width: 250, height: 250 }, position: P(x, y) })
const prompt = (id, x, y, text) => ({ id, type: 'prompt', data: { text }, style: { width: 250, height: 250 }, position: P(x, y) })
const contexto = (id, x, y, text) => ({ id, type: 'context', data: { text }, style: { width: 280, height: 220 }, position: P(x, y) })
const formato = (id, x, y, width, height) => ({ id, type: 'formato', data: { formato: 'custom', width, height }, style: { width: 250, height: 140 }, position: P(x, y) })
const gerar = (id, x, y, model) => ({ id, type: 'generate', data: { status: 'idle', model }, style: { width: 250, height: 140 }, position: P(x, y) })
const portao = (id, x, y, criterio) => ({ id, type: 'artGate', data: { status: 'idle', modo: 'fidelidade', criterio }, style: { width: 250, height: 200 }, position: P(x, y) })
const recorte = (id, x, y, width, height) => ({ id, type: 'app', data: { op: 'crop', label: 'Recortar', status: 'idle', width, height, focal: 'attention' }, style: { width: 250, height: 160 }, position: P(x, y) })
const previa = (id, x, y) => ({ id, type: 'preview', data: { imageUrl: null }, style: { width: 250, height: 250 }, position: P(x, y) })
const liga = (a, b) => ({ id: `e-${a}-${b}`, source: a, target: b })

// ── O contexto comum às três imagens ────────────────────────────────────
// Fica num nó só: repetir em cada prompt é convite a divergirem quando um for
// ajustado. O canvas concatena contexto + prompt na chamada.
const CONTEXTO = `PRODUÇÃO DE CATÁLOGO — HERING · produto KH6V

FIDELIDADE É O CRITÉRIO PRINCIPAL. A peça de roupa nas imagens de referência é o
produto real fotografado em estúdio: estampa, cor, modelagem, costuras, botões,
gola, punhos e comprimento devem sair IDÊNTICOS. Não reinterprete, não "melhore",
não ajuste caimento. Se algum detalhe não estiver visível na referência, mantenha
o que a referência mostra em vez de inventar.

Fundo: cinza claro neutro sólido #F2F2F2, sem gradiente, sem textura, sem sombra
projetada dura. Luz de estúdio suave e difusa, sem estourar os brancos da peça.

A modelo é a do casting aprovado pelo Marketing — mesmo rosto, tom de pele, cabelo
e biotipo. Pose natural de catálogo, corpo inteiro apoiado, sem maneirismo.

SEM NENHUM TEXTO, letra, número, etiqueta legível, logotipo aplicado ou marca
d'água na imagem.`

const nodes = [
  nota('nota', -420, -420,
`TESTE KH6V — HERING (19/08/2026)

Antes de rodar, suba as imagens do e-mail nos nós de ENTRADA (coluna da esquerda):
· Still frente  → KH6V still frente.jpg
· Still costas  → KH6V still costas.jpg
· Modelo        → a melhor das 3 do casting aprovado
· Bolsa         → KMD6N10SI
· Calçado       → AR1A1ASN

Três saídas, uma por linha: PLANO INTEIRO · APROXIMADA · COSTAS.
Cada uma passa pelo Diretor de Arte em modo FIDELIDADE, comparada contra o
STILL — ele reprova divergência de estampa, cor, aviamento e modelagem.

Entrega: 1920×2720, fundo #F2F2F2.
⚠️ O limite de 350 KB do e-mail AINDA NÃO é garantido pelo nó Recortar
(hoje ele grava webp q92, sem alvo de peso). Confira o tamanho no final.`, 400, 340),

  // ── ENTRADAS ──────────────────────────────────────────────────────────
  nota('nota_in', -420, 0, 'ENTRADAS — suba aqui as imagens do e-mail.\n\nA ordem das ligações importa:\nno try-on a 1ª referência é a MODELO e a 2ª é a PEÇA.', 250, 180),
  entrada('in_modelo', -420, 220),
  entrada('in_frente', -420, 500),
  entrada('in_costas', -420, 780),
  entrada('in_bolsa',  -420, 1060),
  entrada('in_calcado', -420, 1340),

  contexto('ctx', -80, -120, CONTEXTO),

  // ── 1 · PLANO INTEIRO ─────────────────────────────────────────────────
  prompt('p1', -80, 160,
`Plano inteiro de catálogo: a modelo em pé, corpo inteiro enquadrado da cabeça aos
pés com folga acima e abaixo, vestindo a peça KH6V da referência.

Look completo: a peça como protagonista, acompanhada da bolsa e do calçado das
referências — acessórios presentes e nítidos, mas sem competir com a peça.

Enquadramento vertical, modelo centralizada, distância que permita ler a silhueta
inteira do produto.`),
  formato('f1', 240, 160, 1920, 2720),
  gerar('g1_tryon', 240, 380, 'fal-ai/fashn/tryon/v1.6'),
  gerar('g1_look',  560, 260, 'fal-ai/nano-banana-pro'),
  portao('gate1', 880, 260, 'A peça KH6V está idêntica ao still: estampa, cor, modelagem, gola, botões e comprimento. Acessórios presentes. Fundo #F2F2F2 uniforme. Nenhum texto na imagem.'),
  recorte('crop1', 1200, 260, 1920, 2720),
  previa('pv1', 1520, 260),

  // ── 2 · APROXIMADA (tecido e detalhes) ────────────────────────────────
  prompt('p2', -80, 700,
`Imagem aproximada da peça KH6V vestida: enquadramento do tórax à cintura,
mostrando TECIDO e ACABAMENTO em detalhe — trama do material, textura, costuras,
barra, aviamentos e a estampa em escala real.

Foco nítido na superfície do tecido, profundidade de campo curta ao fundo.
Não é close de rosto: o assunto é a peça.`),
  formato('f2', 240, 700, 1920, 2720),
  gerar('g2', 560, 700, 'fal-ai/nano-banana-pro'),
  portao('gate2', 880, 700, 'A textura e a estampa correspondem ao still, sem inventar trama nem alterar a cor. Costuras e aviamentos fiéis. Fundo #F2F2F2. Nenhum texto.'),
  recorte('crop2', 1200, 700, 1920, 2720),
  previa('pv2', 1520, 700),

  // ── 3 · COSTAS ────────────────────────────────────────────────────────
  prompt('p3', -80, 1180,
`Vista de costas: a modelo de costas para a câmera, corpo inteiro, vestindo a peça
KH6V, evidenciando como a peça é ATRÁS — caimento nas costas, costura central,
detalhes traseiros e comprimento.

Mesma modelo, mesma luz e mesmo fundo das outras imagens. Cabeça levemente virada
ou de costas por completo, o que preservar melhor a leitura da peça.`),
  formato('f3', 240, 1180, 1920, 2720),
  gerar('g3_tryon', 240, 1400, 'fal-ai/fashn/tryon/v1.6'),
  gerar('g3_look',  560, 1280, 'fal-ai/nano-banana-pro'),
  portao('gate3', 880, 1280, 'As costas da peça correspondem ao still de costas: costura central, caimento, comprimento e cor. Fundo #F2F2F2. Nenhum texto.'),
  recorte('crop3', 1200, 1280, 1920, 2720),
  previa('pv3', 1520, 1280),
]

const edges = [
  // 1 · try-on veste a modelo com a peça (ordem: modelo, depois peça)
  liga('in_modelo', 'g1_tryon'), liga('in_frente', 'g1_tryon'),
  // compõe o look com acessórios sobre o resultado do try-on
  liga('g1_tryon', 'g1_look'), liga('in_bolsa', 'g1_look'), liga('in_calcado', 'g1_look'),
  liga('p1', 'g1_look'), liga('ctx', 'g1_look'), liga('f1', 'g1_look'),
  // portão compara contra o STILL (imageInput a montante = referência)
  liga('g1_look', 'gate1'), liga('in_frente', 'gate1'),
  liga('gate1', 'crop1'), liga('crop1', 'pv1'),

  // 2 · aproximada — o still é a referência dominante
  liga('in_frente', 'g2'), liga('in_modelo', 'g2'),
  liga('p2', 'g2'), liga('ctx', 'g2'), liga('f2', 'g2'),
  liga('g2', 'gate2'), liga('in_frente', 'gate2'),
  liga('gate2', 'crop2'), liga('crop2', 'pv2'),

  // 3 · costas
  liga('in_modelo', 'g3_tryon'), liga('in_costas', 'g3_tryon'),
  liga('g3_tryon', 'g3_look'),
  liga('p3', 'g3_look'), liga('ctx', 'g3_look'), liga('f3', 'g3_look'),
  liga('g3_look', 'gate3'), liga('in_costas', 'gate3'),
  liga('gate3', 'crop3'), liga('crop3', 'pv3'),
]

const { data: ws } = await sb.from('workspaces').select('id').ilike('nome', 'hering').single()
const { data: brand } = await sb.from('brands').select('id').eq('workspace_id', ws.id).limit(1).single()

const { data, error } = await sb.from('studio_workflows').insert({
  workspace_id: ws.id, brand_id: brand.id, is_template: false,
  nome: 'Hering · KH6V — 3 imagens de catálogo (teste 19/08)',
  nodes, edges,
}).select('id, nome').single()

if (error) { console.error('ERRO:', error.message); process.exit(1) }
console.log('workflow criado:', data.nome)
console.log('id  :', data.id)
console.log('url :', `/app/brands/${brand.id}/studio/workflow/${data.id}`)
console.log('nós :', nodes.length, '| ligações:', edges.length)
