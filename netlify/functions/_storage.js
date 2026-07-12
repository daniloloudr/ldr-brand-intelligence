// ════════════════════════════════════════════════════════════════════
// _storage.js — object storage abstraído (S3-compatível)
// Provedor atual: Cloudflare R2 (egress zero). Trocar para DO Spaces / S3
// é só mudar as env vars — nenhuma function de negócio muda.
// Spec: .spec/features/studio.md §4 (Arquitetura de Escala)
// ════════════════════════════════════════════════════════════════════
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const BUCKET     = process.env.R2_BUCKET || 'studio-generations'
// Domínio público na frente do bucket (CDN Cloudflare ou r2.dev). Sem barra final.
const PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '')

let _client = null
function client() {
  if (_client) return _client
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    maxAttempts: 3,                 // retry interno do SDK p/ erros de rede
    credentials: {
      accessKeyId:     process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  })
  return _client
}
// Descarta o client (e seu socket TLS) — força conexão nova no próximo uso
function resetClient() { _client = null }

export const storageConfigured = () =>
  !!(ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && PUBLIC_URL)

/** Sobe um buffer e retorna a URL pública (CDN). Resiliente a erro de TLS
 *  ("bad record mac"): em falha, descarta a conexão e tenta de novo com socket novo. */
export async function putObject(key, buffer, contentType = 'image/webp') {
  const cmd = () => new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  })
  let lastErr
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await client().send(cmd())
      return publicUrl(key)
    } catch (e) {
      lastErr = e
      resetClient()                                   // socket TLS pode estar corrompido
      await new Promise(r => setTimeout(r, 400 * (attempt + 1)))
    }
  }
  throw lastErr
}

export function publicUrl(key) {
  return `${PUBLIC_URL}/${key}`
}

export async function deleteObject(key) {
  await client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}
