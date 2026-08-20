import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const WF = '5de24372-a3ab-43d6-afec-c0960125aa59'
// A base vem do ambiente: URL de projeto escrita no código faz o scanner de
// segredos do Netlify reprovar o build inteiro (aconteceu em 19/08).
const B = `${process.env.SUPABASE_URL}/storage/v1/object/public/brand-assets/09f3d65b-07d9-46c9-b6e7-f878377dd7c2/workflow`

const A = {
  modelo1: `${B}/1787161228142-azfq-imagem_1_modelo.jpg`,   // frente
  modelo2: `${B}/1787161396886-ppgt-imagem_2_modelo.jpg`,   // frente (2º ângulo)
  modelo3: `${B}/1787160536292-tx3z-imagem_3_modelo.jpg`,   // costas
  bolsaC3: `${B}/1787160653584-8k02-KMD6N10SI-C3.jpg`,
  bolsaC1: `${B}/1787160654623-5esu-KMD6N10SI-C1.jpg`,
  calcC2:  `${B}/1787160662122-qr4x-AR1A1ASN-C2.jpg`,
  calcC5:  `${B}/1787160663274-kfs2-AR1A1ASN-C5.jpg`,
}

const { data: wf } = await sb.from('studio_workflows').select('nodes, edges').eq('id', WF).single()
const byId = Object.fromEntries(wf.nodes.map(n => [n.id, n]))

// ── Entradas ────────────────────────────────────────────────────────────
// O try-on tem contrato de DUAS referências (1ª modelo, 2ª peça). Por isso a
// modelo de frente do try-on fica sozinha num nó; a 2ª foto de frente entra por
// um nó separado que alimenta só as composições.
const novos = wf.nodes.map(n => {
  if (n.id === 'in_modelo_frente') return { ...n, data: { urls: [A.modelo1] } }
  if (n.id === 'in_modelo_costas') return { ...n, data: { urls: [A.modelo3] } }
  if (n.id === 'in_bolsa')   return { ...n, data: { urls: [A.bolsaC3, A.bolsaC1] } }
  if (n.id === 'in_calcado') return { ...n, data: { urls: [A.calcC2, A.calcC5] } }
  return n
})

// Nó novo: 2ª foto de frente, como referência de pose/rosto nas composições
if (!byId['in_modelo_pose']) {
  novos.push({
    id: 'in_modelo_pose', type: 'imageInput', data: { urls: [A.modelo2] },
    style: { width: 250, height: 250 }, position: { x: -420, y: 300 },
  })
}

// ── Ligações ────────────────────────────────────────────────────────────
// Ordem = prioridade, porque o canvas corta no 5º. Para o plano inteiro:
// modelo vestida, still (âncora da peça), bolsa, calçado, 2ª pose.
const liga = (a, b) => ({ id: `e-${a}-${b}`, source: a, target: b })
const fora = new Set(['e-g1_tryon-g1_look','e-in_frente-g1_look','e-in_bolsa-g1_look','e-in_calcado-g1_look',
                      'e-in_frente-g2','e-in_modelo_frente-g2'])
const edges = wf.edges.filter(e => !fora.has(e.id))
edges.push(
  liga('g1_tryon','g1_look'), liga('in_frente','g1_look'),
  liga('in_bolsa','g1_look'), liga('in_calcado','g1_look'), liga('in_modelo_pose','g1_look'),
  liga('in_frente','g2'), liga('in_modelo_frente','g2'), liga('in_modelo_pose','g2'),
)

const { error } = await sb.from('studio_workflows').update({ nodes: novos, edges }).eq('id', WF)
if (error) { console.error('ERRO:', error.message); process.exit(1) }

// ── Validação com as MESMAS regras do canvas ────────────────────────────
const imgUrls = d => d?.urls?.length ? d.urls : (d?.url ? [d.url] : [])
const MAX_REF = 5
const PRODUZ = new Set(['generate','app','imageInput','preview','artGate'])
const { data: v } = await sb.from('studio_workflows').select('nodes, edges').eq('id', WF).single()
const id2 = Object.fromEntries(v.nodes.map(n => [n.id, n]))
const saida = {}
for (const n of v.nodes.filter(n => n.type === 'imageInput')) saida[n.id] = imgUrls(n.data)

console.log('=== entradas ===')
for (const [k, u] of Object.entries(saida)) console.log(' ', k.padEnd(20), u.length, 'imagem(ns)')
console.log()
console.log('=== o que cada geração recebe (já com o corte em 5) ===')
for (const g of v.nodes.filter(n => n.type === 'generate')) {
  const ups = [...new Set(v.edges.filter(e => e.target === g.id).map(e => e.source))]
    .map(i => id2[i]).filter(n => n && PRODUZ.has(n.type))
  const refs = ups.flatMap(u => saida[u.id] || ['<gerada>'])
  const usadas = refs.slice(0, MAX_REF)
  const cortadas = refs.length - usadas.length
  console.log(' ', g.id.padEnd(10), usadas.length + '/' + refs.length, 'refs',
    cortadas ? `⚠️ ${cortadas} cortada(s)` : '          ',
    '→', ups.map(u => u.id + (saida[u.id]?.length > 1 ? `×${saida[u.id].length}` : '')).join(' , '))
}
