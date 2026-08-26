import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env','utf8').split('\n').filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')).trim(),l.slice(l.indexOf('=')+1).trim().replace(/^["']|["']$/g,'')]))
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
const sleep = ms => new Promise(r => setTimeout(r, ms))
const ORDEM = ['brand','diagnostico','concorrentes','mineracao','sinteses','destilacao']
let anterior = ''
for (let i = 0; i < 26; i++) {
  const { data: ws } = await db.from('workspaces').select('id, onboarding').eq('slug','zetona').single()
  const s = ws.onboarding?.steps || {}
  const linha = ORDEM.map(k => `${k}=${s[k]}`).join(' · ')
  if (linha !== anterior) {
    const t = new Date().toTimeString().slice(0,8)
    const contagens = {}
    for (const tb of ['concorrentes','concorrente_clipping','tendencias','listening_events','market_sinteses','consumer_insights']) {
      const { count } = await db.from(tb).select('id',{count:'exact',head:true}).eq('workspace_id', ws.id)
      contagens[tb] = count ?? 0
    }
    console.log(`[${t}] ${linha}`)
    console.log(`          conc=${contagens.concorrentes} clip=${contagens.concorrente_clipping} trends=${contagens.tendencias} escuta=${contagens.listening_events} mkt=${contagens.market_sinteses} insights=${contagens.consumer_insights}`)
    const n = ws.onboarding?.notas || {}
    for (const [k,v] of Object.entries(n)) if (k !== 'brand') console.log(`          nota ${k}: ${v}`)
    anterior = linha
  }
  if (ORDEM.filter(k=>k!=='brand').every(k => ['done','expired','failed'].includes(s[k]))) { console.log('\n— trilha encerrada —'); break }
  await sleep(30000)
}
