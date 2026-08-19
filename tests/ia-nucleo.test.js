import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'

// ── AS INVARIANTES DO NÚCLEO DE INTELIGÊNCIA ────────────────────────────
//
// Este arquivo NÃO testa se o modelo é bom. Testa se o ARREDOR está correto —
// e foi sempre o arredor que falhou. Os quatro defeitos achados em 18/08/2026:
//
//   1. o domínio do cliente carregado e nunca enviado ao modelo
//   2. a identidade do cliente sobrescrita pela resposta do modelo
//   3. `callAI` devolvendo só o primeiro bloco de texto de uma resposta picada
//   4. coletor sem busca web "coletando" — inventando o que não podia procurar
//
// Nenhum é falha de raciocínio do modelo. Modelo melhor não conserta nenhum
// deles. É por isso que estas invariantes valem mais que qualquer avaliação de
// qualidade: elas pegam a classe de erro que de fato chegou ao cliente.
//
// Regra para quem mexer aqui: teste que só faz `grep` no fonte é trava de
// regressão, não prova de comportamento. Onde dá para executar a função, execute
// — os testes de comportamento estão em ia-identidade.test.js.

const ler = (p) => readFileSync(p, 'utf8')
// A varredura olha CÓDIGO. Sem tirar os comentários, a própria documentação do
// bug (que cita o padrão antigo) acusa o arquivo que existe para consertá-lo.
const lerCodigo = (p) => ler(p)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map(l => l.replace(/(^|\s)\/\/.*$/, '')).join('\n')
const FUNCOES = 'netlify/functions'

describe('1 · quem é o sujeito da análise é ENTRADA, nunca saída', () => {
  const bg = ler(`${FUNCOES}/diagnostico-gerar-background.js`)
  const compartilhado = ler(`${FUNCOES}/_diagnostico.js`)

  it('o diagnóstico manda o domínio ao modelo', () => {
    // Recorte na MENSAGEM, não no arquivo. A varredura de mutação pegou este
    // teste enfraquecendo sozinho: quando o rastreio de custo passou a usar
    // `alvoDoDiagnostico(alvo)` numa segunda linha (o campo `operacao`),
    // apagar a chamada da MENSAGEM deixou de ficar vermelho — a outra linha
    // satisfazia o casamento. Teste que casa o arquivo inteiro apodrece assim,
    // sem ninguém mexer nele.
    const msg = bg.slice(bg.indexOf('const msgText'), bg.indexOf('const userName'))
    expect(msg).toMatch(/alvoDoDiagnostico\(alvo\)/)
    expect(msg).toMatch(/instrucaoDeIdentidade\(alvo\)/)
  })

  it('o diagnóstico NÃO grava a empresa que o modelo devolveu', () => {
    // Este é o teste que teria evitado o relatório da Pixel chegar ao cliente.
    expect(bg).not.toMatch(/empresa:\s*parsed\.empresa/)
    expect(bg).not.toMatch(/dominio:\s*parsed\.dominio/)
    expect(bg).toMatch(/identidadeParaGravar\(alvo, parsed\)/)
  })

  it('a guarda roda ANTES da gravação, não depois', () => {
    const guarda = bg.indexOf('conferirIdentidade(alvo, parsed)')
    const grava  = bg.indexOf('const payload = {')
    expect(guarda).toBeGreaterThan(0)
    expect(guarda).toBeLessThan(grava)
  })

  it('identidade recusada não vira registro `done`', () => {
    const trecho = bg.slice(bg.indexOf('conferirIdentidade(alvo, parsed)'), bg.indexOf('const payload = {'))
    expect(trecho).toMatch(/saveError/)
    expect(trecho).toMatch(/return \{ statusCode: 200 \}/)
  })

  it('o diagnóstico de CONCORRENTE tem a mesma guarda', () => {
    // Pesa mais aqui: concorrente trocado vira emitSignal permanente no cérebro.
    expect(compartilhado).toMatch(/conferirIdentidade\(sujeito, parsed\)/)
    expect(compartilhado).toMatch(/alvoDoDiagnostico\(sujeito\)/)
    expect(compartilhado).not.toMatch(/const empresa = concorrente\.dominio \|\| concorrente\.nome/)
  })
})

describe('2 · a resposta do modelo é lida inteira', () => {
  const ai = ler(`${FUNCOES}/_ai.js`)

  it('callAI concatena TODOS os blocos de texto', () => {
    // Com busca web a Anthropic pica a resposta em um bloco por trecho citado —
    // medido: 37 blocos, 30+ de texto. O `.find()` entregava o primeiro
    // fragmento como se fosse a resposta inteira. Só mordia em produção, porque
    // em dev o tier standard desliga a busca e a resposta volta num bloco só.
    expect(ai).not.toMatch(/content\?\.find\(b => b\.type === 'text'\)/)
    expect(ai).toMatch(/filter\(b => b\.type === 'text'\)/)
    expect(ai).toMatch(/\.join\(''\)/)
  })

  it('callAI devolve o content cru para quem usa busca web', () => {
    // Sem os blocos `web_search_tool_result` não há como tirar a URL do índice;
    // só resta pedir o link ao modelo, que é a origem da menção inventada.
    expect(ai).toMatch(/return \{ text, content: blocos/)
  })

  it('streamAI acumula todos os deltas', () => {
    expect(ai).toMatch(/fullText \+= evt\.delta\.text/)
  })
})

describe('3 · coletor sem acesso ao mundo não coleta', () => {
  const escuta = ler(`${FUNCOES}/listening-coletar-background.js`)

  it('busca que falhou não vira coleta', () => {
    // O modo degradado silencioso gravou 122 eventos inventados. Modelo sem
    // como pesquisar não recusa: descreve o que o ramo "costuma" receber.
    // Hoje a busca sempre existe (é a chave da Anthropic), então a guarda mudou
    // de lugar: falhou e não trouxe nada, devolve erro e não grava.
    expect(escuta).toMatch(/if \(falhas\.length && !resultados\.length\)/)
    expect(escuta).toMatch(/statusCode: 502/)
  })

  it('quem classifica não tem ferramenta de busca', () => {
    const bloco = escuta.slice(escuta.indexOf('async function classificar'), escuta.indexOf('export const handler'))
    expect(bloco).toMatch(/tools:\s*undefined/)
  })

  it('falha total não vira snapshot zerado', () => {
    // Snapshot com 0 menções é uma AFIRMAÇÃO sobre a semana da marca. Só pode
    // ser gravado quando a busca aconteceu e não achou nada.
    const i = escuta.indexOf('falhas.length && !resultados.length')
    expect(i).toBeGreaterThan(0)
    expect(i).toBeLessThan(escuta.indexOf('sentiment_snapshots'))
  })
})

describe('4 · varredura do núcleo — nenhuma função nova pode reintroduzir o padrão', () => {
  const arquivos = readdirSync(FUNCOES).filter(f => f.endsWith('.js'))

  it('ninguém mais lê só o primeiro bloco de texto', () => {
    const infratores = arquivos.filter(f =>
      /content\s*\??\.\s*find\(\s*b\s*=>\s*b\.type\s*===\s*'text'\s*\)/.test(lerCodigo(`${FUNCOES}/${f}`)))
    expect(infratores).toEqual([])
  })

  it('ninguém grava identidade vinda do modelo', () => {
    // Qualquer `empresa: parsed.empresa` novo reabre o caso Pixel.
    const infratores = arquivos.filter(f =>
      /(empresa|dominio):\s*(parsed|p)\.(empresa|dominio)\b/.test(lerCodigo(`${FUNCOES}/${f}`)))
    expect(infratores).toEqual([])
  })

  it('todo caminho de diagnóstico passa pela guarda', () => {
    const geradores = arquivos.filter(f => {
      const s = ler(`${FUNCOES}/${f}`)
      return s.includes('SYSTEM_PROMPT') && /streamAI|callAI/.test(s)
    })
    expect(geradores.length).toBeGreaterThan(0)
    const semGuarda = geradores.filter(f => !ler(`${FUNCOES}/${f}`).includes('conferirIdentidade'))
    expect(semGuarda).toEqual([])
  })
})

describe('5 · a reserva de modelo existe E está ligada', () => {
  const ai = ler(`${FUNCOES}/_ai.js`)

  it('o principal é o 4-6 e a reserva é o 5', async () => {
    // Escolha medida, não achada: A/B de 4 rodadas no caso Pixel (18/08). Os
    // dois acertam a empresa, o tempo empata, e o 5 custa 2,6× por fazer
    // raciocínio adaptativo. Ele vira a reserva justamente por ser bom.
    const { MODELS, MODELS_RESERVA } = await import('../netlify/functions/_ai.js')
    expect(MODELS.smart).toBe('claude-sonnet-4-6')
    expect(MODELS_RESERVA[MODELS.smart]).toBe('claude-sonnet-5')
  })

  it('só troca de modelo em falha que trocar resolve', async () => {
    const { valeTentarReserva } = await import('../netlify/functions/_ai.js')
    // Capacidade, indisponibilidade, timeout: vale.
    for (const s of [429, 500, 502, 503, 504, 529, 408]) expect(valeTentarReserva(s)).toBe(true)
    // Pedido malformado e chave errada falham igual no outro modelo — repetir
    // só queima tempo e dinheiro, e mascara o erro real.
    for (const s of [400, 401, 403, 404, 413, 422]) expect(valeTentarReserva(s)).toBe(false)
  })

  it('os dois caminhos de chamada aceitam reserva', () => {
    const callAI   = ai.slice(ai.indexOf('export async function callAI'), ai.indexOf('export async function streamAI'))
    const streamAI = ai.slice(ai.indexOf('export async function streamAI'))
    expect(callAI).toMatch(/modeloReserva/)
    expect(streamAI).toMatch(/modeloReserva/)
  })

  it('reserva não usada é reserva que não existe — os chamadores passam', () => {
    // O defeito clássico de fallback: implementado e nunca ligado.
    //
    // A varredura de mutação reprovou a primeira versão deste teste: eu casava
    // `model, modeloReserva, tools, maxTokens` no arquivo inteiro, e a linha da
    // DESESTRUTURAÇÃO já satisfazia isso — apagar o argumento da CHAMADA passava
    // despercebido. Agora o recorte é a chamada do streamAI, e só ela.
    for (const f of ['_diagnostico.js', 'diagnostico-gerar-background.js']) {
      const src = ler(`${FUNCOES}/${f}`)
      const i = src.indexOf('streamAI({')
      expect(i, `${f}: não achei a chamada do streamAI`).toBeGreaterThan(0)
      const chamada = src.slice(i, src.indexOf('})', i))
      expect(chamada, `${f}: a chamada do streamAI não recebe modeloReserva`).toMatch(/modeloReserva/)
    }
  })

  it('a reserva entra UMA vez, não em laço infinito', () => {
    expect(ai).toMatch(/!usouReserva/)
  })
})

describe('6 · o site é a fonte primária do diagnóstico', () => {
  it('o tier do diagnóstico tem a ferramenta de LER página', () => {
    // `web_fetch` estava disponível na nossa chave e não era usado: o modelo só
    // sabia PROCURAR quem falou da marca. Para a costclarity.com — 1 página
    // indexada contra centenas do jargão "cost clarity" em FinOps e da homônima
    // da Arcadis — isso foi a diferença entre acertar e errar a empresa.
    const ai = ler(`${FUNCOES}/_ai.js`)
    expect(ai).toMatch(/webFetch:\s*\{ type: 'web_fetch_/)
    const premium = ai.slice(ai.indexOf("tier === 'premium'"), ai.indexOf("// 'standard' — default"))
    expect(premium).toMatch(/tools:\s*\[TOOLS\.webSearch, TOOLS\.webFetch\]/)
  })

  it('o prompt manda ler o site ANTES de buscar', () => {
    const p = ler(`${FUNCOES}/_prompt.js`)
    expect(p).toMatch(/1\. LEIA O SITE OFICIAL com web_fetch/)
    expect(p).toMatch(/FONTE PRIMÁRIA/)
  })

  it('material escasso vira achado declarado, não desistência', () => {
    const p = ler(`${FUNCOES}/_prompt.js`)
    expect(p).toMatch(/MATERIAL ESCASSO NÃO É MOTIVO PARA DESISTIR NEM PARA INVENTAR/)
    expect(p).toMatch(/"base_de_evidencia"/)
  })
})
