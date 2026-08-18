// pdfPagina.js — rasteriza uma página do manual, sob demanda.
//
// Decisão do Danilo (17/08/2026, opção A): a imagem que a biblioteca mostra ao
// lado de uma referência é a PÁGINA do manual onde ela aparece — a prova visual
// do que a descrição afirma. Os arquivos bons (logo.png, fotos) o cliente sobe;
// não se tenta arrancá-los de dentro do PDF, que quebra em manual vetorizado e
// traz lixo junto.
//
// Sob demanda e não no upload, por três motivos:
//   • 313 páginas rasterizadas de antemão seriam dezenas de MB de storage por
//     marca, quase toda página nunca aberta;
//   • no momento do upload ainda não se sabe quais páginas a extração vai citar;
//   • o PDF já está no bucket — a página se produz quando alguém quer vê-la.
//
// O pdf.js entra por import dinâmico: são ~1 MB que não têm por que pesar no
// bundle de quem nunca abre a biblioteca.

let pdfjsPromise = null
const documentos = new Map()   // url assinada → PDFDocumentProxy
const paginas    = new Map()   // `${chave}:${n}:${largura}` → dataURL

async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then(async (pdfjs) => {
      // O worker vem do próprio pacote: sem CDN, que o CSP bloquearia, e sem
      // arquivo solto em /public para alguém esquecer de atualizar junto.
      const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default
      return pdfjs
    })
  }
  return pdfjsPromise
}

/**
 * Devolve a página `n` do PDF em `url` como dataURL PNG, ou null se não der.
 * `chave` identifica o documento no cache (use o id do asset/arquivo, não a
 * URL assinada — ela muda a cada assinatura e vazaria o cache).
 */
export async function renderPagina(url, n, { chave = url, largura = 420 } = {}) {
  const cacheKey = `${chave}:${n}:${largura}`
  if (paginas.has(cacheKey)) return paginas.get(cacheKey)

  try {
    const pdfjs = await getPdfjs()
    let doc = documentos.get(chave)
    if (!doc) {
      doc = await pdfjs.getDocument({ url }).promise
      documentos.set(chave, doc)
    }
    if (n < 1 || n > doc.numPages) return null

    const pagina = await doc.getPage(n)
    const escala = largura / pagina.getViewport({ scale: 1 }).width
    const viewport = pagina.getViewport({ scale: escala })

    const canvas = document.createElement('canvas')
    canvas.width  = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    await pagina.render({ canvasContext: canvas.getContext('2d'), viewport }).promise

    const dataUrl = canvas.toDataURL('image/png')
    paginas.set(cacheKey, dataUrl)
    return dataUrl
  } catch (e) {
    console.warn('[pdfPagina] não consegui rasterizar a página', n, e?.message)
    return null
  }
}

/** Número de páginas do documento, ou null. */
export async function contarPaginas(url, chave = url) {
  try {
    const pdfjs = await getPdfjs()
    let doc = documentos.get(chave)
    if (!doc) {
      doc = await pdfjs.getDocument({ url }).promise
      documentos.set(chave, doc)
    }
    return doc.numPages
  } catch { return null }
}

/** Libera o documento (o dataURL das páginas continua em cache). */
export function esquecerDocumento(chave) {
  const doc = documentos.get(chave)
  if (doc) { try { doc.destroy() } catch { /* já foi */ } documentos.delete(chave) }
}
