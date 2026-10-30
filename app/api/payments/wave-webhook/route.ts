import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyWaveWebhookSignature } from '@/lib/wave'
import { createOrderNotification } from '@/lib/orderNotifications'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  // 1. Read raw body BEFORE any JSON parsing (signature is on the exact text)
  const rawBody = await request.text()

  // 2. Verify signature
  const webhookSecret = process.env.WAVE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[Wave Webhook] WAVE_WEBHOOK_SECRET non configuré.')
    return new NextResponse('Configuration error', { status: 500 })
  }

  const signatureHeader = request.headers.get('wave-signature') ?? ''

  if (!verifyWaveWebhookSignature(rawBody, signatureHeader, webhookSecret)) {
    console.error('[Wave Webhook] Signature invalide.')
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // 3. Parse JSON
  let envelope: {
    id?: string
    type?: string
    data?: {
      id?: string
      client_reference?: string
      amount?: string
      currency?: string
      payment_status?: string
      transaction_id?: string
    }
  }
  try {
    envelope = JSON.parse(rawBody)
  } catch {
    console.error('[Wave Webhook] JSON invalide.')
    return new NextResponse('Bad request', { status: 400 })
  }

  const eventId = envelope.id
  const eventType = envelope.type ?? ''
  const data = envelope.data

  // 4. Record event for audit (ignore conflict = idempotent)
  if (eventId) {
    const orderId = data?.client_reference && UUID_RE.test(data.client_reference) ? data.client_reference : null
    await supabaseAdmin
      .from('payment_events')
      .upsert(
        {
          event_id: eventId,
          provider: 'wave',
          event_type: eventType,
          order_id: orderId,
        },
        { onConflict: 'event_id', ignoreDuplicates: true },
      )
      .then(({ error }) => {
        if (error) console.error('[Wave Webhook] Erreur écriture payment_events:', error.message)
      })
  }

  // 5. Handle event types
  if (eventType === 'checkout.session.completed' && data) {
    await handleCheckoutCompleted(data)
  } else if (eventType === 'checkout.session.payment_failed') {
    console.info('[Wave Webhook] Échec de paiement signalé, aucune action.')
  }
  // All other event types: respond 200 without action

  return new NextResponse('OK', { status: 200 })
}

// ---------------------------------------------------------------------------
// checkout.session.completed handler
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(data: {
  id?: string
  client_reference?: string
  amount?: string
  currency?: string
  payment_status?: string
  transaction_id?: string
}) {
  const orderId = data.client_reference
  if (!orderId || !UUID_RE.test(orderId)) {
    console.info('[Wave Webhook] client_reference absent ou invalide, événement ignoré.')
    return
  }

  // Fetch the order
  const { data: order, error: fetchError } = await supabaseAdmin
    .from('orders')
    .select('id, status, total_amount, wave_checkout_id')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) {
    console.info(`[Wave Webhook] Commande ${orderId} introuvable, événement ignoré.`)
    return
  }

  // If wave_checkout_id already set and different: conflict – don't touch
  if (order.wave_checkout_id && order.wave_checkout_id !== data.id) {
    console.error(`[Wave Webhook] Conflit de checkout_id sur commande ${orderId}. Existant vs reçu différent.`)
    return
  }

  // Only process succeeded payments in XOF
  if (data.payment_status !== 'succeeded' || data.currency !== 'XOF') {
    return
  }

  // Always record paid_at + wave identifiers (if not already set)
  await supabaseAdmin
    .from('orders')
    .update({
      paid_at: new Date().toISOString(),
      wave_checkout_id: data.id ?? null,
      wave_transaction_id: data.transaction_id ?? null,
    })
    .eq('id', orderId)
    .is('paid_at', null)

  // Amount mismatch: log error, do NOT transition to 'paid'
  if (String(order.total_amount) !== data.amount) {
    console.error(
      `[Wave Webhook] Incohérence de montant pour la commande ${orderId} : reçu=${data.amount}, attendu=${order.total_amount}.`,
    )
    return
  }

  // Transition from 'created' to 'paid' (conditional update prevents double writes)
  const { data: statusUpdated } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'paid',
      wave_checkout_id: data.id ?? null,
      wave_transaction_id: data.transaction_id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('status', 'created')
    .select('id')

  if (statusUpdated && statusUpdated.length > 0) {
    await createOrderNotification(orderId, 'paid')
  }

  // Payment on a cancelled order
  if (order.status === 'cancelled') {
    console.warn(
      `[Wave Webhook] Paiement reçu sur commande annulée ${orderId}, remboursement à prévoir.`,
    )
  }
}
