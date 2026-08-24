// ════════════════════════════════════════════════════════════════════
// mfa.js — segundo fator para quem opera a plataforma.
//
// POR QUE O SUPER ADMIN E NÃO TODO MUNDO
// A conta com `platform_admins` atravessa a RLS de 15 tabelas: com a sessão
// normal, sem cerimônia, ela lê e escreve o dado de TODOS os clientes. Uma
// credencial concentra Hering, Worten e Pixel. Segundo fator ali vale mais do
// que qualquer outra coisa que a gente possa fazer no mesmo tempo.
//
// O CONSOLE DO SUPABASE NÃO ENTREGA ISSO SOZINHO
// Lá se habilita a CAPACIDADE (TOTP no projeto). Quem inscreve o fator e quem
// exige o segundo fator é o app: sem tela de inscrição ninguém cadastra, e sem
// checagem de nível quem entrou só com senha continua entrando.
//
// AAL — o nível de garantia do token
//   aal1 = entrou com senha
//   aal2 = entrou com senha E apresentou o segundo fator
// `nextLevel` conta o que a conta PODE alcançar: se é aal1, não há fator
// inscrito (precisa inscrever); se é aal2 e o atual é aal1, há fator e falta
// apresentar.
//
// A checagem daqui é de TELA. O token carrega `aal` e o servidor confere por
// conta própria (ver `_mfa.js`) — porque tela se contorna e endpoint não.
// ════════════════════════════════════════════════════════════════════
import { supabase } from './supabase'

export const NIVEL = { SEM_FATOR: 'sem-fator', FALTA_VERIFICAR: 'falta-verificar', OK: 'ok', ERRO: 'erro' }

/** Em que pé está a sessão atual. */
export async function situacao() {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error) return { nivel: NIVEL.ERRO, erro: error.message }
  if (data.currentLevel === 'aal2') return { nivel: NIVEL.OK }
  if (data.nextLevel === 'aal2')    return { nivel: NIVEL.FALTA_VERIFICAR }
  return { nivel: NIVEL.SEM_FATOR }
}

/** Fatores TOTP já inscritos e verificados. */
export async function fatores() {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) return []
  return (data?.totp || []).filter(f => f.status === 'verified')
}

/**
 * Começa a inscrição: devolve o QR para escanear no app autenticador.
 * O fator nasce `unverified` — só vale depois de `confirmar`.
 */
export async function inscrever(apelido = 'brandcode') {
  // Fator não-verificado de tentativa anterior trava o enroll com "already
  // exists". Limpa antes: o que não foi confirmado não protege nada mesmo.
  const { data: lista } = await supabase.auth.mfa.listFactors()
  for (const f of (lista?.totp || [])) {
    if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id })
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: `${apelido}-${Date.now()}`,
  })
  if (error) return { erro: error.message }
  return {
    factorId: data.id,
    // SVG em data-URL, servido pelo próprio Supabase: entra num <img>, sem
    // biblioteca de QR e sem innerHTML.
    qr: data.totp?.qr_code,
    // Para quem não consegue escanear (autenticador em outro aparelho).
    segredo: data.totp?.secret,
  }
}

/** Confirma o código de 6 dígitos. Serve para inscrever E para verificar. */
export async function confirmar(factorId, codigo) {
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: String(codigo || '').replace(/\D/g, ''),
  })
  return error ? { erro: humanizar(error.message) } : { ok: true }
}

/** Desiste da inscrição em curso — não deixa fator pendente para trás. */
export async function abortarInscricao(factorId) {
  if (factorId) await supabase.auth.mfa.unenroll({ factorId })
}

/**
 * Desliga o segundo fator. Só o próprio dono da conta chega aqui (é a sessão
 * dele que o Supabase usa) — ninguém desliga o de outro pela aplicação.
 */
export async function desligar() {
  const lista = await fatores()
  if (!lista.length) return { ok: true }
  for (const f of lista) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: f.id })
    if (error) return { erro: error.message }
  }
  return { ok: true }
}

function humanizar(bruto = '') {
  if (/invalid.*code|verification failed/i.test(bruto)) {
    return 'Código inválido. Confira se o relógio do aparelho está certo — o código muda a cada 30 segundos.'
  }
  if (/rate|too many/i.test(bruto)) return 'Muitas tentativas. Espere um instante e tente de novo.'
  return bruto
}
