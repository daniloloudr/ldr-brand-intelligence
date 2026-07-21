import { defineConfig } from 'vitest/config'

// Config de teste separada do vite.config (que cuida do build). Ambiente node —
// as funções puras (créditos) e as de window são testadas com stub de window.
export default defineConfig({
  test: {
    include: ['**/*.test.js'],
    environment: 'node',
  },
})
