// ════════════════════════════════════════════════════════════════════
// O FORMATO ESCOLHIDO CHEGA AO MODELO — sempre, por um veículo ou outro.
//
// Medido em produção (11/set): um pedido de `1:1` no GPT Image voltou
// 1920×2720, e um de `16:9` voltou 800×832. Não era o modelo desobedecendo:
// em edição, quem estava fora do `EDIT_ACCEPTS_ASPECT` não recebia
// `aspect_ratio` NEM `image_size`. O default do `image_size` na fal é `"auto"`,
// documentado como "infer from input images" — então a saída herdava o tamanho
// da REFERÊNCIA, e o formato escolhido era descartado sem erro nenhum.
//
// O comentário antigo do código descrevia isso como comportamento aceito
// ("os demais inferem o tamanho da imagem de entrada"). Era o defeito narrado
// como se fosse decisão — a mesma família do `if (!token) return 401` que custou
// três dias, e do "bloco que falha vira lacuna" que apagou o brand book.
//
// Este teste não confere o payload de um modelo: varre o CATÁLOGO inteiro.
// Modelo novo entra sem formato e o teste fica vermelho.
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { submitImageJob, pxDaProporcao } from '../netlify/functions/_image.js'
import { IMAGE_MODELS, FORMATOS } from '../src/lib/studioModels.js'

const REFS = ['https://r2/base.png', 'https://r2/still.png']

let corpo
beforeEach(() => {
  corpo = null
  global.fetch = vi.fn(async (_u, init) => {
    corpo = JSON.parse(init.body)
    return { ok: true, json: async () => ({ request_id: 'req' }) }
  })
})
afterEach(() => { vi.restoreAllMocks() })

// Os de schema próprio retornam ANTES da montagem genérica: try-on, layerize,
// relight e product-shot têm campos próprios e recusam os comuns.
const PROPRIOS = /vto|fashn|layerize|iclight|product-shot/
const doCatalogo = IMAGE_MODELS.filter(m => m.id !== 'auto' && !PROPRIOS.test(m.id))

describe('a proporção sempre chega ao modelo', () => {
  it.each(doCatalogo.filter(m => m.refs).map(m => [m.label, m.id]))(
    'em EDIÇÃO: %s', async (_l, id) => {
      await submitImageJob({ model: id, prompt: 'peça', references: REFS, format: '1:1' })
      const temAR = typeof corpo.aspect_ratio === 'string'
      const temPx = corpo.image_size && Number(corpo.image_size.width) > 0
      expect(temAR || temPx,
        `${id} saiu sem formato: o tamanho viria da imagem de referência`).toBe(true)
    })

  it.each(doCatalogo.map(m => [m.label, m.id]))('em t2i: %s', async (_l, id) => {
    await submitImageJob({ model: id, prompt: 'peça', references: [], format: '16:9' })
    const temAR = typeof corpo.aspect_ratio === 'string'
    const temPx = corpo.image_size && Number(corpo.image_size.width) > 0
    expect(temAR || temPx, `${id} saiu sem formato em t2i`).toBe(true)
  })
})

describe('o caso que originou o defeito', () => {
  it('GPT Image em edição recebe px, não fica sem nada', async () => {
    await submitImageJob({ model: 'openai/gpt-image-2', prompt: 'p', references: REFS, format: '1:1' })
    expect(corpo.image_size).toEqual({ width: 1024, height: 1024 })
  })

  it('quem aceita o atalho continua recebendo aspect_ratio', async () => {
    await submitImageJob({ model: 'fal-ai/gemini-25-flash-image', prompt: 'p', references: REFS, format: '1:1' })
    expect(corpo.aspect_ratio).toBe('1:1')
    expect(corpo.image_size).toBeUndefined()
  })

  it('"Personalizado (px)" vence os dois — é px exato, não proporção', async () => {
    await submitImageJob({
      model: 'openai/gpt-image-2', prompt: 'p', references: REFS,
      format: '1720x2432', extra: { image_size: { width: 1720, height: 2432 } },
    })
    expect(corpo.image_size).toEqual({ width: 1720, height: 2432 })
    expect(corpo.aspect_ratio).toBeUndefined()
  })
})

describe('a conversão de proporção em pixels', () => {
  it('a base fica no lado MENOR, para trocar de modelo não mudar o tamanho', () => {
    expect(pxDaProporcao('1:1')).toEqual({ width: 1024, height: 1024 })
    expect(pxDaProporcao('16:9')).toEqual({ width: 1820, height: 1024 })
    expect(pxDaProporcao('9:16')).toEqual({ width: 1024, height: 1820 })
    expect(pxDaProporcao('4:5')).toEqual({ width: 1024, height: 1280 })
  })

  it('cobre TODO formato que a tela oferece', () => {
    // Formato novo no seletor sem px correspondente voltaria a cair no "auto".
    for (const f of FORMATOS) {
      const px = pxDaProporcao(f.v)
      expect(px, `o formato "${f.v}" da tela não converte em px`).not.toBeNull()
      expect(px.width).toBeGreaterThan(0)
      expect(px.height).toBeGreaterThan(0)
    }
  })

  it('devolve null para o que não é proporção, em vez de inventar', () => {
    // "1080x1350" é px do nó Personalizado, não razão — e `null` aqui é o que
    // deixa o caminho do px exato seguir intacto.
    expect(pxDaProporcao('1080x1350')).toBeNull()
    expect(pxDaProporcao('')).toBeNull()
    expect(pxDaProporcao(null)).toBeNull()
    expect(pxDaProporcao('0:5')).toBeNull()
  })

  it('mantém a proporção pedida, e não só o tamanho', () => {
    const p = pxDaProporcao('16:9')
    expect(p.width / p.height).toBeCloseTo(16 / 9, 2)
  })
})
