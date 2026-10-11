import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyPaytechIpn } from '@/lib/paytech'
import { createOrderNotification } from '@/lib/orderNotifications'

export async function POST(request: Request) {
  const formData = await request.formData()
  const fields: Record<string, string> = {}
  formData.forEach((value, key) => {
    fields[key] = value.toString()
  })

  const isValid = verifyPaytechIpn({
    item_price: fields.item_price,
    final_item_price: fields.final_item_price,
    ref_command: fields.ref_command,
    hmac_compute: fields.hmac_compute,
    api_key_sha256: fields.api_key_sha256,
    api_secret_sha256: fields.api_secret_sha256,
  })

  if (!isValid) {
    console.error('IPN PayTech rejetée : signature invalide.', fields.ref_command)
    return new NextResponse('Forbidden', { status: 403 })
  }

  const orderId = fields.ref_command
  const typeEvent = fields.type_event

  if (!orderId) {
    return new NextResponse('OK', { status: 200 }) // rien à faire, mais on ne fait pas échouer PayTech
  }

  if (typeEvent === 'sale_complete') {
    // Toujours enregistrer paid_at, quel que soit le statut actuel
    await supabaseAdmin
      .from('orders')
      .update({ paid_at: new Date().toISOString() })
      .eq('id', orderId)
      .is('paid_at', null)

    // Lire la commande pour vérifier le statut et le montant
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('status, total_amount')
      .eq('id', orderId)
      .single()

    const receivedAmount = Number(fields.final_item_price || fields.item_price)

    if (order && order.total_amount !== receivedAmount) {
      console.error(
        `[PayTech IPN] Incohérence de montant pour la commande ${orderId} : montant reçu = ${receivedAmount} FCFA, montant attendu = ${order.total_amount} FCFA.`
      )
    } else {
      // Passer à 'paid' seulement si la commande est encore 'created'
      const { data: statusUpdated } = await supabaseAdmin
        .from('orders')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('status', 'created')
        .select('id')

      if (statusUpdated && statusUpdated.length > 0) {
        await createOrderNotification(orderId, 'paid')
      }
    }

    // Vérifier si le paiement arrive sur une commande déjà annulée
    if (order?.status === 'cancelled') {
      console.warn(
        `⚠️ Paiement reçu sur commande annulée : remboursement à prévoir. Commande : ${orderId}`
      )
    }
  } else if (typeEvent === 'sale_canceled') {
    const { data: cancelUpdated } = await supabaseAdmin
      .from('orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('status', 'created')
      .select('id')

    if (cancelUpdated && cancelUpdated.length > 0) {
      await createOrderNotification(orderId, 'cancelled')
    }
  }

  return new NextResponse('OK', { status: 200 })
}