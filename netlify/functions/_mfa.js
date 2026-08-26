// ════════════════════════════════════════════════════════════════════
// _mfa.js — o endpoint de operador exige o segundo fator, não só a tela.
//
// POR QUE NÃO BASTA O GATE DO /admin
// O MfaGate decide o que RENDERIZAR. Quem tem um token roubado não abre o
// painel: chama `admin-reset-password` direto com curl. Gate de tela contra
// token roubado é a mesma família do `if (secret && ...)` do webhook — parece
// proteção e não é.
//
// COMO SE SABE
// O access token do Supabase é um JWT e carrega a claim `aal`:
//   aal1 = entrou com senha
//   aal2 = entrou com senha E apresentou o segundo fator
// Ela é assinada junto com o resto do token. Aqui só se LÊ o payload — quem
// valida a assinatura é o `supabase.auth.getUser(token)`, que todo chamador
// destes helpers já roda antes. Ler sem validar seria confiar em texto que o
// cliente escreveu; por isso a ordem importa e está escrita em cada function.
//
// FALHA FECHADA: token sem `aal` legível é tratado como aal1. Um formato que a
// gente não entende não pode virar permissão.
// ════════════════════════════════════════════════════════════════════

/** Lê a claim `aal` do payload do JWT. NÃO valida assinatura — ver cabeçalho. */
export function nivelDoToken(token) {
  try {
    const payload = String(token || '').split('.')[1]
    if (!payload) return 'aal1'
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    return JSON.parse(json).aal || 'aal1'
  } catch {
    return 'aal1'
  }
}

export const temSegundoFator = (token) => nivelDoToken(token) === 'aal2'

/**
 * Resposta pronta quando falta o segundo fator, ou `null` quando pode seguir.
 *
 * 403 e não 401 de propósito: a credencial é válida: o que falta é o degrau. O
 * `precisa_mfa` deixa a tela distinguir "faça login" de "confirme o código".
 */
export function exigirSegundoFator(token, cabecalhos) {
  if (temSegundoFator(token)) return null
  return {
    statusCode: 403,
    headers: cabecalhos,
    body: JSON.stringify({
      error: 'Esta operação exige verificação em duas etapas. Entre no painel e confirme o código.',
      precisa_mfa: true,
    }),
  }
}
