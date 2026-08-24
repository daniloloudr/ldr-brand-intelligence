// A bolsa sai dos contextos que não têm bolsa (21/08).
//
// Regra do Danilo, vendo a bolsa aparecer onde não devia: "a bolsa precisa se
// manter apenas na etapa 1, onde ela é inserida."
//
// A regra por trás é mais geral e é a mesma que já custou uma rodada: TEXTO QUE
// PEDE UM ITEM SEM REFERÊNCIA É CONVITE PARA O MODELO INVENTAR O ITEM. Descrever
// uma tote preta de camurça para um gerador que nunca viu a tote não produz a
// tote da Hering — produz uma bolsa qualquer, com a confiança de quem foi
// mandado desenhar uma.
//
// O fluxo do PROCESSO está correto: a bolsa vive só na etapa 1 (e1_ctx, e1_p2) e
// a referência está ligada nos três geradores de lá. O vazamento é no t05, e veio
// do hering-acessorios.mjs desta manhã: ele aplicou o bloco LOOK — que descreve a
// bolsa — no contexto das poses, mas as referências de acessório só foram ligadas
// no fluxo novo. O texto foi, a imagem não.
//
// Onde a bolsa é pedida sem referência:
//   poses_ctx              → poses_g1..g6   (seis geradores — é o bloco em uso)
//   context-1787168153329  → gB_base, gB_p1, gB_p2
//   context-1787169515682  → generate-1787169535081
//
// Rodar da raiz:  node --env-file=.env .spec/arquivo/hering-bolsa-so-etapa1.mjs [--simular]
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const T05 = 'b3d8baf2-583a-4e92-9e71-c8206890b917'
const SIMULAR = process.argv.includes('--simular')
const RE_BOLSA = /\b(bolsa|tote|KMD6N10SI)\b/i

const { data: f, error: eRead } = await sb.from('studio_workflows')
  .select('nodes,edges').eq('id', T05).single()
if (eRead) { console.error('ERRO ao ler:', eRead.message); process.exit(1) }

const tipo = Object.fromEntries(f.nodes.map(n => [n.id, n.type]))

/** O gerador que consome este texto tem alguma referência de bolsa ligada? */
function temBolsaLigada(nodeId) {
  const geradores = f.edges.filter(e => e.source === nodeId && tipo[e.target] === 'generate').map(e => e.target)
  return geradores.some(g => f.edges.some(e => e.target === g && /bolsa/i.test(e.source)))
}

/** Remove o bullet "• BOLSA: ..." inteiro — ele ocupa várias linhas até o
 *  próximo bullet. Cortar só a primeira linha deixaria a descrição órfã, que é
 *  pior: sobra "corpo trapezoidal com base larga" sem dono. */
function tiraBullet(texto) {
  const linhas = texto.split('\n')
  const i = linhas.findIndex(l => /^\s*•\s*BOLSA\b/i.test(l))
  if (i === -1) return null
  let j = i + 1
  while (j < linhas.length && !/^\s*•/.test(linhas[j]) && linhas[j].trim() !== '') j++
  return [...linhas.slice(0, i), ...linhas.slice(j)].join('\n')
}

/** Tira só a palavra BOLSA de uma enumeração "• CALÇA, CALÇADO, BOLSA: ...".
 *  Aqui a linha inteira não sai: ela ainda governa calça e calçado. */
function tiraDaEnumeracao(texto) {
  const linhas = texto.split('\n')
  let mudou = false
  const saida = linhas.map(l => {
    if (!/^\s*•/.test(l) || !RE_BOLSA.test(l)) return l
    const nova = l.replace(/,\s*BOLSA\b/i, '').replace(/\bBOLSA\s*,\s*/i, '')
    if (nova !== l) mudou = true
    return nova
  })
  return mudou ? saida.join('\n') : null
}

const nodes = []
const relatorio = []
for (const n of f.nodes) {
  const texto = n.data?.text
  if (!['context', 'prompt'].includes(n.type) || !texto || !RE_BOLSA.test(texto)) { nodes.push(n); continue }

  if (temBolsaLigada(n.id)) {
    relatorio.push({ id: n.id, acao: 'mantido — a referência da bolsa está ligada aqui' })
    nodes.push(n); continue
  }

  const novo = tiraBullet(texto) ?? tiraDaEnumeracao(texto)
  if (novo === null) {
    // Não reconheci a forma: prefiro deixar visível a mexer no escuro.
    relatorio.push({ id: n.id, acao: '⚠️ CITA BOLSA SEM REFERÊNCIA e não é bullet nem enumeração — revisar à mão' })
    nodes.push(n); continue
  }

  const antes = texto.split('\n').filter(l => RE_BOLSA.test(l)).map(l => l.trim())
  relatorio.push({ id: n.id, acao: 'bolsa removida', antes, sobrou: RE_BOLSA.test(novo) })
  nodes.push({ ...n, data: { ...n.data, text: novo } })
}

for (const r of relatorio) {
  console.log(`\n■ ${r.id}: ${r.acao}`)
  for (const l of r.antes || []) console.log('    − ' + l.slice(0, 110))
  if (r.sobrou) console.log('    ⚠️ ainda restou menção a bolsa neste nó — confira')
}

const mudados = relatorio.filter(r => r.acao === 'bolsa removida').length
console.log(`\n${mudados} nó(s) alterado(s).`)

if (SIMULAR) { console.log('«SIMULAÇÃO — nada foi gravado»'); process.exit(0) }
if (!mudados) { console.log('nada a gravar.'); process.exit(0) }
const { error } = await sb.from('studio_workflows').update({ nodes }).eq('id', T05)
if (error) { console.error('ERRO ao gravar:', error.message); process.exit(1) }
console.log('gravado.')
