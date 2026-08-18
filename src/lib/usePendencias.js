// usePendencias.js — o que falta na marca, para quem não está na biblioteca.
//
// O painel de Referências só é visto por quem abre aquela pasta. O sininho é
// onde a pessoa olha quando quer saber se tem algo para ela — então é lá que a
// pendência precisa chegar. Mesma regra (src/lib/pendencias.js), duas saídas.
import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { pendencias } from './pendencias'

export function usePendencias(brandId) {
  const [itens, setItens] = useState([])

  useEffect(() => {
    if (!brandId) { setItens([]); return }
    let vivo = true

    ;(async () => {
      const [{ data: assets }, { data: bb }] = await Promise.all([
        supabase.from('brand_assets')
          .select('tipo, nome, valor, file_path, mime_type, metadata').eq('brand_id', brandId),
        supabase.from('brand_books')
          .select('verbal_identity, strategy').eq('brand_id', brandId).limit(1).maybeSingle(),
      ])
      if (!vivo) return
      setItens(pendencias({
        assets: assets || [],
        dados: { verbal_identity: bb?.verbal_identity || {}, strategy: bb?.strategy || {} },
        temManual: (assets || []).some(a => a.metadata?.origem === 'manual'),
      }))
    })()

    return () => { vivo = false }
  }, [brandId])

  return itens
}
