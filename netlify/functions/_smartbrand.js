// _smartbrand.js — o manual da marca virado documento vivo.
//
// Regra que governa este arquivo: o smartbrand só contém informação REAL,
// tirada do manual. O que o manual não disser fica EM BRANCO e entra na lista
// de lacunas. Por isso o documento é renderizado por código, não por LLM: um
// renderizador não tem como inventar um propósito que ninguém escreveu.
//
// Quem preenche lacuna é o Copiloto, a pedido do cliente. Até lá, branco.

import { SECOES_DA_MARCA } from '../../src/lib/campos.js'

/* ─── O que é "vazio" ────────────────────────────────────────────────
   O prompt de extração mostra esqueletos de array ([{ ano: "", ... }]) e o
   modelo às vezes devolve o esqueleto de volta com tudo em branco. Um
   `.length` ingênuo leria isso como preenchido — e a lacuna sumiria do
   relatório justo onde ela importa. Daí a checagem ser recursiva. */
export const vazio = (v) => {
  if (v === null || v === undefined) return true
  if (typeof v === 'string')  return v.trim() === ''
  if (typeof v === 'number')  return false
  if (typeof v === 'boolean') return false
  if (Array.isArray(v))       return v.every(vazio)
  if (typeof v === 'object')  return Object.values(v).every(vazio)
  return true
}

/* ─── Estrutura do documento ─────────────────────────────────────────
   As seções de texto vêm do MESMO mapa que desenha as telas
   (src/lib/campos.js). É o que faz a tese fechar: o smartbrand contém tudo o
   que o produto sinaliza como parte da marca — nem um campo a mais, nem um a
   menos. Antes eram duas listas escritas à mão que já divergiam: jornada do
   cliente, UX, portfólio e modelo de negócio existiam na tela e não no
   documento, e o sistema de design existia no documento sem ter onde ser
   editado.

   O que o mapa NÃO cobre são as seções cuja edição ainda vive em telas
   próprias (identidade visual, sistema de design) e a leitura visual, que não
   é campo: é observação da extração. Essas ficam declaradas abaixo, no mesmo
   formato. */
// Alguns campos pedem leitura própria. O mapa diz QUE campo existe; aqui se
// diz COMO ele se lê no documento — textos integrais não cabem em bullet.
const RENDER_ESPECIAL = { 'verbal_identity.textos_referencia': (v) => renderTextos(v) }

const daTela = SECOES_DA_MARCA.map(s => ({
  titulo: s.label,
  campos: s.mapa.filter(c => c.k)
    .map(c => [c.col, c.k, c.label, RENDER_ESPECIAL[`${c.col}.${c.k}`]]),
}))

export const SECOES = [
  ...daTela,
  {
    titulo: 'Identidade visual',
    campos: [
      ['visual_identity', 'logos',                'Logos'],
      ['visual_identity', 'area_protecao',        'Área de proteção'],
      ['visual_identity', 'tamanho_minimo',       'Tamanho mínimo'],
      ['visual_identity', 'usos_proibidos',       'Usos proibidos'],
      ['visual_identity', 'paleta',               'Paleta'],
      ['visual_identity', 'tipo_principal_nome',  'Tipografia principal'],
      ['visual_identity', 'tipo_principal_uso',   'Uso da tipografia principal'],
      ['visual_identity', 'tipo_secundario_nome', 'Tipografia secundária'],
      ['visual_identity', 'tipo_hierarquia',      'Hierarquia tipográfica'],
      ['visual_identity', 'icone_estilo',         'Estilo de ícones'],
      ['visual_identity', 'ilustracao_estilo',    'Estilo de ilustração'],
      ['visual_identity', 'foto_mood',            'Mood fotográfico'],
      ['visual_identity', 'foto_do',              'Fotografia — fazer'],
      ['visual_identity', 'foto_dont',            'Fotografia — não fazer'],
      ['visual_identity', 'grid_descricao',       'Grid'],
      ['visual_identity', 'aplicacoes',           'Aplicações'],
    ],
  },
  {
    titulo: 'Leitura visual',
    nota: 'Descrição do que as páginas do manual **mostram** aplicado — observação, não texto citado.',
    campos: [
      ['visual_reading', 'assinatura_visual',      'Assinatura visual'],
      ['visual_reading', 'uso_do_logo',            'O logo, aplicado'],
      ['visual_reading', 'uso_da_cor',             'A cor, em proporção'],
      ['visual_reading', 'uso_da_tipografia',      'A tipografia, em uso'],
      ['visual_reading', 'tratamento_fotografico', 'Tratamento fotográfico'],
      ['visual_reading', 'ilustracao_e_grafismos', 'Ilustração e grafismos'],
      ['visual_reading', 'composicao_e_layout',    'Composição e layout'],
      ['visual_reading', 'densidade_e_respiro',    'Densidade e respiro'],
      ['visual_reading', 'aplicacoes_observadas',  'Peças aplicadas', renderAplicacoes],
      ['visual_reading', 'recorrencias',           'O que se repete'],
      ['visual_reading', 'contrastes_com_a_regra', 'Onde o mostrado diverge do escrito'],
    ],
  },
  {
    titulo: 'Sistema de design',
    campos: [
      ['design_system', 'colors',         'Cores'],
      ['design_system', 'neutral_colors', 'Neutros'],
      ['design_system', 'font_sizes',     'Escala tipográfica'],
      ['design_system', 'spacing',        'Espaçamento'],
      ['design_system', 'border_radius',  'Cantos'],
      ['design_system', 'components',     'Componentes'],
      ['design_system', 'accessibility',  'Acessibilidade'],
      ['design_system', 'motion',         'Movimento'],
    ],
  },
]

/* ─── Renderização de valor ──────────────────────────────────────────
   Genérica de propósito: 60 formatadores à mão envelheceriam mal e o
   esquema de extração muda com frequência. */
const rotular = (k) => k.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())

const linhaObjeto = (o) =>
  Object.entries(o)
    .filter(([, v]) => !vazio(v))
    .map(([k, v]) => `**${rotular(k)}:** ${Array.isArray(v) ? v.filter(x => !vazio(x)).join(', ') : v}`)
    .join(' · ')

const renderValor = (v) => {
  if (typeof v === 'string' || typeof v === 'number') return String(v).trim()
  if (Array.isArray(v)) {
    return v.filter(x => !vazio(x))
      .map(x => `- ${typeof x === 'object' ? linhaObjeto(x) : String(x).trim()}`)
      .join('\n')
  }
  if (typeof v === 'object') {
    return Object.entries(v).filter(([, x]) => !vazio(x))
      .map(([k, x]) => `- **${rotular(k)}:** ${x}`).join('\n')
  }
  return ''
}

/* Declaração de função (não arrow) porque SECOES, lá em cima, guarda a
   referência — hoisting resolve a ordem. O corpo só roda na renderização. */
function renderAplicacoes(lista) {
  // O modelo nem sempre respeita a forma do esquema — às vezes devolve uma
  // string onde pedimos lista. Melhor renderizar torto do que quebrar.
  if (!Array.isArray(lista)) return renderValor(lista)
  return lista.filter(a => !vazio(a)).map(a => {
    const cabeca = [a.peca || 'Peça', a.pagina && `— p. ${a.pagina}`].filter(Boolean).join(' ')
    const detalhe = linhaObjeto({
      cores_dominantes:     a.cores_dominantes,
      tipografia_aparente:  a.tipografia_aparente,
      composicao:           a.composicao,
    })
    return `**${cabeca}**\n\n${String(a.descricao || '').trim()}${detalhe ? `\n\n${detalhe}` : ''}`
  }).join('\n\n')
}

const renderTextos = (lista) => Array.isArray(lista)
  ? lista.filter(t => !vazio(t?.texto)).map(t => {
    const cabeca = [t.titulo, t.tipo && `(${t.tipo})`, t.publico && `· público: ${t.publico}`]
      .filter(Boolean).join(' ')
      return `### ${cabeca || 'Texto de referência'}\n\n${String(t.texto).trim()}${t.notas ? `\n\n_${t.notas}_` : ''}`
    }).join('\n\n')
  : renderValor(lista)

/* ─── Documento ──────────────────────────────────────────────────────
   Devolve { markdown, lacunas, preenchidos, total }. As lacunas aparecem
   DENTRO do documento (não só no rodapé): quem lê precisa ver o buraco no
   lugar onde ele está, senão o documento parece completo. */
export function renderSmartbrand(extraido, { marca = 'Marca', fonte = 'manual da marca', data = null } = {}) {
  const dados = extraido || {}
  const lacunas = []
  const partes = []

  const quando = data || new Date().toISOString().slice(0, 10)
  partes.push(`# ${marca} — smartbrand`)
  partes.push(
    `> Gerado a partir do ${fonte} em ${quando}, em duas leituras: o que o manual ` +
    `**escreve** e o que ele **mostra** aplicado.\n` +
    `> Contém **apenas** o que veio do manual. Campo em branco é lacuna conhecida, ` +
    `não descuido — o Copiloto pode ajudar a preencher quando você quiser.`
  )

  let preenchidos = 0
  let total = 0

  for (const secao of SECOES) {
    const linhas = []
    for (const [col, chave, rotulo, custom] of secao.campos) {
      total++
      const valor = dados[col]?.[chave]
      if (vazio(valor)) {
        // O endereço da lacuna é o mesmo que a tela usa como âncora
        // (`data-campo`) e que a pendência usa para navegar. Três lugares, um
        // identificador.
        lacunas.push({ secao: secao.titulo, campo: `${col}.${chave}`, rotulo })
        linhas.push(`### ${rotulo}\n\n_— em branco —_`)
      } else {
        preenchidos++
        linhas.push(`### ${rotulo}\n\n${custom ? custom(valor) : renderValor(valor)}`)
      }
    }
    const cabecalho = secao.nota ? `## ${secao.titulo}\n\n_${secao.nota}_` : `## ${secao.titulo}`
    partes.push(`${cabecalho}\n\n${linhas.join('\n\n')}`)
  }

  partes.push(
    lacunas.length
      ? `## Lacunas (${lacunas.length} de ${total})\n\n` +
        lacunas.map(l => `- **${l.rotulo}** — ${l.secao}`).join('\n') +
        `\n\nNada aqui foi inventado. Peça ao Copiloto pra trabalhar qualquer um destes pontos.`
      : `## Lacunas\n\nNenhuma: o manual cobriu todos os campos que o smartbrand acompanha.`
  )

  return { markdown: partes.join('\n\n'), lacunas, preenchidos, total }
}
