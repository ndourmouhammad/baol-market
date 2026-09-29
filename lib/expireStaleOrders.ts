import { supabaseAdmin } from './supabaseAdmin'
import { EXPIRATION_MINUTES } from './orderStatus'

/**
 * Fait passer en CANCELLED toute commande restée en CREATED plus de
 * EXPIRATION_MINUTES. Appelé "à la demande" (option A) : à chaque
 * consultation de la liste des commandes par un admin.
 */
export async function expireStaleOrders() {
  const cutoff = new Date(Date.now() - EXPIRATION_MINUTES * 60 * 1000).toISOString()

  await supabaseAdmin
    .from('orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('status', 'created')
    .lt('created_at', cutoff)
}