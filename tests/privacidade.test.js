import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'

// ── O QUE O CLIENTE NÃO PODE VER ────────────────────────────────────────
// Todo workspace ganha o operador da plataforma como membro, para o suporte
// funcionar. Em 18/08/2026 a Pixel via "danilo@loudr.com.br · Administrador"
// na própria Gestão de time, e QUALQUER pessoa com link de relatório público
// lia o mesmo e-mail sem login. Dois e-mails internos, quatro workspaces.
//
// A regra: dado de quem OPERA a plataforma não sai do servidor para quem a USA.

const ler = (p) => readFileSync(p, 'utf8')

describe('o time do cliente não inclui quem opera a plataforma', () => {
  const fn = ler('netlify/functions/workspace-members.js')

  it('o corte é no SERVIDOR, não na tela', () => {
    // Filtrar na tela não resolve: o e-mail já saiu no payload e aparece em
    // qualquer devtools.
    expect(fn).toMatch(/from\('platform_admins'\)\.select\('user_id'\)/)
    expect(fn).toMatch(/\.filter\(m => vendoComoOperador \|\| !ehOperador\.has\(m\.user_id\)\)/)
  })

  it('quem opera continua enxergando — senão o suporte quebra', () => {
    // E o workspace da própria LOUDR, onde os operadores SÃO o time, ficaria
    // vazio.
    expect(fn).toMatch(/const vendoComoOperador = !!platformAdmin/)
  })

  it('a tela não conta operador como membro do plano', () => {
    const ui = ler('src/pages/app/WorkspacePage.jsx')
    expect(ui).toMatch(/const doCliente = membros\.filter\(m => !m\.plataforma\)/)
    expect(ui).toMatch(/\{doCliente\.length\}\/\{limite\} membros/)
    expect(ui).not.toMatch(/\{membros\.length\}\/\{limite\}/)
  })
})

describe('o relatório público não carrega dado de quem o gerou', () => {
  const pub = ler('src/pages/RelatorioPublico.jsx')

  it('a consulta lista colunas, nunca `*`', () => {
    // `select('*')` trazia user_email numa página lida SEM login.
    const consulta = pub.slice(pub.indexOf("from('diagnosticos')"), pub.indexOf('.eq(\'id\', id)'))
    expect(consulta).not.toMatch(/select\('\*'\)/)
    expect(consulta).not.toMatch(/user_email|user_id|user_name/)
    expect(consulta).toMatch(/frase_diagnostico/)   // e ainda traz o que a página precisa
  })
})

describe('varredura — nenhuma tela pública pode pedir tudo', () => {
  const publicas = ['src/pages/RelatorioPublico.jsx']

  it('nenhuma delas usa select(*) em diagnosticos', () => {
    const infratoras = publicas.filter(p => /from\('diagnosticos'\)\s*\.?\s*\n?\s*\.select\('\*'\)/.test(ler(p)))
    expect(infratoras).toEqual([])
  })

  it('nenhuma função não-admin devolve e-mail sem filtrar operador', () => {
    // workspace-members é a única que expõe e-mail de OUTRO usuário ao cliente.
    // Se aparecer outra, ela precisa do mesmo cuidado — e deste teste.
    const dir = 'netlify/functions'
    const suspeitas = readdirSync(dir)
      .filter(f => f.endsWith('.js') && !f.startsWith('admin-'))
      .filter(f => /email:\s*userMap|email:\s*u\.email|\.map\(u => u\.email\)/.test(ler(`${dir}/${f}`)))
    expect(suspeitas.sort()).toEqual(['workspace-members.js'])
  })
})

describe('não existe leitura anônima de diagnóstico', () => {
  it('a migration 049 derruba a política que abria para anon', () => {
    // A política de 005 era `for select using (publico = true)` SEM cláusula
    // `to` — valia para o papel `public`, que inclui `anon`. Como a chave
    // anônima vai no bundle do front, qualquer pessoa lia os 111 diagnósticos
    // marcados como públicos, com todas as colunas, incluindo user_email.
    const m = readFileSync('supabase/migrations/049_diagnosticos_sem_leitura_anonima.sql', 'utf8')
    expect(m).toMatch(/drop policy if exists "leitura publica diagnosticos" on diagnosticos/)
  })

  it('nenhuma migration posterior reabre para anon', () => {
    // Trava de futuro: se alguém recriar a política, este teste acusa.
    const dir = 'supabase/migrations'
    // Comentário fora: a própria 049 CITA a política antiga para documentar o
    // que removeu, e sem tirar os comentários ela se acusa. Terceira vez hoje
    // que documentação de bug faz teste de varredura disparar.
    const semComentario = (t) => t.split('\n').map(l => l.replace(/--.*$/, '')).join('\n')
    const depois = readdirSync(dir).filter(f => f.endsWith('.sql') && parseInt(f, 10) >= 49)
    const reabrem = depois.filter(f =>
      /create policy[\s\S]{0,200}on diagnosticos[\s\S]{0,200}publico = true/i
        .test(semComentario(readFileSync(`${dir}/${f}`, 'utf8'))))
    expect(reabrem).toEqual([])
  })

  it('a tela manda entrar na conta, não procurar link quebrado', () => {
    const pub = readFileSync('src/pages/RelatorioPublico.jsx', 'utf8')
    expect(pub).toMatch(/Este relatório é privado/)
    expect(pub).not.toMatch(/Relatório não encontrado ou acesso negado/)
  })
})
