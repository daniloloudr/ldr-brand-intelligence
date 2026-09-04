// ════════════════════════════════════════════════════════════════════
// studio-baixar.js — o proxy que existe só porque o R2 não fala CORS.
//
// O bucket público devolve a imagem para uma tag `<img>` (que não precisa de
// permissão de origem) mas NÃO devolve `Access-Control-Allow-Origin` — então
// `fetch()` no navegador é bloqueado, e o "Baixar tudo" não conseguia ler os
// bytes para montar o zip.
//
// ⚠️ Isto NÃO é um proxy aberto. Três travas, e as três importam:
//   1. exige token de usuário;
//   2. a URL tem de ser do NOSSO bucket — senão vira um buscador de URL
//      arbitrária hospedado no nosso domínio, que é o que transforma um proxy
//      inocente em ferramenta de quem quer varrer rede interna;
//   3. a geração pedida tem de pertencer a um workspace de que a pessoa
//      participa. Sem isso, qualquer usuário logado baixaria peça de qualquer
//      cliente — o isolamento que a RLS garante no banco não vale de graça aqui,
//      porque este código roda com a service key.
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers }
  if (event.httpMethod !== 'GET')     return { statusCode: 405, headers }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = event.headers.authorization?.replace('Bearer ', '')
  if (!token) return { statusCode: 401, headers }
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return { statusCode: 401, headers }

  const id = event.queryStringParameters?.generation_id
  if (!id) return { statusCode: 400, headers, body: 'generation_id obrigatório' }

  const { data: gen } = await supabase.from('studio_generations')
    .select('image_url, workspace_id').eq('id', id).maybeSingle()
  if (!gen?.image_url) return { statusCode: 404, headers }

  // A pessoa participa deste workspace? (ou é operador da plataforma)
  const [{ data: membro }, { data: admin }] = await Promise.all([
    supabase.from('workspace_members').select('user_id')
      .eq('workspace_id', gen.workspace_id).eq('user_id', user.id).maybeSingle(),
    supabase.from('platform_admins').select('id').eq('user_id', user.id).maybeSingle(),
  ])
  if (!membro && !admin) return { statusCode: 403, headers }

  // Só o nosso bucket. `URL` em vez de `startsWith`: comparar prefixo de texto
  // aceitaria `https://pub-xxx.r2.dev.evil.com/…`, que tem o nosso host como
  // prefixo e não é nosso.
  let alvo
  try { alvo = new URL(gen.image_url) } catch { return { statusCode: 400, headers } }
  const permitidos = [process.env.R2_PUBLIC_URL, process.env.SUPABASE_URL]
    .filter(Boolean).map(u => { try { return new URL(u).host } catch { return null } }).filter(Boolean)
  if (!permitidos.includes(alvo.host)) return { statusCode: 400, headers, body: 'origem não permitida' }

  const r = await fetch(alvo.toString())
  if (!r.ok) return { statusCode: 502, headers, body: `origem devolveu ${r.status}` }
  const buf = Buffer.from(await r.arrayBuffer())

  return {
    statusCode: 200,
    headers: {
      ...headers,
      'Content-Type': r.headers.get('content-type') || 'application/octet-stream',
      'Cache-Control': 'private, max-age=300',
    },
    body: buf.toString('base64'),
    isBase64Encoded: true,
  }
}
