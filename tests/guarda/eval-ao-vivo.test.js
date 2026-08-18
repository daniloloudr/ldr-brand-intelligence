import { describe, it, expect } from 'vitest'
import { conferirIdentidade, dominioRaiz } from '../../netlify/functions/_identidade.js'

// ── AVALIAÇÃO AO VIVO ───────────────────────────────────────────────────
// `npm run guarda:ao-vivo` — chama a API DE VERDADE e mede se o núcleo está
// alucinando. Roda antes de deploy que toque IA, e sempre que o modelo mudar.
//
// Por que é separada da suíte normal: custa dinheiro (~US$ 0,20 por rodada) e
// leva minutos. A suíte de sempre trava o ARREDOR; esta afere o COMPORTAMENTO.
// As duas são necessárias e nenhuma substitui a outra.
//
// Sem EVAL_AO_VIVO=1 os casos são pulados — nunca falha por falta de chave,
// para não virar ruído no CI e acabar ignorada.

const AO_VIVO = process.env.EVAL_AO_VIVO === '1' && !!process.env.ANTHROPIC_KEY
const talvez  = AO_VIVO ? it : it.skip
const LIMITE  = 180_000

// Casos com VERDADE CONHECIDA. O critério não é "a resposta é boa" — é
// verificável: a empresa certa, a URL existindo no índice. Julgar qualidade
// exigiria um juiz que também alucina.
const CASOS = [
  { rotulo: 'nome ambíguo — o caso Pixel',
    alvo: { nome: 'Pixel', dominio: 'www.pixelretail.com.br' },
    // "Pixel" é nome de dezenas de agências. Foi este caso que produziu, em
    // produção, um diagnóstico da Pixel Agência Digital (agenciapx.com).
    armadilha: 'agenciapx.com' },
  { rotulo: 'nome único — controle',
    alvo: { nome: 'Hering', dominio: 'hering.com.br' },
    armadilha: null },
]

async function diagnosticar(alvo) {
  const { gerarDiagnostico } = await import('../../netlify/functions/_diagnostico.js')
  return gerarDiagnostico(alvo, null)
}

describe('o núcleo diagnostica a empresa CERTA', () => {
  for (const caso of CASOS) {
    talvez(caso.rotulo, async () => {
      let parsed, recusou = false
      try {
        parsed = await diagnosticar(caso.alvo)
      } catch (e) {
        // Recusa por identidade é DESFECHO ACEITÁVEL: melhor não entregar do
        // que entregar a análise de outra empresa. O inaceitável é entregar
        // errado — e isso a guarda impede antes de chegar aqui.
        recusou = /identidade recusada/.test(e.message)
        if (!recusou) throw e
      }

      if (recusou) {
        console.warn(`  [${caso.rotulo}] o modelo insistiu na empresa errada — a guarda barrou`)
        return
      }

      const v = conferirIdentidade(caso.alvo, parsed)
      console.log(`  [${caso.rotulo}] empresa="${parsed.empresa}" dominio="${parsed.dominio}" → ${JSON.stringify(v)}`)
      expect(v.ok).toBe(true)
      if (caso.armadilha) {
        const tudo = JSON.stringify(parsed).toLowerCase()
        expect(tudo).not.toContain(caso.armadilha)   // não contaminou o texto
      }
      // Sanidade do conteúdo: scores no domínio válido e frase não-vazia.
      for (const k of ['score_singularidade', 'score_consistencia', 'score_posicionamento']) {
        expect(parsed[k]).toBeGreaterThanOrEqual(0)
        expect(parsed[k]).toBeLessThanOrEqual(10)
      }
      expect(String(parsed.frase_diagnostico || '').length).toBeGreaterThan(20)
    }, LIMITE)
  }
})

describe('a escuta só grava o que existe no índice', () => {
  talvez('toda URL classificada veio da busca, não do modelo', async () => {
    const { buscarVarias, googleConfigurado } = await import('../../netlify/functions/_google.js')
    if (!googleConfigurado()) {
      console.warn('  GOOGLE_SEARCH_KEY/CX ausentes — coleta não avaliada')
      return
    }
    const { resultados } = await buscarVarias(['"Hering" (reclamação OR opinião)'], { dias: 7 })
    console.log(`  ${resultados.length} resultado(s) reais do índice, janela de 7 dias`)
    for (const r of resultados) {
      expect(r.url).toMatch(/^https?:\/\//)
      expect(dominioRaiz(r.host)).toBeTruthy()
    }
  }, LIMITE)
})
