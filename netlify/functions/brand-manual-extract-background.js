import { createClient } from '@supabase/supabase-js'
import { extractJSON, isDev } from './_ai.js'

const ANTHROPIC_BASE = 'https://api.anthropic.com/v1/messages'

const EXTRACTION_PROMPT = `Analise este brand manual e extraia todas as informações de marca.

Retorne APENAS JSON válido sem markdown:
{
  "identity": {
    "missao": "",
    "visao": "",
    "valores": [],
    "arquetipo": "",
    "tom_voz": "",
    "publico_alvo": "",
    "vocabulario_proibido": []
  },
  "positioning": {
    "posicionamento": "",
    "proposta_valor": "",
    "mensagem_central": ""
  },
  "design_system": {
    "colors": {
      "primary":    { "main": "" },
      "secondary":  { "main": "" },
      "background": { "main": "" },
      "surface":    { "main": "" }
    },
    "typography": {
      "font_primary":   "",
      "font_secondary": ""
    }
  },
  "references": {
    "brands": [],
    "differentiation": "",
    "anti_referencias": ""
  },
  "assets": [
    { "tipo": "logo|cor|tipografia|icone|padrao|outro", "nome": "", "descricao": "", "valor": "" }
  ],
  "tokens": [
    { "nome": "color-primary", "valor": "#RRGGBB", "categoria": "color|typography|spacing|border-radius|shadow|outro", "descricao": "" }
  ]
}

Regras:
- Informação ausente: string vazia ou array vazio
- Cores sempre em #RRGGBB hexadecimal
- Extraia TODOS os tokens de design (cores, fontes, espaçamentos, border-radius, sombras)
- Extraia todos os assets mencionados (logos, paleta de cores completa, fontes, ícones)`

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) return { statusCode: 401 }

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return { statusCode: 401 }

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return { statusCode: 400 } }

  const { brand_id, file_path, job_id } = body
  if (!brand_id || !file_path || !job_id) return { statusCode: 400 }

  const markError = async (msg) => {
    await supabase.from('brand_manual_jobs').update({ status: 'error', error: msg }).eq('id', job_id)
  }

  // Auth check
  const { data: brand } = await supabase
    .from('brands').select('id, workspace_id').eq('id', brand_id).single()
  if (!brand) { await markError('Marca não encontrada'); return { statusCode: 200 } }

  const [{ data: member }, { data: platformAdmin }] = await Promise.all([
    supabase.from('workspace_members').select('role')
      .eq('workspace_id', brand.workspace_id).eq('user_id', user.id).maybeSingle(),
    supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle(),
  ])
  if (!member && !platformAdmin) { await markError('Sem permissão'); return { statusCode: 200 } }

  // Download PDF from Supabase Storage
  const { data: fileData, error: dlErr } = await supabase.storage
    .from('brand-manuals').download(file_path)

  if (dlErr) { await markError(`Erro ao baixar arquivo: ${dlErr.message}`); return { statusCode: 200 } }

  const arrayBuffer = await fileData.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')

  // Call Claude with PDF beta
  const model = isDev() ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6'

  let claudeResp
  try {
    claudeResp = await fetch(ANTHROPIC_BASE, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta':  'pdfs-2024-09-25',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type:   'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            },
            { type: 'text', text: EXTRACTION_PROMPT },
          ],
        }],
      }),
    })
  } catch (e) {
    await markError(`Erro na API: ${e.message}`)
    return { statusCode: 200 }
  }

  if (!claudeResp.ok) {
    const errBody = await claudeResp.text()
    await markError(`Claude ${claudeResp.status}: ${errBody.slice(0, 200)}`)
    return { statusCode: 200 }
  }

  const claudeData = await claudeResp.json()
  const text = claudeData.content?.find(b => b.type === 'text')?.text || ''
  const extracted = extractJSON(text)

  if (!extracted) {
    await markError('Não foi possível extrair dados estruturados do manual')
    return { statusCode: 200 }
  }

  // Upsert brand_book
  const { data: existingBook } = await supabase
    .from('brand_books').select('id, version').eq('brand_id', brand_id).maybeSingle()

  if (existingBook?.id) {
    await supabase.from('brand_books').update({
      identity:      extracted.identity      || {},
      positioning:   extracted.positioning   || {},
      design_system: extracted.design_system || {},
      references:    extracted.references    || {},
      version:       (existingBook.version || 1) + 1,
      updated_at:    new Date().toISOString(),
    }).eq('id', existingBook.id)
  } else {
    await supabase.from('brand_books').insert({
      brand_id,
      identity:      extracted.identity      || {},
      positioning:   extracted.positioning   || {},
      design_system: extracted.design_system || {},
      references:    extracted.references    || {},
    })
  }

  // Replace assets
  if (extracted.assets?.length) {
    await supabase.from('brand_assets').delete().eq('brand_id', brand_id)
    await supabase.from('brand_assets').insert(
      extracted.assets
        .filter(a => a.nome)
        .map(a => ({
          brand_id,
          tipo:      a.tipo      || 'outro',
          nome:      a.nome,
          descricao: a.descricao || '',
          valor:     a.valor     || '',
        }))
    )
  }

  // Replace design tokens
  if (extracted.tokens?.length) {
    await supabase.from('design_tokens').delete().eq('brand_id', brand_id)
    await supabase.from('design_tokens').insert(
      extracted.tokens
        .filter(t => t.nome && t.valor)
        .map(t => ({
          brand_id,
          nome:      t.nome,
          valor:     t.valor,
          categoria: t.categoria || 'outro',
          descricao: t.descricao || '',
        }))
    )
  }

  await supabase.from('brand_manual_jobs').update({ status: 'done' }).eq('id', job_id)
  console.log(`[brand-manual] Extração concluída para brand ${brand_id}`)

  return { statusCode: 200 }
}
