import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env','utf8').split('\n').filter(l=>l.includes('=')&&!l.trim().startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')).trim(),l.slice(l.indexOf('=')+1).trim().replace(/^["']|["']$/g,'')]))
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
const sleep = ms => new Promise(r=>setTimeout(r,ms))
const { data: ws } = await db.from('workspaces').select('id').eq('slug','zetona').single()
const t0 = new Date().toISOString()
for (let i=0;i<20;i++){
  await sleep(20000)
  const [{count:mkt},{count:ins}] = await Promise.all([
    db.from('market_sinteses').select('id',{count:'exact',head:true}).eq('workspace_id',ws.id),
    db.from('consumer_insights').select('id',{count:'exact',head:true}).eq('workspace_id',ws.id),
  ])
  const { data: llm } = await db.from('ai_usage').select('tag').gte('created_at', t0)
  const tags = [...new Set((llm||[]).map(x=>x.tag))].join(',')
  console.log(`[${new Date().toTimeString().slice(0,8)}] mercado=${mkt} insights=${ins} llm=[${tags||'—'}]`)
  if (mkt>0 && ins>0) { console.log('AMBAS PRODUZIRAM'); break }
}
