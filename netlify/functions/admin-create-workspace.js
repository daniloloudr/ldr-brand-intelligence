import { createClient } from '@supabase/supabase-js'

// slug do subdomínio (nomedamarca.br4ndcode.com) — mesma lógica da migration 044
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

// Provisiona o subdomínio da marca no Netlify: adiciona {slug}.br4ndcode.com como
// domain alias → como o br4ndcode.com está no Netlify DNS, ele cria o registro DNS
// E o cert automaticamente. Best-effort: falha aqui NÃO bloqueia a criação do
// workspace (dá pra provisionar depois). Netlify não tem wildcard self-serve —
// por isso registramos subdomínio a subdomínio, mas de forma automática.
async function provisionSubdomain(slug) {
  const token  = process.env.NETLIFY_API_TOKEN
  const siteId = process.env.NETLIFY_SITE_ID || '8971b5bd-05f8-4c41-9cb9-a89065457a88'
  const root   = process.env.ROOT_DOMAIN || 'br4ndcode.com'
  if (!token) return { ok: false, reason: 'sem NETLIFY_API_TOKEN' }
  const host = `${slug}.${root}`
  const api  = `https://api.netlify.com/api/v1/sites/${siteId}`
  const hdr  = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  try {
    const cur = await fetch(api, { headers: hdr })
    if (!cur.ok) return { ok: false, reason: `GET ${cur.status}` }
    const site = await cur.json()
    const aliases = Array.isArray(site.domain_aliases) ? site.domain_aliases : []
    if (aliases.includes(host)) return { ok: true, host, already: true }
    const res = await fetch(api, { method: 'PATCH', headers: hdr, body: JSON.stringify({ domain_aliases: [...aliases, host] }) })
    if (!res.ok) return { ok: false, reason: `PATCH ${res.status}` }
    return { ok: true, host }
  } catch (e) {
    return { ok: false, reason: e.message }
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

  // A MARCA nasce JUNTO do workspace, compartilhando nome/slug/site — não pede de novo
  // (decisão 2026-07-21). O brand book começa vazio; a extração do manual PDF enriquece depois.
  const { data: brand } = await supabase.from('brands')
    .insert({ workspace_id: ws.id, nome: ws.nome, slug: ws.slug, status: 'draft' })
    .select('id').single()
  if (brand?.id) {
    await supabase.from('brand_books').insert({
      brand_id: brand.id,
      identity: { setor: ws.setor || null, site: ws.dominio || null },
      positioning: {}, design_system: {}, references: {}, verbal_identity: {}, visual_identity: {},
    })
  }

  // Provisiona o subdomínio (best-effort — não bloqueia se falhar)
  const subdomain = await provisionSubdomain(slug)

  // A INTELIGÊNCIA começa aqui, sozinha. Ela só precisa do domínio, que acabou
  // de ser cadastrado — não precisa do manual, que pode levar dias. A trilha da
  // marca nasce em `waiting` e destrava quando o PDF chegar.
  // Best-effort: se falhar, o admin ainda tem o botão "Preparar ambiente".
  let onboarding = null
  if (brand?.id && ws.dominio) {
    const agora = new Date().toISOString()
    onboarding = {
      started_at: agora, brand_id: brand.id, phase_at: agora, rev: 0,
      fases: { inteligencia: agora, marca: agora },
      notas: { brand: 'aguardando o manual da marca — a inteligência já está rodando' },
      steps: { brand: 'waiting', diagnostico: 'pending', concorrentes: 'pending',
               mineracao: 'pending', sinteses: 'pending', destilacao: 'pending' },
    }
    const { error: onbErr } = await supabase.from('workspaces').update({ onboarding }).eq('id', ws.id)
    if (onbErr) { console.error('[admin-create-workspace] onboarding não iniciou:', onbErr.message); onboarding = null }
  }

  return { statusCode: 200, headers, body: JSON.stringify({ workspace: { ...ws, onboarding }, brand: brand || null, subdomain }) }
}
