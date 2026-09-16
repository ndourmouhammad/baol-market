'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import OrderTimeline from '@/components/OrderTimeline'

type Order = {
  id: string
  status: string
  payment_method: string
  total_amount: number
  delivery_address: string
  created_at: string
}

const STATUS_MAP: Record<string, { label: string; colors: string }> = {
  'created': { label: 'Créée', colors: 'bg-baobab/10 text-baobab' },
  'confirmed': { label: 'Confirmée', colors: 'bg-nuit-diourbel/10 text-nuit-diourbel' },
  'payment_pending': { label: 'Paiement en attente', colors: 'bg-mil/20 text-baobab border border-mil/50' },
  'paid': { label: 'Payée', colors: 'bg-vert-feuille/10 text-vert-feuille' },
  'preparing': { label: 'En préparation', colors: 'bg-mil/20 text-baobab' },
  'delivering': { label: 'En livraison', colors: 'bg-mil/40 text-baobab' },
  'delivered': { label: 'Livrée', colors: 'bg-vert-feuille text-sable' },
  'cancelled': { label: 'Annulée', colors: 'bg-terre/10 text-terre' },
  'refunded': { label: 'Remboursée', colors: 'bg-terre/10 text-terre' },
}

const ACTIVE_STATUSES = ['created', 'confirmed', 'payment_pending', 'paid', 'preparing', 'delivering']

const getStatusBadge = (status: string) => {
  const mapped = STATUS_MAP[status] || { label: status, colors: 'bg-baobab/10 text-baobab' }
  return (
    <span className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider ${mapped.colors}`}>
      {mapped.label}
    </span>
  )
}

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
    <div className="bg-sable py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-serif text-4xl font-bold text-baobab mb-8">Mes commandes</h1>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-terre/10 p-6 animate-pulse">
                <div className="h-5 bg-baobab/10 w-1/4 mb-4"></div>
                <div className="h-7 bg-terre/10 w-1/3 mb-6"></div>
                <div className="h-4 bg-baobab/5 w-1/2 mb-2"></div>
                <div className="h-4 bg-baobab/5 w-2/3"></div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-white border border-terre/20">
            <svg className="mx-auto h-16 w-16 text-terre/40 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <h2 className="font-serif text-2xl text-baobab mb-3">Vous n&#39;avez aucune commande</h2>
            <p className="text-baobab/70 mb-8 max-w-sm mx-auto">Parcourez notre catalogue pour découvrir nos produits de qualité, vérifiés par notre équipe.</p>
            <Link href="/" className="inline-block bg-terre text-sable px-8 py-3 font-medium hover:bg-terre/90 transition-colors">
              Découvrir le catalogue
            </Link>
          </div>
        ) : (
          <div className="space-y-10">

            {/* Commandes Actives — avec Timeline */}
            {activeOrders.length > 0 && (
              <section>
                <h2 className="font-serif text-xl font-semibold text-baobab mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-terre rounded-full animate-pulse"></span>
                  En cours
                </h2>
                <div className="space-y-6">
                  {activeOrders.map((order) => (
                    <div key={order.id} className="bg-white border-2 border-terre/30 p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                        <div className="mb-3 sm:mb-0">
                          <p className="text-sm text-baobab/60 mb-2">Commande du {formatDate(order.created_at)}</p>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="sm:text-right">
                          <p className="font-serif text-2xl font-bold text-terre">{order.total_amount.toLocaleString('fr-SN')} FCFA</p>
                        </div>
                      </div>

                      {/* Timeline de progression */}
                      <OrderTimeline status={order.status} />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-baobab/80 mt-4 pt-4 border-t border-terre/10">
                        <div>
                          <span className="block font-semibold text-baobab mb-1">Adresse de livraison</span>
                          <p>{order.delivery_address}</p>
                        </div>
                        <div>
                          <span className="block font-semibold text-baobab mb-1">Mode de paiement</span>
                          <p>{formatPaymentMethod(order.payment_method)}</p>
                        </div>
                      </div>

                      {order.status === 'payment_pending' && order.payment_method === 'a_la_livraison' && (
                        <div className="mt-4 bg-mil/10 border-l-2 border-mil p-3 text-sm text-baobab">
                          Préparez le montant exact en espèces pour le livreur.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Commandes Passées — liste compacte */}
            {pastOrders.length > 0 && (
              <section>
                <h2 className="font-serif text-xl font-semibold text-baobab mb-4">Historique</h2>
                <div className="space-y-3">
                  {pastOrders.map((order) => (
                    <div key={order.id} className="bg-white border border-terre/10 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-4 flex-wrap">
                        {getStatusBadge(order.status)}
                        <span className="text-sm text-baobab/60">{formatDate(order.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-serif text-lg font-bold text-baobab">{order.total_amount.toLocaleString('fr-SN')} FCFA</span>
                        <span className="text-xs text-baobab/50">{formatPaymentMethod(order.payment_method)}</span>
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