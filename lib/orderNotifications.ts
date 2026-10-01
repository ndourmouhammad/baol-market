import { supabaseAdmin } from './supabaseAdmin'
import { STATUS_LABELS, type OrderStatus } from './orderStatus'

export async function createOrderNotification(orderId: string, status: string) {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('customer_id')
    .eq('id', orderId)
    .single()

  // Commande invité (pas de compte) ou introuvable : rien à notifier
  if (!order?.customer_id) return

  const label = STATUS_LABELS[status as OrderStatus] ?? status

  await supabaseAdmin.from('order_notifications').insert({
    order_id: orderId,
    customer_id: order.customer_id,
    status,
    message: `Votre commande #${orderId.slice(0, 8).toUpperCase()} est maintenant : ${label}`,
  })
}