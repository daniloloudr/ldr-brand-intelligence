// ════════════════════════════════════════════════════════════════════
// studio-canvas-entradas.test.js — a ordem das referências e a tecla que apaga
//
// Dois defeitos da reunião Hering (31/ago/2026), ambos no canvas do Studio:
//
// 1. A ordem das referências era a ordem das CONEXÕES — histórico de edição,
//    invisível e não editável. Em modelo com papel por posição (try-on: 1ª =
//    pessoa, 2ª = peça) a ordem É o resultado. Virou `refOrder`, escolhida no
//    painel Entradas e ordenada por `ordenarPorRefOrder`.
//
// 2. A conexão entre dois nós só se apagava com Backspace (default do xyflow,
//    nunca sobrescrito). No Mac a tecla grande é rotulada "delete" e emite
//    Backspace; no Windows `Delete` é outra tecla — e a cliente ficou sem
//    NENHUM caminho, porque aresta também não tem afordância de mouse.
//
// O item 2 é trava de regressão ancorada na prop (não dá para exercitar a tecla
// sem navegador); o item 1 é comportamento de verdade, em função pura.
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { ordenarPorRefOrder, planoDeRefs, comoLeAsRefs, REGRA_VIDEO } from '../src/lib/studioModels.js'

const no = id => ({ id, type: 'imageInput' })

describe('ordenarPorRefOrder — a ordem escolhida vence a ordem das conexões', () => {
  it('sem refOrder, mantém a ordem das conexões (comportamento de sempre)', () => {
    const ins = [no('a'), no('b'), no('c')]
    expect(ordenarPorRefOrder(ins, undefined).map(n => n.id)).toEqual(['a', 'b', 'c'])
    expect(ordenarPorRefOrder(ins, []).map(n => n.id)).toEqual(['a', 'b', 'c'])
  })

  it('com refOrder, reordena', () => {
    const ins = [no('a'), no('b'), no('c')]
    expect(ordenarPorRefOrder(ins, ['c', 'a', 'b']).map(n => n.id)).toEqual(['c', 'a', 'b'])
  })

  // O caso que motivou: no try-on a 1ª referência TEM que ser a pessoa. Antes,
  // isso dependia de ter conectado a pessoa primeiro — e ninguém via a ordem.
  it('o try-on consegue pôr a pessoa em 1º sem refazer as conexões', () => {
    const conectadosNaOrdemErrada = [no('peca'), no('pessoa')]
    const r = ordenarPorRefOrder(conectadosNaOrdemErrada, ['pessoa', 'peca'])
    expect(r.map(n => n.id)).toEqual(['pessoa', 'peca'])
  })

  it('conexão nova (fora da lista salva) entra no FIM, não embaralha o resto', () => {
    const ins = [no('a'), no('b'), no('nova')]
    expect(ordenarPorRefOrder(ins, ['b', 'a']).map(n => n.id)).toEqual(['b', 'a', 'nova'])
  })

  it('não muta o array recebido', () => {
    const ins = [no('a'), no('b')]
    ordenarPorRefOrder(ins, ['b', 'a'])
    expect(ins.map(n => n.id)).toEqual(['a', 'b'])
  })
})

describe('a tecla que apaga uma conexão', () => {
  const canvas = readFileSync(new URL('../src/pages/app/StudioCanvas.jsx', import.meta.url), 'utf8')

  // Ancorado na PROP, não no arquivo: o default do xyflow é 'Backspace' e só
  // ele, então omitir a prop é o defeito. Windows manda 'Delete'.
  it('o canvas aceita Backspace E Delete', () => {
    const m = canvas.match(/deleteKeyCode=\{(\[[^\]]*\])\}/)
    expect(m, 'a prop deleteKeyCode sumiu do <ReactFlow> — no Windows a conexão volta a não ter como ser apagada').toBeTruthy()
    expect(m[1]).toContain("'Delete'")
    expect(m[1]).toContain("'Backspace'")
  })
})

describe('o painel conta IMAGENS, não nós', () => {
  const canvas = readFileSync(new URL('../src/pages/app/StudioCanvas.jsx', import.meta.url), 'utf8')
  const nos    = readFileSync(new URL('../src/pages/app/studioNodes.jsx', import.meta.url), 'utf8')

  // O defeito (31/ago, KH6U): bolsa e calçado tinham 2 fotos cada. Eram 5 NÓS
  // e 7 URLs. O dispatcher corta URLs (`flatMap(toUrls).slice(0, MAX_REF)`),
  // mas o painel contava nós — dizia "5 refs", sem alerta, enquanto as duas
  // imagens do calçado eram descartadas. O aviso existia e mentia, que é pior
  // do que não existir.
  it('o canvas soma as URLs de cada entrada, não o número de entradas', () => {
    expect(canvas, 'o painel voltou a contar nós — nó com 2 imagens some sem aviso')
      .toMatch(/totalUrls/)
    expect(canvas).toMatch(/pos \+= urls\.length/)
  })

  it('o nó usa esse total no plano de corte', () => {
    // Ancorado em 'totalUrls é o argumento de CONTAGEM', não na assinatura
    // inteira — a primeira versão deste teste quebrou sozinha quando um
    // parâmetro novo entrou na chamada. É a lei 3 do núcleo.
    expect(nos).toMatch(/planoDeRefs\(modelo, totalUrls[,)]/)
  })
})

describe('atalhos do canvas (Ctrl+Z / Ctrl+S)', () => {
  const canvas = readFileSync(new URL('../src/pages/app/StudioCanvas.jsx', import.meta.url), 'utf8')

  // A armadilha: se o Ctrl+Z do grafo agir DENTRO de um campo de texto, digitar
  // um briefing no nó Contexto e apertar Ctrl+Z apaga o parágrafo inteiro em vez
  // de uma palavra — o atalho que veio evitar perda vira a maior fonte dela.
  it('o desfazer do grafo não rouba o Ctrl+Z de quem está escrevendo', () => {
    expect(canvas, 'a guarda de campo de texto sumiu do atalho de desfazer')
      .toMatch(/k === 'z' && !escrevendo\(e\.target\)/)
    expect(canvas).toMatch(/isContentEditable/)
  })

  it('o salvar vale mesmo escrevendo — é quando o reflexo aparece', () => {
    // Ctrl+S sai ANTES da guarda de campo de texto, com return próprio.
    const iS = canvas.indexOf("k === 's'")
    const iZ = canvas.indexOf("k === 'z'")
    expect(iS).toBeGreaterThan(-1)
    expect(iS, 'o Ctrl+S passou a depender da guarda de escrita').toBeLessThan(iZ)
  })

  // Sem isto, o histórico guardaria o progresso da geração (status running,
  // elapsed, loading) e "voltar um passo" às vezes só desfaria um spinner.
  it('o histórico guarda a projeção serializável, não o estado de execução', () => {
    expect(canvas).toMatch(/JSON\.stringify\(\{ n: serializableNodes\(\), e: edges \}\)/)
  })
})

describe('o nó de Vídeo também consome imagem — e também em silêncio', () => {
  // O dispatcher de vídeo lê `toUrls(outputs[up?.id])[0]`: a 1ª URL do 1º
  // produtor conectado. Conectar duas imagens não dá erro — a segunda some.
  it('a regra do vídeo é UMA imagem de origem', () => {
    const p = planoDeRefs(null, 3, 10, REGRA_VIDEO)
    expect(p.usadas).toBe(1)
    expect(p.ignoradas).toBe(2)
    expect(p.porQue).toBe('modelo')
  })

  it('e a frase diz isso ao cliente', () => {
    expect(comoLeAsRefs(null, REGRA_VIDEO)).toMatch(/origem do vídeo/)
  })
})
