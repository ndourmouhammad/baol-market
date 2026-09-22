'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Inbox, MapPin, CreditCard, ChevronLeft, ChevronRight, Truck, User, Phone, AlertCircle, Check } from 'lucide-react'

type OrderItem = {
  quantity: number
  unit_price: number
  products: { name: string } | null
}

type Rider = { id: string; name: string }
type DeliveryZoneInfo = { id: string; name: string } | null

type Order = {
  id: string
  status: string
  payment_method: string
  total_amount: number
  subtotal_amount: number | null
  delivery_fee: number | null
  delivery_fee_confirmed: boolean | null
  delivery_address: string
  created_at: string
  rider_id: string | null
  customer_id: string | null
  guest_phone: string | null
  guest_email: string | null
  tracking_code: string | null
  order_items: OrderItem[]
  riders: Rider | null
  delivery_zones: DeliveryZoneInfo
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

async function authFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${session?.access_token}` },
  })
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [riders, setRiders] = useState<Rider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [feeEdits, setFeeEdits] = useState<Record<string, string>>({})
  const [savingFeeFor, setSavingFeeFor] = useState<string | null>(null)

  async function loadOrders() {
    const res = await authFetch('/api/admin/orders')
    const json = await res.json()
    if (!res.ok) {
      setError(json.error)
    } else {
      setOrders(json.orders)
    }
    setLoading(false)
  }

  async function loadRiders() {
    const res = await authFetch('/api/admin/riders')
    const json = await res.json()
    if (res.ok) setRiders(json.riders)
  }

  useEffect(() => {
    loadOrders()
    loadRiders()
  }, [])

  async function updateStatus(orderId: string, status: string) {
    await authFetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    loadOrders()
  }

  async function assignRider(orderId: string, riderId: string) {
    await authFetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rider_id: riderId }),
    })
    loadOrders()
  }

  async function saveDeliveryFee(orderId: string) {
    const value = feeEdits[orderId]
    if (value === undefined || value === '') return
    setSavingFeeFor(orderId)
    await authFetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delivery_fee: Number(value) }),
    })
    setSavingFeeFor(null)
    setFeeEdits((prev) => {
      const next = { ...prev }
      delete next[orderId]
      return next
    })
    loadOrders()
  }

  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE)
  const paginatedOrders = orders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const ACTIVE_STATUSES = ['created', 'confirmed', 'payment_pending', 'paid', 'preparing', 'delivering']

  const busyRiderIds = new Set(
    orders
      .filter((o) => o.rider_id && ACTIVE_STATUSES.includes(o.status))
      .map((o) => o.rider_id)
  )

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
          {paginatedOrders.map((order) => {
            const subtotal = order.subtotal_amount ?? order.total_amount
            const deliveryFee = order.delivery_fee ?? 0
            const feeNeedsConfirmation = order.delivery_fee_confirmed === false
            const editingValue = feeEdits[order.id]

            return (
              <div key={order.id} className="bg-white rounded-xl border border-mil/30 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-mil/20">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-xs text-terre">
                        Commande #{order.id.split('-')[0].toUpperCase()} • {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        order.customer_id ? 'bg-nuit-diourbel/10 text-nuit-diourbel' : 'bg-mil/20 text-baobab'
                      }`}>
                        {order.customer_id ? 'Compte' : 'Invité'}
                      </span>
                      {feeNeedsConfirmation && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                          <AlertCircle className="w-3 h-3" /> Frais à confirmer
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-nuit-diourbel text-lg">
                      {order.total_amount.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="relative">
                      <select
                        value={order.rider_id ?? ''}
                        onChange={(e) => assignRider(order.id, e.target.value)}
                        className="appearance-none font-medium text-sm pl-8 pr-8 py-2 rounded-full border border-mil/40 bg-sable/50 text-nuit-diourbel outline-none cursor-pointer focus:ring-2 focus:ring-baobab transition-colors"
                      >
                        <option value="">Aucun livreur</option>
                        {riders.map((r) => {
                          const isBusyElsewhere = busyRiderIds.has(r.id) && r.id !== order.rider_id
                          return (
                            <option key={r.id} value={r.id} disabled={isBusyElsewhere}>
                              {r.name}{isBusyElsewhere ? ' (occupé)' : ''}
                            </option>
                          )
                        })}
                      </select>
                      <Truck className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-terre pointer-events-none" />
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
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-terre mt-0.5 shrink-0" />
                      <span className="text-nuit-diourbel">
                        {order.delivery_zones?.name ? `${order.delivery_zones.name} — ` : ''}{order.delivery_address}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="w-4 h-4 text-terre shrink-0" />
                      <span className="text-nuit-diourbel capitalize">{order.payment_method.replace('_', ' ')}</span>
                    </div>
                    {order.riders && (
                      <div className="flex items-center gap-2 text-sm">
                        <Truck className="w-4 h-4 text-terre shrink-0" />
                        <span className="text-nuit-diourbel">{order.riders.name}</span>
                      </div>
                    )}
                    {!order.customer_id && order.guest_phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-terre shrink-0" />
                        <span className="text-nuit-diourbel">
                          {order.guest_phone}
                          {order.guest_email ? ` · ${order.guest_email}` : ''}
                        </span>
                      </div>
                    )}
                    {!order.customer_id && order.tracking_code && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-terre shrink-0" />
                        <span className="text-nuit-diourbel font-mono">{order.tracking_code}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="bg-sable/50 rounded-lg p-3 text-sm">
                      <p className="font-medium text-terre mb-2 text-xs uppercase tracking-wider">Articles</p>
                      <ul className="space-y-1 mb-2">
                        {order.order_items.map((item, i) => (
                          <li key={i} className="flex justify-between text-nuit-diourbel">
                            <span>{item.quantity}× {item.products?.name ?? 'Produit inconnu'}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="border-t border-mil/20 pt-2 space-y-1">
                        <div className="flex justify-between text-nuit-diourbel/80 text-xs">
                          <span>Sous-total</span>
                          <span>{subtotal.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        <div className="flex justify-between items-center text-nuit-diourbel/80 text-xs">
                          <span>Livraison</span>
                          <span>{deliveryFee.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        <div className="flex justify-between font-semibold text-nuit-diourbel text-sm pt-1">
                          <span>Total</span>
                          <span>{order.total_amount.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder={`Corriger : ${deliveryFee}`}
                        value={editingValue ?? ''}
                        onChange={(e) => setFeeEdits((prev) => ({ ...prev, [order.id]: e.target.value }))}
                        className="w-full text-xs border border-mil/40 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-baobab/50 focus:border-baobab outline-none"
                      />
                      <button
                        onClick={() => saveDeliveryFee(order.id)}
                        disabled={editingValue === undefined || editingValue === '' || savingFeeFor === order.id}
                        className="shrink-0 flex items-center gap-1 text-xs bg-baobab text-white rounded-lg px-3 py-1.5 disabled:opacity-40 hover:bg-vert-feuille transition-colors"
                      >
                        {savingFeeFor === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Valider
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

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