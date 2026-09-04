// ════════════════════════════════════════════════════════════════════
// ZIP no navegador, sem dependência — método `stored` (sem compressão).
//
// POR QUE SEM COMPRESSÃO
// O conteúdo é JPEG/WEBP, que já está comprimido: deflate devolveria ~1% e
// custaria uma biblioteca no bundle. `stored` é o formato mais simples do ZIP e
// todo descompactador abre.
//
// POR QUE NÃO UMA LIB
// Nenhuma entrou no `package.json` até hoje para isto, e o formato é pequeno:
// cabeçalho local, dado, diretório central, fim do diretório. O que exige
// cuidado é o CRC-32 e os offsets — e é exatamente isso que o teste cobre.
// ════════════════════════════════════════════════════════════════════

// Tabela do CRC-32 (polinômio 0xEDB88320), calculada uma vez.
const TABELA = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[i] = c >>> 0
  }
  return t
})()

export function crc32(bytes) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < bytes.length; i++) c = TABELA[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

// Nome de arquivo seguro dentro do zip: sem barra, sem caractere que o Windows
// recuse, sem acento perdido — o descompactador do cliente não é o nosso.
export function nomeSeguro(nome, padrao = 'arquivo') {
  const limpo = String(nome || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  return limpo || padrao
}

// Evita que dois arquivos com o mesmo nome se sobreponham no zip — um deles
// simplesmente sumiria na extração, e ninguém veria falta.
export function semColisao(nome, usados) {
  if (!usados.has(nome)) { usados.add(nome); return nome }
  const ponto = nome.lastIndexOf('.')
  const base = ponto > 0 ? nome.slice(0, ponto) : nome
  const ext  = ponto > 0 ? nome.slice(ponto) : ''
  let i = 2
  while (usados.has(`${base} (${i})${ext}`)) i++
  const final = `${base} (${i})${ext}`
  usados.add(final)
  return final
}

const escrever = (arr, pos, valor, bytes) => {
  for (let i = 0; i < bytes; i++) arr[pos + i] = (valor >>> (i * 8)) & 0xFF
}

/**
 * Monta um ZIP a partir de `[{ nome, dados: Uint8Array }]`.
 * Devolve um Uint8Array pronto para virar Blob.
 */
export function montarZip(arquivos) {
  const enc = new TextEncoder()
  const itens = []
  const usados = new Set()
  let offset = 0
  const locais = []

  for (const a of arquivos || []) {
    const dados = a?.dados
    if (!dados?.length) continue
    const nome = enc.encode(semColisao(nomeSeguro(a.nome), usados))
    const crc = crc32(dados)
    const cab = new Uint8Array(30 + nome.length)
    escrever(cab, 0, 0x04034b50, 4)     // assinatura local
    escrever(cab, 4, 20, 2)             // versão necessária
    escrever(cab, 6, 0, 2)              // flags
    escrever(cab, 8, 0, 2)              // método: 0 = stored
    escrever(cab, 14, crc, 4)
    escrever(cab, 18, dados.length, 4)  // comprimido
    escrever(cab, 22, dados.length, 4)  // original
    escrever(cab, 26, nome.length, 2)
    cab.set(nome, 30)
    locais.push(cab, dados)
    itens.push({ nome, crc, tam: dados.length, offset })
    offset += cab.length + dados.length
  }

  const central = []
  let tamCentral = 0
  for (const it of itens) {
    const c = new Uint8Array(46 + it.nome.length)
    escrever(c, 0, 0x02014b50, 4)       // assinatura do diretório central
    escrever(c, 4, 20, 2); escrever(c, 6, 20, 2)
    escrever(c, 10, 0, 2)               // stored
    escrever(c, 16, it.crc, 4)
    escrever(c, 20, it.tam, 4); escrever(c, 24, it.tam, 4)
    escrever(c, 28, it.nome.length, 2)
    escrever(c, 42, it.offset, 4)
    c.set(it.nome, 46)
    central.push(c)
    tamCentral += c.length
  }

  const fim = new Uint8Array(22)
  escrever(fim, 0, 0x06054b50, 4)       // fim do diretório central
  escrever(fim, 8, itens.length, 2)
  escrever(fim, 10, itens.length, 2)
  escrever(fim, 12, tamCentral, 4)
  escrever(fim, 16, offset, 4)

  const total = offset + tamCentral + 22
  const saida = new Uint8Array(total)
  let p = 0
  for (const bloco of [...locais, ...central, fim]) { saida.set(bloco, p); p += bloco.length }
  return saida
}
