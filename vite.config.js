import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// A chave da Anthropic no proxy de DEV. Em produção quem assina a chamada é a
// função Netlify; em dev o cliente fala com /api/v1/messages, e sem este header
// a Anthropic devolve "x-api-key header is required" — o Copiloto ficava mudo
// em `npm run dev`. loadEnv com prefixo '' lê o .env inteiro, não só VITE_*.
// Isto roda no Node do vite: a chave NÃO entra no bundle do cliente.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  plugins: [react({ include: /\.(jsx|js)$/ })],
  build: {
    rollupOptions: {
      output: {
        // Separa os vendors pesados do bundle principal (index) — chunks próprios,
        // cacheáveis. Ordem importa: @mui/@emotion e @xyflow (que contêm "react" no
        // path) são checados ANTES do react-vendor pra não caírem no chunk errado.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@mui') || id.includes('@emotion')) return 'mui'
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('victory') || id.includes('react-smooth')) return 'charts'
          if (id.includes('@xyflow')) return 'flow'
          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('canvg')) return 'pdf'
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/') || id.includes('react-is')) return 'react-vendor'
          return 'vendor'
        },
      },
    },
  },
  server: {
    proxy: {
      '/.netlify': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
      '/api': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
        headers: {
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'prompt-caching-2024-07-31',
          'anthropic-dangerous-direct-browser-access': 'true',
          ...(env.ANTHROPIC_KEY ? { 'x-api-key': env.ANTHROPIC_KEY } : {}),
        },
      },
    },
  },
  }
})
