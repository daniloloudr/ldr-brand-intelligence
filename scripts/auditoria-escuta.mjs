// ════════════════════════════════════════════════════════════════════
// auditoria-escuta.mjs — a escuta declarou mais do que coletou?
//
// SOMENTE LEITURA. Não apaga, não corrige, não escreve. Roda quando quiser.
//
// POR QUE EXISTE
// Até 18/08/2026 a coleta rodava com um tier que desliga a busca web. Modelo sem
// como pesquisar não recusa: descreve o que uma marca daquele ramo *costuma*
// receber. A PES ganhou 9 queixas de cancelamento que ninguém escreveu, e o
// número virou `sentiment_snapshot`, virou sinal, e a destilação consumiu.
//
// A correção (a busca coleta, o modelo classifica sem ferramenta) impede casos
// NOVOS. Ela não desfaz o que já está no banco — e ninguém tinha como saber o
// tamanho do estrago, porque não havia como perguntar. Esta é a pergunta.
//
// O INVARIANTE
// Um snapshot é um agregado dos eventos daquele ciclo. Ele NUNCA pode declarar
// mais menções do que existem eventos com URL no mesmo dia e workspace. Quando
// declara, uma de duas: o evento foi apagado depois (e o agregado ficou órfão),
// ou o número nasceu da imaginação do modelo. Os dois casos são dado falso
// apresentado ao cliente como percepção de mercado.
//
// A saída separa o que É contaminado do que JÁ FOI CONSUMIDO pela destilação —
// porque limpar snapshot é fácil, e desfazer o que virou memória da marca não é.
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY
if (!url || !key) {
  console.error('✖ Faltam SUPABASE_URL / SUPABASE_SERVICE_KEY no ambiente.')
  process.exit(1)
}
const sb = createClient(url, key)

const porDia = (linhas, campoData) => {
  const m = new Map()
  for (const l of linhas) {
    const dia = String(l[campoData]).slice(0, 10)
    const chave = `${l.workspace_id}|${dia}`
    if (!m.has(chave)) m.set(chave, [])
    m.get(chave).push(l)
  }
  return m
}

const [{ data: workspaces }, { data: eventos }, { data: snapshots }, { data: sinais }] = await Promise.all([
  sb.from('workspaces').select('id, nome'),
  sb.from('listening_events').select('workspace_id, created_at, url'),
  sb.from('sentiment_snapshots').select('id, workspace_id, created_at, total_mencoes'),
  sb.from('brand_signals').select('id, workspace_id, created_at, consumido_em').eq('tipo', 'listening_sentiment'),
])

const nome = Object.fromEntries((workspaces || []).map(w => [w.id, w.nome]))
const eventosPorDia   = porDia(eventos   || [], 'created_at')
const snapshotsPorDia = porDia(snapshots || [], 'created_at')
const sinaisPorDia    = porDia(sinais    || [], 'created_at')

const semUrl = (eventos || []).filter(e => !e.url || !e.url.trim()).length

let contaminados = 0, mencoesFantasma = 0, sinaisConsumidos = 0
const marcasAfetadas = new Set()
const linhas = []

for (const [chave, snaps] of snapshotsPorDia) {
  const [ws, dia] = chave.split('|')
  const declaradas = snaps.reduce((s, x) => s + (x.total_mencoes || 0), 0)
  const reais = (eventosPorDia.get(chave) || []).filter(e => e.url && e.url.trim()).length
  if (declaradas <= reais) continue

  const sinaisDoDia = sinaisPorDia.get(chave) || []
  const consumidos = sinaisDoDia.filter(s => s.consumido_em).length

  contaminados     += snaps.length
  mencoesFantasma  += declaradas - reais
  sinaisConsumidos += consumidos
  marcasAfetadas.add(nome[ws] || ws)

  linhas.push({
    marca: nome[ws] || ws, dia, snapshots: snaps.length,
    declaradas, reais, fantasma: declaradas - reais,
    sinais: sinaisDoDia.length, consumidos,
  })
}

linhas.sort((a, b) => a.marca.localeCompare(b.marca) || a.dia.localeCompare(b.dia))

console.log('\nAUDITORIA DA ESCUTA — o que foi declarado sem ter sido coletado\n')
console.log('eventos sem URL no banco:', semUrl, semUrl === 0 ? '(a limpeza anterior pegou todos)' : '⚠️')
if (!linhas.length) {
  console.log('\n✓ Nenhum snapshot declara mais menções do que existem eventos. Nada a corrigir.')
  process.exit(0)
}

console.log('')
console.log('marca'.padEnd(26), 'dia'.padEnd(12), 'snaps'.padStart(6), 'declar'.padStart(7), 'reais'.padStart(6), 'fantasma'.padStart(9), 'consumidos'.padStart(11))
console.log('-'.repeat(84))
for (const l of linhas) {
  console.log(
    l.marca.slice(0, 25).padEnd(26), l.dia.padEnd(12),
    String(l.snapshots).padStart(6), String(l.declaradas).padStart(7),
    String(l.reais).padStart(6), String(l.fantasma).padStart(9),
    String(l.consumidos).padStart(11),
  )
}
console.log('-'.repeat(84))
console.log(`\n${contaminados} snapshot(s) contaminado(s) em ${marcasAfetadas.size} marca(s): ${[...marcasAfetadas].join(', ')}`)
console.log(`${mencoesFantasma} menção(ões) declarada(s) sem evento correspondente`)
console.log(`${sinaisConsumidos} sinal(is) JÁ CONSUMIDO(S) pela destilação`)

if (sinaisConsumidos > 0) {
  console.log(`
⚠️  Sinal consumido já virou memória da marca. Apagar o snapshot NÃO desfaz isso:
    a destilação lê "versão atual + sinais novos", então a versão seguinte é
    construída EM CIMA da anterior. Para essas marcas, limpar exige decidir o que
    fazer com as versões de brand_intelligence — não é um DELETE e pronto.`)
}
