'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Inbox, MapPin, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react'

type OrderItem = {
  quantity: number
  unit_price: number
  products: { name: string } | null
}

type Order = {
  id: string
  status: string
  payment_method: string
  total_amount: number
  delivery_address: string
  created_at: string
  order_items: OrderItem[]
}

const STATUS_OPTIONS = [
  'created',
  'confirmed',
  'payment_pending',
  'paid',
  'preparing',
  'delivering',
  'delivered',
  'cancelled',
  'refunded',
]

const STATUS_COLORS: Record<string, string> = {
  created: 'bg-gray-100 text-gray-800 border-gray-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  payment_pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  preparing: 'bg-orange-100 text-orange-800 border-orange-200',
  delivering: 'bg-purple-100 text-purple-800 border-purple-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  refunded: 'bg-rose-100 text-rose-800 border-rose-200',
}

const getStatusColor = (status: string) => STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 border-gray-200'
const ITEMS_PER_PAGE = 10

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  async function loadOrders() {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/orders', {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error)
    } else {
      setOrders(json.orders)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadOrders()
  }, [])

  async function updateStatus(orderId: string, status: string) {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ status }),
    })
    loadOrders()
  }

  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE)
  const paginatedOrders = orders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-terre">
        <Loader2 className="w-8 h-8 animate-spin text-baobab mb-4" />
        <p>Chargement des commandes...</p>
      </div>
    )
  }

  if (error) return <p className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">{error}</p>

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-semibold text-baobab font-fraunces mb-6">
        Commandes <span className="text-terre text-lg font-normal">({orders.length})</span>
      </h2>
      
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-mil/30 text-terre">
          <Inbox className="w-12 h-12 mb-4 text-mil" />
          <p className="text-lg">Aucune commande pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl border border-mil/30 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-mil/20">
                <div>
                  <p className="text-xs text-terre mb-1">
                    Commande #{order.id.split('-')[0].toUpperCase()} • {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="font-semibold text-nuit-diourbel text-lg">
                    {order.total_amount.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
                <div className="relative">
                  <select
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                    className={`appearance-none font-medium text-sm px-4 py-2 pr-8 rounded-full border outline-none cursor-pointer focus:ring-2 focus:ring-baobab transition-colors ${getStatusColor(order.status)}`}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-current opacity-70">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-terre mt-0.5 shrink-0" />
                    <span className="text-nuit-diourbel">{order.delivery_address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="w-4 h-4 text-terre shrink-0" />
                    <span className="text-nuit-diourbel capitalize">{order.payment_method.replace('_', ' ')}</span>
                  </div>
                </div>
                <div className="bg-sable/50 rounded-lg p-3 text-sm">
                  <p className="font-medium text-terre mb-2 text-xs uppercase tracking-wider">Articles</p>
                  <ul className="space-y-1">
                    {order.order_items.map((item, i) => (
                      <li key={i} className="flex justify-between text-nuit-diourbel">
                        <span>{item.quantity}× {item.products?.name ?? 'Produit inconnu'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-4 py-3 border border-mil/30 rounded-xl mt-6">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-terre hover:text-nuit-diourbel disabled:opacity-50 disabled:hover:text-terre transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Précédent
              </button>
              <span className="text-sm text-terre font-medium">
                Page {currentPage} sur {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-terre hover:text-nuit-diourbel disabled:opacity-50 disabled:hover:text-terre transition-colors"
              >
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}