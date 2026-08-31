// ════════════════════════════════════════════════════════════════════
// studio-referencias.test.js — o nó promete, o backend cumpre?
//
// O nó Imagem passou a DIZER ao cliente como cada modelo lê as referências
// conectadas (`comoLeAsRefs` / `planoDeRefs` em src/lib/studioModels.js).
// Promessa na tela que o backend não cumpre é pior que silêncio: antes o
// cliente não sabia, agora ele sabe errado.
//
// Por isso aqui não se faz grep no fonte — executa-se o `submitImageJob` de
// verdade, com o fetch dublado, e afere-se o CORPO que iria ao fal.
//
// Origem (31/ago/2026, reunião Hering): "o sapato não pegou". Havia dois
// sumiços silenciosos empilhados — o teto do canvas (MAX_REFS_CANVAS) e, pior,
// os modelos de endpoint singular, que recebem references[0] e descartam o
// resto sem erro nenhum.
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { submitImageJob } from '../netlify/functions/_image.js'
import { IMAGE_MODELS, refsDoModelo, planoDeRefs, MAX_REFS_CANVAS } from '../src/lib/studioModels.js'

const REFS = ['https://r2/1.png', 'https://r2/2.png', 'https://r2/3.png', 'https://r2/4.png', 'https://r2/5.png']

let ultimoBody
beforeEach(() => {
  ultimoBody = null
  global.fetch = vi.fn(async (_url, init) => {
    ultimoBody = JSON.parse(init.body)
    return { ok: true, json: async () => ({ request_id: 'req-teste' }) }
  })
})
afterEach(() => { vi.restoreAllMocks() })

// Só os modelos que o seletor realmente oferece com referência.
const doCatalogo = IMAGE_MODELS.filter(m => m.id !== 'auto' && m.refs)

describe('o que o nó promete sobre referências é o que o backend faz', () => {
  it.each(doCatalogo.map(m => [m.label, m.id]))('%s', async (_label, id) => {
    await submitImageJob({ model: id, prompt: 'peça', references: REFS })
    const r = refsDoModelo(id)

    if (r.modo === 'uma') {
      // A promessa: "usa só a 1ª — as outras são ignoradas"
      expect(ultimoBody.image_url).toBe(REFS[0])
      expect(ultimoBody.image_urls).toBeUndefined()
    } else if (r.modo === 'papeis') {
      // A promessa: cada posição tem um papel. O corpo tem que ter campos
      // NOMEADOS por papel (não uma lista), e nessa ordem.
      const valores = Object.values(ultimoBody)
      expect(valores).toContain(REFS[0])
      if (r.exatas === 2 || r.max === 2) expect(valores).toContain(REFS[1])
      expect(ultimoBody.image_urls).toBeUndefined()
      // e nunca mais do que os papéis declarados
      expect(valores).not.toContain(REFS[2])
    } else {
      // A promessa: "usa todas, na ordem"
      expect(ultimoBody.image_urls).toEqual(REFS)
      expect(ultimoBody.image_url).toBeUndefined()
    }
  })
})

describe('planoDeRefs — quantas somem, e por culpa de quem', () => {
  it('modelo singular: 5 conectadas, 1 usada, culpa do MODELO', () => {
    const p = planoDeRefs('fal-ai/flux-pro/kontext', 5)
    expect(p.usadas).toBe(1)
    expect(p.ignoradas).toBe(4)
    expect(p.porQue).toBe('modelo')
  })

  it('modelo multi: 11 conectadas, 10 usadas, culpa do NOSSO teto', () => {
    const p = planoDeRefs('bytedance/seedream/v5/pro/text-to-image', 11)
    expect(p.usadas).toBe(MAX_REFS_CANVAS)
    expect(p.ignoradas).toBe(1)
    expect(p.porQue).toBe('canvas')
  })

  it('dentro do teto não acusa corte nenhum', () => {
    const p = planoDeRefs('bytedance/seedream/v5/pro/text-to-image', 3)
    expect(p.ignoradas).toBe(0)
    expect(p.porQue).toBeNull()
  })

  // O teto do canvas não pode passar do PISO dos grandes. Toda a família
  // Seedream para em 10 e, acima disso, fica com as ÚLTIMAS 10 — corta pela
  // FRENTE, ao contrário do nosso slice. Subir para 12 aqui faria a posição 1
  // (a base de casting, no processo da Hering) ser a primeira a sumir, e de
  // novo em silêncio. Passar de 10 exige teto POR MODELO antes.
  it('o teto do canvas não ultrapassa o piso dos grandes (Seedream = 10)', () => {
    expect(MAX_REFS_CANVAS).toBeLessThanOrEqual(10)
  })

  it('try-on com 1 referência avisa que falta a outra (o backend recusa)', () => {
    const p = planoDeRefs('fal-ai/fashn/tryon/v1.6', 1)
    expect(p.faltam).toBe(1)
  })

  // O caso REAL que fechou a decisão (KH6U, 31/08/2026): 5 entradas conectadas,
  // mas bolsa e calçado tinham 2 fotos cada = 7 imagens. Com o teto velho de 5,
  // as duas do calçado nunca saíram do browser — o modelo inventou um sapato
  // porque nunca viu o real. Com 10, as sete chegam.
  it('o caso Hering (KH6U): as 7 imagens chegam ao modelo', () => {
    const p = planoDeRefs('bytedance/seedream/v5/pro/text-to-image', 7)
    expect(p.usadas).toBe(7)
    expect(p.ignoradas).toBe(0)
    expect(p.porQue).toBeNull()
  })
})
