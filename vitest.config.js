import { defineConfig } from 'vitest/config'

// Config de teste separada do vite.config (que cuida do build). Ambiente node —
// as funções puras (créditos) e as de window são testadas com stub de window.
export default defineConfig({
  test: {
    include: ['**/*.test.js'],
    // .netlify = artefatos do netlify dev (cópias serve); dist = build. Fora.
    exclude: ['node_modules', 'dist', '.netlify'],
    environment: 'node',
    // As background functions derivam o segredo do porteiro da service key
    // (ver _interno.js). Sem ela no ambiente, todo handler responde 500 e o
    // teste falha por configuração, não por defeito. Valor FICTÍCIO de propósito:
    // a guarda de segredos reprova chave real escrita em arquivo rastreado.
    env: {
      SUPABASE_SERVICE_KEY: 'service-key-ficticia-de-teste',
      SUPABASE_URL: 'https://projeto-ficticio-de-teste.supabase.co',
    },
  },
})
