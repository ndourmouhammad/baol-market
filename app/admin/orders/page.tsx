'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Inbox, MapPin, CreditCard, ChevronLeft, ChevronRight, Truck, Phone, ShieldCheck } from 'lucide-react'
import { ORDER_STATUSES, STATUS_LABELS, STATUS_COLORS, canCancelOrder, isActiveStatus, type OrderStatus } from '@/lib/orderStatus'

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
  delivery_address: string
  created_at: string
  rider_id: string | null
  customer_id: string | null
  order_items: OrderItem[]
  riders: Rider | null
  delivery_zones: DeliveryZoneInfo
  profiles: { phone: string; first_name: string; last_name: string; email: string | null } | null
}

const getStatusColor = (status: string) => STATUS_COLORS[status as OrderStatus] || 'bg-gray-100 text-gray-800 border-gray-200'
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

  // Fenêtre de confirmation par matricule (demandée par le serveur aux modérateurs)
  const [pendingChange, setPendingChange] = useState<{ orderId: string; status: string } | null>(null)
  const [matriculeInput, setMatriculeInput] = useState('')
  const [matriculeError, setMatriculeError] = useState('')
  const [confirming, setConfirming] = useState(false)

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

  async function sendStatusUpdate(orderId: string, status: string, matricule?: string) {
    const res = await authFetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(matricule ? { status, matricule } : { status }),
    })
    const json = await res.json().catch(() => ({}))
    return { ok: res.ok, json }
  }

  async function updateStatus(orderId: string, status: string) {
    const result = await sendStatusUpdate(orderId, status)
    if (result.ok) {
      loadOrders()
      return
    }

    // Le serveur demande le matricule aux modérateurs : on ouvre la fenêtre de confirmation
    if (result.json.code === 'MATRICULE_REQUIRED') {
      setPendingChange({ orderId, status })
      setMatriculeInput('')
      setMatriculeError('')
      return
    }

    alert(result.json.error || "Impossible de changer le statut.")
    loadOrders()
  }

  function closeMatriculeModal() {
    setPendingChange(null)
    setMatriculeInput('')
    setMatriculeError('')
  }

  async function confirmWithMatricule(e: React.FormEvent) {
    e.preventDefault()
    if (!pendingChange) return

    setConfirming(true)
    setMatriculeError('')
    const result = await sendStatusUpdate(pendingChange.orderId, pendingChange.status, matriculeInput)
    setConfirming(false)

    if (result.ok) {
      closeMatriculeModal()
      loadOrders()
      return
    }

    const code = result.json.code
    if (code === 'MATRICULE_INVALID' || code === 'MATRICULE_LOCKED' || code === 'MATRICULE_NOT_SET') {
      // On garde la fenêtre ouverte pour afficher le message (essais restants, blocage...)
      setMatriculeError(result.json.error)
      setMatriculeInput('')
      return
    }

    // Autre erreur (ex. annulation impossible) : on ferme et on l'affiche
    closeMatriculeModal()
    alert(result.json.error || "Impossible de changer le statut.")
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

  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE)
  const paginatedOrders = orders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const busyRiderIds = new Set(
    orders
      .filter((o) => o.rider_id && isActiveStatus(o.status))
      .map((o) => o.rider_id)
  )

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-(--gris-texte)">
        <Loader2 className="w-8 h-8 animate-spin text-(--vert-baol) mb-4" />
        <p>Chargement des commandes...</p>
      </div>
    )
  }

  if (error) return <p className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl">{error}</p>

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-(--encre) mb-6">
        Commandes <span className="text-(--gris-texte) text-lg font-normal">({orders.length})</span>
      </h2>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 text-(--gris-texte)">
          <Inbox className="w-12 h-12 mb-4 text-gray-300" />
          <p className="text-lg">Aucune commande pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedOrders.map((order) => {
            const subtotal = order.subtotal_amount ?? order.total_amount
            const deliveryFee = order.delivery_fee ?? 0
            const orderCancellable = canCancelOrder(order.status)

            return (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-gray-100">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-xs text-(--gris-texte)">
                        Commande #{order.id.split('-')[0].toUpperCase()} • {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {!orderCancellable && isActiveStatus(order.status) && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          Non annulable
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-(--encre) text-lg">
                      {order.total_amount.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="relative">
                      <select
                        value={order.rider_id ?? ''}
                        onChange={(e) => assignRider(order.id, e.target.value)}
                        className="appearance-none font-bold text-sm pl-8 pr-8 py-2 rounded-xl border border-gray-200 bg-gray-50 text-(--encre) outline-none cursor-pointer focus:ring-2 focus:ring-(--vert-baol) transition-colors"
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
                      <Truck className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-(--gris-texte) pointer-events-none" />
                    </div>
                    <div className="relative">
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        className={`appearance-none font-bold text-sm px-4 py-2 pr-8 rounded-xl border outline-none cursor-pointer focus:ring-2 focus:ring-(--vert-baol) transition-colors ${getStatusColor(order.status)}`}
                      >
                        {ORDER_STATUSES.map((s) => {
                          // On désactive "cancelled" dans le menu si la commande n'est plus annulable,
                          // sauf si c'est déjà son statut actuel (pour ne pas casser l'affichage).
                          const disabled = s === 'cancelled' && !orderCancellable && order.status !== 'cancelled'
                          return (
                            <option key={s} value={s} disabled={disabled}>
                              {STATUS_LABELS[s].toUpperCase()}
                            </option>
                          )
                        })}
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
                      <MapPin className="w-4 h-4 text-(--gris-texte) mt-0.5 shrink-0" />
                        <span className="text-(--encre) font-medium">
                        {order.delivery_zones?.name ?? 'Zone non renseignée'}
                        {order.delivery_fee === 0 && (
                          <span className="ml-2 text-xs font-normal text-(--gris-texte)">(livraison gérée par le client)</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="w-4 h-4 text-(--gris-texte) shrink-0" />
                      <span className="text-(--encre) font-medium capitalize">{order.payment_method.replace('_', ' ')}</span>
                    </div>
                    {order.riders && (
                      <div className="flex items-center gap-2 text-sm">
                        <Truck className="w-4 h-4 text-(--gris-texte) shrink-0" />
                        <span className="text-(--encre) font-medium">{order.riders.name}</span>
                      </div>
                    )}
                    {order.customer_id && order.profiles?.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-(--gris-texte) shrink-0" />
                        <span className="text-(--encre) font-medium">
                          {order.profiles.phone}
                          {order.profiles.first_name ? ` · ${order.profiles.first_name} ${order.profiles.last_name}` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="bg-gray-50 rounded-xl p-3 text-sm border border-gray-100">
                      <p className="font-bold text-(--gris-texte) mb-2 text-xs uppercase tracking-wider">Articles</p>
                      <ul className="space-y-1 mb-2">
                        {order.order_items.map((item, i) => (
                          <li key={i} className="flex justify-between text-(--encre)">
                            <span>{item.quantity}× {item.products?.name ?? 'Produit inconnu'}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="border-t border-gray-200 pt-2 space-y-1">
                        <div className="flex justify-between text-(--gris-texte) text-xs">
                          <span>Sous-total</span>
                          <span>{subtotal.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        <div className="flex justify-between items-center text-(--gris-texte) text-xs">
                          <span>Livraison</span>
                          <span>{deliveryFee.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        <div className="flex justify-between font-bold text-(--encre) text-sm pt-1">
                          <span>Total</span>
                          <span>{order.total_amount.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-100 rounded-2xl mt-6">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-(--gris-texte) hover:text-(--encre) disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Précédent
              </button>
              <span className="text-sm text-(--gris-texte) font-medium">
                Page {currentPage} sur {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-(--gris-texte) hover:text-(--encre) disabled:opacity-50 transition-colors"
              >
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation par matricule (modérateurs) */}
      {pendingChange && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={confirmWithMatricule}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-(--vert-baol)/10 text-(--vert-baol) p-3 rounded-full">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-(--encre)">Confirmez avec votre matricule</h3>
            </div>
            <p className="text-(--gris-texte) mb-4 text-sm font-medium">
              Commande #{pendingChange.orderId.split('-')[0].toUpperCase()} :{' '}
              passer au statut <span className="font-bold text-(--encre)">{STATUS_LABELS[pendingChange.status as OrderStatus]?.toUpperCase() ?? pendingChange.status}</span>.
            </p>
            <input
              type="text"
              value={matriculeInput}
              onChange={(e) => setMatriculeInput(e.target.value)}
              placeholder="MOD-123456"
              autoFocus
              autoComplete="off"
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-(--encre) font-mono text-lg tracking-wider focus:ring-2 focus:ring-(--vert-baol) focus:border-(--vert-baol) outline-none"
            />
            {matriculeError && (
              <p className="text-red-600 text-sm bg-red-50 p-2 rounded-lg font-medium mt-3">{matriculeError}</p>
            )}
            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={closeMatriculeModal}
                className="px-4 py-2.5 text-(--gris-texte) hover:bg-gray-100 rounded-xl font-bold transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={confirming || !matriculeInput.trim()}
                className="px-4 py-2.5 bg-(--vert-baol) text-white hover:bg-(--vert-baol-fonce) rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                {confirming ? 'Vérification...' : 'Confirmer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
