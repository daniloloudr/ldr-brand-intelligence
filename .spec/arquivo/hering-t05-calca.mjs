// t05 — a calça entra no bloco de poses (21/08/2026).
//
// Defeito: as seis poses saíam com a parte de baixo inventada (bermuda/saia
// clara). Causa: a base limpa é uma SEGUNDA PELE — vestido neutro, descalça —
// então não havia calça em referência nenhuma, e o contexto ainda mandava
// ignorar "a roupa que ela veste ali". Nada dizia o que vestir embaixo.
//
// Correção pelo mesmo princípio que resolveu a camiseta: em vez de descrever a
// calça no prompt e torcer, entra uma REFERÊNCIA LIMPA — o casting recortado do
// quadril para baixo, com jeans, mocassim e bolsa, e SEM a regata que contamina.
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const ID = 'b3d8baf2-583a-4e92-9e71-c8206890b917'
const BRAND = '09f3d65b-07d9-46c9-b6e7-f878377dd7c2'
const CAMINHO = `${BRAND}/workflow/${Date.now()}-ref0-calca_referencia_limpa.jpg`

const bin = readFileSync(process.argv[2])
const up = await sb.storage.from('brand-assets').upload(CAMINHO, bin, { contentType: 'image/jpeg' })
if (up.error) { console.error('ERRO no upload:', up.error.message); process.exit(1) }
const URL_CALCA = sb.storage.from('brand-assets').getPublicUrl(CAMINHO).data.publicUrl
console.log('referência da calça:', URL_CALCA)

const { data: f } = await sb.from('studio_workflows').select('nodes,edges').eq('id', ID).single()

const LOOK = `═══ O LOOK — DE ONDE VEM CADA PARTE ═══
• PARTE DE CIMA: a camiseta KH6V, 100% do still. É o produto.
• PARTE DE BAIXO: calça jeans, calçado e bolsa vêm da referência de look —
  o recorte do casting do quadril para baixo. Reproduza fielmente.
  A calça é jeans de algodão em AZUL MÉDIO, lavagem uniforme com desbotado
  suave nas coxas e joelhos; cintura alta, cinco bolsos, modelagem ampla e
  reta (perna larga que cai solta do quadril ao tornozelo), barra reta e
  acabada, sem desfiado e sem dobra. Comprimento até o tornozelo.
  O calçado é mocassim de couro marrom-caramelo, salto baixo.
  A bolsa é tote de couro caramelo com alças e vivo em preto.
• IDENTIDADE (rosto, pele, cabelo, biotipo): da referência de casting.
  Aquela referência mostra a modelo com uma peça neutra de base — ela NÃO é
  roupa do look, é só o suporte da identidade, e não deve aparecer na imagem.`

const idx = f.nodes.findIndex(n => n.id === 'poses_ctx')
let t = f.nodes[idx].data.text
// A frase que causou o buraco: mandava ignorar a roupa da referência sem dizer
// o que vestir embaixo. Vira o bloco de look, que responde a pergunta.
const ALVO = `A 1ª referência é a foto de casting: dela aproveite SOMENTE a pessoa. A roupa
que ela veste ali, a pose e o enquadramento NÃO devem ser copiados — a pose
vem do texto de cada saída.`
if (!t.includes(ALVO)) { console.error('ERRO: não achei o trecho a substituir'); process.exit(1) }
t = t.replace(ALVO, `A pose e o enquadramento da referência de casting NÃO devem ser copiados — a
pose vem do texto de cada saída. Da referência de casting vem só a PESSOA.

${LOOK}`)

const nodes = [
  ...f.nodes.map(n => n.id === 'poses_ctx' ? { ...n, data: { ...n.data, text: t } } : n),
  { id: 'poses_calca', type: 'imageInput', style: { width: 250, height: 250 },
    position: { x: -740, y: (f.nodes[idx].position?.y ?? 3600) + 320 },
    data: { urls: [URL_CALCA] } },
]

// Ordem = prioridade: identidade, peça, look. Três referências, teto é cinco.
const edges = [...f.edges]
for (let i = 1; i <= 6; i++) {
  const g = `poses_g${i}`
  const minhas = edges.filter(e => e.target === g)
  const outras = edges.filter(e => e.target !== g)
  const img = id => minhas.find(e => e.source === id)
  const ordenadas = [
    img('in_modelo1'),
    img('in_still'),
    { id: `e-poses_calca-${g}`, source: 'poses_calca', target: g },
    ...minhas.filter(e => !['in_modelo1', 'in_still'].includes(e.source)),
  ].filter(Boolean)
  edges.length = 0
  edges.push(...outras, ...ordenadas)
}

const { error } = await sb.from('studio_workflows').update({ nodes, edges }).eq('id', ID)
if (error) { console.error('ERRO:', error.message); process.exit(1) }
console.log('contexto de poses: bloco de LOOK adicionado')
console.log('nó poses_calca ligado nas 6 saídas (3ª referência)')
