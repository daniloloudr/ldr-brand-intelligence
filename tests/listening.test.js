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
