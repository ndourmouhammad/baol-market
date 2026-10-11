import { supabaseAdmin } from './supabaseAdmin'
import { STATUS_LABELS, type OrderStatus } from './orderStatus'
import { webpush, isConfigured } from './webPush'

export async function createOrderNotification(orderId: string, status: string) {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('customer_id')
    .eq('id', orderId)
    .single()

  // Sécurité : si la commande est introuvable ou si le compte client est manquant, rien à notifier
  if (!order?.customer_id) return

  const label = STATUS_LABELS[status as OrderStatus] ?? status
  const message = `Votre commande #${orderId.slice(0, 8).toUpperCase()} est maintenant : ${label}`

  await supabaseAdmin.from('order_notifications').insert({
    order_id: orderId,
    customer_id: order.customer_id,
    status,
    message,
  })

  // Envoi de la notification Push via Web Push
  if (isConfigured) {
    try {
      const { data: subscriptions } = await supabaseAdmin
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', order.customer_id)

      if (subscriptions && subscriptions.length > 0) {
        const payload = JSON.stringify({
          title: 'Baol Market',
          body: message,
          icon: '/logo/logo-192x192.png',
          badge: '/logo/favicon-32x32.png',
          data: { url: '/orders' },
          tag: `order-${orderId}`,
        })

        const expiredSubIds: string[] = []

        await Promise.all(
          subscriptions.map(async (sub) => {
            try {
              await webpush.sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth,
                  },
                },
                payload
              )
            } catch (err: unknown) {
              const statusCode = (err as { statusCode?: number })?.statusCode
              if (statusCode === 404 || statusCode === 410) {
                expiredSubIds.push(sub.id)
              } else {
                console.error(`Erreur envoi push:`, err)
              }
            }
          })
        )

        if (expiredSubIds.length > 0) {
          await supabaseAdmin.from('push_subscriptions').delete().in('id', expiredSubIds)
        }
      }
    } catch (pushErr) {
      console.error('Erreur globale envoi web-push:', pushErr)
    }
  }
}