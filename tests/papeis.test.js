// ════════════════════════════════════════════════════════════════════
// PAPÉIS POR TENANT — o que a migration 052 e as functions prometem.
//
// Contexto (24/08/2026): até aqui `role` não aparecia em NENHUMA policy. As ~40
// policies gateiam por participação, então `admin` vs `member` só mudava a cor
// de um Chip. Três buracos reais saíram do mesmo levantamento:
//
//   1. `workspace_members` com `for all using (é membro)` — qualquer pessoa do
//      tenant se promovia, rebaixava o dono ou removia um colega.
//   2. `for insert with check (user_id = auth.uid())` — SEM workspace_id.
//      Qualquer conta + um UUID = membro de qualquer cliente. Bypass de tenant.
//   3. `workspaces` com a mesma policy `for all`, e é lá que mora
//      `creditos_saldo`. Crédito é chamada paga na fal e na Anthropic.
//
// Estes testes se ancoram no PONTO EXATO de cada garantia — nunca no arquivo
// inteiro. Teste que casa padrão no arquivo todo apodrece no dia em que outra
// linha usa a mesma expressão (aconteceu 4× em 18/08).
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { PRESETS as PRESETS_SERVIDOR, normalizarPapel, PAPEIS, derivarCapacidades } from '../netlify/functions/_papeis.js'
import { PRESETS as PRESETS_TELA, ORDEM_PRESETS, presetDoMembro, papelDoPreset } from '../src/lib/papeis.js'

const migration = readFileSync('supabase/migrations/052_papeis_por_tenant.sql', 'utf8')

/**
 * Tira comentários antes de varrer.
 *
 * Sem isto o teste acusa o próprio comentário que EXPLICA o defeito: os dois
 * primeiros vermelhos desta suíte foram a frase "antes era
 * `from('workspace_members').update(...)`" e a palavra `user_metadata` num
 * parágrafo de contexto. Um teste que obriga a apagar a explicação para ficar
 * verde ensina a coisa errada — e é a versão fina do "casar padrão no arquivo
 * inteiro" que já apodreceu 4 testes aqui em 18/08.
 */
function soCodigo(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

/** Recorte entre marcadores — falha alto se o marcador sumir. */
function trecho(src, de, ate) {
  const i = src.indexOf(de)
  expect(i, `marcador sumiu: "${de}"`).toBeGreaterThan(-1)
  const j = src.indexOf(ate, i + de.length)
  return src.slice(i, j === -1 ? undefined : j)
}

describe('a tela e o servidor concordam sobre os papéis', () => {
  it('todo preset da tela existe no servidor, com a mesma composição', () => {
    for (const chave of ORDEM_PRESETS) {
      const tela = PRESETS_TELA[chave]
      const srv  = PRESETS_SERVIDOR[chave]
      expect(srv, `preset "${chave}" existe na tela mas não no servidor`).toBeTruthy()
      expect({
        role: tela.role,
        pode_aprovar_pecas: tela.pode_aprovar_pecas,
        pode_aprovar_aprendizado: tela.pode_aprovar_aprendizado,
      }, `preset "${chave}" divergiu entre tela e servidor`).toEqual(srv)
    }
  })

  it('as duas capacidades são independentes — existe quem aprove peça e não aprendizado', () => {
    // É a razão de o modelo ser papel+capacidades e não escada de papéis.
    // Se alguém "simplificar" para uma escada, este teste cai.
    const sohPecas = ORDEM_PRESETS.filter(k =>
      PRESETS_TELA[k].pode_aprovar_pecas && !PRESETS_TELA[k].pode_aprovar_aprendizado)
    expect(sohPecas.length).toBeGreaterThan(0)
  })

  it('ida e volta: preset → dado → preset', () => {
    for (const chave of ORDEM_PRESETS) {
      expect(presetDoMembro(papelDoPreset(chave))).toBe(chave)
    }
  })

  it('combinação desconhecida cai no MENOR privilégio, nunca no maior', () => {
    // Linha corrompida ou de uma versão futura não pode virar "Dono" na tela.
    const estranho = { role: 'member', pode_aprovar_pecas: false, pode_aprovar_aprendizado: true }
    const preset = PRESETS_TELA[presetDoMembro(estranho)]
    expect(preset.pode_aprovar_pecas).toBe(false)
    expect(preset.pode_aprovar_aprendizado).toBe(false)
  })
})

describe('normalizarPapel — o servidor não aceita qualquer coisa', () => {
  it('recusa papel fora da lista', () => {
    expect(normalizarPapel({ role: 'superadmin' }).erro).toBeTruthy()
    expect(normalizarPapel({ role: 'admin' }).erro).toBeTruthy()   // valor pré-052
  })

  it('aceita só owner e member', () => {
    expect(PAPEIS).toEqual(['owner', 'member'])
  })

  it('dono sempre sai com as duas capacidades', () => {
    // Dono sem capacidade é estado que a tela não sabe representar e que ele
    // desfaz sozinho em dois cliques.
    const p = normalizarPapel({ role: 'owner', pode_aprovar_pecas: false, pode_aprovar_aprendizado: false })
    expect(p.pode_aprovar_pecas).toBe(true)
    expect(p.pode_aprovar_aprendizado).toBe(true)
  })

  it('capacidade só é concedida quando pedida — nada de default verdadeiro', () => {
    const p = normalizarPapel({ role: 'member' })
    expect(p.pode_aprovar_pecas).toBe(false)
    expect(p.pode_aprovar_aprendizado).toBe(false)
  })
})

describe('migration 052 — as policies fecham o que estava aberto', () => {
  it('a policy `for all` de workspace_members foi derrubada', () => {
    expect(migration).toMatch(/drop policy if exists "membro acessa workspace_members" on workspace_members/)
  })

  it('a policy de auto-inserção (bypass de tenant) foi derrubada', () => {
    // `for insert with check (user_id = auth.uid())` não restringia workspace_id.
    expect(migration).toMatch(/drop policy if exists "autenticado adiciona membro"\s+on workspace_members/)
  })

  it('escrita em workspace_members é por comando e só para o dono', () => {
    for (const cmd of ['insert', 'update', 'delete']) {
      const re = new RegExp(`for ${cmd}[\\s\\S]{0,120}?eh_owner\\(workspace_id\\)`)
      expect(migration, `policy de ${cmd} não exige eh_owner`).toMatch(re)
    }
  })

  it('não sobrou nenhuma policy `for all` em workspace_members', () => {
    // `for all` foi exatamente o descuido que deixou UPDATE e DELETE abertos.
    const criacoes = migration.match(/create policy[\s\S]*?;/g) || []
    const paraMembros = criacoes.filter(p => /on workspace_members/.test(p))
    expect(paraMembros.length).toBeGreaterThan(0)
    for (const p of paraMembros) expect(p).not.toMatch(/for all/)
  })

  it('leitura do time continua liberada para qualquer membro', () => {
    // Fechar demais também é defeito: saber com quem se trabalha não é privilégio.
    expect(migration).toMatch(/for select using \(public\.eh_membro\(workspace_id\)\)/)
  })

  it('o último dono não pode ser removido nem rebaixado', () => {
    expect(migration).toMatch(/create trigger trg_protege_ultimo_owner[\s\S]*?before update or delete on workspace_members/)
    expect(migration).toMatch(/pelo menos um dono/)
  })

  it('o backfill preserva quem já mandava (admin vira owner com as capacidades)', () => {
    // Migration que rebaixa usuário ativo é incidente, não deploy.
    expect(migration).toMatch(/update workspace_members set role = 'owner'\s+where role = 'admin'/)
    const bf = trecho(migration, "set pode_aprovar_pecas = true", 'where role')
    expect(bf).toMatch(/pode_aprovar_aprendizado = true/)
  })

  it('workspace órfão ganha dono — ninguém fica ingovernável', () => {
    expect(migration).toMatch(/orfaos/)
    expect(migration).toMatch(/order by m\.workspace_id, m\.created_at asc/)
  })

  it('o CHECK entra DEPOIS do backfill (senão rejeita as linhas vivas)', () => {
    const posBackfill = migration.indexOf("set role = 'owner'  where role = 'admin'")
    const posCheck    = migration.indexOf('workspace_members_role_check check')
    expect(posBackfill).toBeGreaterThan(-1)
    expect(posCheck).toBeGreaterThan(posBackfill)
  })
})

describe('migration 052 — o saldo não é editável pelo cliente', () => {
  it('as colunas comerciais estão protegidas por trigger', () => {
    const fn = trecho(migration, 'function public.protege_campos_comerciais', 'drop trigger if exists trg_protege_campos_comerciais')
    for (const col of ['creditos_saldo', 'creditos_mes', 'valor_mensal_centavos', 'plano', 'ativo', 'slug', 'pais']) {
      expect(fn, `${col} ficou de fora da proteção`).toMatch(new RegExp(`new\\.${col}\\s+is distinct from old\\.${col}`))
    }
  })

  it('o servidor (service key) e o operador da plataforma passam', () => {
    const fn = trecho(migration, 'function public.protege_campos_comerciais', 'drop trigger if exists trg_protege_campos_comerciais')
    expect(fn).toMatch(/if auth\.uid\(\) is null then return new/)
    expect(fn).toMatch(/platform_admins where user_id = auth\.uid\(\)/)
  })
})

describe('as functions do time checam quem chama', () => {
  const lidos = {
    membro:  readFileSync('netlify/functions/workspace-member.js', 'utf8'),
    criar:   readFileSync('netlify/functions/workspace-create-user.js', 'utf8'),
    join:    readFileSync('netlify/functions/workspace-join.js', 'utf8'),
  }

  it('workspace-member exige dono antes de tocar em qualquer coisa', () => {
    const antesDoAlvo = trecho(lidos.membro, 'export const handler', "supabase\n    .from('workspace_members')")
    expect(antesDoAlvo).toMatch(/exigirOwner\(supabase, event, workspace_id\)/)
    expect(antesDoAlvo).toMatch(/if \(ctx\.erro\) return ctx\.erro/)
  })

  it('workspace-member nunca filtra só por member_id (id atravessa tenant)', () => {
    // Com service key a RLS não protege: sem eq('workspace_id'), o dono do
    // workspace A editaria membro do workspace B.
    const chamadas = lidos.membro.match(/\.eq\('id', member_id\)[^\n]*/g) || []
    expect(chamadas.length).toBeGreaterThan(0)
    for (const c of chamadas) {
      expect(c, `filtro sem workspace_id: ${c}`).toMatch(/\.eq\('workspace_id', workspace_id\)/)
    }
  })

  it('workspace-create-user recusa e-mail que já tem conta', () => {
    // Duas coisas de uma vez. (a) Tomada de conta: o admin-create-user redefine
    // a senha quando o e-mail existe — aceitável para o operador, que já tem
    // service key; dar isso ao dono de um tenant seria ele digitar o e-mail de
    // qualquer pessoa e receber uma senha válida na tela. (b) Vínculo não
    // solicitado: a pessoa virava membro de um workspace que nunca pediu.
    const ramo = trecho(lidos.criar, 'if (existente) {', '\n  }')
    expect(ramo).toMatch(/return erro\(409/)
    expect(soCodigo(ramo)).not.toMatch(/password|updateUserById|insert|update/)
  })

  it('a resposta não conta nada sobre contas alheias', () => {
    // `ja_existia` e `user_id` viravam oráculo: qualquer dono de tenant digitava
    // um e-mail e descobria se aquela pessoa usa o brandcode.
    const resposta = trecho(lidos.criar, 'return ok(', '}')
    expect(resposta).not.toMatch(/ja_existia|user_id|senha_definida/)
  })

  it('workspace-join lê o convite de app_metadata, nunca do corpo nem de user_metadata', () => {
    // user_metadata é reescrito pelo próprio usuário com updateUser({ data }).
    const codigo = soCodigo(lidos.join)
    expect(codigo).toMatch(/user\.app_metadata\?\.convite_workspace_id/)
    expect(codigo, 'voltou a ler user_metadata, que o próprio usuário reescreve').not.toMatch(/user_metadata/)
    expect(codigo, 'voltou a aceitar workspace_id do corpo da requisição').not.toMatch(/body[\s\S]{0,40}workspace_id/)
  })

  it('workspace-join consome o convite (convite não expira = porta aberta)', () => {
    expect(lidos.join).toMatch(/convite_workspace_id: null/)
  })

  it('o convidado entra no MENOR privilégio', () => {
    expect(lidos.join).toMatch(/PRESETS\.criador\.role/)
    expect(PRESETS_SERVIDOR.criador.pode_aprovar_pecas).toBe(false)
    expect(PRESETS_SERVIDOR.criador.pode_aprovar_aprendizado).toBe(false)
  })

  it('admin-invite grava a intenção do convite em app_metadata', () => {
    const invite = readFileSync('netlify/functions/admin-invite.js', 'utf8')
    expect(invite).toMatch(/app_metadata: \{ convite_workspace_id: workspace_id \}/)
  })
})

describe('o código aguenta o banco pré-052 (a janela do deploy)', () => {
  // O Netlify sobe o código e a migration roda à parte. No meio existe uma
  // janela em que o código NOVO fala com o banco VELHO — e `select` de coluna
  // inexistente não degrada: o PostgREST recusa a query INTEIRA. Sem tolerância,
  // essa janela é "nenhum tenant carrega".
  // Cada caminho precisa de uma SEGUNDA consulta, sem as colunas novas, usada
  // quando a primeira falha. A âncora é a chamada de fallback exata.
  const caminhos = {
    'WorkspaceContext (login de todo tenant)': [
      'src/lib/WorkspaceContext.jsx', "buscar('role, workspaces!inner(*)')"],
    'workspace-members (lista do time)': [
      'netlify/functions/workspace-members.js', "listar('id, user_id, role, created_at')"],
    '_papeis (todo endpoint novo)': [
      'netlify/functions/_papeis.js', "consulta('id, role')"],
    // ESCRITA também atravessa a janela, e essa foi a que mordeu: o vínculo do
    // dono levava as capacidades novas e o insert inteiro era recusado no
    // esquema velho — workspace nascia sem dono e não abria para ninguém.
    'admin-create-workspace (o vínculo do dono)': [
      'netlify/functions/admin-create-workspace.js', "vincular({ role: 'owner' })"],
  }
  for (const [nome, [arq, fallback]] of Object.entries(caminhos)) {
    it(nome, () => {
      const src = soCodigo(readFileSync(arq, 'utf8'))
      expect(src, `${arq} pede as colunas novas`).toMatch(/pode_aprovar_pecas/)
      expect(src, `${arq} perdeu o fallback pré-052: ${fallback}`).toContain(fallback)
    })
  }

  it('as duas listas de membros normalizam o papel antes da tela', () => {
    // Achado abrindo a tela: o dropdown do operador ficava VAZIO. O papel dele
    // ainda é 'admin' no banco e as opções do <Select> são owner|member — o MUI
    // com valor fora da lista renderiza em branco, e quem olha conclui que a
    // pessoa não tem acesso. Mesma classe do "filtro em branco" de 18/08.
    //
    // A primeira versão deste teste só checava se o arquivo MENCIONA
    // `derivarCapacidades` — e a linha de import menciona. A varredura de
    // mutação reprovou na hora: tirar a chamada do pipeline deixava tudo verde.
    // Por isso a âncora é a CHAMADA, com o que ela recebe.
    const chamadas = {
      'netlify/functions/admin-list-members.js': 'members.map(derivarCapacidades)',
      'netlify/functions/workspace-members.js':  '(members || []).map(derivarCapacidades)',
    }
    for (const [arq, chamada] of Object.entries(chamadas)) {
      expect(soCodigo(readFileSync(arq, 'utf8')),
        `${arq} devolve o papel cru para a tela`).toContain(chamada)
    }
  })

  it('capacidade ausente deriva do papel, igual ao backfill da 052', () => {
    expect(derivarCapacidades({ role: 'admin' })).toMatchObject({
      role: 'owner', pode_aprovar_pecas: true, pode_aprovar_aprendizado: true,
    })
    expect(derivarCapacidades({ role: 'member' })).toMatchObject({
      role: 'member', pode_aprovar_pecas: false, pode_aprovar_aprendizado: false,
    })
    // Já migrado: o valor do banco manda, não a derivação.
    expect(derivarCapacidades({ role: 'member', pode_aprovar_pecas: true, pode_aprovar_aprendizado: false }))
      .toMatchObject({ pode_aprovar_pecas: true, pode_aprovar_aprendizado: false })
  })
})

describe('nenhuma tela escreve em workspace_members direto', () => {
  // O caminho voltar para o browser é o defeito voltando: a policy recusaria em
  // silêncio (0 linhas) e a tela diria "salvo".
  const telas = [
    'src/pages/app/WorkspacePage.jsx',
    'src/pages/AppInterno.jsx',
    'src/pages/auth/Invite.jsx',
  ]
  for (const t of telas) {
    it(t.replace('src/', ''), () => {
      const src = soCodigo(readFileSync(t, 'utf8'))
      const escritas = src.match(/from\('workspace_members'\)\s*\.\s*(insert|update|delete)/g) || []
      expect(escritas, `${t} ainda escreve direto em workspace_members`).toEqual([])
    })
  }
})
