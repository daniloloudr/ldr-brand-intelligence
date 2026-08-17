#!/usr/bin/env node
/**
 * Reprovisiona os subdomínios das marcas que JÁ existem.
 *
 * O `admin-create-workspace` só registra o alias no momento da criação do
 * workspace — na virada de domínio (s1ngulr.com → br4ndcode.com) os workspaces
 * antigos ficariam sem host. Este script fecha essa lacuna.
 *
 * DRY-RUN por padrão: sem `--apply` ele só mostra o que faria.
 *
 *   node scripts/provision-subdomains.mjs           # mostra o plano
 *   node scripts/provision-subdomains.mjs --apply   # escreve no Netlify
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, NETLIFY_API_TOKEN,
 *      ROOT_DOMAIN (padrão br4ndcode.com), NETLIFY_SITE_ID (padrão = site atual).
 */
import { readFileSync } from 'node:fs'

// .env local (mesmo formato do netlify dev) — sem dependência externa
try {
  for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch { /* sem .env: usa o ambiente */ }

const APPLY   = process.argv.includes('--apply')
const ROOT    = process.env.ROOT_DOMAIN || 'br4ndcode.com'
const SITE_ID = process.env.NETLIFY_SITE_ID || '8971b5bd-05f8-4c41-9cb9-a89065457a88'
const TOKEN   = process.env.NETLIFY_API_TOKEN
const SB_URL  = process.env.SUPABASE_URL
const SB_KEY  = process.env.SUPABASE_SERVICE_KEY

for (const [k, v] of Object.entries({ NETLIFY_API_TOKEN: TOKEN, SUPABASE_URL: SB_URL, SUPABASE_SERVICE_KEY: SB_KEY })) {
  if (!v) { console.error(`✗ falta ${k} no ambiente`); process.exit(1) }
}

const api = `https://api.netlify.com/api/v1/sites/${SITE_ID}`
const hdr = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }

// 1) marcas ativas no banco
const res = await fetch(`${SB_URL}/rest/v1/workspaces?select=nome,slug,ativo&order=nome`, {
  headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
})
if (!res.ok) { console.error('✗ Supabase', res.status, await res.text()); process.exit(1) }
const workspaces = (await res.json()).filter(w => w.slug && w.ativo !== false)

// 2) estado atual do site
const siteRes = await fetch(api, { headers: hdr })
if (!siteRes.ok) { console.error('✗ Netlify GET', siteRes.status); process.exit(1) }
const site    = await siteRes.json()
const aliases = Array.isArray(site.domain_aliases) ? site.domain_aliases : []

// 3) diferença
const wanted  = workspaces.map(w => ({ ...w, host: `${w.slug}.${ROOT}` }))
const missing = wanted.filter(w => !aliases.includes(w.host))
const stale   = aliases.filter(a => a.endsWith('.s1ngulr.com'))

console.log(`\nsite:        ${site.name} (${site.custom_domain || 'sem domínio principal'})`)
console.log(`root:        ${ROOT}`)
console.log(`workspaces:  ${workspaces.length} ativos com slug`)
console.log(`aliases:     ${aliases.length} registrados\n`)

if (!missing.length) console.log('✓ todos os subdomínios já existem')
else {
  console.log(`faltando (${missing.length}):`)
  for (const w of missing) console.log(`  + ${w.host.padEnd(38)} ${w.nome}`)
}
if (stale.length) console.log(`\n⚠ aliases do domínio antigo ainda no site (${stale.length}) — remover no Netlify após validar:\n  ${stale.join('\n  ')}`)

if (!missing.length) process.exit(0)
if (!APPLY) { console.log('\n(dry-run — rode com --apply para registrar)'); process.exit(0) }

// 4) escreve — um PATCH só, com a lista completa
const patch = await fetch(api, {
  method: 'PATCH', headers: hdr,
  body: JSON.stringify({ domain_aliases: [...aliases, ...missing.map(w => w.host)] }),
})
if (!patch.ok) { console.error('\n✗ Netlify PATCH', patch.status, await patch.text()); process.exit(1) }
console.log(`\n✓ ${missing.length} subdomínio(s) registrado(s). DNS e certificado saem automáticos — confira em alguns minutos.`)
