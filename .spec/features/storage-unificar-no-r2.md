# Unificar o storage no R2

Decisão do Danilo, 11/set. **Nada aplicado.**

## Hoje

| | onde | o quê |
|---|---|---|
| upload | Supabase Storage, bucket público `brand-assets` (+ `brand-manuals`) | stills, castings, logos, fontes, PDFs |
| geração | Cloudflare R2, bucket `studio-generations` | toda saída do Studio |

A metade do R2 existe por egress zero (`_storage.js`). A do Supabase existe por
inércia: o browser sobe direto com a sessão do usuário, sem passar por function.

## Por que unificar

Um provedor, uma conta de custo, uma política de retenção, um lugar para olhar
quando um arquivo some. E a abstração S3 do `_storage.js` já deixa trocar de
provedor por variável de ambiente — vantagem que hoje só metade dos arquivos tem.

## A trava que decide o desenho

**O upload de hoje vai do browser direto para o Supabase.** Para ir ao R2, ou:

- **(a) passa por uma Netlify function** — ❌ inviável. O corpo de uma function
  tem teto de ~6 MB. O `still.jpg` da Hering tem 5,4 MB (raspando), e o manual da
  PES tinha **36,5 MB** — foi justamente o caso que obrigou a extração a usar a
  Files API em vez de base64. Isto reintroduziria aquele defeito noutro lugar.

- **(b) URL pré-assinada (presigned PUT) do R2** — ✅ o caminho. A function só
  assina; os bytes vão do browser direto ao R2, sem teto de payload. Exige
  `@aws-sdk/s3-request-presigner` (o `@aws-sdk/client-s3` já é dependência).

## O que muda no código

Oito arquivos, e todos repetem o MESMO par:

```
supabase.storage.from('brand-assets').upload(path, file, { upsert: true })
supabase.storage.from('brand-assets').getPublicUrl(path)
```

`StudioCanvas` · `StudioImage` · `StudioVideo` · `StudioLibrary` ·
`AddonCatalogo` (2×) · `BrandAssistant` · `BrandAssetsSection` · `AppInterno`
(este no bucket `brand-manuals`).

Como o padrão é idêntico, o certo é **um helper só** — `subirAsset(file, {brandId,
pasta})` → `{ url, path, mime, bytes }` — e os 8 passam a chamá-lo. O ganho não é
só o R2: hoje a regra de caminho (`${brandId}/...`) está repetida em cada tela.

## ⚠️ A migração tem que ser ADITIVA

`brand_assets.valor` guarda URL absoluta. Já existem URLs do Supabase gravadas —
**inclusive dentro da planilha do cliente**: a linha da sku122 referencia os
acessórios por URL completa `…supabase.co/storage/v1/object/public/brand-assets/…`.

Big-bang quebraria essas referências em silêncio, que é a família de defeito que
este projeto já pagou caro (o manual da Zétona). Então:

1. **Upload novo vai para o R2.** Nada é movido.
2. **URL antiga continua resolvendo** — o bucket do Supabase fica de pé, em modo
   leitura, por tempo indeterminado.
3. Se um dia valer copiar o acervo antigo, é job separado que **reescreve
   `brand_assets.valor` na mesma transação da cópia**, e só depois de conferir
   que nenhuma URL do Supabase sobrou em `lote_peca.linha`, em `studio_workflows`
   (os nós `imageInput`!) e em brand books.

⚠️ Lembrar que os nós `imageInput` do fluxo guardam URLs absolutas. Hoje o addon
os sobrescreve, mas quem usa o canvas à mão depende delas.

## Teste que guarda

- nenhum caminho novo de upload aponta para `supabase.storage`
- URL antiga do Supabase continua sendo aceita como referência válida
- o helper devolve `bytes` e `mime` (migration 017 tem as colunas; hoje são
  preenchidas em alguns lugares e em outros não)

## Tamanho

Meio dia de trabalho, quase todo mecânico depois que o helper existe. O risco
está inteiro na parte aditiva — nunca mover o que já está gravado.
