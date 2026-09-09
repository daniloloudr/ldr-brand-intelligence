// ════════════════════════════════════════════════════════════════════
// admin-invite.js — convite de acesso, em lote de até 10.
//
// O QUE MUDOU EM 08/09/2026, E POR QUÊ
//
// 1. QUEM ENVIA PASSOU A SER O RESEND. Antes: `inviteUserByEmail`, que manda
//    pelo serviço do Supabase Auth — teto de envio por hora e template no
//    painel. Com 10 endereços de uma vez, o teto morde. Agora o Supabase só
//    GERA o link (`generate_link`) e nós enviamos (`_email.js`).
//
// 2. O LINK PASSOU A SER NOSSO. Antes o e-mail levava para
//    `<projeto>.supabase.co/auth/v1/verify?token=…`: host estranho num e-mail
//    da marca, e — pior — o token queimava assim que QUALQUER UM buscasse a
//    URL. Scanner de e-mail corporativo (o Safe Links do Microsoft 365 faz
//    isso em todo link de remetente novo) entregava o convite já morto. Agora
//    o link é `https://<slug>.br4ndcode.com/convite?token_hash=…`, uma rota do
//    próprio app: buscar a URL devolve só HTML, e o token só vira sessão
//    quando o JavaScript roda.
//
// 3. O DESTINO É O SUBDOMÍNIO DA MARCA, não `app.`. Não é preferência de URL:
//    `src/lib/supabase.js` cria o client sem opção de `storage`, então a sessão
//    mora no localStorage, que é POR ORIGEM. Terminar o convite em `app.` e
//    mandar a pessoa para `worten.` a deixava deslogada na chegada, com a senha
//    que ela tinha acabado de criar.
//
// ⚠️ HISTÓRICO QUE EXPLICA A DESCONFIANÇA: até 08/set a Site URL do projeto no
//    Supabase era `http://localhost:3000`, e o Supabase DESCARTA em silêncio o
//    `redirect_to` fora da allow-list. Todo convite deste projeto — o único de
//    17/jul inclusive — mandava o convidado para a máquina dele. Nada no código
//    acusava. Por isso este arquivo não depende mais de `redirect_to`: o link é
//    montado aqui, com o token na mão.
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { exigirSegundoFator } from './_mfa.js'
import { convite, enviar, emailConfigurado } from './_email.js'

const TETO = 10
const ROOT = process.env.ROOT_DOMAIN || 'br4ndcode.com'
const baseDaMarca = (slug) => `https://${slug}.${ROOT}`

// Deliberadamente simples: barra o erro de digitação e o campo em branco. Quem
// julga se o endereço existe é o servidor de e-mail, não uma regex.
const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)

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
  // Segundo fator. A identidade já foi VALIDADA acima (getUser confere a
  // assinatura do token); só depois disso faz sentido ler a claim `aal` dele.
  const semFator = exigirSegundoFator(token, headers)
  if (semFator) return semFator

  if (!emailConfigurado()) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: 'RESEND_API_KEY não configurada no ambiente — nenhum convite sairia.' }) }
  }

  const corpo = JSON.parse(event.body || '{}')
  const { workspace_id } = corpo

  // Aceita `emails: []` (a tela nova, com a textarea) e `email: '…'` (chamador
  // antigo). Normaliza, tira brancos e repete: colar uma lista de gente sempre
  // traz linha vazia e endereço duplicado.
  const brutos = Array.isArray(corpo.emails) ? corpo.emails : (corpo.email ? [corpo.email] : [])
  const emails = [...new Set(brutos.map(e => String(e || '').trim().toLowerCase()).filter(Boolean))]

  if (!workspace_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'workspace_id obrigatório' }) }
  if (!emails.length) return { statusCode: 400, headers, body: JSON.stringify({ error: 'informe ao menos um e-mail' }) }
  if (emails.length > TETO) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: `${emails.length} e-mails — o limite é ${TETO} por vez` }) }
  }

  const { data: ws } = await supabase
    .from('workspaces').select('id, nome, slug, ativo').eq('id', workspace_id).maybeSingle()
  if (!ws) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Workspace não encontrado' }) }
  if (ws.ativo === false) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Workspace inativo' }) }
  if (!ws.slug) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Workspace sem slug — o convite não tem para onde apontar' }) }

  const base = baseDaMarca(ws.slug)
  const resultados = []

  for (const email of emails) {
    if (!emailValido(email)) { resultados.push({ email, ok: false, motivo: 'endereço inválido' }); continue }
    try {
      // `invite` só serve para conta NOVA. Existindo, o Supabase recusa — e a
      // pessoa continua precisando de acesso. Nesse caso vale um `magiclink`:
      // cai na MESMA tela, define senha e entra igual. O que decide o acesso
      // é o app_metadata abaixo, não o tipo do link.
      let tipo = 'invite'
      let gen = await supabase.auth.admin.generateLink({
        type: 'invite', email,
        options: { data: { workspace_id: ws.id, workspace_name: ws.nome } },
      })
      if (gen.error) {
        tipo = 'magiclink'
        gen = await supabase.auth.admin.generateLink({ type: 'magiclink', email })
      }
      if (gen.error) { resultados.push({ email, ok: false, motivo: gen.error.message }); continue }

      const props = gen.data?.properties || {}
      const hash = props.hashed_token
      const uid = gen.data?.user?.id
      if (!hash) { resultados.push({ email, ok: false, motivo: 'Supabase não devolveu o token do link' }); continue }

      // ── A intenção do convite vai em app_metadata ────────────────────────
      // O `data:` do generateLink grava em user_metadata, que o próprio
      // convidado reescreve com `supabase.auth.updateUser({ data: {...} })`.
      // Enquanto a entrada no workspace saía do browser lendo esse campo, o
      // convite podia ser reapontado para qualquer tenant. `app_metadata` só a
      // service key escreve — é a única parte do usuário em que o servidor pode
      // confiar. Quem lê é workspace-join.
      // user_metadata vai junto e SEMPRE, não só no caminho `invite`: é dele que
      // a tela de boas-vindas tira o nome da marca (Invite.jsx). O `data:` do
      // generateLink só existe para o tipo invite, então no reconvite por
      // magiclink o convidado veria "acesse o workspace" sem dizer qual —
      // justamente para quem já teve um convite falhar e precisa de confiança.
      if (uid) {
        await supabase.auth.admin.updateUserById(uid, {
          app_metadata: { convite_workspace_id: ws.id },
          user_metadata: { workspace_id: ws.id, workspace_name: ws.nome },
        })
      }

      const link = `${base}/convite?token_hash=${encodeURIComponent(hash)}&type=${tipo}`
      const { assunto, html, texto } = convite({
        workspaceNome: ws.nome, link, base,
        deQuem: adminUser.user_metadata?.nome || adminUser.email,
      })
      const env = await enviar({ para: email, assunto, html, texto })
      resultados.push(env.ok
        ? { email, ok: true, id: env.id, novo: tipo === 'invite' }
        : { email, ok: false, motivo: env.erro })
    } catch (e) {
      resultados.push({ email, ok: false, motivo: e.message })
    }
  }

  const enviados = resultados.filter(r => r.ok).length
  // 200 mesmo com falha parcial: o corpo diz o que aconteceu com CADA endereço,
  // e a tela mostra a lista. Um status de erro para o lote inteiro esconderia os
  // que saíram e faria alguém reenviar para quem já recebeu.
  return {
    statusCode: 200, headers,
    body: JSON.stringify({
      success: enviados > 0,
      workspace: { id: ws.id, nome: ws.nome, slug: ws.slug, url: base },
      enviados, total: resultados.length, resultados,
    }),
  }
}
