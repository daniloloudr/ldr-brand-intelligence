import Stripe from 'stripe'

const PRICE_IDS = {
  starter:    process.env.STRIPE_PRICE_STARTER,
  pro:        process.env.STRIPE_PRICE_PRO,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
}

export async function handler(event) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { workspaceId, plano } = JSON.parse(event.body)

    if (!workspaceId || !plano) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ message: 'workspaceId e plano são obrigatórios.' }) }
    }

    const priceId = PRICE_IDS[plano]
    if (!priceId) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ message: `Plano inválido: ${plano}` }) }
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const origin = event.headers.origin || event.headers.referer?.replace(/\/$/, '') || 'https://ldr.netlify.app'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/#/app/workspace?checkout=success`,
      cancel_url:  `${origin}/#/onboarding`,
      metadata: { workspaceId, plano },
    })

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    }
  } catch (err) {
    console.error('[stripe-checkout]', err)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: err.message }),
    }
  }
}
