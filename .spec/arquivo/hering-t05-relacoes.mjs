// t05 — conserta as RELAÇÕES do fluxo (21/08/2026).
//
// Sintoma: o bloco de novas poses alucinava a camiseta. Causa medida: dois
// geradores recebiam 7 e 8 referências com MAX_REF = 5, e as descartadas eram
// justamente o STILL e a imagem-âncora. O gerador desenhava a peça sem nunca
// ter visto a peça — sobravam modelo, bolsa e calçado.
//
// A armadilha: um nó de ENTRADA carrega VÁRIAS imagens. Cinco nós ligados
// pareciam cinco referências e eram oito (bolsa C1+C3, calçado C2+C5, base
// teste3+teste5). O canvas não avisa — só corta o excedente em silêncio.
//
// Três correções:
//  1. uma imagem por nó de entrada. A segunda vai para um nó "(alt)" solto no
//     canvas — nada é apagado, e trocar é arrastar a ligação.
//  2. ordem das ligações = prioridade. Identidade e PEÇA entram primeiro, e
//     acessório nunca empurra o still para fora.
//  3. o gerador de costas recebia DOIS contextos (3,8k + 13,8k chars) que se
//     contradiziam sobre modelagem. Fica só o de costas, que já traz a peça.
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const ID = 'b3d8baf2-583a-4e92-9e71-c8206890b917'
const MAX_REF = 5

const { data: f } = await sb.from('studio_workflows').select('nodes,edges').eq('id', ID).single()
let nodes = [...f.nodes]
let edges = [...f.edges]
const byId = () => Object.fromEntries(nodes.map(n => [n.id, n]))

// ── 1. uma imagem por nó de entrada ─────────────────────────────────────
const extras = []
nodes = nodes.map(n => {
  if (n.type !== 'imageInput') return n
  const urls = n.data?.urls || (n.data?.url ? [n.data.url] : [])
  if (urls.length <= 1) return n
  // re-executável: o canvas aberto pode regravar o nó com as imagens de volta.
  // Se o "_alt" já existe, ele apenas absorve as excedentes de novo.
  const jaTem = nodes.find(x => x.id === `${n.id}_alt`)
  if (jaTem) {
    const antigas = jaTem.data?.urls || []
    jaTem.data = { ...jaTem.data, urls: [...new Set([...antigas, ...urls.slice(1)])] }
    console.log(`entrada ${n.id}: ${urls.length} imagens → 1 (excedentes reabsorvidas em ${n.id}_alt)`)
    return { ...n, data: { ...n.data, urls: [urls[0]] } }
  }
  extras.push({
    id: `${n.id}_alt`, type: 'imageInput',
    style: n.style || { width: 250, height: 250 },
    position: { x: (n.position?.x ?? 0) - 290, y: n.position?.y ?? 0 },
    data: { ...n.data, urls: urls.slice(1) },          // solto: sem ligação
  })
  console.log(`entrada ${n.id}: ${urls.length} imagens → 1 (as outras em ${n.id}_alt, sem ligação)`)
  return { ...n, data: { ...n.data, urls: [urls[0]] } }
})
nodes = [...nodes, ...extras]

// ── 2. ordem das ligações = prioridade ──────────────────────────────────
// A ordem das edges É a ordem das referências. Quem entra por último é quem
// cai fora quando estoura — então o que não pode faltar entra primeiro.
const PESO = id => {
  if (/modelo|casting|teste/i.test(id)) return 0   // identidade da modelo
  if (/still/i.test(id)) return 1                  // A PEÇA
  if (/bolsa/i.test(id)) return 3
  if (/calcado|calçado/i.test(id)) return 4
  return 2                                          // âncora / demais
}
const nomeUrl = n => String((n.data?.urls || [n.data?.url])[0] || '').split('/').pop()
const pesoDoNo = n => {
  if (n.type === 'generate') return 2
  const chave = n.id + ' ' + nomeUrl(n)
  return PESO(chave)
}

const mapa = byId()
const geradores = nodes.filter(n => n.type === 'generate').map(n => n.id)
let reordenados = 0, cortados = 0
for (const g of geradores) {
  const minhas = edges.filter(e => e.target === g)
  const imgs = minhas.filter(e => ['imageInput', 'generate'].includes(mapa[e.source]?.type))
  const resto = minhas.filter(e => !imgs.includes(e))
  if (!imgs.length) continue
  const ordenadas = [...imgs].sort((a, b) => pesoDoNo(mapa[a.source]) - pesoDoNo(mapa[b.source]))
  const mudou = ordenadas.some((e, i) => e !== imgs[i])
  if (ordenadas.length > MAX_REF) {
    const fora = ordenadas.slice(MAX_REF)
    console.log(`⚠️  ${g}: ${ordenadas.length} refs → corta ${fora.length} (${fora.map(e => e.source).join(', ')})`)
    cortados += fora.length
  }
  if (mudou) reordenados++
  const mantidas = ordenadas.slice(0, MAX_REF)
  edges = [...edges.filter(e => e.target !== g), ...mantidas, ...resto]
}

// ── 3. um contexto por gerador ──────────────────────────────────────────
// A ficha técnica (13,8k) é DOCUMENTAÇÃO, não prompt: injetada junto do
// contexto de costas dava 17,7k chars com afirmações que se contradiziam
// sobre modelagem. Fica no canvas como referência, desligada do gerador.
const FICHA = 'context-1787176925574'
const antes = edges.length
edges = edges.filter(e => !(e.source === FICHA && e.target === 'generate-1787169535081'))
if (edges.length < antes) console.log('costas: ficha técnica (13,8k) desligada — sobra só o contexto de costas')

const { error } = await sb.from('studio_workflows').update({ nodes, edges }).eq('id', ID)
if (error) { console.error('ERRO:', error.message); process.exit(1) }
console.log(`\ngeradores com ordem corrigida: ${reordenados} | referências cortadas: ${cortados}`)
console.log('nós:', f.nodes.length, '→', nodes.length, '| ligações:', f.edges.length, '→', edges.length)
