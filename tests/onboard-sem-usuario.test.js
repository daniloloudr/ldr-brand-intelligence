// ════════════════════════════════════════════════════════════════════
// O ONBOARDING ANDA SOZINHO — inclusive o diagnóstico.
//
// 25/08, no setup da Zétona. A trilha terminou com `diagnostico: expired` e
// `concorrentes: expired` (por dependência), e não havia NEM linha de erro na
// tabela — o que já era o sintoma: a function nunca entrou.
//
// A causa: o `onboard-cron` chama `avancarOnboarding` SEM authHeader (não tem
// usuário — é servidor), o dispatch mandava só `Content-Type`, e o
// `diagnostico-gerar-background` começava com `if (!token) return 401`. Recusa
// silenciosa: sem linha, sem erro, sem alerta. A etapa só estourava o teto de
// 8 minutos e virava `expired`.
//
// Por que ninguém viu antes: com o painel "Preparar ambiente" ABERTO, o avanço
// sai do browser COM token e funciona. O caminho manual escondia o automático —
// e o automático é o que o produto promete ("andar sem depender da aba do
// admin", `onboard-cron` de minuto em minuto no netlify.toml).
//
// Evidência que separou as hipóteses: `tendencias` gerou 8 linhas no mesmo
// ciclo (aquele worker não exige usuário) e `ai_usage` da Zétona ficou vazio —
// e o `streamAI` REGISTRA usage (_ai.js), então vazio ali significa que o
// modelo nunca foi chamado.
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const soCodigo = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const onboard = soCodigo(readFileSync('netlify/functions/_onboard.js', 'utf8'))
const diag    = soCodigo(readFileSync('netlify/functions/diagnostico-gerar-background.js', 'utf8'))
const cron    = soCodigo(readFileSync('netlify/functions/onboard-cron.js', 'utf8'))

function trecho(src, de, ate) {
  const i = src.indexOf(de)
  expect(i, `marcador sumiu: "${de}"`).toBeGreaterThan(-1)
  const j = src.indexOf(ate, i + de.length)
  return src.slice(i, j === -1 ? undefined : j)
}

describe('o cron avança sem usuário — e precisa se identificar', () => {
  it('o cron continua chamando sem authHeader (é servidor, não tem usuário)', () => {
    expect(cron).toMatch(/avancarOnboarding\(supabase, \{ workspaceId: ws\.id \}\)/)
  })

  it('sem token de usuário, o dispatch usa o segredo interno', () => {
    const d = trecho(onboard, 'const dispatch =', 'const hasSince')
    expect(d, 'o dispatch voltou a mandar só Content-Type').toMatch(/internalHeaders\(\)/)
    // Com token, continua sendo o token: é o clique de alguém, e a autorização
    // por workspace depende de saber QUEM clicou.
    expect(d).toMatch(/authHeader\s*\n?\s*\?\s*\{[^}]*Authorization: authHeader/)
  })
})

describe('o diagnóstico aceita a chamada de servidor', () => {
  it('não exige token além do porteiro', () => {
    // O `if (!token) return 401` depois do porteiro era o que derrubava o cron.
    expect(diag, 'voltou o 401 que ignora o porteiro').not.toMatch(/if \(!token\) return \{ statusCode: 401 \}/)
    expect(diag).toMatch(/const user = porteiro\.user/)
  })

  it('a checagem de participação só roda quando HÁ usuário', () => {
    // Estar autenticado não dá acesso ao workspace dos outros — mas a chamada
    // interna não tem usuário e não precisa: ela já é o servidor.
    const bloco = trecho(diag, 'if (workspace_id) {', 'const { data: ws }')
    expect(bloco).toMatch(/if \(!porteiro\.interno\)/)
    expect(bloco).toMatch(/workspace_members/)
  })

  it('sem usuário E sem workspace_id, recusa — não abre exceção', () => {
    // O caminho do admin digitando na caixa exige platform_admin de verdade.
    // Âncora em CÓDIGO: o marcador anterior era um comentário, e soCodigo tira
    // comentários — o teste caía por causa da própria ferramenta dele.
    const bloco = trecho(diag, 'if (!user) return { statusCode: 400 }', 'const separado')
    expect(bloco).toMatch(/platform_admins/)
  })

  it('registro de servidor não inventa autor, e diz de onde veio', () => {
    // O cron-monitor já grava diagnóstico sem usuário (tipo 'cron'). Aqui vale
    // o mesmo: sem user, sem user_id/user_email/user_name — e `tipo` distingue
    // 'manual' (alguém clicou) de 'onboarding' (a trilha andou sozinha).
    const bloco = trecho(diag, 'const autoria', 'const saveError')
    expect(bloco).toMatch(/tipo: 'onboarding'/)
    expect(bloco).toMatch(/user\s*\n?\s*\?\s*\{ user_id: user\.id/)
  })

  it('nenhum acesso a user.* fora da proteção de nulo', () => {
    // `user` agora pode ser null. Um `user.id` solto volta a derrubar o cron —
    // desta vez com TypeError em vez de 401, que é ainda mais difícil de achar.
    const desprotegido = diag.split('\n').filter(l =>
      /\buser\.(id|email|user_metadata)\b/.test(l) &&
      !/porteiro\.interno|if \(!user\)|user\s*\?|autoria|user_id: user\.id/.test(l))
    // As linhas que sobram têm que estar dentro de um bloco já guardado por
    // `if (!porteiro.interno)` ou `if (!user) return` — conferido acima.
    for (const l of desprotegido) {
      expect(
        /workspace_members|platform_admins/.test(l),
        `acesso a user.* fora de guarda: ${l.trim()}`,
      ).toBe(true)
    }
  })
})
