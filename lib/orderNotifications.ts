import { supabaseAdmin } from './supabaseAdmin'
import { getStatusLabel } from './orderStatus'
import { webpush, isConfigured } from './webPush'

/**
 * Notifie tous les membres du staff (admins) ayant activé les notifications push
 * lorsqu'une nouvelle commande est payée / passée.
 */
export async function notifyAdminsNewOrder(orderId: string, totalAmount?: number) {
  if (!isConfigured) return

  try {
    const { data: staffMembers } = await supabaseAdmin
      .from('staff')
      .select('id')

    if (!staffMembers || staffMembers.length === 0) return

    const staffIds = staffMembers.map((s) => s.id)
    const { data: subscriptions } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .in('user_id', staffIds)

    if (!subscriptions || subscriptions.length === 0) return

    const shortId = orderId.slice(0, 8).toUpperCase()
    const amountStr = totalAmount ? ` (${totalAmount.toLocaleString('fr-FR')} FCFA)` : ''
    const bodyMessage = `Nouvelle commande payée #${shortId}${amountStr} !`

    const payload = JSON.stringify({
      title: 'Baol Market Admin',
      body: bodyMessage,
      icon: '/logo/logo-192x192.png',
      badge: '/logo/favicon-32x32.png',
      data: { url: '/admin/orders' },
      tag: `admin-order-${orderId}`,
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
            console.error('Erreur envoi push admin:', err)
          }
        }
      })
    )

    if (expiredSubIds.length > 0) {
      await supabaseAdmin.from('push_subscriptions').delete().in('id', expiredSubIds)
    }
  } catch (err) {
    console.error('Erreur globale notification admin push:', err)
  }
}

/**
 * Crée une notification in-app pour le client et lui envoie une notification push.
 * Si le statut est 'paid', notifie également les administrateurs.
 */
export async function createOrderNotification(orderId: string, status: string) {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('customer_id, total_amount, fulfillment_method')
    .eq('id', orderId)
    .single()

  // Si la commande vient d'être payée, alerter les admins
  if (status === 'paid') {
    await notifyAdminsNewOrder(orderId, order?.total_amount)
  }

  // Sécurité : si la commande est introuvable ou si le compte client est manquant, rien à notifier côté client
  if (!order?.customer_id) return

  const shortId = orderId.slice(0, 8).toUpperCase()
  let message = `Votre commande #${shortId} est maintenant : ${getStatusLabel(status, order.fulfillment_method)}`

  if (order.fulfillment_method === 'pickup') {
    if (status === 'delivering') {
      message = `Votre commande #${shortId} est prête au retrait. Notre équipe vous communiquera l'adresse de retrait par notification ou par appel.`
    } else if (status === 'delivered') {
      message = `Votre commande #${shortId} a bien été retirée. Merci de votre confiance !`
    }
  }

  await supabaseAdmin.from('order_notifications').insert({
    order_id: orderId,
    customer_id: order.customer_id,
    status,
    message,
  })

  // Envoi de la notification Push au client via Web Push
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

// Alias pour compatibilité et clarté sémantique
export const notifyNewOrder = notifyAdminsNewOrder
export const notifyOrderStatusChanged = createOrderNotification