// Frameworks do Writing Room — estruturas guiadas por formato (E1).
// O que vende é o framework, não o gerador: cada formato tem campos mínimos
// e uma estrutura de saída fixa. A voz/território/temas vêm do cérebro
// (system prompt), NUNCA daqui — aqui é só a forma da peça.

export const WRITING_FRAMEWORKS = [
  {
    key: 'legenda',
    label: 'Legenda de post',
    desc: 'Post para feed — gancho, desenvolvimento e CTA no tom da marca.',
    campos: [
      { id: 'tema',     label: 'Tema do post',        placeholder: 'Ex.: bastidores do novo produto', required: true, multiline: true },
      { id: 'canal',    label: 'Canal',               placeholder: 'Instagram, LinkedIn, TikTok…' },
      { id: 'objetivo', label: 'Objetivo / CTA',      placeholder: 'Ex.: levar para o link da bio' },
    ],
    build: c => `Escreva uma LEGENDA DE POST${c.canal ? ` para ${c.canal}` : ''} sobre: "${c.tema}".
${c.objetivo ? `Objetivo/CTA: ${c.objetivo}.` : ''}
Estrutura obrigatória (markdown):
## Gancho
(1ª linha que para o scroll — máx 125 caracteres)
## Legenda
(desenvolvimento curto, 3–6 linhas, quebras de linha generosas, no tom da marca)
## CTA
(1 frase de chamada para ação)
## Hashtags
(5–8, coerentes com a marca — só se o canal for Instagram/TikTok)`,
  },
  {
    key: 'carrossel',
    label: 'Carrossel',
    desc: 'Slide a slide — capa que fisga, uma ideia por slide, CTA no fim.',
    campos: [
      { id: 'tema',     label: 'Tema do carrossel',   placeholder: 'Ex.: 5 erros de posicionamento que custam vendas', required: true, multiline: true },
      { id: 'promessa', label: 'Promessa central',    placeholder: 'O que a pessoa ganha ao ler até o fim' },
      { id: 'slides',   label: 'Nº de slides',        placeholder: '8' },
    ],
    build: c => `Escreva um CARROSSEL de ${c.slides || 8} slides sobre: "${c.tema}".
${c.promessa ? `Promessa central: ${c.promessa}.` : ''}
Estrutura obrigatória (markdown), um bloco por slide:
## Slide 1 — Capa
(título de capa que fisga + subtítulo opcional; máx 8 palavras no título)
## Slide 2..N-1
(cada slide = UMA ideia: título curto + 1–3 linhas de texto)
## Slide final — CTA
(fechamento + chamada para ação clara)
Depois dos slides, adicione:
## Legenda do post
(2–4 linhas + hashtags)`,
  },
  {
    key: 'reel',
    label: 'Roteiro de Reel',
    desc: 'Hook de 3 segundos, blocos com tempo e texto de tela.',
    campos: [
      { id: 'tema',     label: 'Tema do vídeo',       placeholder: 'Ex.: como avaliamos se um criativo está on-brand', required: true, multiline: true },
      { id: 'duracao',  label: 'Duração',             placeholder: '30s' },
      { id: 'objetivo', label: 'Objetivo',            placeholder: 'Ex.: gerar salvamentos / seguir o perfil' },
    ],
    build: c => `Escreva um ROTEIRO DE REEL de ${c.duracao || '30s'} sobre: "${c.tema}".
${c.objetivo ? `Objetivo: ${c.objetivo}.` : ''}
Estrutura obrigatória (markdown):
## Hook (0–3s)
(fala + o que aparece na tela — precisa segurar o dedo)
## Blocos
(cada bloco com marcação de tempo, fala e sugestão de cena/texto na tela)
## CTA final
(fala de fechamento + texto na tela)
## Texto do post
(legenda curta para acompanhar o Reel)`,
  },
  {
    key: 'anuncio',
    label: 'Copy de anúncio',
    desc: '3 variações para Meta Ads — headline, texto principal e CTA.',
    campos: [
      { id: 'oferta',   label: 'Produto / oferta',    placeholder: 'Ex.: consultoria de marca com diagnóstico gratuito', required: true, multiline: true },
      { id: 'publico',  label: 'Público',             placeholder: 'Ex.: fundadores de PMEs de tecnologia' },
      { id: 'objetivo', label: 'Objetivo da campanha', placeholder: 'Conversão, tráfego, reconhecimento…' },
    ],
    build: c => `Escreva COPY DE ANÚNCIO (Meta Ads) para: "${c.oferta}".
${c.publico ? `Público: ${c.publico}.` : ''}${c.objetivo ? ` Objetivo: ${c.objetivo}.` : ''}
Gere EXATAMENTE 3 variações com ângulos diferentes. Estrutura obrigatória (markdown), por variação:
## Variação A/B/C — (nome do ângulo)
**Headline** (máx 40 caracteres)
**Texto principal** (gancho na 1ª linha + 2–4 linhas de corpo)
**Descrição** (máx 30 caracteres)
**CTA sugerido** (botão)`,
  },
  {
    key: 'email',
    label: 'E-mail de marketing',
    desc: 'Assuntos A/B/C, corpo com gancho e CTA único.',
    campos: [
      { id: 'tema',     label: 'Tema / oferta',       placeholder: 'Ex.: convite para o webinar de lançamento', required: true, multiline: true },
      { id: 'objetivo', label: 'Objetivo do e-mail',  placeholder: 'Ex.: inscrições no evento' },
    ],
    build: c => `Escreva um E-MAIL DE MARKETING sobre: "${c.tema}".
${c.objetivo ? `Objetivo: ${c.objetivo}.` : ''}
Estrutura obrigatória (markdown):
## Assuntos
(3 opções A/B/C, máx 50 caracteres cada, ângulos diferentes)
## Preheader
(1 linha)
## Corpo
(gancho de abertura + 2–3 parágrafos curtos + UM único CTA)
## PS
(1 linha que reforça urgência ou benefício)`,
  },
]

export const frameworkByKey = k => WRITING_FRAMEWORKS.find(f => f.key === k) || null
