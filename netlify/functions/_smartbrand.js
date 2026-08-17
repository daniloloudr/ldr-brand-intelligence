// _smartbrand.js — o manual da marca virado documento vivo.
//
// Regra que governa este arquivo: o smartbrand só contém informação REAL,
// tirada do manual. O que o manual não disser fica EM BRANCO e entra na lista
// de lacunas. Por isso o documento é renderizado por código, não por LLM: um
// renderizador não tem como inventar um propósito que ninguém escreveu.
//
// Quem preenche lacuna é o Copiloto, a pedido do cliente. Até lá, branco.

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
   Fonte única: o markdown e a lista de lacunas saem daqui, então nunca
   divergem. `de` é a chave do JSON extraído; cada campo é [chave, rótulo]. */
export const SECOES = [
  {
    titulo: 'Essência', de: 'verbal_identity', campos: [
      ['proposito',        'Propósito'],
      ['missao',           'Missão'],
      ['visao',            'Visão'],
      ['valores',          'Valores'],
      ['manifesto',        'Manifesto'],
      ['tagline',          'Tagline'],
      ['narrativa_origem', 'Narrativa de origem'],
      ['marcos',           'Marcos'],
    ],
  },
  {
    titulo: 'Posicionamento', de: 'verbal_identity', campos: [
      ['posicionamento',   'Posicionamento'],
      ['proposta_valor',   'Proposta de valor'],
      ['mensagem_central', 'Mensagem central'],
      ['publico_alvo',     'Público-alvo'],
      ['personas',         'Personas'],
      ['arquetipo',        'Arquétipo'],
    ],
  },
  {
    titulo: 'Voz', de: 'verbal_identity', campos: [
      ['tom_voz',                'Tom de voz'],
      ['tom_atributos',          'Atributos do tom'],
      ['tom_evitar',             'O que evitar'],
      ['personalidade',          'Personalidade'],
      ['vocabulario_aprovado',   'Vocabulário aprovado'],
      ['termos_proprios',        'Termos próprios'],
      ['vocabulario_proibido',   'Vocabulário proibido'],
      ['situacoes',              'Como falar em cada situação'],
      ['exemplos_headlines',     'Headlines de referência'],
      ['exemplos_ctas',          'CTAs de referência'],
      ['boilerplate',            'Boilerplate'],
    ],
  },
  {
    titulo: 'Identidade visual', de: 'visual_identity', campos: [
      ['logos',                'Logos'],
      ['area_protecao',        'Área de proteção'],
      ['tamanho_minimo',       'Tamanho mínimo'],
      ['usos_proibidos',       'Usos proibidos'],
      ['paleta',               'Paleta'],
      ['tipo_principal_nome',  'Tipografia principal'],
      ['tipo_principal_uso',   'Uso da tipografia principal'],
      ['tipo_secundario_nome', 'Tipografia secundária'],
      ['tipo_hierarquia',      'Hierarquia tipográfica'],
      ['icone_estilo',         'Estilo de ícones'],
      ['ilustracao_estilo',    'Estilo de ilustração'],
      ['foto_mood',            'Mood fotográfico'],
      ['foto_do',              'Fotografia — fazer'],
      ['foto_dont',            'Fotografia — não fazer'],
      ['grid_descricao',       'Grid'],
      ['aplicacoes',           'Aplicações'],
    ],
  },
  /* O manual diz duas coisas: o que está escrito e o que está mostrado. Esta
     seção é a segunda — a descrição do que se vê aplicado nas páginas. É o
     que responde "com o que esta marca se parece", que é o que o Studio e o
     Copiloto precisam para gerar peça on-brand. Continua sendo informação
     real (sai da página), mas é LEITURA, não citação — e o cabeçalho da seção
     diz isso, para ninguém confundir descrição com regra escrita. */
  {
    titulo: 'Leitura visual', de: 'visual_reading',
    nota: 'Descrição do que as páginas do manual **mostram** aplicado — observação, não texto citado.',
    campos: [
      ['assinatura_visual',        'Assinatura visual'],
      ['uso_do_logo',              'O logo, aplicado'],
      ['uso_da_cor',               'A cor, em proporção'],
      ['uso_da_tipografia',        'A tipografia, em uso'],
      ['tratamento_fotografico',   'Tratamento fotográfico'],
      ['ilustracao_e_grafismos',   'Ilustração e grafismos'],
      ['composicao_e_layout',      'Composição e layout'],
      ['densidade_e_respiro',      'Densidade e respiro'],
      ['aplicacoes_observadas',    'Peças aplicadas', renderAplicacoes],
      ['recorrencias',             'O que se repete'],
      ['contrastes_com_a_regra',   'Onde o mostrado diverge do escrito'],
    ],
  },
  {
    titulo: 'Sistema de design', de: 'design_system', campos: [
      ['colors',         'Cores'],
      ['neutral_colors', 'Neutros'],
      ['font_sizes',     'Escala tipográfica'],
      ['spacing',        'Espaçamento'],
      ['border_radius',  'Cantos'],
      ['components',     'Componentes'],
      ['accessibility',  'Acessibilidade'],
      ['motion',         'Movimento'],
    ],
  },
]

/* Textos longos merecem página própria — são o que o RAG usa pra imitar a
   voz, e enfiá-los numa lista de bullets destrói a leitura. */
const TEXTOS = { de: 'verbal_identity', campo: 'textos_referencia', titulo: 'Textos de referência' }

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
    const bloco = dados[secao.de] || {}
    const linhas = []
    for (const [chave, rotulo, custom] of secao.campos) {
      total++
      const valor = bloco[chave]
      if (vazio(valor)) {
        lacunas.push({ secao: secao.titulo, campo: `${secao.de}.${chave}`, rotulo })
        linhas.push(`### ${rotulo}\n\n_— em branco —_`)
      } else {
        preenchidos++
        linhas.push(`### ${rotulo}\n\n${custom ? custom(valor) : renderValor(valor)}`)
      }
    }
    const cabecalho = secao.nota ? `## ${secao.titulo}\n\n_${secao.nota}_` : `## ${secao.titulo}`
    partes.push(`${cabecalho}\n\n${linhas.join('\n\n')}`)
  }

  total++
  const textos = dados[TEXTOS.de]?.[TEXTOS.campo]
  if (vazio(textos)) {
    lacunas.push({ secao: TEXTOS.titulo, campo: `${TEXTOS.de}.${TEXTOS.campo}`, rotulo: TEXTOS.titulo })
    partes.push(`## ${TEXTOS.titulo}\n\n_— em branco —_`)
  } else {
    preenchidos++
    partes.push(`## ${TEXTOS.titulo}\n\n${renderTextos(textos)}`)
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
