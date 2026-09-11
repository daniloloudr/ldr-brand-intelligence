// ════════════════════════════════════════════════════════════════════
// A RECEITA VIAJA COM O ADDON — e não leva o cliente anterior junto.
//
// O ADDON NÃO INSTALAVA. A 060 criou `addon_instalacao.workflow_id` e disse que
// quem libera escolhe a receita; o botão "Liberar" do painel nunca gravou a
// coluna. Toda liberação feita pelo produto produzia o estado que a própria 060
// chama de quebrado: ativo, visível no menu do cliente, e a tela recusando
// rodar. Instalar de verdade exigia montar 61 nós no canvas e um UPDATE à mão —
// foi assim que a Hering foi ligada em 11/set.
//
// A receita nasceu de um fluxo da Hering, e é AÍ que mora o risco que estes
// testes guardam: o grafo vinha com 11 nós de imagem apontando para fotos do
// KH6V no bucket da Hering, 17 nós de geração carregando o workspace e a marca
// dela, e notas de canvas que citavam o cliente pelo nome ("Pedido da Hering,
// e-mail 21/08"). Instalado noutro tenant, isso mostraria um cliente ao outro.
//
// ⚠️ O saneamento é a parte que apodrece calada: alguém regenera a receita a
// partir de um fluxo vivo e os ativos do tenant voltam sem que nada quebre. O
// addon segue funcionando — só que vazando. Por isso o teste procura RESÍDUO,
// não estrutura.
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { receitaDoAddon, fluxoDaInstalacao } from '../src/lib/addonReceitas.js'
import { RECEITA_CATALOGO } from '../src/lib/addonReceitaCatalogo.js'
import { ADDONS } from '../src/lib/addons.js'
import { vistasDoGrafo } from '../src/lib/studioGrafo.js'

const WS = '11111111-1111-1111-1111-111111111111'
const texto = JSON.stringify(RECEITA_CATALOGO)

describe('a receita é portável — nada do tenant de origem viaja', () => {
  it('não carrega ativo de nenhum bucket', () => {
    // Uma URL aqui é uma foto que vive no storage de OUTRO cliente. Instalada
    // noutro tenant, ou some (404) ou mostra a peça de quem não devia.
    expect(texto, 'a receita voltou a carregar URL de ativo').not.toMatch(/https?:\/\//)
  })

  it('não carrega id de workspace, de marca nem de rodada', () => {
    const uuids = [...new Set(texto.match(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi) || [])]
    expect(uuids, `uuid do tenant de origem na receita: ${uuids.slice(0, 3).join(', ')}`).toEqual([])
  })

  it('não nomeia o cliente de origem nem os SKUs dele', () => {
    // As notas do canvas citavam a Hering pelo nome e por e-mail datado, e três
    // rótulos traziam SKU. O cliente novo abre o canvas e lê tudo.
    for (const proibido of [/hering/i, /KH6[UV]/, /AR1A1ASN/, /KMD6N10SI/]) {
      expect(texto, `resíduo do cliente de origem: ${proibido}`).not.toMatch(proibido)
    }
  })

  it('nenhum nó de geração nasce com resultado de uma rodada antiga', () => {
    for (const n of RECEITA_CATALOGO.nodes.filter(n => n.type === 'generate')) {
      expect(n.data.status, `${n.id} nasce com estado de execução`).toBe('idle')
      expect(n.data.outputUrl, `${n.id} carrega imagem de outra rodada`).toBeNull()
      expect(n.data.genId).toBeNull()
    }
  })

  it('os nós de imagem nascem VAZIOS — a entrada vem da planilha', () => {
    const entradas = RECEITA_CATALOGO.nodes.filter(n => n.type === 'imageInput')
    expect(entradas.length, 'a receita perdeu os nós de entrada').toBeGreaterThan(5)
    for (const n of entradas) {
      expect(n.data.urls, `${n.id} veio com foto embutida`).toEqual([])
      // O rótulo é o PAPEL ("Still · frente") e precisa sobreviver: é ele que
      // diz onde cada coluna da planilha entra.
      expect(String(n.data.rotulo || ''), `${n.id} perdeu o rótulo do papel`).not.toBe('')
    }
  })
})

describe('a receita ainda é executável depois do saneamento', () => {
  it('o grafo continua produzindo vistas', () => {
    // Saneamento que quebra o grafo troca um problema por outro: o addon
    // instalaria e não rodaria — que é o estado de onde estamos saindo.
    const vistas = vistasDoGrafo(RECEITA_CATALOGO.nodes, RECEITA_CATALOGO.edges)
    const executaveis = vistas.filter(v => v.generateNodeId)
    expect(executaveis.length, 'a receita não tem vista executável').toBeGreaterThan(10)
  })

  it('mantém as 4 etapas e as arestas', () => {
    expect(RECEITA_CATALOGO.nodes.length).toBeGreaterThan(50)
    expect(RECEITA_CATALOGO.edges.length).toBeGreaterThan(50)
    for (const e of RECEITA_CATALOGO.edges) {
      expect(RECEITA_CATALOGO.nodes.some(n => n.id === e.source), `aresta órfã: ${e.source}`).toBe(true)
      expect(RECEITA_CATALOGO.nodes.some(n => n.id === e.target), `aresta órfã: ${e.target}`).toBe(true)
    }
  })
})

describe('a instalação monta o fluxo do tenant que recebe', () => {
  it('o Catálogo traz receita; addon sem receita devolve null sem explodir', () => {
    expect(receitaDoAddon('catalogo')).not.toBeNull()
    expect(receitaDoAddon('formatos'), 'o Fan-out roda sobre o nó Recortar, não tem fluxo próprio').toBeNull()
    expect(receitaDoAddon('nao-existe')).toBeNull()
  })

  it('todo slug com receita existe no catálogo de addons', () => {
    // Receita apontando para addon que saiu do código é fluxo que ninguém abre.
    for (const slug of ['catalogo']) {
      expect(ADDONS.some(a => a.slug === slug), `receita órfã: ${slug}`).toBe(true)
    }
  })

  it('o fluxo nasce no workspace que está instalando', () => {
    const f = fluxoDaInstalacao('catalogo', { workspaceId: WS, brandId: null, nomeDaMarca: 'Worten' })
    expect(f.workspace_id).toBe(WS)
    expect(f.brand_id).toBeNull()
    expect(f.nome, 'o nome não diz de quem é a cópia').toContain('Worten')
    expect(f.nodes.length).toBe(RECEITA_CATALOGO.nodes.length)
  })

  it('respeita o escopo de marca da instalação (§13.5 regra 4)', () => {
    const f = fluxoDaInstalacao('catalogo', { workspaceId: WS, brandId: 'marca-1' })
    expect(f.brand_id).toBe('marca-1')
  })

  it('sem workspace não monta nada — seria um fluxo órfão', () => {
    expect(() => fluxoDaInstalacao('catalogo', {})).toThrow(/workspaceId/)
  })

  it('CLONA: mexer no fluxo instalado não contamina a receita', () => {
    // Se a instalação devolvesse a mesma referência, o canvas de um cliente
    // editaria a receita da casa — e, por tabela, a de todos os outros.
    const a = fluxoDaInstalacao('catalogo', { workspaceId: WS })
    a.nodes[0].data.text = 'EDITADO PELO CLIENTE'
    const b = fluxoDaInstalacao('catalogo', { workspaceId: WS })
    expect(b.nodes[0].data.text, 'a edição de um tenant vazou para a receita').not.toBe('EDITADO PELO CLIENTE')
  })
})
