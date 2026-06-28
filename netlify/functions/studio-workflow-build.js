// ════════════════════════════════════════════════════════════════════
// studio-workflow-build.js — monta um grafo de workflow a partir de um prompt
// O Sonnet 4.6 devolve nós + conexões; validamos contra o schema do canvas.
// Spec: specs/features/studio.md — Workflow (criar por prompt)
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { callAI, aiConfig } from './_ai.js'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const NODE_TYPES = ['prompt', 'formato', 'generate', 'preview', 'app', 'imageInput', 'brandContext']
const FORMATOS = ['1:1', '9:16', '16:9', '4:5']
const APP_OPS = ['upscale', 'removebg', 'variation']
const POS = (col, row) => ({ x: 40 + col * 250, y: 40 + row * 185 })

const SYSTEM = [
  'Você projeta workflows nodais de geração de imagem para o LOUDR Studio.',
  'Dada a intenção do usuário, devolva um grafo de nós e conexões.',
  'Tipos de nó disponíveis (use só estes):',
  '- "prompt": data.text (descrição da cena). Alimenta um generate.',
  '- "formato": data.formato em ["1:1","9:16","16:9","4:5"]. Alimenta um generate.',
  '- "brandContext": data.title "Brand Voice" (verbal) ou "Brand Visual" (estética). Alimenta um generate quando a peça deve ser on-brand.',
  '- "imageInput": imagem que o usuário vai subir (referência/produto). Alimenta generate (image-to-image) ou um app.',
  '- "generate": cria a imagem a partir das entradas conectadas. data: {"status":"idle","model":"auto"}.',
  '- "preview": exibe a saída de um generate/app. data: {"imageUrl":null}.',
  '- "app": edição. data.op em ["upscale","removebg","variation"]. Recebe UMA imagem de entrada (generate, imageInput ou outro app).',
  'Regras: entradas (prompt/formato/brandContext/imageInput) conectam-se a generate; generate conecta a preview e/ou app; um generate pode usar a saída de outro generate como referência. Use de 3 a 8 nós. Prefira incluir um preview no final de cada generate.',
  'Responda APENAS com JSON válido, sem markdown, no formato:',
  '{"nome":"...","nodes":[{"id":"p1","type":"prompt","col":0,"row":0,"data":{"text":"..."}}],"edges":[{"source":"p1","target":"g1"}]}',
  'col/row são inteiros (coluna/linha) para layout — entradas em col 0, generate em col 1, preview/app à direita.',
].join('\n')

function coerceNode(n, i) {
  const type = NODE_TYPES.includes(n?.type) ? n.type : 'prompt'
  const id = (typeof n?.id === 'string' && n.id) ? n.id : `${type}-${i}`
  const col = Number.isInteger(n?.col) ? n.col : 0
  const row = Number.isInteger(n?.row) ? n.row : i
  const d = n?.data || {}
  let data = {}
  if (type === 'prompt')        data = { text: String(d.text || '') }
  else if (type === 'formato')  data = { formato: FORMATOS.includes(d.formato) ? d.formato : '1:1' }
  else if (type === 'generate') data = { status: 'idle', model: 'auto' }
  else if (type === 'preview')  data = { imageUrl: null }
  else if (type === 'app')      data = { op: APP_OPS.includes(d.op) ? d.op : 'upscale', label: String(d.label || (d.op || 'app')), status: 'idle' }
  else if (type === 'imageInput') data = {}
  else if (type === 'brandContext') {
    const visual = !/voice|voz|verbal/i.test(String(d.title || ''))
    data = visual ? { title: 'Brand Visual', desc: 'Paleta, tipografia e estética' }
                  : { title: 'Brand Voice', desc: 'Tom de voz, personalidade e vocabulário' }
  }
  return { id, type, position: POS(col, row), data }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers }
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Não autorizado' }) }
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Token inválido' }) }

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body inválido' }) } }

  const { brand_id, prompt = '' } = body
  if (!brand_id)       return { statusCode: 400, headers, body: JSON.stringify({ error: 'brand_id obrigatório' }) }
  if (!prompt.trim())  return { statusCode: 400, headers, body: JSON.stringify({ error: 'Descreva o workflow' }) }

  const { data: brand } = await supabase.from('brands').select('id, workspace_id').eq('id', brand_id).single()
  if (!brand) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Marca não encontrada' }) }

  const [{ data: member }, { data: platformAdmin }] = await Promise.all([
    supabase.from('workspace_members').select('role').eq('workspace_id', brand.workspace_id).eq('user_id', user.id).maybeSingle(),
    supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle(),
  ])
  if (!member && !platformAdmin) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Sem acesso ao workspace' }) }

  let graph
  try {
    const { text } = await callAI({
      ...aiConfig('fast'),
      model: 'claude-sonnet-4-6',
      maxTokens: 1200,
      system: SYSTEM,
      messages: [{ role: 'user', content: `Intenção do usuário:\n${prompt.trim()}` }],
    })
    const json = (text || '').replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
    graph = JSON.parse(json)
  } catch {
    graph = null
  }

  // Fallback: grafo mínimo on-brand a partir do texto do usuário
  if (!graph || !Array.isArray(graph.nodes) || !graph.nodes.length) {
    graph = {
      nome: 'Workflow',
      nodes: [
        { id: 'p1', type: 'prompt', col: 0, row: 0, data: { text: prompt.trim() } },
        { id: 'bv', type: 'brandContext', col: 0, row: 1, data: { title: 'Brand Visual' } },
        { id: 'g1', type: 'generate', col: 1, row: 0, data: {} },
        { id: 'pv', type: 'preview', col: 2, row: 0, data: {} },
      ],
      edges: [{ source: 'p1', target: 'g1' }, { source: 'bv', target: 'g1' }, { source: 'g1', target: 'pv' }],
    }
  }

  const nodes = (graph.nodes || []).slice(0, 12).map(coerceNode)
  const ids = new Set(nodes.map(n => n.id))
  const edges = (graph.edges || [])
    .filter(e => e && ids.has(e.source) && ids.has(e.target) && e.source !== e.target)
    .map(e => ({ id: `e-${e.source}-${e.target}`, source: e.source, target: e.target }))
  const nome = (typeof graph.nome === 'string' && graph.nome.trim()) ? graph.nome.trim().slice(0, 80) : 'Workflow'

  return { statusCode: 200, headers, body: JSON.stringify({ nome, nodes, edges }) }
}
