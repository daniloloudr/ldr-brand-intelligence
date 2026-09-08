// ════════════════════════════════════════════════════════════════════
// seed-ficticia.mjs — semeia a MARÉ ALTA, a empresa fictícia de teste,
// num BRANCH de preview do Supabase. Nunca em produção.
//
// Uso:  npm run branch:subir   (escreve .env.branch)
//       node scripts/seed-ficticia.mjs
//       npm run dev:branch     (a app sobe apontada para o branch)
//
// POR QUE O GUARDA É PARANOICO: dev e prod são a MESMA instância. Este
// script só roda com .env.branch presente, e recusa se a URL do branch
// for igual à do .env — que é a produção. Idempotente: rodar duas vezes
// não duplica (procura o workspace pelo slug e para).
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'

const lerEnv = (arquivo) => Object.fromEntries(
  readFileSync(arquivo, 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)])
)

if (!existsSync('.env.branch')) {
  console.error('✖ .env.branch não existe. Rode `npm run branch:subir` antes — este seed NÃO roda em produção.')
  process.exit(1)
}
const branch = lerEnv('.env.branch')
const prod = existsSync('.env') ? lerEnv('.env') : {}
if (!branch.SUPABASE_URL || !branch.SUPABASE_SERVICE_KEY) {
  console.error('✖ .env.branch sem SUPABASE_URL/SUPABASE_SERVICE_KEY. Rode `npm run branch:subir` de novo.')
  process.exit(1)
}
if (prod.SUPABASE_URL && branch.SUPABASE_URL === prod.SUPABASE_URL) {
  console.error('✖ RECUSADO: o .env.branch aponta para a MESMA URL do .env — isso é a produção.')
  process.exit(1)
}

const sb = createClient(branch.SUPABASE_URL, branch.SUPABASE_SERVICE_KEY)

// ── A empresa fictícia ──────────────────────────────────────────────
// Domínio .example é reservado pela RFC 2606: nunca resolve, nunca colide
// com marca real — e é por isso que o e-mail de login usa ele.
const EMPRESA = {
  slug: 'mare-alta',
  nome: 'Maré Alta',
  email: 'dono@marealta.example',
  senha: 'MareAlta!teste-2026',
  pessoa: 'Duna Ferreira',
}

const diasAtras = (d, h = 10) => new Date(Date.now() - d * 864e5 - h * 36e5).toISOString()
const falhou = (passo, error) => { console.error(`✖ ${passo}: ${error.message}`); process.exit(1) }

// ── Idempotência: já semeado? ───────────────────────────────────────
{
  const { data } = await sb.from('workspaces').select('id').eq('slug', EMPRESA.slug).maybeSingle()
  if (data) {
    console.log(`✓ workspace "${EMPRESA.slug}" já existe no branch — nada a fazer.`)
    console.log(`  login: ${EMPRESA.email} · senha: ${EMPRESA.senha}`)
    process.exit(0)
  }
}

console.log(`semeando "${EMPRESA.nome}" em ${branch.SUPABASE_URL}…`)

// ── 1 · usuário de login ────────────────────────────────────────────
// email_confirm e SEM must_change_password: entra direto, sem tela forçada.
let userId
{
  const { data, error } = await sb.auth.admin.createUser({
    email: EMPRESA.email,
    password: EMPRESA.senha,
    email_confirm: true,
    user_metadata: { full_name: EMPRESA.pessoa },
  })
  if (error && /already/i.test(error.message)) {
    const { data: lista } = await sb.auth.admin.listUsers()
    userId = lista?.users?.find(u => u.email === EMPRESA.email)?.id
  } else if (error) falhou('criar usuário', error)
  else userId = data.user.id
}
console.log('  ✓ usuário de login')

// ── 2 · workspace + participação (dona, com as duas capacidades) ────
const { data: ws, error: eWs } = await sb.from('workspaces').insert({
  nome: EMPRESA.nome, slug: EMPRESA.slug, dominio: 'marealta.example',
  setor: 'Moda e Vestuário', porte: '11-50 pessoas', pais: 'BR',
  plano: 'pro', plano_status: 'active', ativo: true,
  creditos_saldo: 5000, creditos_mes: 5000, valor_mensal_centavos: 0,
  creditos_ciclo_reset: new Date(Date.now() + 30 * 864e5).toISOString(),
}).select().single()
if (eWs) falhou('criar workspace', eWs)

{
  const { error } = await sb.from('workspace_members').insert({
    workspace_id: ws.id, user_id: userId, role: 'owner',
    pode_aprovar_pecas: true, pode_aprovar_aprendizado: true,
  })
  if (error) falhou('participação', error)
}
console.log('  ✓ workspace + dona')

// ── 3 · marca + brand book (Culture → Business → Communication) ─────
const { data: marca, error: eMarca } = await sb.from('brands').insert({
  workspace_id: ws.id, nome: EMPRESA.nome, slug: EMPRESA.slug,
}).select().single()
if (eMarca) falhou('criar marca', eMarca)

{
  const { error } = await sb.from('brand_books').insert({
    brand_id: marca.id,
    version: 1,
    verbal_identity: {
      visao: 'Ser a marca de moda praia que prova que estilo e oceano limpo cabem na mesma peça.',
      proposito: 'Vestir quem ama o mar sem sujar o mar.',
      missao: 'Criar moda praia com material recuperado do oceano, produção local e transparência radical de cadeia.',
      valores: ['Oceano primeiro', 'Transparência radical', 'Produção local', 'Design que dura'],
      posicionamento: 'A Maré Alta é a marca de moda praia sustentável para quem quer estilo com procedência: cada peça nasce de rede de pesca e PET recuperados do litoral, costurada por cooperativas de Florianópolis.',
      proposta_valor: 'Biquínis e sungas de alta durabilidade feitos de plástico retirado do mar, com rastreio da origem do fio ao caixa.',
      publico_alvo: 'Mulheres e homens de 25–40 anos, urbanos, praticantes de praia e esportes de água, que já escolhem marcas por valores. Não é para quem busca fast fashion de R$ 39.',
      manifesto: 'A gente cresceu com o pé na areia. E viu a areia mudar. A Maré Alta existe porque a praia que amamos não se defende sozinha — cada peça nossa tira do mar o que não devia estar lá.',
      narrativa_origem: 'Nasceu em 2022 em Florianópolis, quando duas velejadoras transformaram redes de pesca fantasma recolhidas em regata num primeiro lote de 200 biquínis.',
      boilerplate: 'Maré Alta — moda praia feita de oceano limpo. Fio regenerado de redes e PET recuperados do litoral brasileiro, produção em cooperativas locais, rastreio completo.',
      tom_voz: 'Leve, direto e salgado: fala como quem volta do mar. Otimista sem ser ingênuo; ativista sem sermão.',
      personas: [
        { nome: 'Marina, 31', descricao: 'Publicitária, surfa aos fins de semana, paga mais por marca com propósito', dor: 'Não confia em greenwashing', motivacao: 'Provar que consumo pode regenerar' },
        { nome: 'Rafa, 27', descricao: 'Professor de vela, vive de bermuda, compra pouco e usa até gastar', dor: 'Peça técnica durável é cara ou feia', motivacao: 'Durabilidade real' },
      ],
    },
    strategy: {
      meaning: 'Vestir a Maré Alta é declarar de que lado do litoral você está.',
      business_model: 'D2C digital + duas lojas próprias (Floripa e São Paulo) + atacado seletivo para resorts. Margem sustentada por preço premium e recompra.',
      portfolio: 'Linhas Maré (biquínis), Ressaca (sungas e bermudas), Deriva (saídas e camisetas de fio regenerado) e a cápsula anual Rede Viva.',
      goals_kpis: 'Recompra 35% em 12 meses · 8 t de resíduo recuperado/ano · NPS 70+',
      stakeholders: ['clientes', 'cooperativas de costura', 'projetos de limpeza do mar', 'resorts parceiros'],
    },
  })
  if (error) falhou('brand book', error)
}
console.log('  ✓ marca + brand book')

// ── 4 · cérebro: modelo vivo v1 (forma do compileIntel/_brain) ──────
{
  const { error } = await sb.from('brand_intelligence').insert({
    brand_id: marca.id, workspace_id: ws.id, versao: 1,
    confianca_media: 0.72,
    // A forma é a do _brain.js (`gerado_de: { count, tipos, … }`). A Home lê
    // `gerado_de.count` e mostra "?" quando o nome não bate.
    gerado_de: { count: 6, tipos: ['generation_vote', 'writing_edit', 'brandbook_edit'], seed: 'empresa-ficticia' },
    metricas: { sinais_consumidos: 6 },
    modelo: {
      posicionamento: { valor: 'Moda praia com procedência: o oceano limpo é o produto, a peça é a prova.', confianca: 0.8 },
      voz: { valor: 'Leve e salgada, de quem volta do mar — otimista, direta, zero sermão.', confianca: 0.75 },
      territorio: { valor: 'Regeneração do litoral brasileiro — dona da conversa "praia limpa" no vestuário.', confianca: 0.7 },
      preferencias_visuais: {
        aprovado: [
          { padrao: 'Luz natural dura de meio-dia, areia e água reais, sem estúdio', confianca: 0.8 },
          { padrao: 'Paleta azul-profundo + coral + areia crua', confianca: 0.75 },
        ],
        reprovado: [
          { padrao: 'Fundo branco de e-commerce e pose estática de catálogo', confianca: 0.8 },
        ],
      },
      do_dont: {
        do: ['Mostrar a origem do material (rede, PET, cooperativa)', 'Corpo real, gente que usa de verdade'],
        dont: ['Prometer "salvar o planeta"', 'Desconto agressivo — corrói a tese premium'],
      },
      conteudo: {
        temas: ['bastidor da cadeia produtiva', 'ciência do mar acessível', 'vida de praia fora de temporada'],
        angulos: ['a peça conta de onde veio', 'antes/depois do resíduo', 'quem costura aparece'],
      },
      fatos: [
        { fato: 'Conteúdo de bastidor de cooperativa performa 2x acima da média da conta.', confianca: 0.7 },
        { fato: 'A palavra "sustentável" solta, sem prova junto, gera comentário cético.', confianca: 0.65 },
      ],
    },
  })
  if (error) falhou('brand_intelligence', error)
}
console.log('  ✓ cérebro v1')

// ── 5 · sinais não consumidos (dão o que destilar sem inventar escuta) ──
{
  const sinais = [
    { tipo: 'generation_vote', peso: 1, payload: { voto: 'up', resumo: 'Carrossel "de rede a biquíni" aprovado sem edição' }, dias: 2 },
    { tipo: 'generation_vote', peso: 1, payload: { voto: 'down', resumo: 'Imagem com fundo branco reprovada: "parece catálogo"' }, dias: 3 },
    { tipo: 'writing_edit', peso: 1, payload: { resumo: 'Legenda editada para tirar "eco-friendly" e citar a cooperativa' }, dias: 4 },
    { tipo: 'trend', peso: 1, payload: { titulo: 'Verão fora de época', leitura: 'Conteúdo de praia em julho performa por escassez' }, dias: 6 },
  ]
  const { error } = await sb.from('brand_signals').insert(sinais.map(s => ({
    brand_id: marca.id, workspace_id: ws.id, tipo: s.tipo, fonte: 'seed',
    peso: s.peso, payload: s.payload, created_at: diasAtras(s.dias),
  })))
  if (error) falhou('brand_signals', error)
}
console.log('  ✓ 4 sinais não consumidos')

// ── 6 · concorrentes + clipping ─────────────────────────────────────
const { data: rivais, error: eRiv } = await sb.from('concorrentes').insert([
  { workspace_id: ws.id, nome: 'Onda Sul', dominio: 'ondasul.example', ativo: true, dados: { frase: 'Moda praia performance do Sul', territorio: 'esporte de água' } },
  { workspace_id: ws.id, nome: 'Praia Viva', dominio: 'praiaviva.example', ativo: true, dados: { frase: 'Básicos de praia acessíveis', territorio: 'preço' } },
]).select()
if (eRiv) falhou('concorrentes', eRiv)

{
  const { error } = await sb.from('concorrente_clipping').insert([
    { workspace_id: ws.id, concorrente_id: rivais[0].id, titulo: 'Onda Sul lança linha com tecido reciclado', conteudo: 'A Onda Sul anunciou cápsula com 30% de poliéster reciclado, entrando na conversa de sustentabilidade.', fonte: 'seed/imprensa', sentiment: 'neutro', score_impacto: 7, url: 'https://noticias.example/onda-sul-reciclado', created_at: diasAtras(3) },
    { workspace_id: ws.id, concorrente_id: rivais[1].id, titulo: 'Praia Viva abre terceira loja de fábrica', conteudo: 'Aposta em volume e preço baixo se intensifica com nova loja outlet no litoral norte.', fonte: 'seed/imprensa', sentiment: 'neutro', score_impacto: 4, url: 'https://noticias.example/praia-viva-outlet', created_at: diasAtras(5) },
  ])
  if (error) falhou('clipping', error)
}
console.log('  ✓ 2 concorrentes + clipping')

// ── 7 · escuta: termos + eventos COM URL (o invariante da casa) ─────
// A regra aprendida no 1.3: sentimento declarado nunca pode exceder
// eventos com URL no mesmo dia/workspace. Snapshot = contagem real.
{
  const { error } = await sb.from('listening_terms').insert([
    { workspace_id: ws.id, termo: 'Maré Alta moda praia' },
    { workspace_id: ws.id, termo: 'biquíni sustentável' },
  ])
  if (error) falhou('listening_terms', error)
}
{
  const eventos = [
    { conteudo: 'O biquíni da Maré Alta aguentou a temporada inteira de mar grosso. Vale cada centavo.', sentiment: 'positivo', dias: 0 },
    { conteudo: 'Recebi o meu com a etiqueta contando de qual praia veio a rede. Que ideia boa.', sentiment: 'positivo', dias: 0 },
    { conteudo: 'Achei caro. Bonito, mas caro.', sentiment: 'negativo', dias: 0 },
    { conteudo: 'Alguém já comprou da Maré Alta? Quero saber se o tamanho vem certo.', sentiment: 'neutro', dias: 1 },
    { conteudo: 'A cápsula Rede Viva esgotou de novo. Terceira vez que tento.', sentiment: 'neutro', dias: 2 },
  ]
  const { error } = await sb.from('listening_events').insert(eventos.map((e, i) => ({
    workspace_id: ws.id, fonte: 'seed/social', conteudo: e.conteudo,
    sentiment: e.sentiment, score_impacto: 5,
    url: `https://social.example/post/${1000 + i}`, created_at: diasAtras(e.dias, 6),
  })))
  if (error) falhou('listening_events', error)
}
{
  // 3 eventos hoje ⇒ o snapshot de hoje declara 3. Nunca mais que os eventos.
  //
  // ⚠️ `avg_*` é PERCENTUAL 0–100, não fração — é o que o
  // listening-coletar-background grava (Math.round(pos/total*100)), e a Home lê
  // esse campo cru em "{n}% positivo domina". Semear 0.67 aqui pintava "1%" na
  // tela: seed com a forma errada não testa a app, testa outra app.
  const { error } = await sb.from('sentiment_snapshots').insert({
    workspace_id: ws.id, periodo: 'semanal', data: new Date().toISOString().slice(0, 10),
    total_mencoes: 3, positivo_pct: 67, neutro_pct: 0, negativo_pct: 33,
    avg_positivo: 67, avg_neutro: 0, avg_negativo: 33,
  })
  if (error) falhou('sentiment_snapshots', error)
}
console.log('  ✓ escuta (2 termos, 5 eventos com URL, 1 snapshot)')

// ── 8 · leituras prontas: insights, tendências, síntese de mercado ──
{
  // batch_id é NOT NULL: os insights nascem em lote (um batch por rodada do cron).
  const batch = crypto.randomUUID()
  const { error } = await sb.from('consumer_insights').insert([
    { workspace_id: ws.id, batch_id: batch, tipo: 'elogio', titulo: 'Durabilidade vira argumento espontâneo', insight: 'Clientes citam resistência das peças sem serem perguntados — o "dura de verdade" já é percepção.', acao: 'Transformar relatos reais de durabilidade em série de conteúdo.', persona: 'Rafa, 27', evidencias: 2 },
    { workspace_id: ws.id, batch_id: batch, tipo: 'atrito', titulo: 'Preço sem contexto gera objeção', insight: 'Quando o preço aparece longe da história do material, a reação é "caro". Perto da procedência, a objeção some.', acao: 'Nunca mostrar preço sem a origem do fio na mesma peça de conteúdo.', persona: 'Marina, 31', evidencias: 1 },
    { workspace_id: ws.id, batch_id: batch, tipo: 'oportunidade', titulo: 'Dúvida de tamanho é pergunta pública', insight: 'Gente pergunta em rede social se "o tamanho vem certo" — sinal de guia de medidas fraco no site.', acao: 'Publicar guia de medidas em vídeo com corpo real.', persona: 'Marina, 31', evidencias: 1 },
  ])
  if (error) falhou('consumer_insights', error)
}
{
  const { error } = await sb.from('tendencias').insert([
    { workspace_id: ws.id, titulo: 'Rastreabilidade como prova, não promessa', conteudo: 'Marcas de moda passam a publicar a cadeia inteira por QR code na etiqueta; o consumidor cético audita.', categoria: 'consumo consciente', relevancia: 9, horizonte: 'agora', como_surfar: 'A etiqueta que conta a praia de origem já faz isso — elevar a QR code com a jornada completa do fio.', fonte: 'seed/radar', url: 'https://radar.example/rastreabilidade' },
    { workspace_id: ws.id, titulo: 'Verão o ano inteiro no conteúdo', conteudo: 'Conteúdo de praia fora de temporada cresce por escassez de oferta e audiência saudosa.', categoria: 'comportamento', relevancia: 7, horizonte: '3-6 meses', como_surfar: 'Série "praia de julho" com bastidores de cooperativa no inverno.', fonte: 'seed/radar', url: 'https://radar.example/verao-o-ano-todo' },
  ])
  if (error) falhou('tendencias', error)
}
{
  const { error } = await sb.from('market_sinteses').insert({
    workspace_id: ws.id, janela_dias: 7, mencoes: 5,
    bullets: [
      'Concorrência entra na pauta sustentável (Onda Sul, 30% reciclado) — a régua de prova sobe.',
      'Preço segue sendo a objeção nº 1, mas só quando descolado da procedência.',
      'Esgotamento recorrente da cápsula Rede Viva indica demanda reprimida no premium.',
    ],
    para_marca: 'A vantagem da Maré Alta não é dizer que é sustentável — é PROVAR com rastreio. Enquanto o rival fala em % de poliéster, a marca mostra a praia de origem. Dobrar a aposta em prova visível.',
  })
  if (error) falhou('market_sinteses', error)
}
console.log('  ✓ 3 insights, 2 tendências, 1 síntese de mercado')

console.log(`
✓ "${EMPRESA.nome}" semeada no branch.

  login:  ${EMPRESA.email}
  senha:  ${EMPRESA.senha}

  npm run dev:branch   → sobe a app contra o branch
  npm run branch:matar → apaga tudo quando terminar (cobra por hora)
`)
