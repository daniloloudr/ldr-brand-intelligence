// ════════════════════════════════════════════════════════════════════
// _email.js — envio transacional pelo Resend.
//
// POR QUE NÃO É O SUPABASE QUE ENVIA
// `inviteUserByEmail` manda o e-mail pelo serviço do Supabase Auth, que tem teto
// de envio por hora e um template que mora no painel — fora do repo, sem teste e
// sem revisão. Com 10 endereços colados de uma vez, o teto é o que morde
// primeiro. Aqui o link é GERADO pelo Supabase (`generate_link`) e ENVIADO por
// nós: sem teto, com a marca, e o template versionado ao lado do teste.
//
// REGRAS DE MARCA (.spec/brand.md)
// · Assinatura primária é BR4NDCODE por extenso. A imagem é o logotipo; o `alt`
//   é a rede de proteção para quem bloqueia imagem — que é o padrão do Gmail e
//   do Outlook para remetente sem histórico.
// · Verde 1 (#00FF55) pareia com PRETO · Verde 2 (#00DD55) com BRANCO. O filete
//   e o botão são verde 1 sobre preto, então o texto do botão é PRETO (§03).
// · "Cheiro verde": verde não passa de ~10% da área — aqui são dois elementos.
// · Verde nunca em texto corrido (§02.1) · borda 1px · corners 8/16 (§04).
//
// REGRAS DE ENTREGA (não são estética)
// · sempre com parte em TEXTO PURO junto do HTML — HTML-only pontua pior
// · tabelas e estilo inline — Outlook e Gmail ignoram <style> e flexbox
// · Reply-To real — remetente que não aceita resposta é sinal de bulk
// · ⚠️ NÃO pôr `height` fixo no style da <img>: a caixa apertada faz o cliente
//   desenhar o ícone de imagem quebrada NO LUGAR do alt. Só `width`.
// ════════════════════════════════════════════════════════════════════

const VERDE1 = '#00FF55'   // par: preto
const PRETO  = '#000000'
const TINTA  = '#111111'
const FONTE  = "'Saira','Saira Condensed',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"

export const REMETENTE = 'BR4NDCODE <hello@br4ndcode.com>'

// ⚠️ TODO dado que entra no HTML passa por aqui. O nome do workspace é EDITÁVEL
// PELO CLIENTE — está na lista-branca do trigger `protege_campos_comerciais`
// (migration 052) junto de dominio/setor/porte. Sem escapar, um usuário de
// tenant escreve HTML no nome e o link dele viaja dentro de um convite nosso,
// assinado com DKIM válido, para alguém em onboarding que nunca viu a interface
// e está esperando exatamente um link de primeiro acesso. Cliente de e-mail
// bloqueia <script>, então não é XSS — é phishing com a nossa credencial.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

// Cabeçalho não interpreta HTML, mas quebra de linha em assunto é injeção de
// cabeçalho. Some com as duas antes de compor.
const umaLinha = (s) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim()

/** O convite. `base` é a origem da marca (https://<slug>.br4ndcode.com) — a
 *  MESMA de onde sai o link e de onde vem o logotipo. Um host só no e-mail
 *  inteiro é o que um filtro corporativo espera ver. */
export function convite({ workspaceNome, link, deQuem, base }) {
  const BASE = esc(String(base || '').replace(/\/$/, ''))
  const nome = esc(workspaceNome)          // ← cliente edita este campo
  const quem = esc(deQuem)
  const href = esc(link)
  const assunto = workspaceNome
    ? `Seu acesso ao BR4NDCODE — ${umaLinha(workspaceNome)}`
    : 'Seu acesso ao BR4NDCODE'

  const texto = [
    'BR4NDCODE',
    '',
    `Você recebeu acesso${workspaceNome ? ` ao workspace ${workspaceNome}` : ''}.`,
    '',
    'Para entrar, defina sua senha neste endereço:',
    link,
    '',
    'O link vale por 24 horas e só pode ser usado uma vez.',
    deQuem ? `Convite enviado por ${deQuem}.` : '',
    'Se você não esperava este convite, ignore este e-mail — nenhuma conta',
    'é criada sem que você defina a senha.',
    '',
    '— BR4NDCODE · LOUDR',
    'Dúvidas? Responda este e-mail.',
  ].filter(l => l !== '').join('\n')

  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;margin:0;padding:32px 12px">
 <tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e4e4e4;border-radius:16px;overflow:hidden;font-family:${FONTE}">

   <tr><td style="background:${PRETO};padding:24px 28px 22px">
    <img src="${BASE}/email/logo-branco.png" width="150" alt="BR4NDCODE"
         style="border:0;outline:none;text-decoration:none;width:150px;max-width:150px;color:#ffffff;font-family:${FONTE};font-size:15px;font-weight:800;letter-spacing:0.10em;line-height:26px">
   </td></tr>
   <tr><td style="background:${VERDE1};font-size:0;line-height:0;height:3px">&nbsp;</td></tr>

   <tr><td style="padding:34px 28px 0">
    <p style="margin:0 0 10px;font-size:23px;font-weight:800;color:${TINTA};letter-spacing:-0.02em;line-height:1.2">Seu acesso está pronto</p>
    <p style="margin:0;font-size:15px;line-height:1.65;color:#4a4a4a">
      Você recebeu acesso${workspaceNome ? ` ao workspace <strong style="color:${TINTA}">${nome}</strong>` : ''} no BR4NDCODE.
      Defina sua senha para entrar.
    </p>
   </td></tr>

   <tr><td style="padding:26px 28px 0">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
     <td style="background:${VERDE1};border-radius:8px">
      <a href="${href}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:800;color:${PRETO};text-decoration:none;letter-spacing:-0.01em">Definir minha senha</a>
     </td>
    </tr></table>
   </td></tr>

   <tr><td style="padding:20px 28px 30px">
    <p style="margin:0 0 16px;font-size:12px;line-height:1.55;color:#8a8a8a">
      O link vale por 24 horas e só pode ser usado uma vez.<br>
      Se o botão não abrir, copie este endereço:<br>
      <span style="color:#6a6a6a;word-break:break-all">${href}</span>
    </p>
    <p style="margin:0;padding-top:16px;border-top:1px solid #ececec;font-size:12px;line-height:1.55;color:#9a9a9a">
      ${quem ? `Convite enviado por ${quem}. ` : ''}Se você não esperava este e-mail, pode ignorá-lo — nenhuma conta é criada sem que você defina a senha.
    </p>
   </td></tr>

  </table>
  <p style="margin:18px 0 0;font-size:11px;color:#a8a8a8;font-family:${FONTE};letter-spacing:0.06em">BR4NDCODE · LOUDR</p>
 </td></tr>
</table>`

  return { assunto, html, texto }
}

/** Redefinição de senha. Mesmo esqueleto e mesmas regras de entrega do convite
 *  — e de propósito NÃO é o mesmo e-mail.
 *
 *  Antes daqui, quem esquecia a senha recebia o convite: "Você recebeu acesso
 *  ao workspace X", com a linha "nenhuma conta é criada sem que você defina a
 *  senha". Para alguém que JÁ tem conta, isso mente duas vezes. E some a única
 *  frase que um e-mail de senha precisa ter: se não foi você que pediu, a sua
 *  senha atual continua valendo.
 *
 *  ⚠️ NÃO recebe `workspaceNome` nem `deQuem`, e isso é escolha, não descuido.
 *  Redefinir senha é ato de CONTA, não de workspace — a pessoa pode estar em
 *  vários. Sem campo editável pelo cliente, este e-mail não tem por onde
 *  carregar texto de terceiro: some a superfície de phishing que o `esc()`
 *  do convite existe para tapar. `base` continua vindo da marca porque a
 *  sessão mora no localStorage, que é por ORIGEM: terminar noutro host
 *  deixaria a pessoa deslogada logo depois de escolher a senha.
 *
 *  Sem promessa de prazo. O convite diz "24 horas" porque é o que o Supabase
 *  aplica a `invite`; a expiração de `recovery` é outra configuração, e chutar
 *  um número num e-mail de credencial é pior do que não dizer. */
export function recuperacao({ link, base }) {
  const BASE = esc(String(base || '').replace(/\/$/, ''))
  const href = esc(link)
  const assunto = 'Redefinir sua senha — BR4NDCODE'

  const texto = [
    'BR4NDCODE',
    '',
    'Você pediu para redefinir a senha da sua conta.',
    '',
    'Escolha uma nova senha neste endereço:',
    link,
    '',
    'O link só pode ser usado uma vez.',
    'Se não foi você que pediu, ignore este e-mail — sua senha atual continua',
    'valendo e nada muda.',
    '',
    '— BR4NDCODE · LOUDR',
    'Dúvidas? Responda este e-mail.',
  ].join('\n')

  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;margin:0;padding:32px 12px">
 <tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e4e4e4;border-radius:16px;overflow:hidden;font-family:${FONTE}">

   <tr><td style="background:${PRETO};padding:24px 28px 22px">
    <img src="${BASE}/email/logo-branco.png" width="150" alt="BR4NDCODE"
         style="border:0;outline:none;text-decoration:none;width:150px;max-width:150px;color:#ffffff;font-family:${FONTE};font-size:15px;font-weight:800;letter-spacing:0.10em;line-height:26px">
   </td></tr>
   <tr><td style="background:${VERDE1};font-size:0;line-height:0;height:3px">&nbsp;</td></tr>

   <tr><td style="padding:34px 28px 0">
    <p style="margin:0 0 10px;font-size:23px;font-weight:800;color:${TINTA};letter-spacing:-0.02em;line-height:1.2">Redefinir sua senha</p>
    <p style="margin:0;font-size:15px;line-height:1.65;color:#4a4a4a">
      Você pediu para redefinir a senha da sua conta no BR4NDCODE.
      Escolha uma nova para voltar a entrar.
    </p>
   </td></tr>

   <tr><td style="padding:26px 28px 0">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
     <td style="background:${VERDE1};border-radius:8px">
      <a href="${href}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:800;color:${PRETO};text-decoration:none;letter-spacing:-0.01em">Escolher nova senha</a>
     </td>
    </tr></table>
   </td></tr>

   <tr><td style="padding:20px 28px 30px">
    <p style="margin:0 0 16px;font-size:12px;line-height:1.55;color:#8a8a8a">
      O link só pode ser usado uma vez.<br>
      Se o botão não abrir, copie este endereço:<br>
      <span style="color:#6a6a6a;word-break:break-all">${href}</span>
    </p>
    <p style="margin:0;padding-top:16px;border-top:1px solid #ececec;font-size:12px;line-height:1.55;color:#9a9a9a">
      Se não foi você que pediu, ignore este e-mail — sua senha atual continua valendo e nada muda.
    </p>
   </td></tr>

  </table>
  <p style="margin:18px 0 0;font-size:11px;color:#a8a8a8;font-family:${FONTE};letter-spacing:0.06em">BR4NDCODE · LOUDR</p>
 </td></tr>
</table>`

  return { assunto, html, texto }
}

export const emailConfigurado = () => !!process.env.RESEND_API_KEY

/** Envia UM e-mail. Devolve { ok, id } ou { ok:false, erro }. Nunca lança:
 *  num lote, um endereço que falha não pode derrubar os outros nove. */
export async function enviar({ para, assunto, html, texto }) {
  if (!process.env.RESEND_API_KEY) return { ok: false, erro: 'RESEND_API_KEY ausente' }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: REMETENTE,
        reply_to: 'hello@br4ndcode.com',
        to: [para],
        subject: assunto,
        html,
        text: texto,
      }),
    })
    const j = await r.json().catch(() => ({}))
    return r.ok ? { ok: true, id: j.id } : { ok: false, erro: j.message || `HTTP ${r.status}` }
  } catch (e) {
    return { ok: false, erro: e.message }
  }
}
