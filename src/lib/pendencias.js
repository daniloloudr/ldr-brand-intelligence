// pendencias.js — o que falta para a marca funcionar por inteiro.
//
// A plataforma já SABE o que falta: a extração devolve as lacunas, e a
// biblioteca sabe quais arquivos existem. O que faltava era contar para quem
// pode resolver. Este arquivo é a regra; a tela só mostra.
//
// Duas decisões de escrita, e elas são o ponto:
//
// • Cada pendência diz o QUE QUEBRA sem ela, não o que "seria bom ter".
//   "Suba a fonte" não move ninguém; "sem o arquivo da fonte, o Estúdio
//   escreve com uma fonte parecida" move. É a diferença entre cobrar e
//   explicar.
//
// • Nada aqui bloqueia. Marca sem manual funciona — só funciona com menos.
//   A severidade diz o tamanho da perda, não uma permissão.

const ehImagem = (a) => (a.mime_type || '').startsWith('image/')
  || /\.(png|jpe?g|webp|gif|svg)$/i.test(a.nome || '')
const ehFonte = (a) => (a.mime_type || '').startsWith('font/')
  || /\.(otf|ttf|woff2?)$/i.test(a.nome || '')
const temArquivo = (a) => !!a.file_path || /^https?:\/\//i.test(a.valor || '')

// Quantas imagens de referência bastam para o juiz ter de onde tirar padrão.
// Abaixo disso ele generaliza de exemplo demais e erra bonito.
const MINIMO_REFERENCIAS = 8

/**
 * @param {object} estado
 * @param {Array}  estado.assets   linhas de brand_assets da marca
 * @param {Array}  estado.lacunas  smartbrand_gaps do brand book
 * @param {boolean} estado.temManual
 * @returns {Array<{id,titulo,porque,acao,severidade}>}
 */
export function pendencias({ assets = [], lacunas = [], temManual = false } = {}) {
  const lista = []
  const arquivos = assets.filter(temArquivo)

  if (!temManual) {
    lista.push({
      id: 'manual',
      titulo: 'O manual da marca',
      porque: 'Sem ele a marca vive só do que a inteligência observou por fora. '
        + 'Nada do que ela declara sobre si mesma — propósito, tom, regras de uso — entra no cérebro.',
      acao: 'Importar manual',
      severidade: 'alta',
    })
  }

  // O manual DESCREVE o logo; ele não entrega o arquivo. Esta é a pendência
  // que mais engana: a marca parece completa porque tem nove logos listados.
  const logosDescritos = assets.filter(a => a.tipo === 'logo').length
  const logosComArquivo = arquivos.filter(a => a.tipo === 'logo').length
  if (!logosComArquivo) {
    lista.push({
      id: 'logo',
      titulo: 'O arquivo do logo',
      porque: logosDescritos
        ? `O manual descreve ${logosDescritos} ${logosDescritos > 1 ? 'versões' : 'versão'} do logo, mas descrição não é arquivo. `
          + 'O Estúdio não consegue aplicar o logo numa peça enquanto ele não existir em SVG ou PNG.'
        : 'O Estúdio não consegue aplicar o logo numa peça sem o arquivo, em SVG ou PNG.',
      acao: 'Subir logo',
      severidade: 'alta',
    })
  }

  if (!arquivos.some(ehFonte)) {
    lista.push({
      id: 'fontes',
      titulo: 'Os arquivos de fonte',
      porque: 'Sem eles o Estúdio escreve com uma fonte parecida — e "parecida" é '
        + 'exatamente o que faz uma peça não parecer da marca.',
      acao: 'Subir fontes',
      severidade: 'media',
    })
  }

  const referencias = arquivos.filter(a => ehImagem(a) && (a.metadata?.reference === true
    || ['logo', 'icone', 'padrao'].includes(a.tipo))).length
  if (referencias < MINIMO_REFERENCIAS) {
    lista.push({
      id: 'referencias',
      titulo: 'Imagens de referência',
      porque: `São elas que ensinam o que é "a cara da marca". Com ${referencias} de ${MINIMO_REFERENCIAS}, `
        + 'o julgamento generaliza de exemplo demais e erra com confiança.',
      acao: 'Subir imagens',
      severidade: 'media',
    })
  }

  // Lacunas do manual: o documento existe, mas não cobriu certos campos.
  // Não é falha de ninguém — é informação que ainda não foi declarada.
  if (lacunas.length) {
    const nomes = lacunas.slice(0, 3).map(l => l.rotulo).filter(Boolean)
    lista.push({
      id: 'lacunas',
      titulo: `${lacunas.length} ${lacunas.length > 1 ? 'campos não declarados' : 'campo não declarado'}`,
      porque: nomes.length
        ? `O manual não cobriu ${nomes.join(', ')}${lacunas.length > nomes.length ? ' e outros' : ''}. `
          + 'Onde não há declaração, o cérebro deduz — e dedução vira invenção quando ninguém confere.'
        : 'Onde o manual não declara, o cérebro deduz — e dedução vira invenção quando ninguém confere.',
      acao: 'Ver lacunas',
      severidade: 'baixa',
    })
  }

  return lista
}

/** Um resumo curto para caber numa linha, fora da tela de referências. */
export function resumoPendencias(lista) {
  if (!lista.length) return null
  const altas = lista.filter(p => p.severidade === 'alta').length
  return altas
    ? `${lista.length} ${lista.length > 1 ? 'pendências' : 'pendência'} — ${altas} ${altas > 1 ? 'travam' : 'trava'} o Estúdio`
    : `${lista.length} ${lista.length > 1 ? 'pendências' : 'pendência'} para a marca ficar completa`
}
