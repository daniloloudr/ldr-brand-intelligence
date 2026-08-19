// _identidade.js — quem está sendo analisado é ENTRADA, nunca saída do modelo.
//
// O CASO QUE ORIGINOU ISTO (18/08/2026, workspace "Pixel")
// O diagnóstico recebia `ws.nome || ws.dominio` e mandava ao modelo a string
// "Pixel". O domínio `www.pixelretail.com.br` era carregado na linha seguinte e
// nunca chegava ao prompt. "Pixel" é nome de dezenas de agências no Brasil: o
// modelo pesquisou, pegou a Pixel Agência Digital (agenciapx.com) e diagnosticou
// ela. Depois o registro gravou `empresa: parsed.empresa` — a resposta do modelo
// SOBRESCREVEU quem era o cliente. Não sobrou nada no dado dizendo que era para
// ser outra empresa.
//
// O detalhe que define a gravidade: o próprio relatório escreveu que "o nome
// Pixel é compartilhado por múltiplas agências no Brasil". O modelo PERCEBEU a
// ambiguidade, escolheu errado assim mesmo, e vendeu o erro como achado.
//
// Duas regras saem daí, e valem para todo o núcleo de inteligência:
//   1. O identificador não-ambíguo (o domínio) vai SEMPRE ao modelo.
//   2. A identidade do sujeito é gravada da ENTRADA. Se o modelo devolver
//      empresa diferente, isso é erro de identificação — aborta, não grava.
//
// A regra 2 é a que fecha a classe inteira: enquanto o modelo puder redefinir
// quem está sendo analisado, ele erra em silêncio, e o erro chega ao cliente
// com cara de relatório pronto.

// Domínios de segundo nível: em "pixelretail.com.br" o registrável tem 3
// rótulos, não 2. Sem esta lista, "com.br" viraria o domínio e QUALQUER par de
// sites .com.br seria considerado a mesma empresa — a guarda passaria a aprovar
// exatamente o erro que existe para pegar.
const SLD = new Set(['com', 'net', 'org', 'gov', 'edu', 'ind', 'adv', 'eng', 'art', 'co'])

/** Normaliza qualquer forma de domínio para host limpo, minúsculo. */
export function host(x) {
  return String(x || '')
    .trim().toLowerCase()
    .replace(/^[a-z]+:\/\//, '')   // protocolo
    .replace(/^www\./, '')
    .replace(/[/?#].*$/, '')       // caminho, query, fragmento
    .replace(/:\d+$/, '')          // porta
    .replace(/\.$/, '')            // ponto final absoluto
}

/** O domínio registrável — o que identifica a empresa. */
export function dominioRaiz(x) {
  const h = host(x)
  if (!h || !h.includes('.')) return h
  const p = h.split('.')
  // "a.com.br" → 3 rótulos; "a.com" → 2
  const n = (p.length >= 3 && SLD.has(p[p.length - 2])) ? 3 : 2
  return p.slice(-n).join('.')
}

/**
 * O texto pode trazer mais de um domínio — o modelo devolveu
 * "agenciapx.com / agenciapixel.digital" num campo só. Extrai todos.
 */
export function dominiosEm(texto) {
  const achados = String(texto || '').match(/[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+/gi) || []
  return [...new Set(achados.map(dominioRaiz).filter(d => d.includes('.')))]
}

/** Mesma empresa? Compara pelo domínio registrável. */
export function mesmoDominio(a, b) {
  const x = dominioRaiz(a), y = dominioRaiz(b)
  return !!x && !!y && x === y
}

/**
 * Separa nome e domínio do que foi digitado numa caixa só.
 *
 * O fluxo do admin tem UM campo. Em 19/08/2026 o Danilo colou
 * "https://www.costclarity.com/pt-BR" e o código jogava o domínio fora
 * (`dominio = null`): a guarda ficou sem referência para conferir, a instrução
 * de identidade caiu na variante fraca, e o diagnóstico voltou sobre a "Cost
 * Clarity" da Arcadis — um produto de custos de CONSTRUÇÃO — em vez do SaaS de
 * cloud da costclarity.com. Dois homônimos, e escolhemos o errado de novo.
 *
 * Se o que veio contém domínio, ele é o identificador. O que sobra vira nome.
 */
export function separarAlvo(entrada) {
  const bruto = String(entrada || '').trim()
  if (!bruto) return { nome: '', dominio: null }

  const dominios = dominiosEm(bruto)
  if (!dominios.length) return { nome: bruto, dominio: null }

  const dominio = dominios[0]
  // Sobrou nome legível fora da URL? ("Cost Clarity costclarity.com" → o nome).
  // Se o campo era só a URL, o nome fica vazio e `alvoDoDiagnostico` usa o host.
  const nome = bruto
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+/gi, ' ')
    .replace(/\s+/g, ' ').trim()
  return { nome, dominio }
}

/**
 * O rótulo que vai ao modelo. Com domínio conhecido ele vira o identificador
 * primário e o nome fica como apoio — é o inverso do que a escuta faz, e de
 * propósito: para ACHAR MENÇÃO procura-se pelo nome (ninguém escreve URL num
 * post); para IDENTIFICAR QUAL empresa, só o domínio é não-ambíguo.
 */
export function alvoDoDiagnostico({ nome, dominio } = {}) {
  const h = host(dominio)
  const n = String(nome || '').trim()
  if (h && n) return `${n} (${h})`
  return h || n || ''
}

/**
 * A instrução que amarra o modelo ao sujeito certo.
 *
 * Os DOIS entram como contexto, com hierarquia explícita (decisão do Danilo,
 * 18/08): o domínio decide, o nome ajuda a procurar. Eles divergem com
 * frequência — nome fantasia ≠ razão social ≠ domínio, e o domínio às vezes é
 * uma abreviação que ninguém escreve. Mandar só um dos dois perde informação;
 * mandar os dois sem hierarquia devolve a ambiguidade ao modelo, que foi o que
 * produziu o diagnóstico da empresa errada.
 */
export function instrucaoDeIdentidade({ nome, dominio } = {}) {
  const h = host(dominio)
  const n = String(nome || '').trim()
  if (!h && !n) return ''

  if (!h) {
    return `\n\nIDENTIDADE DO SUJEITO:
O diagnóstico é da empresa "${n}". Não temos o site oficial para desempatar, então:
se houver mais de uma empresa com este nome, NÃO escolha uma por ter mais material —
devolva {"erro_identificacao":"mais de uma empresa atende por ${n}"} e liste no campo
"candidatos" os domínios que você encontrou.`
  }

  return `\n\nIDENTIDADE DO SUJEITO — regra absoluta:
O diagnóstico é da empresa cujo site oficial é ${h}.${n ? ` Ela se apresenta como "${n}".` : ''}

O DOMÍNIO decide, o nome só ajuda a procurar. Os dois podem divergir — nome fantasia,
razão social e domínio raramente coincidem — e nesse caso o domínio prevalece SEMPRE.
Se o material que você achar pelo nome pertencer a outro domínio, ele NÃO é do sujeito:
descarte, por mais abundante ou convincente que seja.

COMECE LENDO ${h} com web_fetch — home, produto, sobre, preços. O site é a fonte
PRIMÁRIA: é a marca falando de si, e é o que fixa de que empresa estamos tratando.
Só depois use o nome para procurar percepção externa, conferindo que cada achado se
refere a ESTA empresa e não a uma homônima.
No JSON, o campo "dominio" deve conter exatamente ${h}.

Pouca coisa pública sobre ${h} NÃO é motivo para desistir: marca pequena ou de nicho
é assim, e isso mesmo é um achado. Com o site lido, diagnostique — declarando em
"base_de_evidencia" o que faltou e baixando a confiança onde for inferência.

Devolva {"erro_identificacao":"não consegui ler ${h}"} SOMENTE se o próprio site
estiver inacessível. Nesse caso é resposta correta; diagnosticar o homônimo nunca é.`
}

/**
 * A guarda. Roda DEPOIS do modelo e ANTES de gravar.
 *
 * @param {{nome?:string, dominio?:string}} alvo  o que a plataforma sabe (verdade)
 * @param {object} parsed                          o que o modelo devolveu
 * @returns {{ok:boolean, verificado:boolean, motivo?:string, esperado?:string, recebido?:string}}
 */
export function conferirIdentidade(alvo, parsed) {
  if (parsed?.erro_identificacao) {
    return { ok: false, verificado: true, motivo: 'modelo não encontrou o sujeito',
             esperado: host(alvo?.dominio), recebido: String(parsed.erro_identificacao) }
  }

  const esperado = dominioRaiz(alvo?.dominio)
  // Sem domínio na entrada não há como conferir. Não inventamos aprovação:
  // devolve verificado: false para quem chama registrar que passou sem prova.
  if (!esperado) return { ok: true, verificado: false, motivo: 'sem domínio de referência na entrada' }

  const recebidos = dominiosEm(parsed?.dominio)
  // Modelo que não declarou domínio não pode ser confrontado — mas também não
  // contradiz. Passa como não-verificado, e o registro guarda a verdade da entrada.
  if (!recebidos.length) return { ok: true, verificado: false, motivo: 'modelo não declarou domínio' }

  if (recebidos.some(d => d === esperado)) return { ok: true, verificado: true }

  return {
    ok: false, verificado: true,
    motivo: 'o diagnóstico é de outra empresa',
    esperado,
    recebido: recebidos.join(', '),
  }
}

/**
 * A identidade que vai para o banco. Da ENTRADA quando ela existe — o modelo
 * pode enriquecer setor e porte, nunca dizer quem é o cliente.
 */
export function identidadeParaGravar(alvo, parsed) {
  const h = host(alvo?.dominio)
  return {
    empresa: (alvo?.nome || '').trim() || parsed?.empresa || 'N/A',
    dominio: h || (dominiosEm(parsed?.dominio)[0] || null),
  }
}
