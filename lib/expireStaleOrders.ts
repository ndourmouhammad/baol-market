import { supabaseAdmin } from './supabaseAdmin'
import { EXPIRATION_MINUTES } from './orderStatus'
import { createOrderNotification } from './orderNotifications'

export async function expireStaleOrders() {
  const cutoff = new Date(Date.now() - EXPIRATION_MINUTES * 60 * 1000).toISOString()

  const { data: staleOrders } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('status', 'created')
    .lt('created_at', cutoff)

  if (!staleOrders || staleOrders.length === 0) return

  await supabaseAdmin
    .from('orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('status', 'created')
    .lt('created_at', cutoff)

  for (const order of staleOrders) {
    await createOrderNotification(order.id, 'cancelled')
  }
}