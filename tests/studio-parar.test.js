// ════════════════════════════════════════════════════════════════════
// O botão Parar tem que parar ANTES do débito, não depois.
//
// O crédito é debitado no DISPATCH (studio-generate.js debita ao receber), não
// na conclusão. Então "parar" só vale alguma coisa se cada envio conferir a
// bandeira ANTES de sair. Um Parar que só desliga o poll deixaria a cascata
// enviar — e cobrar — a fila inteira, enquanto mostra "Parado" na tela: pior
// que não ter botão, porque promete o que não faz.
//
// Ancorado no ponto exato de cada envio, não no arquivo inteiro: teste que casa
// padrão no arquivo todo apodrece sozinho quando outra linha usa a expressão
// (aconteceu 4 vezes em 18/08).
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/pages/app/StudioCanvas.jsx', 'utf8')

/** Recorte entre dois marcadores — falha alto se o marcador sumiu. */
function trecho(de, ate) {
  const i = src.indexOf(de)
  expect(i, `marcador sumiu do StudioCanvas: "${de}"`).toBeGreaterThan(-1)
  const j = src.indexOf(ate, i + de.length)
  expect(j, `marcador final sumiu: "${ate}"`).toBeGreaterThan(-1)
  return src.slice(i, j)
}

describe('Parar interrompe antes de gastar crédito', () => {
  it('a bandeira é levantada por pararRun()', () => {
    const fn = trecho('function pararRun()', '\n  }')
    expect(fn, 'pararRun precisa levantar abortRef').toContain('abortRef.current = true')
    expect(fn, 'pararRun precisa encerrar o poll em curso').toContain('stopRunRef.current')
  })

  it('e é baixada no começo de cada run — senão o run seguinte já nasce parado', () => {
    const fn = trecho('async function run(rootId', 'const auth = await authHeaders()')
    expect(fn).toContain('abortRef.current = false')
  })

  it('o disparo inicial confere a bandeira ANTES de cada envio', () => {
    // Um envio por iteração = um débito por iteração. A conferência precisa
    // estar DENTRO do laço; fora dele, parar no meio ainda cobraria o resto.
    const fn = trecho('const jobs = []', 'if (!jobs.length)')
    for (const [rotulo, chamada] of [
      ['imagem', 'dispatchGenerateNode(g, ctx)'],
      ['vídeo',  'dispatchVideoNode(v, ctx)'],
      ['app',    'dispatchAppNode(a, ctx)'],
    ]) {
      const i = fn.indexOf(chamada)
      expect(i, `não achei o envio de ${rotulo}`).toBeGreaterThan(-1)
      const inicioDoLaco = fn.lastIndexOf('for (', i)
      const antes = fn.slice(inicioDoLaco, i)
      expect(antes, `o envio de ${rotulo} dispara sem conferir a parada — parar não economizaria esse crédito`)
        .toContain('abortRef.current')
    }
  })

  it('a cascata do poll confere a bandeira antes de disparar a etapa seguinte', () => {
    // É o caminho que mais gasta: cada etapa concluída dispara a próxima. Sem
    // esta conferência, apertar Parar não impede a etapa seguinte inteira.
    const fn = trecho('// encadeamento: re-varre tudo', 'setProgress({ done: jobs.length')
    const i = fn.indexOf('dispatchGenerate(g)')
    expect(i, 'não achei o disparo em cascata').toBeGreaterThan(-1)
    expect(fn.slice(0, i), 'a cascata dispara sem conferir a parada')
      .toContain('if (abortRef.current) return')
  })

  it('o Parar já está na tela DURANTE o disparo inicial, não só no poll', () => {
    // A bandeira não vale nada se não houver como levantá-la. `running` comanda
    // o botão; se só ligasse no pollEngine (depois de todos os dispatches), a
    // tela diria "Gerar" exatamente na janela em que cada envio debita crédito.
    const fn = trecho('async function run(rootId', 'const jobs = []')
    expect(fn, 'run precisa ligar running ANTES do laço de dispatch')
      .toContain('setRunning(true)')
  })

  it('e some da tela quando o run termina sem nenhum job — senão trava em Parar', () => {
    // Sem job não há poll, e é o poll que costuma desligar o running.
    const fn = trecho('if (!jobs.length) {', 'pollEngine(jobs')
    expect(fn, 'a saída sem jobs precisa desligar running').toContain('setRunning(false)')
  })

  it('a interface oferece Parar enquanto roda (e não só um spinner)', () => {
    const barra = trecho('{running ? (', '<Box ref={flowWrapRef}')
    expect(barra).toContain('onClick={pararRun}')
    expect(barra, 'o rótulo precisa dizer Parar').toMatch(/Parar/)
  })

  it('a mensagem não promete cancelar o que já foi enviado', () => {
    const fn = trecho('function pararRun()', '\n  }')
    expect(fn, 'o usuário precisa saber que o que já saiu continua e já foi cobrado')
      .toMatch(/seguem no provedor|já foi debitado/)
  })
})
