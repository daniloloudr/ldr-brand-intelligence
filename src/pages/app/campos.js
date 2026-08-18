// campos.js — onde cada campo da marca mora. Um campo, um lugar.
//
// O problema que este arquivo resolve: dez campos apareciam em DUAS telas ao
// mesmo tempo (propósito, missão, visão, valores, posicionamento, proposta de
// valor, personalidade, atributos de tom, personas, público). A pessoa editava
// num lugar, abria o outro e via o mesmo dado com outro rótulo — sem saber qual
// era o certo. E uma pendência que aponta "Visão" não tinha para onde apontar:
// havia duas Visões.
//
// Personas era pior: viviam em COLUNAS diferentes (`strategy.personas` e
// `verbal_identity.personas`), então as duas telas mostravam listas diferentes
// da mesma coisa. Cada uma com dados reais de marcas diferentes.
//
// Agora a estrutura é declarada aqui e as telas são renderizadas a partir dela.
// Duplicar vira impossível por construção: um campo aparece uma vez nesta
// lista, ou não aparece.
//
// A árvore segue o método (Culture → Business → Communication), que é a mesma
// da navegação e a mesma do smartbrand — o que faz a lacuna do manual saber
// para qual aba levar.

export const COL = { verbal: 'verbal_identity', strategy: 'strategy' }

/* Tipos de campo:
   texto  — uma linha
   area   — várias linhas (rows)
   chips  — lista de termos curtos
   itens  — lista de objetos (fields descreve as colunas) */

export const ESSENCIA = [
  { grupo: 'Brand Essence' },
  { col: COL.verbal, k: 'visao', label: 'Visão', tipo: 'area', meia: true,
    ph: 'Onde a marca quer chegar — o futuro que ela persegue' },
  { col: COL.verbal, k: 'proposito', label: 'Propósito', tipo: 'area', meia: true,
    ph: 'Por que a marca existe além do lucro' },
  { col: COL.verbal, k: 'missao', label: 'Missão', tipo: 'area',
    ph: 'O que a marca faz todos os dias para realizar a visão' },
  { col: COL.verbal, k: 'valores', label: 'Valores', tipo: 'chips',
    ph: 'Digite um valor e Enter' },
  { col: COL.verbal, k: 'manifesto', label: 'Manifesto', tipo: 'area', rows: 5,
    ph: 'O texto que a marca assinaria — a declaração de crença dela' },

  { grupo: 'Posicionamento e significado' },
  { col: COL.verbal, k: 'posicionamento', label: 'Posicionamento', tipo: 'area', rows: 4, meia: true,
    ph: 'O lugar que a marca ocupa na mente do público — alimenta toda geração' },
  { col: COL.strategy, k: 'meaning', label: 'Significado', tipo: 'area', rows: 4, meia: true,
    ph: 'O que a marca representa na vida das pessoas, além do que vende' },

  { grupo: 'De onde vem' },
  { col: COL.verbal, k: 'narrativa_origem', label: 'Narrativa de origem', tipo: 'area', rows: 4,
    ph: 'Como a marca nasceu, e por quê' },
  { col: COL.verbal, k: 'boilerplate', label: 'Boilerplate', tipo: 'area', rows: 3,
    ph: 'A descrição padrão da marca — a que vai no rodapé de um release' },
  { col: COL.verbal, k: 'marcos', label: 'Marcos da história', tipo: 'itens',
    addLabel: 'Adicionar marco', vazio: 'Fundação, viradas, rebrands, crises — o que explica a marca de hoje.',
    fields: [
      { key: 'ano', label: 'Ano', ph: '2019' },
      { key: 'titulo', label: 'Título', ph: 'Ex.: primeira loja própria' },
      { key: 'descricao', label: 'O que mudou', multiline: true, ph: 'Por que este momento importa' },
    ] },
]

export const FUNCAO = [
  { grupo: 'O que a marca entrega' },
  { col: COL.verbal, k: 'proposta_valor', label: 'Proposta de valor', tipo: 'area', meia: true,
    ph: 'A promessa central — por que escolher esta marca' },
  { col: COL.strategy, k: 'business_model', label: 'Modelo de negócio', tipo: 'area', meia: true,
    ph: 'Como a marca gera valor e receita' },
  { col: COL.strategy, k: 'portfolio', label: 'Portfólio', tipo: 'area', meia: true,
    ph: 'Produtos e serviços, e como se organizam' },
  { col: COL.strategy, k: 'brand_architecture', label: 'Arquitetura de marca', tipo: 'area', meia: true,
    ph: 'Relação entre marca-mãe, submarcas e produtos' },
  { col: COL.strategy, k: 'stakeholders', label: 'Stakeholders', tipo: 'chips',
    ph: 'Ex.: clientes, investidores, parceiros… (Enter)' },

  { grupo: 'Para quem' },
  { col: COL.verbal, k: 'publico_alvo', label: 'Público-alvo', tipo: 'area', rows: 4,
    ph: 'Quem a marca serve — e, se souber, para quem ela não é' },
  // Canônico: `verbal_identity.personas`. É onde a extração do manual escreve, e
  // o esquema é mais rico para marca (dor, motivação, objeção). O legado em
  // `strategy.personas` é oferecido para mesclar, nunca mesclado sozinho.
  { col: COL.verbal, k: 'personas', label: 'Personas', tipo: 'itens',
    addLabel: 'Adicionar persona', vazio: 'Quem a marca serve — cada persona afia a copy e as peças geradas.',
    fields: [
      { key: 'nome', label: 'Nome / papel', ph: 'Ex.: Marina, head de marketing de PME' },
      { key: 'demografia', label: 'Contexto', multiline: true, ph: 'Onde vive, o que faz, por onde consome' },
      { key: 'dor', label: 'Dor', multiline: true, ph: 'O que tira o sono dela' },
      { key: 'motivacao', label: 'Motivação', multiline: true, ph: 'O que ela quer alcançar' },
      { key: 'objecoes', label: 'Objeções', multiline: true, ph: 'O que a faz hesitar' },
    ] },

  { grupo: 'Onde quer chegar' },
  { col: COL.strategy, k: 'goals_kpis', label: 'Objetivos e indicadores', tipo: 'itens',
    addLabel: 'Adicionar objetivo', vazio: 'Metas da marca e como medi-las.',
    fields: [
      { key: 'objetivo', label: 'Objetivo', ph: 'Ex.: ser referência em Smart Branding no BR' },
      { key: 'kpi', label: 'KPI', ph: 'Ex.: share of search do termo' },
      { key: 'meta', label: 'Meta', ph: 'Ex.: top-3 em 12 meses' },
    ] },
]

export const EXPERIENCIA = [
  { grupo: 'Experiência' },
  { col: COL.strategy, k: 'ux', label: 'UX — princípios de experiência', tipo: 'area', meia: true,
    ph: 'Como deve ser a experiência de usar ou consumir a marca' },
  { col: COL.strategy, k: 'ui', label: 'UI — princípios de interface', tipo: 'area', meia: true,
    ph: 'Diretrizes de interface e interação' },
  { col: COL.strategy, k: 'customer_journey', label: 'Jornada do cliente', tipo: 'area', rows: 5,
    ph: 'Do primeiro contato ao pós-venda, com os momentos-chave da marca' },

  { grupo: 'Design System' },
  { col: COL.strategy, k: 'storybook_url', label: 'Storybook', tipo: 'texto',
    ph: 'https://storybook.suamarca.com' },
  { col: COL.strategy, k: 'design_notes', label: 'Notas de design', tipo: 'area', rows: 2,
    ph: 'Regras extras que o time quer registrar — entram no design.md' },
]

export const PERSONALIDADE = [
  { grupo: 'Quem a marca é quando fala' },
  { col: COL.verbal, k: 'personalidade', label: 'Traços de personalidade', tipo: 'chips',
    ph: 'Ex.: provocadora, direta… (Enter)' },
  { col: COL.verbal, k: 'arquetipo', label: 'Arquétipo', tipo: 'arquetipo' },

  { grupo: 'Tom de voz' },
  { col: COL.verbal, k: 'tom_voz', label: 'Como a marca soa', tipo: 'area', rows: 4,
    ph: 'A descrição do tom — o que faz o texto soar como ela' },
  { col: COL.verbal, k: 'tom_atributos', label: 'Atributos do tom', tipo: 'chips',
    ph: 'Como a personalidade soa (Enter)' },
  { col: COL.verbal, k: 'tom_evitar', label: 'Como NÃO falar', tipo: 'area', rows: 3,
    ph: 'O que soa errado na boca desta marca' },
  { col: COL.verbal, k: 'mensagem_central', label: 'Mensagem central', tipo: 'area', rows: 3,
    ph: 'A frase que resume o que a marca quer que fique na cabeça' },

  { grupo: 'Territórios' },
  { col: COL.strategy, k: 'territorio_notas', label: 'Territórios — notas do time', tipo: 'area',
    ph: 'Direcionamento humano: o que reivindicar, o que evitar' },

  { grupo: 'Storytelling' },
  { col: COL.strategy, k: 'storytelling_overview', label: 'A grande narrativa', tipo: 'area', rows: 4,
    ph: 'O arco que conecta tudo que a marca comunica' },
  { col: COL.strategy, k: 'seasons', label: 'Temporadas narrativas', tipo: 'itens',
    addLabel: 'Adicionar temporada', vazio: 'Capítulos da narrativa ao longo do ano — campanhas com tema próprio.',
    fields: [
      { key: 'nome', label: 'Nome', ph: 'Ex.: Lançamento Writing Room' },
      { key: 'periodo', label: 'Período', ph: 'Ex.: ago–set/2026' },
      { key: 'narrativa', label: 'Narrativa', multiline: true, ph: 'O tema e a mensagem desta temporada' },
    ] },
]

// Expressão verbal: as PALAVRAS da marca. O que ela é e como se comporta está
// nas abas anteriores; aqui é o material pronto que o Estúdio consome.
export const EXPRESSAO_VERBAL = [
  { grupo: 'Assinatura verbal' },
  { col: COL.verbal, k: 'tagline', label: 'Tagline', tipo: 'texto',
    ph: 'A frase que assina a marca' },

  { grupo: 'Vocabulário' },
  { col: COL.verbal, k: 'vocabulario_aprovado', label: 'Vocabulário aprovado', tipo: 'chips',
    ph: 'Palavras que a marca usa (Enter)' },
  { col: COL.verbal, k: 'termos_proprios', label: 'Termos próprios', tipo: 'chips',
    ph: 'Jargão da casa, nomes de produto (Enter)' },
  { col: COL.verbal, k: 'vocabulario_proibido', label: 'Vocabulário proibido', tipo: 'chips',
    ph: 'Palavras que a marca não usa (Enter)' },

  { grupo: 'Texto pronto' },
  { col: COL.verbal, k: 'exemplos_headlines', label: 'Headlines de referência', tipo: 'itens',
    addLabel: 'Adicionar headline', vazio: 'Títulos que já saíram e representam a marca.',
    fields: [
      { key: 'titulo', label: 'Headline', ph: 'O título como foi publicado' },
      { key: 'contexto', label: 'Contexto', ph: 'Onde e para quem' },
    ] },
  { col: COL.verbal, k: 'exemplos_ctas', label: 'CTAs preferidos', tipo: 'itens',
    addLabel: 'Adicionar CTA', vazio: 'As chamadas para ação que a marca usa.',
    fields: [
      { key: 'cta', label: 'CTA', ph: 'Ex.: Comece agora' },
      { key: 'contexto', label: 'Contexto', ph: 'Quando usar' },
    ] },
  { col: COL.verbal, k: 'exemplos_posts', label: 'Posts e e-mails', tipo: 'itens',
    addLabel: 'Adicionar exemplo', vazio: 'Peças escritas que servem de modelo.',
    fields: [
      { key: 'canal', label: 'Canal', ph: 'Ex.: LinkedIn' },
      { key: 'objetivo', label: 'Objetivo', ph: 'Ex.: anúncio de produto' },
      { key: 'texto', label: 'Texto', multiline: true, ph: 'O texto como foi publicado' },
    ] },
  { col: COL.verbal, k: 'textos_referencia', label: 'Textos de referência', tipo: 'itens',
    addLabel: 'Adicionar texto', vazio: 'É deste material que a IA tira a voz — vale colar integral.',
    fields: [
      { key: 'tipo', label: 'Tipo', ph: 'e-mail, blog, anúncio…' },
      { key: 'titulo', label: 'Título', ph: 'Como identificar' },
      { key: 'publico', label: 'Público', ph: 'Para quem foi escrito' },
      { key: 'texto', label: 'Texto', multiline: true, ph: 'Cole o texto integral' },
    ] },

  { grupo: 'Como falar em cada situação' },
  { col: COL.verbal, k: 'situacoes', label: 'Cenários e respostas-modelo', tipo: 'itens',
    addLabel: 'Adicionar situação', vazio: 'Reclamação, crise, lançamento — como a marca responde.',
    fields: [
      { key: 'situacao', label: 'Situação', ph: 'Ex.: cliente reclama publicamente' },
      { key: 'como_falar', label: 'Como falar', multiline: true, ph: 'O caminho certo' },
      { key: 'evitar', label: 'O que evitar', multiline: true, ph: 'O que piora' },
    ] },
]

/** Todos os campos declarados, para conferir que ninguém aparece duas vezes. */
export const TODOS = [...ESSENCIA, ...FUNCAO, ...EXPERIENCIA, ...PERSONALIDADE, ...EXPRESSAO_VERBAL]
  .filter(c => c.k)
