// ════════════════════════════════════════════════════════════════════
// CONVITE — o link, o lote e o que autoriza a entrada.
//
// O CONVITE DESTE PROJETO NUNCA FUNCIONOU. Medido em 08/09/2026: em 15 contas,
// UM convite jamais saiu (17/jul), e nunca foi usado. A causa não estava no
// código — a Site URL do projeto no Supabase era `http://localhost:3000`, e o
// Supabase DESCARTA EM SILÊNCIO o `redirect_to` fora da allow-list. Todo
// convidado era mandado para a própria máquina. Nada acusava: sem erro, sem
// log, sem linha a menos.
//
// O que estes testes seguram, cada um com o defeito que o originou:
//   · o link é do NOSSO domínio — antes levava para `*.supabase.co`, e o token
//     queimava quando QUALQUER UM buscava a URL (scanner de e-mail corporativo
//     inclusive: o Safe Links do M365 pré-busca todo link de remetente novo);
//   · o convite não depende mais de `redirect_to` — é o campo que falhava calado;
//   · o destino é o SUBDOMÍNIO DA MARCA, porque a sessão mora no localStorage,
//     que é por origem: terminar em `app.` e redirecionar deslogava a pessoa;
//   · quem autoriza a entrada é `app_metadata`, nunca `user_metadata`;
//   · o lote tem teto e devolve resultado POR E-MAIL;
//   · o `alt` do logotipo não pode ter altura fixa — a caixa apertada faz o
//     cliente desenhar o ícone de quebrado NO LUGAR do texto.
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const soCodigo = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const fn     = readFileSync('netlify/functions/admin-invite.js', 'utf8')
const email  = readFileSync('netlify/functions/_email.js', 'utf8')
const join   = readFileSync('netlify/functions/workspace-join.js', 'utf8')
const tela   = readFileSync('src/pages/AppInterno.jsx', 'utf8')
const invite = readFileSync('src/pages/auth/Invite.jsx', 'utf8')
const app    = readFileSync('src/App.jsx', 'utf8')
const help   = readFileSync('src/lib/helpers.js', 'utf8')

describe('o link do convite', () => {
  it('aponta para o domínio da marca, não para o Supabase', () => {
    const c = soCodigo(fn)
    expect(c).toMatch(/\/convite\?token_hash=/)
    // Se alguém voltar a mandar o action_link pronto, o host do Supabase
    // reaparece no e-mail e o token volta a queimar na pré-busca.
    expect(c).not.toMatch(/action_link/)
    expect(c).not.toMatch(/supabase\.co/)
  })

  it('usa o SUBDOMÍNIO da marca — não app.', () => {
    const c = soCodigo(fn)
    expect(c).toMatch(/baseDaMarca\s*=\s*\(slug\)\s*=>\s*`https:\/\/\$\{slug\}\.\$\{ROOT\}`/)
    expect(c).not.toMatch(/VITE_APP_URL/)
    expect(c).not.toMatch(/app\.br4ndcode\.com/)
  })

  it('NÃO depende de redirect_to — o campo que falhava em silêncio', () => {
    expect(soCodigo(fn)).not.toMatch(/redirect_to|redirectTo/)
  })

  it('o token vem do hashed_token, que é o que a rota /convite troca', () => {
    expect(soCodigo(fn)).toMatch(/hashed_token/)
  })

  it('e-mail já cadastrado não fica sem acesso: cai para magiclink', () => {
    const c = soCodigo(fn)
    expect(c).toMatch(/type:\s*'magiclink'/)
    expect(c).toMatch(/type:\s*'invite'/)
  })
})

describe('o lote', () => {
  it('tem teto de 10, e o teto é conferido no servidor', () => {
    const c = soCodigo(fn)
    expect(c).toMatch(/const TETO = 10/)
    expect(c).toMatch(/emails\.length > TETO/)
  })

  it('deduplica e normaliza antes de enviar', () => {
    // Lista colada traz linha vazia, o mesmo endereço duas vezes e caixa alta.
    // Sem isto, a mesma pessoa recebe dois convites e o segundo invalida o
    // primeiro — ela clica no que chegou antes e ele já não vale.
    expect(soCodigo(fn)).toMatch(/new Set\([\s\S]{0,140}?toLowerCase\(\)/)
  })

  it('devolve resultado POR E-MAIL, e um que falha não derruba os outros', () => {
    const c = soCodigo(fn)
    expect(c).toMatch(/resultados\.push\(\{ email, ok: false/)
    expect(c).toMatch(/continue/)
    // 200 com falha parcial: status de erro para o lote esconderia quem saiu, e
    // o reenvio às cegas mandaria de novo para quem já recebeu.
    expect(c).toMatch(/statusCode: 200[\s\S]{0,200}?resultados/)
  })

  it('o envio nunca lança — um endereço não pode derrubar os outros nove', () => {
    expect(soCodigo(email)).toMatch(/catch \(e\)[\s\S]{0,80}?return \{ ok: false/)
  })

  it('recusa o lote inteiro se a chave do Resend não existe', () => {
    // Sem isto o operador vê "enviado" e ninguém recebe nada.
    expect(soCodigo(fn)).toMatch(/emailConfigurado\(\)[\s\S]{0,160}?503/)
  })
})

describe('o porteiro não afrouxou', () => {
  it('segue exigindo operador da plataforma e segundo fator', () => {
    const c = soCodigo(fn)
    expect(c).toMatch(/platform_admins/)
    expect(c).toMatch(/exigirSegundoFator/)
    expect(c.indexOf('platform_admins')).toBeLessThan(c.indexOf('generateLink'))
  })

  it('quem autoriza a entrada é app_metadata, nunca user_metadata', () => {
    // user_metadata o próprio convidado reescreve com updateUser({ data }).
    // Enquanto a entrada saía dele, o convite podia ser reapontado para
    // qualquer tenant.
    expect(soCodigo(fn)).toMatch(/app_metadata:\s*\{\s*convite_workspace_id/)
    expect(soCodigo(join)).toMatch(/app_metadata\?\.convite_workspace_id/)
    expect(soCodigo(join)).not.toMatch(/user_metadata\?\.workspace_id/)
  })

  it('workspace sem slug não vira convite — não teria para onde apontar', () => {
    expect(soCodigo(fn)).toMatch(/!ws\.slug[\s\S]{0,160}?400/)
  })
})

describe('a rota /convite', () => {
  it('existe no roteador', () => {
    expect(soCodigo(help)).toMatch(/p === '\/convite'[\s\S]{0,40}?return 'convite'/)
  })

  it('o App entra na tela de convite por ela', () => {
    expect(soCodigo(app)).toMatch(/getRoute\(\) === 'convite'/)
  })

  it('troca o token por sessão no app — o host do Supabase não aparece', () => {
    const c = soCodigo(invite)
    expect(c).toMatch(/verifyOtp\(\{[\s\S]{0,80}?token_hash/)
    // Link de uso único não sobrevive no histórico do navegador.
    expect(c).toMatch(/replaceState/)
  })

  it('🔴 a troca do token pende de um CLIQUE — nunca do mount', () => {
    // INCIDENTE 08/09/2026: cinco convites saíram para a Worten às 23:37 UTC e
    // os cinco tokens foram consumidos entre 23:38:53 e 23:39:02 — madrugada em
    // Portugal, cinco caixas diferentes, 45 segundos. Foi o Safe Links do
    // Microsoft Defender detonando as URLs. A tela chamava verifyOtp no mount,
    // apostando que scanner só busca HTML; o detonador do M365 RODA JS.
    // Scanner renderiza, mas não clica. Devolver isto para o useEffect mata
    // todo convite que passar por filtro corporativo, e sem nada acusando.
    const c = soCodigo(invite)
    expect(c).toMatch(/async function trocarToken/)
    expect(c).toMatch(/onClick=\{trocarToken\}/)
    expect(c).toMatch(/'aguardando'/)
    const efeitos = c.match(/useEffect\([\s\S]*?\n  \}, \[\]\)/g) || []
    for (const e of efeitos) {
      expect(e, 'verifyOtp voltou para dentro de um useEffect').not.toMatch(/verifyOtp/)
    }
  })

  it('link vencido ou já usado tem tela própria, com o que fazer', () => {
    const c = soCodigo(invite)
    expect(c).toMatch(/'invalido'/)
    expect(invite).toMatch(/Este convite não vale mais/)
  })

  it('o caminho antigo (hash do Supabase) continua atendido', () => {
    // Convite disparado antes da troca ainda pode estar numa caixa de entrada,
    // e link que já saiu não se corrige.
    expect(soCodigo(app)).toMatch(/type=invite/)
  })
})

describe('o e-mail', () => {
  it('vai com parte em TEXTO PURO — HTML-only pontua pior em filtro', () => {
    expect(soCodigo(email)).toMatch(/text:\s*texto/)
  })

  it('o alt do logotipo NÃO tem altura fixa', () => {
    // Com `height` no style, a caixa de 150x23 não comporta o texto e o cliente
    // desenha o ícone de imagem quebrada no lugar dele. Medido em 08/set.
    const tag = email.match(/<img[^>]*logo-branco[^>]*>/)?.[0] || ''
    expect(tag, 'a <img> do logotipo sumiu').not.toBe('')
    expect(tag).toMatch(/alt="BR4NDCODE"/)
    // O lookbehind é o ponto: `line-height` é legítimo e desejável (dá respiro
    // ao alt quando a imagem não carrega); o proibido é `height` sozinho, que
    // trava a caixa. Uma regex sem ele reprovaria o código certo.
    expect(tag).not.toMatch(/(?<![-\w])height\s*[:=]/)
  })

  it('a imagem sai da MESMA origem do link', () => {
    // Host de terceiro em imagem de e-mail pesa contra a entrega, e o filtro
    // corporativo olha quantos domínios distintos a mensagem toca.
    expect(soCodigo(email)).toMatch(/\$\{BASE\}\/email\/logo-branco\.png/)
  })

  it('tem Reply-To real — remetente que não aceita resposta é sinal de bulk', () => {
    expect(soCodigo(email)).toMatch(/reply_to/)
  })

  it('🔒 NENHUM dado cru entra no HTML — o nome do workspace o CLIENTE edita', () => {
    // `nome` está na lista-branca do trigger protege_campos_comerciais (052),
    // ao lado de dominio/setor/porte: um usuário de tenant escreve o que quiser
    // ali. Sem escapar, o link dele viaja dentro de um convite NOSSO, com DKIM
    // válido, para alguém em onboarding esperando exatamente um link de
    // primeiro acesso. Não é XSS (cliente de e-mail bloqueia script) — é
    // phishing assinado com a nossa credencial de domínio.
    const corpo = email.slice(email.indexOf('const html = `'), email.indexOf('return { assunto, html, texto }'))
    expect(corpo, 'variável crua no HTML do e-mail').not.toMatch(/\$\{(workspaceNome|deQuem|link|base)\}/)
    expect(soCodigo(email)).toMatch(/const esc = /)
    for (const v of ['nome', 'quem', 'href']) {
      expect(soCodigo(email), `${v} precisa sair de esc()`).toMatch(new RegExp(`const ${v} = esc\\(`))
    }
  })

  it('🔒 o assunto não aceita quebra de linha — seria injeção de cabeçalho', () => {
    expect(soCodigo(email)).toMatch(/umaLinha\(workspaceNome\)/)
    expect(soCodigo(email)).toMatch(/replace\(\/\[\\r\\n\]\+\/g/)
  })
})

describe('a tela do /admin', () => {
  it('aceita lista, não um endereço só', () => {
    const c = soCodigo(tela)
    expect(c).toMatch(/multiline/)
    expect(c).toMatch(/JSON\.stringify\(\{ emails/)
  })

  it('separa por linha, vírgula e ponto e vírgula, e entende "Nome <email>"', () => {
    // É o que sai de um copiar-colar do Outlook.
    const c = soCodigo(tela)
    expect(c).toMatch(/split\(\/\[\\n,;\]\+\//)
    expect(c).toMatch(/<\(\[\^>\]\+\)>/)
  })

  it('não fecha o modal sozinho — a lista de resultados é a única prova', () => {
    // Fechando, ninguém sabe quem recebeu; o reenvio manda de novo para quem já
    // tem convite válido, e o primeiro link morre na mão da pessoa.
    const h = tela.slice(tela.indexOf('async function handleInvite'), tela.indexOf('function genPassword'))
    expect(h).toMatch(/setInviteResultado\(json\)/)
    expect(h).not.toMatch(/setShowInvite\(null\)/)
    expect(h).not.toMatch(/alert\(/)
  })

  it('abrir o modal de outro workspace limpa o resultado anterior', () => {
    expect(soCodigo(tela)).toMatch(/setShowInvite\(ws\);[\s\S]{0,120}?setInviteResultado\(null\)/)
  })
})
