export const ORDER_STATUSES = [
  'created',
  'paid',
  'preparing',
  'confirmed',
  'delivering',
  'delivered',
  'cancelled',
  'refunded',
] as const

export type OrderStatus = typeof ORDER_STATUSES[number]

export const STATUS_LABELS: Record<OrderStatus, string> = {
  created: 'Créée',
  paid: 'Payée',
  preparing: 'En préparation',
  confirmed: 'Confirmée',
  delivering: 'En livraison',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  refunded: 'Remboursée',
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  created: 'bg-gray-100 text-gray-800 border-gray-200',
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  preparing: 'bg-orange-100 text-orange-800 border-orange-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  delivering: 'bg-purple-100 text-purple-800 border-purple-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  refunded: 'bg-rose-100 text-rose-800 border-rose-200',
}

// Une commande peut encore être annulée tant qu'elle n'a pas atteint CONFIRMED
export const CANCELLABLE_STATUSES: OrderStatus[] = ['created', 'paid', 'preparing']

export function canCancelOrder(status: string): boolean {
  return CANCELLABLE_STATUSES.includes(status as OrderStatus)
}

// Statuts "finaux" : la commande n'évoluera plus
export const FINAL_STATUSES: OrderStatus[] = ['delivered', 'cancelled', 'refunded']

export function isActiveStatus(status: string): boolean {
  return !FINAL_STATUSES.includes(status as OrderStatus)
}
export const EXPIRATION_MINUTES = 30

export const STATUS_FLOW: OrderStatus[] = [
  'created',
  'paid',
  'preparing',
  'confirmed',
  'delivering',
  'delivered',
]

/**
 * Retourne la liste des prochains statuts autorisés depuis le statut courant,
 * en fonction du rôle du membre du staff ('super_admin', 'admin', 'moderator', etc.).
 */
export function allowedNextStatuses(current: string, role?: string | null): OrderStatus[] {
  const allowed: OrderStatus[] = []
  const idx = STATUS_FLOW.indexOf(current as OrderStatus)

  if (idx !== -1) {
    // Étape suivante dans l'ordre linéaire
    if (idx < STATUS_FLOW.length - 1) {
      allowed.push(STATUS_FLOW[idx + 1])
    }
    // Admin / super_admin : correction d'erreur autorisée en reculant d'une seule étape
    if ((role === 'admin' || role === 'super_admin') && idx > 0) {
      allowed.push(STATUS_FLOW[idx - 1])
    }
    // Annulation autorisée (tant que la commande n'a pas atteint confirmed)
    if (canCancelOrder(current)) {
      allowed.push('cancelled')
    }
  }

  return allowed
}