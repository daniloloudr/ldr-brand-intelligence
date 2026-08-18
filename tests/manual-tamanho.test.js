import { describe, it, expect } from 'vitest'
import { checarTamanhoManual, MANUAL_MAX_MB } from '../src/lib/helpers'

const pdfDe = (mb) => ({ size: mb * 1024 * 1024, type: 'application/pdf' })

describe('tamanho do manual — a regra vive num lugar só', () => {
  it('o teto é o do bucket (migration 013)', () => {
    expect(MANUAL_MAX_MB).toBe(50)
  })

  it('o maior manual que existe hoje (44,7 MB) passa', () => {
    // É o da PES, 313 páginas. Antes falhava com 413; hoje é caso normal.
    expect(checarTamanhoManual(pdfDe(44.7))).toBeNull()
  })

  it('acima do teto explica o tamanho, o limite e o que fazer', () => {
    const msg = checarTamanhoManual(pdfDe(62.3))
    expect(msg).toContain('62.3 MB')
    expect(msg).toContain('50 MB')
    expect(msg).toMatch(/divida/i)
  })

  it('NÃO manda comprimir — comprimir apaga o que a leitura visual usa', () => {
    // O aviso antigo pedia compressão, herança de quando o PDF ia em base64.
    // Hoje isso destrói a resolução de onde saem logo, paleta e tipografia.
    const msg = checarTamanhoManual(pdfDe(80))
    expect(msg).not.toMatch(/comprim(a|ir)\b(?!:)/i)
    expect(msg).toMatch(/evite comprimir/i)
  })

  it('arquivo ausente ou vazio não é erro de tamanho', () => {
    expect(checarTamanhoManual(null)).toBeNull()
    expect(checarTamanhoManual({})).toBeNull()
  })
})
