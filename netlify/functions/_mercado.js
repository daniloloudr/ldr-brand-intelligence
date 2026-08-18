// _mercado.js — em que mercado a marca vive.
//
// POR QUE EXISTE (18/08/2026, véspera do setup da Worten)
// O produto nasceu brasileiro e o Brasil estava escrito no código, não na
// configuração: o prompt do diagnóstico mandava pesquisar "Reclame Aqui", as
// tendências pediam "o setor no Brasil", o conteúdo saía em "português
// brasileiro" e a escuta tinha o Reclame Aqui como canal fixo.
//
// Para um cliente português isso não é imprecisão, é erro visível: o Reclame
// Aqui não existe em Portugal (lá é Portal da Queixa e o Livro de Reclamações
// Eletrónico), e texto em português brasileiro entregue a uma marca portuguesa
// se denuncia na primeira linha.
//
// É a mesma classe do bug da Pixel: premissa errada entrando no prompt e
// saindo como análise. A diferença é que essa a gente pegou antes do cliente.
//
// O mercado passa a ser DADO do workspace. Marca sem país declarado continua
// no Brasil — que é onde estão todas as de hoje.

export const PADRAO = 'BR'

export const MERCADOS = {
  BR: {
    nome:       'Brasil',
    gentilico:  'brasileiro',
    idioma:     'português do Brasil',
    codigoIdioma: 'pt-BR',
    google:     { gl: 'br', hl: 'pt-BR' },
    moeda:      'BRL',
    // As praças onde a reputação pública mora. Citar a errada faz o modelo
    // procurar o que não existe — e modelo que procura o que não existe
    // costuma preencher o vazio.
    reputacao:  ['Google Reviews', 'Reclame Aqui', 'Glassdoor'],
    canaisEscuta: [
      { nome: 'Reclame Aqui', hosts: ['reclameaqui.com.br'], busca: 'site:reclameaqui.com.br' },
    ],
  },
  PT: {
    nome:       'Portugal',
    gentilico:  'português',
    idioma:     'português europeu',
    codigoIdioma: 'pt-PT',
    google:     { gl: 'pt', hl: 'pt-PT' },
    moeda:      'EUR',
    reputacao:  ['Google Reviews', 'Portal da Queixa', 'Livro de Reclamações Eletrónico', 'Glassdoor'],
    canaisEscuta: [
      { nome: 'Portal da Queixa', hosts: ['portaldaqueixa.com'], busca: 'site:portaldaqueixa.com' },
    ],
    // O que separa um texto português de um texto brasileiro traduzido pela
    // metade. Sem isto o modelo escreve "time", "celular", "ônibus" e a marca
    // percebe na primeira linha.
    notaDeLingua:
      'Escreva em português EUROPEU: ortografia e vocabulário de Portugal '
      + '(equipa, telemóvel, autocarro, ecrã, casa de banho), gerúndio evitado '
      + '("estou a fazer", não "estou fazendo"), tratamento por "si"/"vós" '
      + 'conforme o registo. NUNCA use português brasileiro.',
  },
}

/** O perfil do mercado. País desconhecido cai no padrão, sem quebrar. */
export function mercado(pais) {
  const cod = String(pais || '').trim().toUpperCase()
  return MERCADOS[cod] || MERCADOS[PADRAO]
}

/**
 * O bloco que entra nos prompts. É aqui que o mercado deixa de ser suposição
 * do modelo e passa a ser instrução.
 */
export function contextoDeMercado(pais) {
  const m = mercado(pais)
  return `\n\nMERCADO: esta marca opera em ${m.nome}. Analise o mercado ${m.gentilico}, `
    + `com concorrentes, imprensa e referências de ${m.nome} — não de outros países.\n`
    + `Reputação pública em ${m.nome} vive em: ${m.reputacao.join(', ')}. `
    + `Não procure praças de outros mercados; se uma não existir em ${m.nome}, ignore-a.\n`
    + `Escreva em ${m.idioma}.`
    + (m.notaDeLingua ? `\n${m.notaDeLingua}` : '')
}

/** Idioma para prompts que só precisam saber como escrever. */
export function idiomaDe(pais) {
  const m = mercado(pais)
  return m.idioma + (m.notaDeLingua ? `\n${m.notaDeLingua}` : '')
}
