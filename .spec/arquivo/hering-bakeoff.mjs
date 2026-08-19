// hering-bakeoff.mjs — qual abordagem serve para o KH6V?
//
// Danilo, 19/08/2026: "vamos rodar com exemplos específicos, até decidir se o
// try-on é o melhor modelo mesmo para isso."
//
// Mesmo alvo, mesmas entradas, seis caminhos. Todos julgados pelo MESMO juiz de
// fidelidade (o mesmo system prompt do art-review em modo fidelidade), contra o
// MESMO still. O que sai é comparação, não impressão.
//
// Rodar da raiz do projeto:  node .spec/arquivo/hering-bakeoff.mjs
import { submitImageJob, getJobStatus, getJobResult, firstImageUrl } from '../../netlify/functions/_image.js'
import { callAI, MODELS } from '../../netlify/functions/_ai.js'

const B = 'https://uoaeegvpksaummjvmwxg.supabase.co/storage/v1/object/public/brand-assets/09f3d65b-07d9-46c9-b6e7-f878377dd7c2/workflow'
const STILL   = `${B}/1787160605941-x3im-KH6V_still_frente.jpg`
const MODELO  = `${B}/1787161228142-azfq-imagem_1_modelo.jpg`
const MODELO2 = `${B}/1787161396886-ppgt-imagem_2_modelo.jpg`

// O mesmo pedido para todos: só muda COMO se chega lá.
const PROMPT = `Plano inteiro de catálogo de moda: a modelo em pé, de frente, corpo inteiro,
vestindo EXATAMENTE a camiseta da imagem de referência do produto — manga curta, off-white,
listras horizontais finas azul-marinho, gola alta canelada.

A peça vem do still do produto, NÃO da roupa que a modelo veste na foto de casting (ali ela
usa outra peça — ignore-a completamente; dela aproveite só rosto, tom de pele, cabelo e pose).

Fundo cinza claro neutro sólido #F2F2F2. Luz de estúdio suave e difusa.
SEM NENHUM TEXTO, letra, número, etiqueta ou logotipo na imagem.`

// REPETIÇÃO (2ª fase): três rodadas por finalista. Modelo generativo varia entre
// execuções — uma rodada indica direção, três mostram CONSISTÊNCIA, que é o que
// importa numa operação em escala. Ligar com REPETIR=3.
const REPETIR = Number(process.env.REPETIR || 1)
const FINALISTAS = process.env.FINALISTAS === '1'

const CAMINHOS = [
  { nome: 'try-on (FASHN)',            model: 'fal-ai/fashn/tryon/v1.6',                       refs: [MODELO, STILL] },
  { nome: 'nano banana pro',           model: 'fal-ai/nano-banana-pro',                        refs: [STILL, MODELO, MODELO2] },
  { nome: 'seedream 4.5',              model: 'fal-ai/bytedance/seedream/v4.5/text-to-image',  refs: [STILL, MODELO, MODELO2] },
  { nome: 'gpt image 2',               model: 'openai/gpt-image-2',                            refs: [STILL, MODELO, MODELO2] },
  { nome: 'flux.2 pro',                model: 'fal-ai/flux-2-pro',                             refs: [STILL, MODELO, MODELO2] },
  // ordem invertida: a modelo primeiro. Testa se a DOMINÂNCIA da 1ª referência
  // é o que faz o modelo copiar a roupa errada.
  { nome: 'nano banana (modelo 1º)',   model: 'fal-ai/nano-banana-pro',                        refs: [MODELO, STILL, MODELO2] },
]

const JUIZ = [
  'Você é um INSPETOR DE FIDELIDADE DE PRODUTO para catálogo de moda/e-commerce.',
  'Você recebe DUAS imagens: a 1ª é a PEÇA GERADA por IA; a 2ª é o PRODUTO ORIGINAL (foto real de referência).',
  'Julgue APENAS a fidelidade da roupa/produto entre as duas: estampa e posição dos elementos, TEXTO (letra por letra), cores exatas, botões/aviamentos, costuras e modelagem. IGNORE estética de marca, fundo, pose ou qualidade artística.',
  '"aprovada" = produto idêntico no que está visível; "aprovada_com_ressalvas" = diferenças pequenas (elemento levemente reposicionado, detalhe ocluso); "reprovada" = elemento inventado/removido/alterado, texto ilegível ou divergente, cor errada.',
  'CRITÉRIO ADICIONAL: a peça precisa ser camiseta de MANGA CURTA com GOLA ALTA canelada e LISTRAS HORIZONTAIS azul-marinho. Regata, alça fina ou decote em V = reprovada.',
  'Responda APENAS com JSON estrito: {"veredito":"aprovada|aprovada_com_ressalvas|reprovada","resumo":"<1 frase>","ajustes":["<divergência concreta>"]}',
].join('\n')

const dorme = ms => new Promise(r => setTimeout(r, ms))

async function gerar({ model, refs }) {
  const job = await submitImageJob({ model, prompt: PROMPT, references: refs, format: '4:5' })
  const t0 = Date.now()
  for (let i = 0; i < 90; i++) {
    await dorme(4000)
    const st = await getJobStatus(model, job.requestId ?? job.request_id, job.statusUrl ?? job.status_url)
    const s = String(st?.status || '').toUpperCase()
    if (s === 'COMPLETED') {
      const res = await getJobResult(model, job.requestId ?? job.request_id, job.resultUrl ?? job.response_url)
      return { url: firstImageUrl(res), seg: (Date.now() - t0) / 1000 }
    }
    if (s === 'FAILED' || s === 'ERROR') throw new Error('job falhou: ' + JSON.stringify(st).slice(0, 200))
  }
  throw new Error('timeout')
}

async function julgar(url) {
  const { text } = await callAI({
    model: MODELS.medium, maxTokens: 800, retries: 1, timeoutMs: 40000, system: JUIZ,
    messages: [{ role: 'user', content: [
      { type: 'image', source: { type: 'url', url } },
      { type: 'image', source: { type: 'url', url: STILL } },
      { type: 'text', text: 'A 1ª imagem é a peça gerada; a 2ª é o produto original. Julgue.' },
    ] }],
  })
  const m = text.match(/\{[\s\S]*\}/)
  return m ? JSON.parse(m[0]) : { veredito: '?', resumo: text.slice(0, 120), ajustes: [] }
}

const ALVOS = (FINALISTAS
  ? CAMINHOS.filter(c => ['nano banana pro', 'seedream 4.5', 'flux.2 pro'].includes(c.nome))
  : CAMINHOS)
  .flatMap(c => Array.from({ length: REPETIR }, (_, i) =>
    REPETIR > 1 ? { ...c, nome: `${c.nome} #${i + 1}` } : c))

const linhas = []
for (const c of ALVOS) {
  process.stderr.write(`· ${c.nome}\n`)
  try {
    const { url, seg } = await gerar(c)
    if (!url) throw new Error('sem imagem na resposta')
    const j = await julgar(url)
    linhas.push({ ...c, url, seg, ...j })
  } catch (e) {
    linhas.push({ ...c, erro: e.message })
  }
}

const ORDEM = { aprovada: 0, aprovada_com_ressalvas: 1, reprovada: 2 }
linhas.sort((a, b) => (ORDEM[a.veredito] ?? 9) - (ORDEM[b.veredito] ?? 9))

console.log('\n' + 'caminho'.padEnd(26) + 'veredito'.padEnd(26) + 'tempo')
console.log('─'.repeat(72))
for (const l of linhas) {
  if (l.erro) { console.log(l.nome.padEnd(26) + 'ERRO: ' + l.erro.slice(0, 44)); continue }
  console.log(l.nome.padEnd(26) + String(l.veredito).padEnd(26) + `${l.seg.toFixed(0)}s`)
}
console.log('\n\n=== O QUE O JUIZ VIU ===')
for (const l of linhas) {
  if (l.erro) continue
  console.log(`\n── ${l.nome} · ${l.veredito}`)
  console.log('   ' + l.resumo)
  for (const a of (l.ajustes || []).slice(0, 4)) console.log('   · ' + a)
  console.log('   ' + l.url)
}

if (REPETIR > 1) {
  const base = l => l.nome.replace(/ #\d+$/, '')
  const por = {}
  for (const l of linhas) {
    const k = base(l)
    por[k] ??= { aprovada: 0, ressalvas: 0, reprovada: 0, erro: 0, seg: [] }
    if (l.erro) por[k].erro++
    else {
      por[k][l.veredito === 'aprovada_com_ressalvas' ? 'ressalvas' : l.veredito]++
      por[k].seg.push(l.seg)
    }
  }
  console.log('\n\n=== CONSISTÊNCIA (' + REPETIR + ' rodadas por caminho) ===')
  console.log('caminho'.padEnd(20) + 'aprov'.padStart(6) + 'ressalv'.padStart(9) + 'reprov'.padStart(8) + 'erro'.padStart(6) + 'tempo médio'.padStart(14))
  console.log('─'.repeat(63))
  for (const [k, v] of Object.entries(por).sort((a, b) => b[1].aprovada - a[1].aprovada)) {
    const media = v.seg.length ? (v.seg.reduce((a, b) => a + b, 0) / v.seg.length).toFixed(0) + 's' : '—'
    console.log(k.padEnd(20) + String(v.aprovada).padStart(6) + String(v.ressalvas).padStart(9) + String(v.reprovada).padStart(8) + String(v.erro).padStart(6) + media.padStart(14))
  }
}
