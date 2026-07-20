import { createClient } from '@supabase/supabase-js'

// slug do subdomínio (nomedamarca.s1ngulr.com) — mesma lógica da migration 044
function slugify(nome) {
  return (nome || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// garante unicidade (índice único em workspaces.slug); colisão ganha sufixo
async function uniqueSlug(supabase, base) {
  base = slugify(base) || 'marca'
  let slug = base, n = 1
  for (;;) {
    const { data } = await supabase.from('workspaces').select('id').eq('slug', slug).maybeSingle()
    if (!data) return slug
    n += 1; slug = `${base}-${n}`
  }
}

async function isPlatformAdmin(supabase, token) {
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  const { data } = await supabase
    .from('platform_admins')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  return data ? user : null
}

export const handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = event.headers.authorization?.replace('Bearer ', '')
  const adminUser = await isPlatformAdmin(supabase, token)
  if (!adminUser) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Acesso negado' }) }

  const { nome, dominio, setor, porte, creditos_mes, valor_mensal_centavos, slug: slugInput } = JSON.parse(event.body || '{}')
  if (!nome) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nome obrigatório' }) }

  // slug do subdomínio: usa o informado (slugificado) ou deriva do nome; garante único
  const slug = await uniqueSlug(supabase, slugInput || nome)

  // Sem tiers (decisão 2026-07-20): workspace criado pelo admin nasce full-access
  // (plano='enterprise' só destrava os gates legados) e com o pool do contrato já
  // inicializado. Créditos/mês e valor são inseridos na mão.
  const pool  = Math.max(parseInt(creditos_mes, 10) || 0, 0)
  const reset = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1)).toISOString()

  const { data: ws, error: wsError } = await supabase
    .from('workspaces')
    .insert({
      nome, dominio, setor, porte, slug,
      plano: 'enterprise', plano_status: 'active',
      creditos_mes: pool || null,
      valor_mensal_centavos: Number.isFinite(valor_mensal_centavos) ? valor_mensal_centavos : null,
      creditos_saldo: pool,
      creditos_ciclo_reset: reset,
    })
    .select()
    .single()

  if (!wsError && pool > 0) {
    // registra o grant inicial no ledger (auditoria)
    await supabase.from('credit_transactions').insert({
      workspace_id: ws.id, delta: pool, saldo_after: pool, tipo: 'grant', operacao: 'admin',
    })
  }

  if (wsError) return { statusCode: 400, headers, body: JSON.stringify({ error: wsError.message }) }

  // Adiciona o admin como membro do workspace criado
  await supabase.from('workspace_members').insert({
    workspace_id: ws.id,
    user_id: adminUser.id,
    role: 'admin',
  })

  return { statusCode: 200, headers, body: JSON.stringify({ workspace: ws }) }
}
