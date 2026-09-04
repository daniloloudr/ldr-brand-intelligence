// O `?tenant=` é como o app sabe de quem é o workspace em dev e em preview.
// Perdê-lo numa navegação não dá erro: dá app vazio, que parece perda de dado.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { navigate } from '../src/lib/helpers.js'

const irPara = (url) => {
  const u = new URL(url, 'http://localhost')
  delete globalThis.window
  globalThis.window = {
    location: { pathname: u.pathname, search: u.search, hostname: 'localhost' },
    history: { pushState: vi.fn(), replaceState: vi.fn() },
    dispatchEvent: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }
  globalThis.Event = class { constructor(t) { this.type = t } }
}
const destino = () => window.history.pushState.mock.calls.at(-1)?.[1 + 1]

describe('navigate preserva o tenant', () => {
  beforeEach(() => { vi.useFakeTimers() })

  it('acrescenta o tenant quando o destino não tem query', () => {
    irPara('/app?tenant=teste-catalogo')
    navigate('/app/brands/x/studio')
    expect(destino()).toBe('/app/brands/x/studio?tenant=teste-catalogo')
  })

  it('⭐ preserva o tenant mesmo quando o destino JÁ tem query', () => {
    irPara('/app?tenant=teste-catalogo')
    navigate('/app/brands/x/studio/biblioteca?pasta=Lote%20KH6V')
    const d = destino()
    expect(d).toContain('pasta=Lote')
    expect(d).toContain('tenant=teste-catalogo')
  })

  it('não duplica se o destino já traz o tenant', () => {
    irPara('/app?tenant=a')
    navigate('/app/x?tenant=b')
    expect(destino().match(/tenant=/g)).toHaveLength(1)
    expect(destino()).toContain('tenant=b')      // o explícito vence
  })

  it('sem tenant na origem, não inventa', () => {
    irPara('/app')
    navigate('/app/x?pasta=y')
    expect(destino()).toBe('/app/x?pasta=y')
  })

  it('aceita o formato legado com #', () => {
    irPara('/app?tenant=t')
    navigate('#/app/y')
    expect(destino()).toBe('/app/y?tenant=t')
  })
})
