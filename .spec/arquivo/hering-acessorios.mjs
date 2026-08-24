// Os acessórios de referência entram no lugar da descrição inventada (21/08).
//
// Defeito meu: escrevi no contexto "mocassim de couro marrom-caramelo" e "bolsa
// tote caramelo com vivo preto" — cores lidas da FOTO DE CASTING. Os produtos
// que a Hering quer aplicados são outros e são PRETOS: sapatilha de bico fino
// (AR1A1ASN) e tote de camurça (KMD6N10SI). Texto que contradiz a referência é
// o mesmo defeito da camiseta "levemente ampla": o modelo obedece ao texto.
//
// Segundo defeito, encadeado: a referência de look que montei recortava o
// casting do quadril para baixo — e levava junto mocassim marrom e bolsa
// caramelo. Ela agora é SÓ A CALÇA; acessório vem do próprio still de produto.
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const BRAND = '09f3d65b-07d9-46c9-b6e7-f878377dd7c2'
const B = `${process.env.SUPABASE_URL}/storage/v1/object/public/brand-assets/${BRAND}/workflow`
const NOVO = '7bc39bb5-d1be-43d9-9900-a80b8d717512'
const T05  = 'b3d8baf2-583a-4e92-9e71-c8206890b917'

const BOLSA   = `${B}/1787321937870-0ffp-KMD6N10SI-C3.jpg`
const CALCADO = `${B}/1787321932401-tl34-AR1A1ASN-C2.jpg`

const caminho = `${BRAND}/workflow/${Date.now()}-ref0-calca_somente.jpg`
const up = await sb.storage.from('brand-assets')
  .upload(caminho, readFileSync(process.argv[2]), { contentType: 'image/jpeg' })
if (up.error) { console.error('ERRO no upload:', up.error.message); process.exit(1) }
const CALCA = sb.storage.from('brand-assets').getPublicUrl(caminho).data.publicUrl
console.log('calça (só a peça):', CALCA)

// Descrição alinhada ao que a referência mostra — conferido imagem a imagem.
const LOOK = `═══ O LOOK — DE ONDE VEM CADA PARTE ═══
Cada item vem da SUA PRÓPRIA referência de produto. Reproduza fielmente cor,
material, formato e acabamento de cada uma — não substitua por item parecido.
• PARTE DE CIMA: a camiseta, 100% do still. É o produto principal.
• CALÇA: da referência de calça — jeans de algodão em AZUL MÉDIO, lavagem
  uniforme com desbotado suave nas coxas e joelhos, cintura alta, cinco bolsos,
  perna larga e reta caindo solta até o tornozelo, barra reta e acabada.
• CALÇADO: da referência de calçado — SAPATILHA PRETA de bico fino, rasteira
  (sem salto), em camurça preta com recorte em couro liso preto na lateral e no
  calcanhar, e abertura em V no peito do pé. Preta por inteiro, sola fina.
• BOLSA: da referência de bolsa — TOTE PRETA em camurça/nobuck, estruturada, de
  corpo trapezoidal com base larga; duas alças curtas de ombro e uma alça longa
  transversal ajustável com fivela DOURADA (o único metal, e é discreto).
  Preta por inteiro, sem vivo em cor contrastante.
• IDENTIDADE (rosto, pele, cabelo, biotipo): da referência de casting.`

const ALVO = /═══ O LOOK — DE ONDE VEM CADA PARTE ═══[\s\S]*?da referência de casting\./

// ── fluxo novo: religa a calça e acrescenta bolsa e calçado na etapa 1 ──
const { data: f } = await sb.from('studio_workflows').select('nodes,edges').eq('id', NOVO).single()
let nodes = f.nodes.map(n => {
  if (n.id === 'e1_in_look') return { ...n, data: { urls: [CALCA], rotulo: 'Calça (só a peça)' } }
  if (n.type === 'context' && ALVO.test(n.data?.text || ''))
    return { ...n, data: { ...n.data, text: n.data.text.replace(ALVO, LOOK) } }
  return n
})
const yLook = nodes.find(n => n.id === 'e1_in_look')?.position?.y ?? 0
nodes = [...nodes,
  { id: 'e1_in_bolsa',   type: 'imageInput', style: { width: 250, height: 250 },
    position: { x: -1340, y: yLook + 290 }, data: { urls: [BOLSA],   rotulo: 'Bolsa · KMD6N10SI' } },
  { id: 'e1_in_calcado', type: 'imageInput', style: { width: 250, height: 250 },
    position: { x: -1340, y: yLook + 580 }, data: { urls: [CALCADO], rotulo: 'Calçado · AR1A1ASN' } },
  // etapa 3 não come da etapa 1: precisa das próprias referências de look
  { id: 'e3_in_calca',   type: 'imageInput', style: { width: 250, height: 250 },
    position: { x: -1340, y: (nodes.find(n => n.id === 'e3_in_still')?.position?.y ?? 0) + 290 },
    data: { urls: [CALCA], rotulo: 'Calça (só a peça)' } },
  { id: 'e3_in_calcado', type: 'imageInput', style: { width: 250, height: 250 },
    position: { x: -1340, y: (nodes.find(n => n.id === 'e3_in_still')?.position?.y ?? 0) + 580 },
    data: { urls: [CALCADO], rotulo: 'Calçado · AR1A1ASN' } },
]

// Acessório entra DEPOIS de identidade, peça e calça — se um dia estourar o
// teto de 5, quem cai é o acessório, nunca o still.
const edges = [...f.edges]
for (const [g, extras] of [
  ['e1_g1', ['e1_in_bolsa', 'e1_in_calcado']], ['e1_g2', ['e1_in_bolsa', 'e1_in_calcado']],
  ['e1_g3', ['e1_in_bolsa', 'e1_in_calcado']],
  ['e3_g1', ['e3_in_calca', 'e3_in_calcado']], ['e3_g2', ['e3_in_calca', 'e3_in_calcado']],
]) for (const src of extras) edges.push({ id: `e-${src}-${g}`, source: src, target: g })

const r1 = await sb.from('studio_workflows').update({ nodes, edges }).eq('id', NOVO)
if (r1.error) { console.error('ERRO:', r1.error.message); process.exit(1) }
console.log('fluxo do PROCESSO: calça corrigida, bolsa e calçado ligados nas etapas 1 e 3')

// ── t05: mesma correção no bloco de poses, que também dizia "caramelo" ──
const { data: t } = await sb.from('studio_workflows').select('nodes').eq('id', T05).single()
const nt = t.nodes.map(n => {
  if (n.id === 'poses_calca') return { ...n, data: { urls: [CALCA] } }
  if (n.type === 'context' && ALVO.test(n.data?.text || ''))
    return { ...n, data: { ...n.data, text: n.data.text.replace(ALVO, LOOK) } }
  return n
})
const mudou = nt.filter((n, i) => n !== t.nodes[i]).map(n => n.id)
if (mudou.length) {
  const r2 = await sb.from('studio_workflows').update({ nodes: nt }).eq('id', T05)
  if (r2.error) console.error('t05:', r2.error.message)
  else console.log('t05 corrigido:', mudou.join(', '))
} else console.log('t05: nada a corrigir')
