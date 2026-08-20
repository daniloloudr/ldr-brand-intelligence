import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const MEU = '5de24372-a3ab-43d6-afec-c0960125aa59'   // NÃO tocar no 0ff25382 (do Danilo)

const { data: wf } = await sb.from('studio_workflows').select('nodes, edges').eq('id', MEU).single()

// ── v4: dois problemas reais, dois tratamentos diferentes ───────────────
//
// 1 · ANATOMIA/POSE — é VARIAÇÃO, não defeito sistemático. Testado: a mesma
//     proporção 1920x2720 produziu uma rodada torta e outra correta. Prompt não
//     resolve aleatoriedade; o que resolve é o PORTÃO REPROVAR e a gente regerar.
//     Por isso entra no critério, não no prompt.
//
// 2 · CONTINUIDADE DO LOOK — esse é sistemático. A calça mudou entre a foto de
//     frente e a de costas porque cada geração inventa o look do zero. Conserto:
//     o PLANO INTEIRO vira a ÂNCORA e alimenta as outras duas como referência.
//     Assim jeans, calçado, bolsa e cabelo atravessam a sequência.
const ANATOMIA = `
ANATOMIA: proporções humanas corretas e naturais — cabeça, tronco, braços e pernas
em escala real, mãos com cinco dedos, articulações plausíveis. Pose de catálogo
relaxada e natural, peso distribuído, ombros soltos. Nada de corpo alongado,
membros deformados ou postura rígida.`

const nodes = wf.nodes.map(n => {
  if (n.id === 'p1') return { ...n, data: { text: n.data.text + ANATOMIA } }
  if (n.id === 'p2') return { ...n, data: { text: n.data.text + ANATOMIA } }
  if (n.id === 'p3') return { ...n, data: { text: n.data.text + ANATOMIA +
`\n\nCONTINUIDADE: a imagem de referência do PLANO INTEIRO mostra o look completo desta
sequência. Use EXATAMENTE a mesma calça (mesmo lavado, mesmo corte), o mesmo calçado e
o mesmo cabelo. Muda só a vista: agora é de costas.` } }

  if (n.id === 'p2') return n

  if (n.type === 'artGate') {
    const costas = n.id === 'gate3'
    const aproximada = n.id === 'gate2'
    return { ...n, data: { ...n.data, status: 'idle', veredito: null, resumo: null, ajustes: null, outputUrl: null, criterio:
`PEÇA: camiseta MANGA CURTA, base OFF-WHITE/CREME com LISTRAS FINAS AZUL-MARINHO horizontais (marinière: fundo claro, listras escuras), GOLA ALTA canelada bem marcada. Regata, alça fina, decote em V ou fundo escuro = reprovada.
MODELO: a MESMA PESSOA da foto de casting — mulher negra, cabelo escuro longo e ondulado. Pessoa diferente = reprovada.
ANATOMIA: proporções humanas corretas (cabeça/tronco/pernas em escala real, mãos íntegras), pose natural de catálogo. Corpo desproporcional, membro deformado ou pose rígida/artificial = REPROVADA.
COMPOSIÇÃO: modelo vestida por completo (camiseta + calça + calçado). Pernas nuas ou camiseta como vestido = reprovada.${
  costas ? '\nVISTA: a modelo precisa estar DE COSTAS.\nCONTINUIDADE: calça, calçado e cabelo precisam ser os MESMOS da imagem de plano inteiro. Calça de lavado ou corte diferente = reprovada.' : ''}${
  aproximada ? '\nENQUADRAMENTO: do tórax à cintura, tecido canelado e listras legíveis em escala real.' : ''}
Nenhum texto, etiqueta ou logotipo aplicado na imagem.` } }
  }

  if (['generate','app'].includes(n.type)) return { ...n, data: { ...n.data, status:'idle', outputUrl:null, error:null } }
  if (n.type === 'preview') return { ...n, data: { imageUrl: null } }

  if (n.id === 'nota') return { ...n, data: { text:
`TESTE KH6V — HERING · v4

O QUE A v4 TRATA (feedback do Danilo na v3):
· CALÇA MUDAVA entre frente e costas. Cada geração inventava o look do zero.
  Agora o PLANO INTEIRO é a ÂNCORA: ele alimenta a aproximada e a de costas
  como referência, então jeans, calçado e cabelo atravessam a sequência.
  ⚠️ Ordem de execução: rode o plano inteiro PRIMEIRO.
· ANATOMIA/POSE saía torta às vezes. Testei se era a proporção 1920x2720
  (não-nativa) e NÃO ERA — a mesma proporção deu rodada boa e rodada torta.
  É variação do modelo. Prompt não resolve aleatório: agora o PORTÃO REPROVA
  desproporção e pose artificial, e a gente regera até passar.

Modelo: seedream 4.5 (escolhido em bake-off de 6 caminhos × 3 rodadas).
Entrega: 1920×2720, fundo #F2F2F2.
⚠️ 350 KB ainda não é garantido pelo nó Recortar.` } }

  return n
})

// A âncora alimenta as outras duas linhas.
const liga = (a, b) => ({ id: `e-${a}-${b}`, source: a, target: b })
const edges = [...wf.edges]
for (const alvo of ['g2', 'g3_look']) {
  if (!edges.some(e => e.id === `e-g1_look-${alvo}`)) edges.push(liga('g1_look', alvo))
}

const { error } = await sb.from('studio_workflows')
  .update({ nome: 'Hering · KH6V — 3 imagens de catálogo (v4 · âncora + anatomia)', nodes, edges }).eq('id', MEU)
if (error) { console.error('ERRO:', error.message); process.exit(1) }

const imgUrls = d => d?.urls?.length ? d.urls : (d?.url ? [d.url] : [])
const PRODUZ = new Set(['generate','app','imageInput','preview','artGate'])
const { data: v } = await sb.from('studio_workflows').select('nodes,edges').eq('id', MEU).single()
const id2 = Object.fromEntries(v.nodes.map(n => [n.id, n]))
const saida = {}; for (const n of v.nodes.filter(n=>n.type==='imageInput')) saida[n.id] = imgUrls(n.data)
console.log('=== v4 · referências por geração ===')
for (const g of v.nodes.filter(n => n.type === 'generate')) {
  const ups = [...new Set(v.edges.filter(e=>e.target===g.id).map(e=>e.source))].map(i=>id2[i]).filter(n=>n&&PRODUZ.has(n.type))
  const refs = ups.flatMap(u => saida[u.id] || ['<gerada>'])
  console.log(' ', g.id.padEnd(9), refs.length + '/5 refs →', ups.map(u=>u.id).join(' , '))
}
console.log('\nportões que checam anatomia:', v.nodes.filter(n=>n.type==='artGate' && /ANATOMIA/.test(n.data?.criterio||'')).length + '/3')
console.log('portão que checa continuidade:', v.nodes.filter(n=>n.type==='artGate' && /CONTINUIDADE/.test(n.data?.criterio||'')).map(n=>n.id).join(', ') || 'nenhum')
