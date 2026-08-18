import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

// A função é um handler de background com efeitos; o que dá para fixar aqui —
// e é o que quebrou — são as duas regras de conteúdo: por qual termo se busca,
// e o que conta como menção.
const fonte = readFileSync('netlify/functions/listening-coletar-background.js', 'utf8')

// Reproduz as regras do arquivo para testá-las sem executar o handler.
const DISCLAIMER = [
  /não (tenho|possui|é possível|foi possível)/i,
  /sem acesso/i,
  /base de conhecimento/i,
  /não (consigo|posso) (acessar|pesquisar|buscar)/i,
  /acesso (em tempo real|direto)/i,
  /nenhuma? (menç|resultado|registro|publicaç)/i,
  /sem (menç|resultado|registro|publicaç)/i,
  /não (foram|foi) encontrad/i,
  /não há (menç|registro|resultado)/i,
  /não retorn/i,
  /presença digital limitada/i,
]
const ehMencao = (t) => !DISCLAIMER.some(p => p.test(t))
const hostDe = (d) => (d || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '')

describe('por qual termo a escuta procura', () => {
  it('o NOME vem antes do domínio', () => {
    // Era `ws.dominio || ws.nome`: a PES foi procurada como
    // "https://www.pesenglish.com.br/" no Instagram e voltou vazia. Ninguém
    // escreve a URL num post.
    expect(fonte).toContain('const marca = ws.nome || ws.dominio')
    expect(fonte).not.toContain('const marca = ws.dominio || ws.nome')
  })

  it('o domínio vira termo secundário, como host limpo', () => {
    expect(hostDe('https://www.pesenglish.com.br/')).toBe('pesenglish.com.br')
    expect(hostDe('http://hering.com.br')).toBe('hering.com.br')
    expect(hostDe('')).toBe('')
  })
})

describe('o que conta como menção', () => {
  it('"procurei e não achei" é resultado, não menção', () => {
    // A PES tinha 19 "menções" e todas eram esta frase, uma por canal, por rodada.
    expect(ehMencao('Nenhuma menção recente encontrada')).toBe(false)
    expect(ehMencao('Sem menções recentes encontradas')).toBe(false)
    expect(ehMencao('Não foram encontradas publicações no período')).toBe(false)
    expect(ehMencao('Não há registros recentes')).toBe(false)
  })

  it('recusa de ferramenta continua sendo descartada', () => {
    expect(ehMencao('Não consigo acessar o Instagram em tempo real')).toBe(false)
    expect(ehMencao('Baseado na minha base de conhecimento')).toBe(false)
  })

  it('menção de verdade passa — inclusive negativa', () => {
    expect(ehMencao('Aluno elogia a metodologia do PES nas escolas')).toBe(true)
    expect(ehMencao('Mãe reclama do atendimento e não recomenda')).toBe(true)
    // A palavra "sem" no meio de uma menção real não pode derrubá-la
    expect(ehMencao('Ensino sem complicação, dizem os professores')).toBe(true)
  })
})

describe('menção precisa ser verificável', () => {
  const temFonte = (url) => /^https?:\/\/\S+$/i.test(String(url || '').trim())

  it('sem URL não é menção — é afirmação que ninguém confere', () => {
    // A PES tinha 10 eventos e ZERO URLs: reclamações de cancelamento que
    // ninguém escreveu, geradas porque o modelo não tinha como pesquisar.
    expect(temFonte(null)).toBe(false)
    expect(temFonte('')).toBe(false)
    expect(temFonte('   ')).toBe(false)
    expect(temFonte('Reclame Aqui')).toBe(false)
    expect(temFonte('https://www.reclameaqui.com.br/empresa/pes/')).toBe(true)
  })

  it('o esquema do prompt não oferece mais url nula', () => {
    // Era `"url":"https://...ou null"` — o modelo aceitava o convite. Confere a
    // LINHA do esquema, não o arquivo: o comentário que explica o bug cita a
    // string antiga e faria o teste passar por engano ao contrário.
    const linhaEsquema = fonte.split('\n').find(l => l.includes('"url":"https'))
    expect(linhaEsquema).toBeTruthy()
    expect(linhaEsquema).not.toMatch(/ou null/)
    expect(fonte).toContain('Sem link verificável, NÃO inclua')
  })
})

describe('coletor sem busca web não coleta', () => {
  it('a escuta usa o tier que tem busca em TODO ambiente', () => {
    // 'standard' desliga a busca em dev: o modelo inventava menções plausíveis
    // para o ramo em vez de procurar as reais.
    expect(fonte).toContain("aiConfig('premium')")
    expect(fonte).not.toContain("aiConfig('standard')")
  })
})

describe('busca aberta por canal', () => {
  it('nenhum canal usa filtro por domínio', () => {
    // `site:twitter.com` devolvia vazio SEMPRE — as redes bloqueiam crawler ou
    // exigem login, então o índice não tem o conteúdo. Medido: com o filtro,
    // 3 buscas e nada; sem ele, o Instagram devolveu 7 menções com permalink.
    const bloco = fonte.slice(fonte.indexOf('const FONTES'), fonte.indexOf('function buildPrompt'))
    expect(bloco).not.toMatch(/site:/)
    expect(bloco).toMatch(/alvo:/)
  })

  it('o prompt proíbe o modelo de restringir por domínio', () => {
    expect(fonte).toMatch(/NÃO restrinja a busca a um domínio/)
  })

  it('a pergunta é sobre PERCEPÇÃO, não sobre menção genérica', () => {
    // A escuta existe para avaliar como a marca é percebida (decisão do Danilo).
    expect(fonte).toMatch(/é percebida em/)
    expect(fonte).toMatch(/Post da\n?\s*própria marca só entra se a reação/)
  })
})
