import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Recompõe o pool de créditos do plano e estende o ciclo (1º dia do próximo mês).
// Idempotente: seta o saldo para o pool (não soma). Loga uma transação de refill.
async function refillCredits(supabase, workspaceId, plano) {
  const { data: pool } = await supabase.rpc('plano_creditos', { p_plano: plano })
  const reset = new Date(); reset.setUTCMonth(reset.getUTCMonth() + 1, 1); reset.setUTCHours(0, 0, 0, 0)
  await supabase.from('workspaces')
    .update({ creditos_saldo: pool, creditos_ciclo_reset: reset.toISOString() })
    .eq('id', workspaceId)
  await supabase.from('credit_transactions')
    .insert({ workspace_id: workspaceId, delta: pool, saldo_after: pool, tipo: 'refill', operacao: 'assinatura' })
}

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
        // libera o pool de créditos do plano na ativação
        await refillCredits(supabase, workspaceId, plano)
        console.log(`[stripe-webhook] Workspace ${workspaceId} ativado no plano ${plano} + créditos liberados`)
      }
    }

    // Renovação mensal paga → recarrega os créditos do ciclo
    if (stripeEvent.type === 'invoice.paid' && stripeEvent.data.object.billing_reason === 'subscription_cycle') {
      const invoice = stripeEvent.data.object
      // a referência da assinatura mudou de lugar entre versões da API — cobre ambas
      const subId = invoice.subscription
        || invoice.parent?.subscription_details?.subscription
        || invoice.lines?.data?.[0]?.subscription
        || null
      const { data: ws } = subId ? await supabase.from('workspaces')
        .select('id, plano').eq('stripe_subscription_id', subId).maybeSingle() : { data: null }
      if (ws) {
        await refillCredits(supabase, ws.id, ws.plano)
        console.log(`[stripe-webhook] Renovação — créditos recarregados p/ workspace ${ws.id} (${ws.plano})`)
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
        await refillCredits(supabase, workspaceId, 'trial')   // rebaixa pro pool do trial
        console.log(`[stripe-webhook] Workspace ${workspaceId} revertido para trial (cancelamento)`)
      }
    }
  } catch (err) {
    console.error('[stripe-webhook] Erro ao processar evento:', err)
    return { statusCode: 500, body: 'Erro interno' }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) }
}
