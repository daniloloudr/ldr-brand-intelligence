// ════════════════════════════════════════════════════════════════════
// Segredo escrito no código reprova o BUILD INTEIRO no Netlify.
//
// 19/08/2026: o merge para produção falhou com "exit code 2" e a causa levou
// meia hora para aparecer, porque o log do build não é acessível pela API —
// o scanner de segredos achou a URL do projeto Supabase escrita em três
// scripts arquivados. Não era vazamento real (essa URL vai no bundle do
// cliente como VITE_SUPABASE_URL), mas o scanner compara com as variáveis
// configuradas e barra. E build barrado = correção que não chega em produção.
//
// A regra aqui é mais estrita que a do Netlify de propósito: valor de variável
// de ambiente não se escreve em arquivo rastreado, ponto. Ler do ambiente
// custa uma linha; descobrir isso pelo deploy custa o dia.
// ════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const rastreados = () =>
  execSync('git ls-files', { encoding: 'utf8' }).trim().split('\n').filter(Boolean)

// Binários e afins não interessam (e não são texto).
const IGNORA = /\.(png|jpe?g|gif|webp|svg|ico|pdf|woff2?|ttf|eot|zip|mp4|csv)$/i

const conteudo = () =>
  rastreados()
    .filter(a => !IGNORA.test(a))
    .map(a => { try { return [a, readFileSync(a, 'utf8')] } catch { return null } })
    .filter(Boolean)

describe('nenhum segredo escrito em arquivo rastreado', () => {
  it('não tem URL de projeto Supabase literal (o que reprovou o build de 19/08)', () => {
    // Qualquer subdomínio de projeto — não fixa o nosso, senão o teste morre
    // junto com a instância e para de proteger na próxima.
    const culpados = conteudo()
      .filter(([a]) => !a.startsWith('tests/'))         // este arquivo descreve o padrão
      .filter(([, t]) => /https?:\/\/[a-z0-9]{15,}\.supabase\.co/i.test(t))
      .map(([a]) => a)
    expect(culpados, `URL de projeto Supabase literal em: ${culpados.join(', ')} — use process.env.SUPABASE_URL`).toEqual([])
  })

  it('não tem chave de serviço, JWT nem chave de provedor literal', () => {
    const PADROES = [
      [/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./, 'JWT (anon/service key do Supabase)'],
      [/\bsk-ant-[A-Za-z0-9_-]{20,}/, 'chave da Anthropic'],
      [/\bsk_live_[A-Za-z0-9]{20,}/, 'chave viva da Stripe'],
      [/\bnfp_[A-Za-z0-9]{30,}/, 'token do Netlify'],
      // FAL_KEY: <uuid>:<hex32> — formato próprio, não casa com os de cima
      [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{32}\b/, 'chave da fal'],
    ]
    const achados = []
    for (const [arquivo, texto] of conteudo()) {
      if (arquivo.startsWith('tests/')) continue
      for (const [re, nome] of PADROES) if (re.test(texto)) achados.push(`${arquivo} → ${nome}`)
    }
    expect(achados, `segredo literal em: ${achados.join(' | ')}`).toEqual([])
  })
})
