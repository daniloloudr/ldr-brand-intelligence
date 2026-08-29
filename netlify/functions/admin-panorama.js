// ════════════════════════════════════════════════════════════════════
// admin-panorama.js — as visões CROSS-TENANT do /admin, lidas pelo servidor.
//
// POR QUE ISTO EXISTE
// Dois painéis do /admin olham todos os clientes de uma vez: **Cérebros**
// (quantas versões, que confiança, quantos sinais pendentes por marca) e
// **Custos** (consumo por workspace). Eles liam as tabelas direto do browser,
// com o token do operador, apoiados no bypass permanente da migration 007.
//
// A migration 053 acaba com esse bypass: para ver o dado de um cliente é
// preciso uma sessão de suporte declarada PARA AQUELE cliente. E aí está o
// problema que a revisão de 27/08 encontrou: uma visão que atravessa todos os
// tenants não cabe numa sessão de um tenant só. Não é limitação da 053 — é a
// natureza da tela. Panorama de plataforma é pergunta de operação, não de
// suporte a um cliente.
//
// A resposta é a mesma que o produto já usa em `admin-list-members` e
// `admin-create-user`: o servidor lê com service key, atrás de identidade
// conferida e SEGUNDO FATOR. O browser recebe o resultado, nunca a permissão.
//
// O QUE NÃO PASSA POR AQUI
// O ambiente de UM cliente. Isso continua sendo impersonação com sessão aberta
// — inclusive para o operador. A divisão é essa: agregado da plataforma vem
// pelo servidor; dado de um cliente exige declarar a intenção.
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { exigirSegundoFator } from './_mfa.js'

const cabecalhos = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
const erro = (statusCode, mensagem) => ({ statusCode, headers: cabecalhos, body: JSON.stringify({ error: mensagem }) })

// Os mesmos tetos que as consultas do browser já usavam — trocar o caminho não
// pode trocar o número, senão o painel muda de valor sem ninguém ter pedido.
const TETO = 10000

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cabecalhos }
  if (event.httpMethod !== 'GET') return erro(405, 'Método não suportado')

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const token = event.headers?.authorization?.replace(/^Bearer /, '')
  if (!token) return erro(401, 'Não autenticado')

  const { data: { user: quemChama } = {}, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !quemChama) return erro(401, 'Não autenticado')

  const { data: operador } = await supabase
    .from('platform_admins').select('id').eq('user_id', quemChama.id).maybeSingle()
  if (!operador) return erro(403, 'Acesso negado')

  // Segundo fator. A identidade já foi VALIDADA acima (getUser confere a
  // assinatura do token); só depois disso faz sentido ler a claim `aal`.
  // Este endpoint devolve um retrato de TODOS os clientes de uma vez — se
  // alguma leitura exige o degrau, é esta.
  const semFator = exigirSegundoFator(token, cabecalhos)
  if (semFator) return semFator

  const vista = event.queryStringParameters?.vista

  if (vista === 'cerebros') {
    // As seis consultas que o painel fazia do browser, com os mesmos campos e
    // os mesmos tetos. A agregação segue no cliente de propósito: mover o
    // caminho do dado e reescrever a matemática no mesmo commit é como se
    // introduz uma diferença que ninguém sabe se veio de qual das duas.
    const [b, w, bi, sig, ds, votes] = await Promise.all([
      supabase.from('brands').select('id,nome,workspace_id'),
      supabase.from('workspaces').select('id,nome,plano'),
      supabase.from('brand_intelligence').select('brand_id,versao,confianca_media,created_at').order('versao', { ascending: true }),
      supabase.from('brand_signals').select('brand_id,consumido_em').limit(TETO),
      supabase.from('brand_dataset').select('brand_id').limit(TETO),
      supabase.from('studio_generations').select('brand_id,feedback').not('feedback', 'is', null).limit(TETO),
    ])

    return {
      statusCode: 200,
      headers: cabecalhos,
      body: JSON.stringify({
        brands:     b.data   || [],
        workspaces: w.data   || [],
        intel:      bi.data  || [],
        sinais:     sig.data || [],
        dataset:    ds.data  || [],
        votos:      votes.data || [],
      }),
    }
  }

  if (vista === 'custos') {
    const [g, w] = await Promise.all([
      supabase.from('studio_generations').select('workspace_id,provider,media_type,status,created_at').limit(5000),
      supabase.from('workspaces').select('id,nome,plano,creditos_saldo'),
    ])
    return {
      statusCode: 200,
      headers: cabecalhos,
      body: JSON.stringify({ gens: g.data || [], workspaces: w.data || [] }),
    }
  }

  return erro(400, 'vista inválida (use: cerebros | custos)')
}
