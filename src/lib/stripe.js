import { loadStripe } from '@stripe/stripe-js'

let stripePromise = null

function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  }
  return stripePromise
}

export async function getCheckoutUrl(workspaceId, plano) {
  const res = await fetch('/.netlify/functions/stripe-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspaceId, plano }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Erro ao criar sessão de pagamento.')
  }

  const { url } = await res.json()
  return url
}

export async function redirectToCheckout(workspaceId, plano) {
  const url = await getCheckoutUrl(workspaceId, plano)
  window.location.href = url
}
