// A ordem das referências da etapa 1: a calça vai para o fim (21/08).
//
// Pedido do Danilo, olhando as saídas: "os sapatos não estão fiéis... existe
// importância na entrada, coloque o nó que tem a calça jeans como último."
//
// A ordem não é decorativa. `imageUpstreamsOf` (StudioCanvas.jsx:438) monta as
// referências na ORDEM DAS LIGAÇÕES, e `references` corta com .slice(0, MAX_REF)
// — o último da fila é o primeiro a ser descartado, e é descartado em silêncio.
// Então mandar a calça para o fim faz duas coisas de uma vez: tira peso dela na
// leitura do modelo e a elege como sacrifício se algum dia entrar uma referência
// a mais. Nunca o still, nunca a identidade.
//
// Por que o calçado sobe: é a peça que está saindo infiel, é a menor da imagem
// (num corpo inteiro o sapato tem poucos pixels) e é um produto que a Hering
// quer aplicado de verdade — AR1A1ASN, sapatilha preta. A calça é a que menos
// precisa de ajuda: é grande, é jeans azul comum e está descrita em detalhe no
// bloco do look.
//
// Achado ao ler o grafo: as três saídas da etapa 1 estavam com ordens DIFERENTES
// entre si — g1 tinha calçado antes de bolsa, g2 e g3 tinham bolsa antes de
// calçado. Mesma etapa, mesmo pedido, entradas em ordem diferente: as saídas não
// eram comparáveis entre si, e uma variação que parecia do modelo era nossa.
// Ficam as três na mesma ordem canônica.
//
// A etapa 3 (costas) leva a mesma ordem, pelo mesmo motivo: ali os pés também
// aparecem, e a calça estava na frente do calçado do mesmo jeito. Ela não tem
// bolsa ligada — só still, calça e calçado sobre a modelo de costas.
//
// Rodar da raiz:  node --env-file=.env .spec/arquivo/hering-ordem-referencias.mjs [--simular]
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const FLUXO = '7bc39bb5-d1be-43d9-9900-a80b8d717512'
const SIMULAR = process.argv.includes('--simular')

// Ordem canônica: identidade → produto principal → o pequeno que falha →
// o outro acessório → a calça, por último. Uma ordem por etapa, porque os nós
// de entrada são outros — o princípio é o mesmo.
const GRUPOS = [
  { nome: 'ETAPA 1 · primeira imagem inteira',
    alvos: ['e1_g1', 'e1_g2', 'e1_g3'],
    ordem: ['e0_g1', 'e1_in_still', 'e1_in_calcado', 'e1_in_bolsa', 'e1_in_look'] },
  { nome: 'ETAPA 3 · costas',
    alvos: ['e3_g1', 'e3_g2'],
    ordem: ['e0_g5', 'e3_in_still', 'e3_in_calcado', 'e3_in_calca'] },
]

const { data: f, error: eRead } = await sb.from('studio_workflows')
  .select('nodes,edges').eq('id', FLUXO).single()
if (eRead) { console.error('ERRO ao ler:', eRead.message); process.exit(1) }

const tipoDe = Object.fromEntries(f.nodes.map(n => [n.id, n.type]))
const EH_IMAGEM = new Set(['imageInput', 'generate', 'app', 'artGate', 'preview'])
const rotuloDe = id => f.nodes.find(n => n.id === id)?.data?.rotulo || id

let edges = [...f.edges]
for (const { nome, alvos, ordem } of GRUPOS) {
  console.log(`\n══ ${nome}`)
  for (const g of alvos) {
    const minhas = edges.filter(e => e.target === g)
    if (!minhas.length) { console.error(`ERRO: ${g} não tem ligações — fluxo errado?`); process.exit(1) }

    const imagens = minhas.filter(e => EH_IMAGEM.has(tipoDe[e.source]))
    const resto   = minhas.filter(e => !EH_IMAGEM.has(tipoDe[e.source]))

    // Quem não está na ordem do grupo para o script: melhor falhar visível do
    // que reordenar às cegas uma entrada nova e mandá-la para o fim sem querer.
    const desconhecidas = imagens.filter(e => !ordem.includes(e.source))
    if (desconhecidas.length) {
      console.error(`ERRO: ${g} tem referência fora da ordem canônica:`, desconhecidas.map(e => e.source).join(', '))
      console.error('      Acrescente-a à ordem do grupo antes de rodar — não vou adivinhar o peso dela.')
      process.exit(1)
    }

    const antes = imagens.map(e => e.source)
    const ordenadas = ordem.map(id => imagens.find(e => e.source === id)).filter(Boolean)

    edges = edges.filter(e => e.target !== g)
    edges.push(...ordenadas, ...resto)

    const mudou = antes.join() !== ordenadas.map(e => e.source).join()
    console.log(`\n${g}${mudou ? '' : '   (já estava na ordem)'}`)
    console.log('  antes:  ' + antes.join(' → '))
    console.log('  agora:  ' + ordenadas.map(e => e.source).join(' → '))
  }
}

// Confere que a leitura do app bate com a intenção, com a mesma regra do código:
// ordem das edges, filtrada por quem produz imagem, cortada no teto.
const MAX_REF = 5
console.log('\n═══ COMO O APP VAI LER (ordem das edges, teto ' + MAX_REF + ') ═══')
for (const { nome, alvos, ordem } of GRUPOS) {
  console.log('\n' + nome)
  const calca = ordem[ordem.length - 1]          // por definição do grupo, a última
  for (const g of alvos) {
    const refs = [...new Set(edges.filter(e => e.target === g).map(e => e.source))]
      .filter(id => EH_IMAGEM.has(tipoDe[id]))
    const usadas = refs.slice(0, MAX_REF), cortadas = refs.slice(MAX_REF)
    console.log(`  ${g}: ` + usadas.map((id, i) => `${i + 1}. ${rotuloDe(id)}`).join('  ·  '))
    if (cortadas.length) console.log(`    ⚠️ descartadas em silêncio: ${cortadas.map(rotuloDe).join(', ')}`)
    const ultima = usadas[usadas.length - 1]
    if (ultima !== calca) console.error(`    ⚠️ a última não é a calça, é ${rotuloDe(ultima)}`)
  }
}

if (SIMULAR) { console.log('\n«SIMULAÇÃO — nada foi gravado»'); process.exit(0) }
const { error } = await sb.from('studio_workflows').update({ edges }).eq('id', FLUXO)
if (error) { console.error('ERRO ao gravar:', error.message); process.exit(1) }
console.log('\ngravado.')
