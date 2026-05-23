import { useRef } from 'react'

const REEMBED_URL = '/.netlify/functions/brandos/brand-book/update'

export function useReembed() {
  const timerRef = useRef(null)

  function scheduleReembed(brandId, section, data) {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        await fetch(REEMBED_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brandId, section, data }),
        })
      } catch (e) {
        console.warn('[useReembed] re-embed falhou:', e.message)
      }
    }, 2000)
  }

  return { scheduleReembed }
}
