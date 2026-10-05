import { STATUS_LABELS, type OrderStatus } from './orderStatus'

// Textes lisibles des actions du journal. Pour journaliser une nouvelle action,
// il suffit d'ajouter une ligne ici : elle apparaîtra automatiquement dans la page Journal.
export const ACTION_LABELS: Record<string, string> = {
  order_status_changed: 'Changement de statut',
  order_rider_assigned: "Affectation d'un livreur",
}

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super admin',
  admin: 'Admin',
  moderator: 'Modérateur',
}

type Details = Record<string, unknown> | null | undefined

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

export function entityLabel(entityType: string | null, entityId: string | null): string {
  if (!entityType || !entityId) return '—'
  if (entityType === 'order') return `Commande #${entityId.split('-')[0].toUpperCase()}`
  return `${entityType} ${entityId}`
}

function statusText(value: unknown): string {
  return typeof value === 'string' ? (STATUS_LABELS[value as OrderStatus] ?? value) : '—'
}

export function detailsLabel(action: string, details: Details): string {
  if (!details) return '—'

  if (action === 'order_status_changed') {
    return `${statusText(details.from)} → ${statusText(details.to)}`
  }
  if (action === 'order_rider_assigned') {
    const from = typeof details.from === 'string' ? details.from : 'Aucun livreur'
    const to = typeof details.to === 'string' ? details.to : 'Aucun livreur'
    return `${from} → ${to}`
  }
  return '—'
}