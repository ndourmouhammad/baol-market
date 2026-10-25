'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Inbox, MapPin, CreditCard, ChevronLeft, ChevronRight, Truck, Phone, ShieldCheck, RotateCcw } from 'lucide-react'
import {
  ORDER_STATUSES,
  STATUS_COLORS,
  canCancelOrder,
  isActiveStatus,
  allowedNextStatuses,
  getStatusLabel,
  FULFILLMENT_LABELS,
  type OrderStatus,
  type FulfillmentMethod,
} from '@/lib/orderStatus'

type OrderItem = {
  quantity: number
  unit_price: number
  size?: string | null
  products: { name: string } | null
}

type Rider = {
  id: string
  name: string
  region?: string | null
  department?: string | null
  has_photo?: boolean
  has_id_document?: boolean
}
type DeliveryZoneInfo = { id: string; name: string } | null
type StaffRole = 'super_admin' | 'admin' | 'moderator'

type Order = {
  id: string
  status: string
  payment_method: string
  total_amount: number
  subtotal_amount: number | null
  delivery_fee: number | null
  delivery_address: string
  created_at: string
  updated_at: string
  rider_id: string | null
  customer_id: string | null
  order_items: OrderItem[]
  riders: Rider | null
  delivery_zones: DeliveryZoneInfo
  profiles: { phone: string; first_name: string; last_name: string; email: string | null } | null
  paid_at: string | null
  refunded_at: string | null
  refund_reference: string | null
  fulfillment_method: string | null
  delivery_department: string | null
}

const FULFILLMENT_BADGES: Record<FulfillmentMethod, string> = {
  delivery: 'bg-blue-50 text-blue-700 border-blue-200',
  pickup: 'bg-purple-50 text-purple-700 border-purple-200',
  self_arranged: 'bg-gray-100 text-gray-700 border-gray-200',
}

const getStatusColor = (status: string) => STATUS_COLORS[status as OrderStatus] || 'bg-gray-100 text-gray-800 border-gray-200'
const ITEMS_PER_PAGE = 10

function needsRefund(order: Order): boolean {
  return order.status === 'cancelled' && !!order.paid_at && !order.refunded_at
}

/** Nombre de jours ouvrables (hors samedi et dimanche) depuis une date ISO. */
function businessDaysSince(isoDate: string): number {
  const start = new Date(isoDate)
  const now = new Date()
  let count = 0
  const d = new Date(start)
  d.setHours(0, 0, 0, 0)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  while (d < today) {
    d.setDate(d.getDate() + 1)
    const day = d.getDay()
    if (day !== 0 && day !== 6) count++
  }
  return count
}

function refundUrgencyColor(days: number): string {
  if (days >= 3) return 'text-red-600'
  if (days >= 2) return 'text-orange-500'
  return 'text-(--gris-texte)'
}

async function authFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${session?.access_token}` },
  })
}

type TabKey = 'all' | 'refund'

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [riders, setRiders] = useState<Rider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState<TabKey>('all')

  const [role, setRole] = useState<StaffRole | null>(null)

  // Fenêtre de confirmation par matricule (demandée par le serveur aux modérateurs)
  const [pendingChange, setPendingChange] = useState<{ orderId: string; status: string } | null>(null)
  const [matriculeInput, setMatriculeInput] = useState('')
  const [matriculeError, setMatriculeError] = useState('')
  const [confirming, setConfirming] = useState(false)

  // Modale de remboursement
  const [refundOrder, setRefundOrder] = useState<Order | null>(null)
  const [refundRef, setRefundRef] = useState('')
  const [refundError, setRefundError] = useState('')
  const [refunding, setRefunding] = useState(false)

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

  async function loadRole() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: staffRow } = await supabase.from('staff').select('role').eq('id', user.id).maybeSingle()
      setRole((staffRow?.role as StaffRole) ?? null)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOrders()
    loadRiders()
    loadRole()
  }, [])

  const canRefund = role === 'admin' || role === 'super_admin'

  // Filtrage par onglet
  const refundCount = orders.filter(needsRefund).length
  const filteredOrders = activeTab === 'refund' ? orders.filter(needsRefund) : orders

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE)
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  function switchTab(tab: TabKey) {
    setActiveTab(tab)
    setCurrentPage(1)
  }

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

  // --- Remboursement ---
  function openRefundModal(order: Order) {
    setRefundOrder(order)
    setRefundRef('')
    setRefundError('')
  }

  function closeRefundModal() {
    setRefundOrder(null)
    setRefundRef('')
    setRefundError('')
  }

  async function confirmRefund(e: React.FormEvent) {
    e.preventDefault()
    if (!refundOrder) return
    const trimmed = refundRef.trim()
    if (trimmed.length < 3) return

    setRefunding(true)
    setRefundError('')
    const res = await authFetch(`/api/admin/orders/${refundOrder.id}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference: trimmed }),
    })
    const json = await res.json().catch(() => ({}))
    setRefunding(false)

    if (res.ok) {
      closeRefundModal()
      loadOrders()
    } else {
      setRefundError(json.error || 'Erreur lors du remboursement.')
    }
  }

  const busyRiderIds = new Set(
    orders
      .filter(
        (o) =>
          o.rider_id &&
          isActiveStatus(o.status) &&
          (o.fulfillment_method === 'delivery' || !o.fulfillment_method)
      )
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

      {/* Onglets */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => switchTab('all')}
          className={`px-4 py-2 text-sm font-bold rounded-xl border transition-colors ${
            activeTab === 'all'
              ? 'bg-(--vert-baol) text-white border-(--vert-baol)'
              : 'bg-white text-(--gris-texte) border-gray-200 hover:bg-gray-50'
          }`}
        >
          Toutes ({orders.length})
        </button>
        <button
          onClick={() => switchTab('refund')}
          className={`px-4 py-2 text-sm font-bold rounded-xl border transition-colors ${
            activeTab === 'refund'
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-(--gris-texte) border-gray-200 hover:bg-gray-50'
          }`}
        >
          À rembourser ({refundCount})
        </button>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 text-(--gris-texte)">
          <Inbox className="w-12 h-12 mb-4 text-gray-300" />
          <p className="text-lg">{activeTab === 'refund' ? 'Aucune commande à rembourser.' : 'Aucune commande pour le moment.'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedOrders.map((order) => {
            const method: FulfillmentMethod = (order.fulfillment_method as FulfillmentMethod) || 'delivery'
            const isDelivery = method === 'delivery' || !order.fulfillment_method
            const subtotal = order.subtotal_amount ?? order.total_amount
            const deliveryFee = order.delivery_fee ?? 0
            const orderCancellable = canCancelOrder(order.status)
            const isRefundable = needsRefund(order)
            const isRefunded = order.status === 'refunded'
            const statusMenuDisabled = isRefunded || isRefundable
            const nextAllowed = allowedNextStatuses(order.status, role)

            return (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-gray-100">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-xs text-(--gris-texte)">
                        Commande #{order.id.split('-')[0].toUpperCase()} • {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${FULFILLMENT_BADGES[method]}`}>
                        {FULFILLMENT_LABELS[method]}
                      </span>
                      {!orderCancellable && isActiveStatus(order.status) && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          Non annulable
                        </span>
                      )}
                      {isRefundable && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          À rembourser
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-(--encre) text-lg">
                      {order.total_amount.toLocaleString('fr-FR')} FCFA
                    </p>

                    {/* Info remboursement à prévoir */}
                    {isRefundable && order.paid_at && (
                      <div className="mt-2 space-y-1">
                        {(() => {
                          const refundStart = order.updated_at && order.updated_at > order.paid_at
                            ? order.updated_at
                            : order.paid_at
                          const days = businessDaysSince(refundStart)
                          return (
                            <p className={`text-xs font-medium ${refundUrgencyColor(days)}`}>
                              À rembourser depuis {days} jour{days !== 1 ? 's' : ''} ouvrable{days !== 1 ? 's' : ''}
                            </p>
                          )
                        })()}
                        <p className="text-xs text-(--gris-texte)">
                          Montant : <span className="font-bold text-(--encre)">{order.total_amount.toLocaleString('fr-FR')} FCFA</span>
                          {order.profiles?.phone && (
                            <> · Tél : <span className="font-bold text-(--encre)">{order.profiles.phone}</span></>
                          )}
                        </p>
                        {canRefund ? (
                          <button
                            onClick={() => openRefundModal(order)}
                            className="mt-1 flex items-center gap-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Marquer comme remboursée
                          </button>
                        ) : (
                          <p className="text-xs font-medium text-orange-600 mt-1">Prévenir un admin</p>
                        )}
                      </div>
                    )}

                    {/* Commande remboursée */}
                    {isRefunded && (
                      <div className="mt-2">
                        <p className="text-xs font-bold text-rose-700">Remboursée</p>
                        {order.refund_reference && (
                          <p className="text-[11px] text-(--gris-texte)">
                            Réf. {order.refund_reference}
                            {order.refunded_at && (
                              <> · {new Date(order.refunded_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</>
                            )}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-start md:items-end gap-2 w-full md:w-auto">
                    <div className="flex flex-wrap gap-2 items-center">
                      {isDelivery ? (
                        <div className="relative">
                          <select
                            value={order.rider_id ?? ''}
                            onChange={(e) => assignRider(order.id, e.target.value)}
                            disabled={isRefunded}
                            className={`appearance-none font-bold text-sm pl-8 pr-8 py-2 rounded-xl border border-gray-200 bg-gray-50 text-(--encre) outline-none cursor-pointer focus:ring-2 focus:ring-(--vert-baol) transition-colors ${isRefunded ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <option value="">Aucun livreur</option>
                            {riders.map((r) => {
                              const isBusyElsewhere = busyRiderIds.has(r.id) && r.id !== order.rider_id
                              const isComplete = Boolean(r.region && r.department && r.has_id_document)
                              const isDisabled = isBusyElsewhere || (!isComplete && r.id !== order.rider_id)
                              return (
                                <option key={r.id} value={r.id} disabled={isDisabled}>
                                  {r.name}
                                  {!isComplete ? ' (dossier incomplet - inéligible)' : isBusyElsewhere ? ' (occupé)' : ''}
                                </option>
                              )
                            })}
                          </select>
                          <Truck className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-(--gris-texte) pointer-events-none" />
                        </div>
                      ) : (
                        order.rider_id && (
                          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-medium text-(--gris-texte)">
                            <Truck className="w-4 h-4 text-(--gris-texte)" />
                            <span>{order.riders?.name ?? 'Livreur affecté'}</span>
                          </div>
                        )
                      )}
                      <div className="relative">
                        <select
                          value={order.status}
                          onChange={(e) => updateStatus(order.id, e.target.value)}
                          disabled={statusMenuDisabled}
                          className={`appearance-none font-bold text-sm px-4 py-2 pr-8 rounded-xl border outline-none cursor-pointer focus:ring-2 focus:ring-(--vert-baol) transition-colors ${getStatusColor(order.status)} ${statusMenuDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {ORDER_STATUSES.map((s) => {
                            const isCurrent = s === order.status
                            const disabled = !isCurrent && !nextAllowed.includes(s)
                            return (
                              <option key={s} value={s} disabled={disabled}>
                                {getStatusLabel(s, order.fulfillment_method).toUpperCase()}
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
                    {order.fulfillment_method === 'pickup' && order.status === 'confirmed' && (
                      <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 font-medium max-w-xs text-left md:text-right">
                        Au passage à « Prête au retrait », le client est notifié : communiquez-lui l&apos;adresse de retrait.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-(--gris-texte) mt-0.5 shrink-0" />
                      <div className="text-(--encre) font-medium">
                        {method === 'delivery' && (
                          <span>{order.delivery_zones?.name ?? 'Zone non renseignée'}</span>
                        )}
                        {method === 'self_arranged' && (
                          <div>
                            <span>
                              Région : {order.delivery_zones?.name ?? 'Non renseignée'}
                              {order.delivery_department ? ` · Département : ${order.delivery_department}` : ''}
                            </span>
                            <span className="block text-xs font-normal text-(--gris-texte)">Livraison gérée par le client</span>
                          </div>
                        )}
                        {method === 'pickup' && (
                          <span className="text-xs text-(--gris-texte)">
                            Retrait : l&apos;adresse est à communiquer au client (notification ou appel)
                          </span>
                        )}
                      </div>
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
                            <span>
                              {item.quantity}× {item.products?.name ?? 'Produit inconnu'}
                              {item.size ? ` (taille ${item.size})` : ''}
                            </span>
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
              passer au statut <span className="font-bold text-(--encre)">{getStatusLabel(pendingChange.status, orders.find((o) => o.id === pendingChange.orderId)?.fulfillment_method).toUpperCase()}</span>.
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

      {/* Modale de remboursement */}
      {refundOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={confirmRefund}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-red-100 text-red-600 p-3 rounded-full">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-(--encre)">Marquer comme remboursée</h3>
            </div>
            <p className="text-(--gris-texte) mb-1 text-sm font-medium">
              Commande <span className="font-bold text-(--encre)">#{refundOrder.id.split('-')[0].toUpperCase()}</span>
            </p>
            <p className="text-(--gris-texte) mb-4 text-sm font-medium">
              Montant : <span className="font-bold text-(--encre)">{refundOrder.total_amount.toLocaleString('fr-FR')} FCFA</span>
            </p>
            <div className="space-y-1.5">
              <label className="font-bold text-(--encre) block text-sm">Référence du remboursement</label>
              <input
                type="text"
                value={refundRef}
                onChange={(e) => setRefundRef(e.target.value)}
                placeholder="N° de transaction du remboursement"
                autoFocus
                autoComplete="off"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-(--encre) text-sm focus:ring-2 focus:ring-(--vert-baol) focus:border-(--vert-baol) outline-none"
              />
            </div>
            {refundError && (
              <p className="text-red-600 text-sm bg-red-50 p-2 rounded-lg font-medium mt-3">{refundError}</p>
            )}
            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={closeRefundModal}
                className="px-4 py-2.5 text-(--gris-texte) hover:bg-gray-100 rounded-xl font-bold transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={refunding || refundRef.trim().length < 3}
                className="px-4 py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                {refunding ? 'En cours...' : 'Confirmer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
