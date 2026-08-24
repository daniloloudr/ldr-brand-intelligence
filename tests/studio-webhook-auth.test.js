// ════════════════════════════════════════════════════════════════════
// O webhook do Studio não pode aceitar POST anônimo.
//
// Ele é um endpoint HTTP público que marca gerações como concluídas — quem
// alcança ele escreve no nosso banco. A proteção existia no código e estava
// desligada na prática: `if (secret && ...)`, com STUDIO_WEBHOOK_SECRET nunca
// definida, e a URL registrada no fal sem o `?s=`. Defesa escrita nos dois
// lados, ligada em nenhum.
//
// Estes testes exercitam o handler de verdade em vez de casar padrão no fonte:
// autenticação é comportamento, e comportamento se prova chamando.
//
// O caso do 200: com body vazio o handler devolve `ok` ANTES de tocar no banco
// (não há request_id), então o teste passa pela porta sem precisar de Supabase.
// É o que queremos medir — que a porta abriu, não o que tem depois dela.
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { handler } from '../netlify/functions/studio-webhook.js'
import { webhookSecret, studioWebhookUrl } from '../netlify/functions/_studio.js'

const ORIGINAL = { ...process.env }

// Sem truque de cache: o segredo é lido do ambiente A CADA chamada, então trocar
// process.env entre os casos basta. Se um dia ele passar a ser calculado no
// carregamento do módulo, estes testes começam a mentir — e é de propósito que
// eles quebrem nesse dia.
const post = (queryStringParameters = {}) =>
  handler({ httpMethod: 'POST', body: '{}', queryStringParameters })

beforeEach(() => {
  process.env.SUPABASE_SERVICE_KEY = 'chave-de-teste-para-derivar-o-segredo'
  process.env.SUPABASE_URL = 'https://exemplo-de-teste.supabase.co'
  delete process.env.STUDIO_WEBHOOK_SECRET
})

afterEach(() => { process.env = { ...ORIGINAL } })

describe('studio-webhook exige segredo', () => {
  it('recusa POST sem segredo nenhum', async () => {
    const res = await post()
    expect(res.statusCode, 'POST anônimo foi aceito — o endpoint está aberto').toBe(401)
  })

  it('recusa POST com segredo errado', async () => {
    expect((await post({ s: 'chute' })).statusCode).toBe(401)
  })

  it('aceita POST com o segredo certo', async () => {
    expect((await post({ s: webhookSecret() })).statusCode).toBe(200)
  })

  it('não aceita método diferente de POST', async () => {
    expect((await handler({ httpMethod: 'GET' })).statusCode).toBe(405)
  })

  it('sem nada de onde derivar segredo, falha fechado (500, não 200)', async () => {
    // Falhar ABERTO aqui seria o defeito original de volta: sem segredo
    // disponível, aceitar todo mundo. Prefere-se quebrar ruidosamente.
    delete process.env.SUPABASE_SERVICE_KEY
    expect((await post({ s: 'qualquer' })).statusCode).toBe(500)
  })
})

describe('os dois lados usam o mesmo segredo', () => {
  it('a URL registrada no fal carrega exatamente o segredo que o handler exige', async () => {
    // O defeito original não era só o `if` frouxo: a URL enviada ao fal não
    // levava `?s=` nenhum. Se alguém tivesse configurado o segredo, o webhook
    // teria passado a recusar TODAS as conclusões — e as gerações ficariam
    // órfãs até o timeout de 10 min do canvas, porque em produção não há poll.
    process.env.URL = 'https://br4ndcode.com'
    process.env.NODE_ENV = 'production'
    const url = studioWebhookUrl()
    expect(url, 'sem URL de webhook em produção a geração nunca é finalizada').toBeTruthy()
    expect(new URL(url).searchParams.get('s')).toBe(webhookSecret())
  })

  it('o segredo é estável entre chamadas e derivado da chave (não é constante no código)', async () => {
    const a = webhookSecret()
    expect(webhookSecret()).toBe(a)
    process.env.SUPABASE_SERVICE_KEY = 'outra-chave-completamente-diferente'
    expect(webhookSecret(), 'o segredo não muda com a chave — está fixo no código?').not.toBe(a)
  })

  it('STUDIO_WEBHOOK_SECRET tem precedência, para permitir rotação', async () => {
    process.env.STUDIO_WEBHOOK_SECRET = 'segredo-rotacionado'
    expect(webhookSecret()).toBe('segredo-rotacionado')
  })

  it('quem dispara usa a URL assinada — ninguém remonta o endereço à mão', () => {
    // Provar que studioWebhookUrl() assina não basta: o defeito volta inteiro se
    // um dispatcher montar a URL sozinho, sem passar por ela. Foi exatamente o
    // que uma mutação da guarda fez, e os testes de comportamento acima não
    // pegaram — eles chamam a função, não os call sites.
    const src = readFileSync('netlify/functions/_studio.js', 'utf8')

    const usos = src.split('const webhookUrl = studioWebhookUrl()').length - 1
    expect(usos, 'imagem e vídeo precisam pegar a URL da mesma função').toBe(2)

    const literais = src.split('functions/studio-webhook').length - 1
    expect(literais, 'o endereço do webhook só pode ser escrito dentro de studioWebhookUrl')
      .toBe(1)
  })
})
