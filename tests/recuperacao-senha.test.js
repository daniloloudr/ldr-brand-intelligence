// ════════════════════════════════════════════════════════════════════
// "ESQUECI A SENHA" — e por que não podia continuar sendo o convite.
//
// Até 10/set existia UM template no `_email.js`. Quem esquecia a senha recebia
// o do convite: "Seu acesso está pronto", "Você recebeu acesso ao workspace X",
// e o rodapé "nenhuma conta é criada sem que você defina a senha". Para alguém
// que JÁ tem conta as três linhas são falsas — e some a única frase que um
// e-mail de credencial precisa carregar: se não foi você que pediu, a sua senha
// atual continua valendo.
//
// O que estes testes seguram:
//   · o e-mail de senha não volta a ser o de convite (a tentação é reusar);
//   · ele não recebe NENHUM campo editável pelo cliente — o convite precisa de
//     `esc()` porque carrega o nome do workspace, que o tenant edita; este não
//     carrega nada de terceiro, e a superfície some em vez de ser tapada;
//   · as regras de ENTREGA valem igual (texto puro, logo da mesma origem, alt
//     sem altura fixa) — filtro corporativo não sabe que o e-mail é outro;
//   · não promete prazo que não controla.
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { recuperacao, convite } from '../netlify/functions/_email.js'

const email = readFileSync('netlify/functions/_email.js', 'utf8')
const corpo = email.slice(
  email.indexOf('export function recuperacao'),
  email.indexOf('export const emailConfigurado'),
)

const BASE = 'https://loudr.br4ndcode.com'
const LINK = `${BASE}/convite?token_hash=abc123&type=recovery`
const r = recuperacao({ link: LINK, base: BASE })

// O mesmo escape do módulo. No HTML o `&` do query string vira `&amp;` — é o
// certo, e é por isso que a conferência do link tem duas formas.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

describe('é um e-mail de SENHA, não o convite reaproveitado', () => {
  it('diz o que só um e-mail de senha diz', () => {
    expect(r.texto, 'sumiu a frase que protege quem NÃO pediu a redefinição')
      .toMatch(/sua senha atual continua/i)
    expect(r.html).toMatch(/sua senha atual continua/i)
  })

  it('não afirma as coisas do convite, que seriam mentira para quem já tem conta', () => {
    // A URL precisa sair antes da conferência: a rota que troca o token_hash
    // chama-se `/convite` e atende os dois fluxos (Invite.jsx). A palavra
    // aparece no ENDEREÇO, e o que está sob teste aqui é a CÓPIA.
    const semLink = (s) => s.split(LINK).join('').split(esc(LINK)).join('')
    for (const parte of [r.assunto, semLink(r.texto), semLink(r.html)]) {
      expect(parte, 'o e-mail de senha voltou a falar em convite').not.toMatch(/convite/i)
      expect(parte).not.toMatch(/recebeu acesso/i)
      expect(parte).not.toMatch(/nenhuma conta é criada/i)
    }
  })

  it('o assunto é de redefinição', () => {
    expect(r.assunto).toMatch(/redefinir/i)
    expect(r.assunto).not.toBe(convite({ workspaceNome: 'LOUDR', link: LINK, base: BASE }).assunto)
  })

  it('NÃO promete prazo que não controla', () => {
    // O convite diz "24 horas" porque é o que o Supabase aplica a `invite`.
    // `recovery` tem outra expiração; chutar número em e-mail de credencial é
    // pior que calar.
    expect(r.texto).not.toMatch(/24 horas|\d+\s*hora/i)
    expect(r.html).not.toMatch(/24 horas|\d+\s*hora/i)
    expect(r.texto, 'perdeu o aviso de uso único').toMatch(/uma vez/i)
  })
})

describe('🔒 sem campo de terceiro, a superfície some', () => {
  it('a assinatura não aceita nome de workspace nem remetente', () => {
    expect(corpo, 'o template de senha voltou a receber dado editável pelo cliente')
      .toMatch(/export function recuperacao\(\{\s*link,\s*base\s*\}\)/)
    expect(corpo).not.toMatch(/workspaceNome|deQuem/)
  })

  it('nada entra cru no HTML', () => {
    expect(corpo, 'variável crua no HTML do e-mail').not.toMatch(/\$\{(link|base)\}/)
    expect(corpo).toMatch(/const href = esc\(/)
    expect(corpo).toMatch(/const BASE = esc\(/)
  })

  it('o link do e-mail é o que foi passado — nada de host do Supabase', () => {
    expect(r.texto, 'a parte em texto puro leva o link cru').toContain(LINK)
    expect(r.html, 'no HTML o & do query string precisa sair escapado').toContain(esc(LINK))
    expect(r.html).not.toMatch(/supabase\.co/)
    expect(r.texto).not.toMatch(/supabase\.co/)
  })
})

describe('as regras de entrega valem igual — o filtro não sabe que o e-mail é outro', () => {
  it('vai com parte em TEXTO PURO', () => {
    expect(r.texto.length, 'e-mail sem parte em texto puro pontua pior').toBeGreaterThan(80)
  })

  it('a imagem sai da MESMA origem do link', () => {
    expect(corpo).toMatch(/\$\{BASE\}\/email\/logo-branco\.png/)
    expect(r.html).toContain(`${BASE}/email/logo-branco.png`)
  })

  it('o alt do logotipo NÃO tem altura fixa', () => {
    // Com `height` no style a caixa não comporta o texto e o cliente desenha o
    // ícone de imagem quebrada NO LUGAR do alt. Medido no convite em 08/set —
    // o defeito é do HTML, não do template, então reaparece a cada e-mail novo.
    const tag = r.html.match(/<img[^>]*logo-branco[^>]*>/)?.[0] || ''
    expect(tag, 'a <img> do logotipo sumiu').not.toBe('')
    expect(tag).toMatch(/alt="BR4NDCODE"/)
    expect(tag).not.toMatch(/(?<![-\w])height\s*[:=]/)
  })

  it('verde 1 pareia com preto — o texto do botão é PRETO (§03 do brand.md)', () => {
    const botao = r.html.match(/<a href[^>]*>Escolher nova senha<\/a>/)?.[0] || ''
    expect(botao, 'o botão sumiu').not.toBe('')
    expect(botao).toMatch(/color:#000000/)
    expect(r.html, 'o botão precisa ser verde 1').toMatch(/background:#00FF55;border-radius:8px/)
  })

  it('verde não entra em texto corrido (§02.1) — só filete e botão', () => {
    const verdes = (r.html.match(/#00FF55/g) || []).length
    expect(verdes, '"cheiro verde": o verde passou de dois elementos').toBeLessThanOrEqual(2)
  })
})
