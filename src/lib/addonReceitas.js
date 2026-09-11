// ════════════════════════════════════════════════════════════════════
// A RECEITA VIAJA COM O ADDON (§13.8, §13.10)
//
// O QUE ESTAVA QUEBRADO
// A 060 deu ao addon uma receita — `addon_instalacao.workflow_id` — e disse que
// quem libera a escolhe. Só que o botão "Liberar" do painel nunca gravou essa
// coluna: ele muda o estado e pronto. Ou seja, TODA liberação feita pelo produto
// caía no caso que a própria 060 descreve como quebrado ("nula = liberado mas
// sem receita definida; a tela recusa rodar"). Instalar o Catálogo em algum
// lugar exigia um UPDATE à mão, e antes disso alguém montar 61 nós no canvas.
//
// Um addon que só instala com cirurgia não é um addon: é um fluxo com tela.
//
// O QUE MUDA
// A receita deixa de ser uma linha de banco do tenant e passa a ser CÓDIGO que
// o addon carrega. Liberar clona a receita para dentro do workspace e amarra o
// `workflow_id`. É o mesmo princípio que a §13.10 já aplica ao catálogo de
// addons — "o catálogo é código; a instalação é banco" — estendido ao que o
// addon entrega quando é instalado.
//
// ⚠️ CLONA, não referencia. Um template compartilhado entre tenants seria uma
// linha que dois clientes leem — e, no dia em que um deles editar o canvas, a
// edição vazaria para o outro. Cada instalação nasce com a SUA cópia: o cliente
// continua sem escolher a receita (a decisão de 04/set segue de pé), mas o que
// ele tem é dele.
//
// A receita nasce da Hering porque foi lá que o processo foi descoberto — e ela
// foi SANEADA na extração: ver o cabeçalho de `addonReceitaCatalogo.js`.
// ════════════════════════════════════════════════════════════════════
import { RECEITA_CATALOGO } from './addonReceitaCatalogo'

const RECEITAS = {
  catalogo: { nome: 'Catálogo em 4 etapas', ...RECEITA_CATALOGO },
}

/** A receita de um addon, ou `null` se ele não traz uma.
 *  Addon sem receita não é erro: o "Fan-out de Formato" roda sobre o nó
 *  Recortar e não precisa de fluxo próprio. */
export const receitaDoAddon = (slug) => RECEITAS[slug] || null

/** O que será gravado em `studio_workflows` ao instalar. Puro de propósito —
 *  é isto que o teste consegue conferir sem banco e sem rede. */
export function fluxoDaInstalacao(slug, { workspaceId, brandId = null, nomeDaMarca = '' } = {}) {
  const receita = receitaDoAddon(slug)
  if (!receita) return null
  if (!workspaceId) throw new Error('fluxoDaInstalacao: workspaceId é obrigatório')
  return {
    workspace_id: workspaceId,
    brand_id: brandId || null,
    // O nome diz de quem é a cópia. Sem isso, um operador olhando a lista de
    // fluxos de um cliente vê "Catálogo em 4 etapas" e não sabe se alguém
    // montou à mão ou se veio da instalação.
    nome: nomeDaMarca ? `${receita.nome} · ${nomeDaMarca}` : receita.nome,
    // CÓPIA PROFUNDA, e não é zelo: `RECEITA_CATALOGO` é uma constante de
    // módulo. Devolver os nós por referência faz a primeira instalação e a
    // milésima apontarem para os MESMOS objetos — e qualquer escrita em cima do
    // retorno (um ajuste antes do insert, um teste) edita a receita da casa
    // para todo mundo que instalar depois, no mesmo processo.
    nodes: structuredClone(receita.nodes),
    edges: structuredClone(receita.edges),
  }
}
