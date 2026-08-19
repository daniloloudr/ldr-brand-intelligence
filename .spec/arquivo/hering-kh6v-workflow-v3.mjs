import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const MEU = '5de24372-a3ab-43d6-afec-c0960125aa59'   // NÃO tocar no 0ff25382 (cópia do Danilo)

const { data: wf } = await sb.from('studio_workflows').select('nodes, edges').eq('id', MEU).single()
const byId = Object.fromEntries(wf.nodes.map(n => [n.id, n]))
const SEEDREAM = 'fal-ai/bytedance/seedream/v4.5/text-to-image'

// ── O que o bake-off decidiu ────────────────────────────────────────────
// 6 caminhos × 1 rodada, depois 3 finalistas × 3 rodadas, todos julgados pelo
// mesmo juiz de fidelidade contra o still:
//   · try-on FASHN     reprovado — transferiu a peça mas ERROU A COR (listras pretas)
//   · nano banana pro  1/3 — deriva de cor (listras cinza numa rodada, bege noutra)
//   · flux.2 pro       3/3 na peça, mas TROCOU A MODELO nas três — inviável com
//                      casting aprovado, e o juiz não pegava porque só olha a roupa
//   · seedream 4.5     3/3 na peça E manteve a modelo do casting  ← escolhido
const PROMPT_COMUM = `
IMPORTANTE — a modelo precisa estar VESTIDA POR COMPLETO: a camiseta KH6V em cima e
uma calça (jeans reto ou alfaiataria clara) embaixo, além do calçado. Nunca pernas
nuas, nunca a camiseta usada como vestido.`

const nodes = wf.nodes
  // try-on sai: errou a cor das listras e custava uma etapa a mais
  .filter(n => !['g1_tryon', 'g3_tryon'].includes(n.id))
  .map(n => {
    if (['g1_look', 'g2', 'g3_look'].includes(n.id)) return { ...n, data: { status: 'idle', model: SEEDREAM } }

    if (n.id === 'p1') return { ...n, data: { text:
`Plano inteiro de catálogo: a modelo em pé, DE FRENTE, corpo inteiro da cabeça aos pés
com folga acima e abaixo, vestindo a camiseta listrada KH6V do still.

Look completo: a peça como protagonista, com a bolsa e o calçado das referências.
${PROMPT_COMUM}

Enquadramento vertical, modelo centralizada, distância que permita ler a silhueta
inteira do produto.` } }

    if (n.id === 'p3') return { ...n, data: { text:
`Vista de costas: a modelo DE COSTAS para a câmera, corpo inteiro, vestindo a camiseta
listrada KH6V, evidenciando como a peça é ATRÁS — caimento nas costas, gola alta por
trás, costuras e comprimento.
${PROMPT_COMUM}

Mesma modelo, mesma luz e mesmo fundo das outras imagens.` } }

    // Critério dos portões: some a ambiguidade que gerou falso negativo no
    // bake-off (o juiz leu "listras azul-marinho" como "camiseta azul-marinho"
    // e reprovou uma peça correta), e entra a identidade da modelo — que o juiz
    // não checava e por isso quase elegeu um modelo que trocava a pessoa.
    if (n.type === 'artGate') {
      const costas = n.id === 'gate3'
      return { ...n, data: { ...n.data, status: 'idle', veredito: null, resumo: null, ajustes: null, outputUrl: null, criterio:
`PEÇA: camiseta de MANGA CURTA, base OFF-WHITE/CREME com LISTRAS FINAS AZUL-MARINHO horizontais (padrão marinière: fundo claro, listras escuras), GOLA ALTA canelada. Regata, alça fina ou decote em V = reprovada. Camiseta de fundo escuro = reprovada.
MODELO: precisa ser a MESMA PESSOA da foto de casting — mulher negra, cabelo escuro longo e ondulado. Pessoa diferente = reprovada.
COMPOSIÇÃO: modelo vestida por completo (camiseta + calça + calçado). Pernas nuas ou camiseta usada como vestido = reprovada.${costas ? '\nVISTA: a modelo precisa estar DE COSTAS.' : ''}
Nenhum texto, etiqueta ou logotipo aplicado na imagem.` } }
    }

    if (['generate', 'app'].includes(n.type)) return { ...n, data: { ...n.data, status: 'idle', outputUrl: null, error: null } }
    if (n.type === 'preview') return { ...n, data: { imageUrl: null } }

    if (n.id === 'nota') return { ...n, data: { text:
`TESTE KH6V — HERING · v3 (decidida por bake-off)

O TRY-ON SAIU. Comparei 6 caminhos com o mesmo alvo e o mesmo juiz, depois repeti
os 3 finalistas 3× cada:
· try-on FASHN    reprovado — vestiu a peça mas errou a COR (listras pretas)
· nano banana     1/3 — listras derivaram para cinza e bege
· flux.2 pro      3/3 na peça, mas TROCOU A MODELO nas 3 — inviável com casting
· seedream 4.5    3/3 na peça E manteve a modelo  ← adotado nas três linhas

DOIS AJUSTES QUE VIERAM DO TESTE:
· o prompt agora exige a modelo VESTIDA POR COMPLETO (o seedream entregou a
  camiseta como vestido, com as pernas nuas)
· o critério dos portões passou a checar a IDENTIDADE DA MODELO — o juiz só
  olhava a roupa, e por isso quase elegemos um modelo que troca a pessoa

Entrega: 1920×2720, fundo #F2F2F2.
⚠️ 350 KB ainda não é garantido pelo nó Recortar — confira no final.
Reserva: 2ºs ângulos de bolsa/calçado no storage (troque no nó se sair errado).` } }

    return n
  })

// Sem try-on, as composições recebem as entradas direto.
const remover = new Set(['e-in_modelo_frente-g1_tryon','e-in_frente-g1_tryon','e-g1_tryon-g1_look',
                         'e-in_modelo_costas-g3_tryon','e-in_costas-g3_tryon','e-g3_tryon-g3_look'])
const liga = (a, b) => ({ id: `e-${a}-${b}`, source: a, target: b })
const edges = wf.edges.filter(e => !remover.has(e.id))
// ordem = prioridade (o canvas corta no 5º): still primeiro, ele é a âncora da peça
edges.unshift(liga('in_frente', 'g1_look'), liga('in_modelo_frente', 'g1_look'))
edges.push(liga('in_costas', 'g3_look'), liga('in_modelo_costas', 'g3_look'))

const vistos = new Set()
const limpas = edges.filter(e => !vistos.has(e.id) && vistos.add(e.id) && byId[e.source] !== undefined || e.source === 'in_frente' || e.source === 'in_costas')
  .filter(e => nodes.some(n => n.id === e.source) && nodes.some(n => n.id === e.target))

const { error } = await sb.from('studio_workflows')
  .update({ nome: 'Hering · KH6V — 3 imagens de catálogo (v3 · seedream)', nodes, edges: limpas }).eq('id', MEU)
if (error) { console.error('ERRO:', error.message); process.exit(1) }

const imgUrls = d => d?.urls?.length ? d.urls : (d?.url ? [d.url] : [])
const PRODUZ = new Set(['generate','app','imageInput','preview','artGate'])
const { data: v } = await sb.from('studio_workflows').select('nodes,edges').eq('id', MEU).single()
const id2 = Object.fromEntries(v.nodes.map(n => [n.id, n]))
const saida = {}; for (const n of v.nodes.filter(n=>n.type==='imageInput')) saida[n.id] = imgUrls(n.data)
console.log('=== v3 · referências por geração ===')
for (const g of v.nodes.filter(n => n.type === 'generate')) {
  const ups = [...new Set(v.edges.filter(e=>e.target===g.id).map(e=>e.source))].map(i=>id2[i]).filter(n=>n&&PRODUZ.has(n.type))
  const refs = ups.flatMap(u => saida[u.id] || ['<gerada>'])
  console.log(' ', g.id.padEnd(9), g.data.model.replace('fal-ai/bytedance/',''), '·', refs.length + '/5 refs →', ups.map(u=>u.id).join(' , '))
}
console.log('\ntry-on removido:', v.nodes.some(n=>/tryon/.test(n.data?.model||'')) ? '⚠️ ainda existe' : 'sim')
console.log('nós:', v.nodes.length, '| ligações:', v.edges.length)
