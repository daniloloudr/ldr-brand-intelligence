import { describe, it, expect, afterEach } from 'vitest'
import { slugify, tenantUrl, getTenantSlug, getRoute } from './helpers.js'

describe('slugify', () => {
  it('normaliza acentos, espaços, símbolos e caixa', () => {
    expect(slugify('Escola da Inteligência')).toBe('escola-da-inteligencia')
    expect(slugify('  Hering!! ')).toBe('hering')
    expect(slugify('Ação & Café')).toBe('acao-cafe')
  })
  it('vazio / null → string vazia', () => {
    expect(slugify('')).toBe('')
    expect(slugify(null)).toBe('')
  })
})

describe('tenantUrl', () => {
  it('monta a URL do subdomínio da marca', () => {
    expect(tenantUrl('hering')).toBe('https://hering.s1ngulr.com')
  })
})

describe('getTenantSlug — resolução por subdomínio', () => {
  const setWin = (hostname, search = '') => { global.window = { location: { hostname, search } } }
  afterEach(() => { delete global.window })

  it('subdomínio de tenant → slug', () => {
    setWin('hering.s1ngulr.com')
    expect(getTenantSlug()).toBe('hering')
  })
  it('domínios de sistema (app/apex/www) → null', () => {
    setWin('app.s1ngulr.com');  expect(getTenantSlug()).toBe(null)
    setWin('www.s1ngulr.com');  expect(getTenantSlug()).toBe(null)
    setWin('s1ngulr.com');      expect(getTenantSlug()).toBe(null)
  })
  it('localhost/preview → null; ?tenant= faz override em dev', () => {
    setWin('localhost');                       expect(getTenantSlug()).toBe(null)
    setWin('localhost', '?tenant=hering');     expect(getTenantSlug()).toBe('hering')
  })
})

describe('getRoute — History API (pathname)', () => {
  const setPath = (pathname) => { global.window = { location: { pathname } } }
  afterEach(() => { delete global.window })

  it('rotas principais', () => {
    setPath('/');                    expect(getRoute()).toBe('login')
    setPath('/login');               expect(getRoute()).toBe('login')
    setPath('/app');                 expect(getRoute()).toBe('app-home')
    setPath('/app/posicionamento');  expect(getRoute()).toBe('posicionamento')
    setPath('/admin');               expect(getRoute()).toBe('admin')
  })
  it('rotas de marca com params', () => {
    setPath('/app/brands/abc/studio/workflow/xyz'); expect(getRoute()).toBe('brands-studio-workflow')
    setPath('/app/brands/abc/assistant');           expect(getRoute()).toBe('brands-assistant')
    setPath('/app/brands/abc');                     expect(getRoute()).toBe('brands-detail')
  })
})
