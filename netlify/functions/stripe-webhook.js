import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const PLANO_ORDER = { starter: 1, pro: 2, enterprise: 3 }

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  let stripeEvent
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      event.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('[stripe-webhook] Assinatura inválida:', err.message)
    return { statusCode: 400, body: `Webhook Error: ${err.message}` }
  }

  try {
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object
      const { workspaceId, plano } = session.metadata || {}

      if (workspaceId && plano) {
        await supabase.from('workspaces').update({
          plano,
          plano_status: 'active',
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
        }).eq('id', workspaceId)

        console.log(`[stripe-webhook] Workspace ${workspaceId} atualizado para plano ${plano}`)
      }
    }

    if (stripeEvent.type === 'customer.subscription.updated') {
      const subscription = stripeEvent.data.object
      const { workspaceId, plano } = subscription.metadata || {}

      if (workspaceId) {
        const status = subscription.status === 'active' ? 'active' : 'inactive'
        await supabase.from('workspaces').update({
          plano_status: status,
          stripe_subscription_id: subscription.id,
        }).eq('id', workspaceId)
      }
    }

    if (stripeEvent.type === 'customer.subscription.deleted') {
      const subscription = stripeEvent.data.object
      const { workspaceId } = subscription.metadata || {}

      if (workspaceId) {
        await supabase.from('workspaces').update({
          plano: 'trial',
          plano_status: 'canceled',
        }).eq('id', workspaceId)

        console.log(`[stripe-webhook] Workspace ${workspaceId} revertido para trial (cancelamento)`)
      }
    }
  } catch (err) {
    console.error('[stripe-webhook] Erro ao processar evento:', err)
    return { statusCode: 500, body: 'Erro interno' }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) }
}
