import { supabaseAdmin } from './supabaseAdmin'
import { EXPIRATION_MINUTES } from './orderStatus'
import { createOrderNotification } from './orderNotifications'

export async function expireStaleOrders(): Promise<number> {
  const cutoff = new Date(Date.now() - EXPIRATION_MINUTES * 60 * 1000).toISOString()

  const { data: staleOrders } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('status', 'created')
    .lt('created_at', cutoff)

  if (!staleOrders || staleOrders.length === 0) return 0

  const ids = staleOrders.map((o) => o.id)

  const { data: updatedOrders } = await supabaseAdmin
    .from('orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .in('id', ids)
    .eq('status', 'created')
    .select('id')

  if (!updatedOrders || updatedOrders.length === 0) return 0

  for (const order of updatedOrders) {
    try {
      await createOrderNotification(order.id, 'cancelled')
    } catch (err) {
      console.error(`Erreur notification annulation pour commande ${order.id}:`, err)
    }
  }

  return updatedOrders.length
}