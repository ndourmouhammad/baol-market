'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import OrderTimeline from '@/components/OrderTimeline'
import { StatusBadge } from '@/components/StatusBadge'
import { EmptyState } from '@/components/EmptyState'

type Order = {
  id: string
  status: string
  payment_method: string
  total_amount: number
  delivery_address: string
  created_at: string
}

const ACTIVE_STATUSES = ['created', 'confirmed', 'payment_pending', 'paid', 'preparing', 'delivering']

const formatPaymentMethod = (method: string) => {
  if (method === 'a_la_livraison') return 'À la livraison'
  if (method === 'en_ligne') return 'En ligne'
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

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
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
      setLoading(false)
    }
    loadOrders()
  }, [router])

  const activeOrders = orders.filter(o => ACTIVE_STATUSES.includes(o.status))
  const pastOrders = orders.filter(o => !ACTIVE_STATUSES.includes(o.status))

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
            {/* Commandes Actives */}
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
                          <StatusBadge status={order.status} />
                        </div>
                        <div className="sm:text-right">
                          <p className="text-2xl font-bold text-(--encre)">{order.total_amount.toLocaleString('fr-SN')} FCFA</p>
                        </div>
                      </div>

                      {/* Timeline de progression */}
                      <div className="mb-4">
                        <OrderTimeline status={order.status} />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-(--gris-texte) mt-4 pt-4 border-t border-gray-100">
                        <div>
                          <span className="block font-bold text-(--encre) mb-1">Adresse de livraison</span>
                          <p>{order.delivery_address}</p>
                        </div>
                        <div>
                          <span className="block font-bold text-(--encre) mb-1">Mode de paiement</span>
                          <p>{formatPaymentMethod(order.payment_method)}</p>
                        </div>
                      </div>

                      {order.status === 'payment_pending' && order.payment_method === 'a_la_livraison' && (
                        <div className="mt-4 bg-(--vert-baol)/10 border border-(--vert-baol)/20 p-3 rounded-xl text-sm text-(--vert-baol-fonce)">
                          Préparez le montant exact en espèces pour le livreur.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Commandes Passées */}
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