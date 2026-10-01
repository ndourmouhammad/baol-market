'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import OrderTimeline from '@/components/OrderTimeline'
import { StatusBadge } from '@/components/StatusBadge'
import { EmptyState } from '@/components/EmptyState'
import { isActiveStatus, canCancelOrder } from '@/lib/orderStatus'

type Order = {
  id: string
  status: string
  payment_method: string
  total_amount: number
  delivery_address: string | null
  created_at: string
}

type NotificationRow = {
  id: string
  order_id: string
  status: string
  message: string
  is_read: boolean
  created_at: string
}

const formatPaymentMethod = (method: string) => {
  if (method === 'en_ligne') return 'Paiement en ligne (PayTech)'
  return method
}

const formatDate = (isoString: string) => {
  const date = new Date(isoString)
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

const formatDateTime = (isoString: string) => {
  const date = new Date(isoString)
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const router = useRouter()

  async function loadOrders() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data } = await supabase
      .from('orders')
      .select('id, status, payment_method, total_amount, delivery_address, created_at')
      .order('created_at', { ascending: false })

    setOrders(data || [])

    const { data: notifData } = await supabase
      .from('order_notifications')
      .select('id, order_id, status, message, is_read, created_at')
      .order('created_at', { ascending: true })

    setNotifications(notifData || [])
    setLoading(false)

    // Le client voit les nouveautés à sa visite : on marque tout comme lu
    const unreadIds = (notifData || []).filter((n) => !n.is_read).map((n) => n.id)
    if (unreadIds.length > 0) {
      await supabase.from('order_notifications').update({ is_read: true }).in('id', unreadIds)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  async function handleCancel(orderId: string) {
    if (!confirm('Voulez-vous vraiment annuler cette commande ?')) return
    setCancellingId(orderId)

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/orders/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ orderId }),
    })

    setCancellingId(null)

    if (res.ok) {
      loadOrders()
    } else {
      const json = await res.json()
      alert(json.error || "Impossible d'annuler cette commande.")
    }
  }

  const activeOrders = orders.filter((o) => isActiveStatus(o.status))
  const pastOrders = orders.filter((o) => !isActiveStatus(o.status))

  function hadUnreadNotification(orderId: string) {
    // "unreadAtLoad" : avant qu'on ne les marque comme lues plus haut —
    // on se base sur l'état en mémoire capturé juste après le chargement initial.
    return notifications.some((n) => n.order_id === orderId)
  }

  function historyFor(orderId: string) {
    return notifications.filter((n) => n.order_id === orderId)
  }

  return (
    <div className="bg-(--fond) py-12 px-4 sm:px-6 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-(--encre) mb-8">Mes commandes</h1>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-gray-100 p-6 rounded-2xl animate-pulse">
                <div className="h-5 bg-gray-200 w-1/4 mb-4 rounded"></div>
                <div className="h-7 bg-gray-200 w-1/3 mb-6 rounded"></div>
                <div className="h-4 bg-gray-100 w-1/2 mb-2 rounded"></div>
                <div className="h-4 bg-gray-100 w-2/3 rounded"></div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            title="Vous n'avez aucune commande"
            description="Parcourez notre catalogue pour découvrir nos produits de qualité, vérifiés par notre équipe."
            actionText="Découvrir le catalogue"
            onAction={() => router.push('/')}
            icon={
              <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            }
          />
        ) : (
          <div className="space-y-10">
            {activeOrders.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-(--encre) mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-(--vert-baol) rounded-full animate-pulse"></span>
                  En cours
                </h2>
                <div className="space-y-6">
                  {activeOrders.map((order) => (
                    <div key={order.id} className="bg-white border border-(--vert-baol)/30 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                        <div className="mb-3 sm:mb-0">
                          <p className="text-sm text-(--gris-texte) mb-2">Commande du {formatDate(order.created_at)}</p>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={order.status} />
                            {hadUnreadNotification(order.id) && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-(--rouge-erreur)/10 text-(--rouge-erreur)">
                                Nouveau
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="sm:text-right">
                          <p className="text-2xl font-bold text-(--encre)">{order.total_amount.toLocaleString('fr-SN')} FCFA</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <OrderTimeline status={order.status} />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-(--gris-texte) mt-4 pt-4 border-t border-gray-100">
                        <div>
                          <span className="block font-bold text-(--encre) mb-1">Mode de paiement</span>
                          <p>{formatPaymentMethod(order.payment_method)}</p>
                        </div>
                      </div>

                      {historyFor(order.id).length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-xs font-bold text-(--gris-texte) uppercase tracking-wider mb-2">Historique</p>
                          <ul className="space-y-1.5">
                            {historyFor(order.id).map((n) => (
                              <li key={n.id} className="text-xs text-(--gris-texte) flex justify-between">
                                <span>{n.message}</span>
                                <span className="shrink-0 ml-3">{formatDateTime(n.created_at)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {canCancelOrder(order.status) && (
                        <button
                          onClick={() => handleCancel(order.id)}
                          disabled={cancellingId === order.id}
                          className="mt-4 text-sm font-medium text-(--rouge-erreur) hover:underline disabled:opacity-50"
                        >
                          {cancellingId === order.id ? 'Annulation...' : 'Annuler ma commande'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {pastOrders.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-(--encre) mb-4">Historique</h2>
                <div className="space-y-3">
                  {pastOrders.map((order) => (
                    <div key={order.id} className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
                      <div className="flex items-center gap-4 flex-wrap">
                        <StatusBadge status={order.status} />
                        <span className="text-sm text-(--gris-texte)">{formatDate(order.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-(--encre)">{order.total_amount.toLocaleString('fr-SN')} FCFA</span>
                        <span className="text-xs text-(--gris-texte)">{formatPaymentMethod(order.payment_method)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}