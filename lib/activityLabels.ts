import { STATUS_LABELS, type OrderStatus } from './orderStatus'

// Textes lisibles des actions du journal. Pour journaliser une nouvelle action,
// il suffit d'ajouter une ligne ici : elle apparaîtra automatiquement dans la page Journal.
export const ACTION_LABELS: Record<string, string> = {
  order_status_changed: 'Changement de statut',
  order_rider_assigned: "Affectation d'un livreur",
  product_created: 'Création de produit',
  product_updated: 'Modification de produit',
  product_availability_changed: "Disponibilité d'un produit",
  product_deleted: 'Suppression de produit',
  category_created: 'Création de catégorie',
  category_updated: 'Modification de catégorie',
  category_deleted: 'Suppression de catégorie',
  staff_created: 'Création de membre',
  staff_removed: 'Retrait de membre',
  staff_matricule_generated: 'Génération de matricule',
  staff_matricule_reset: 'Réinitialisation de matricule',
  staff_login: 'Connexion',
  merchant_created: 'Création de commerçant',
  merchant_updated: 'Modification de commerçant',
  merchant_deleted: 'Suppression de commerçant',
  rider_created: 'Création de livreur',
  rider_updated: 'Modification de livreur',
  rider_availability_changed: "Activité d'un livreur",
  rider_deleted: 'Suppression de livreur',
}

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super admin',
  admin: 'Admin',
  moderator: 'Modérateur',
}

type Details = Record<string, unknown> | null | undefined

// Modifications enregistrées dans le journal : avec les valeurs (nom, prix) ou simple repère
const FIELD_LABELS: Record<string, string> = {
  name: 'Nom',
  price: 'Prix',
}
const FLAG_LABELS: Record<string, string> = {
  description: 'Description modifiée',
  image_url: 'Image modifiée',
  category_id: 'Catégorie modifiée',
  merchant_id: 'Commerçant modifié',
  phone: 'Téléphone modifié',
  address: 'Adresse modifiée',
  notes: 'Notes modifiées',
}

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

export function entityLabel(entityType: string | null, entityId: string | null, details?: Details): string {
  if (!entityType) return '—'

  const name = details && typeof details.name === 'string' ? details.name : null

  if (entityType === 'order' && entityId) return `Commande #${entityId.split('-')[0].toUpperCase()}`
  if (entityType === 'product') return name ? `Produit « ${name} »` : 'Produit'
  if (entityType === 'category') return name ? `Catégorie « ${name} »` : 'Catégorie'
  if (entityType === 'staff') {
    const email = details && typeof details.email === 'string' ? details.email : null
    return email ? `Membre « ${email} »` : 'Membre'
  }

  if (entityType === 'merchant') return name ? `Commerçant « ${name} »` : 'Commerçant'
  if (entityType === 'rider') return name ? `Livreur « ${name} »` : 'Livreur'

  return entityId ? `${entityType} ${entityId}` : '—'
}

function statusText(value: unknown): string {
  return typeof value === 'string' ? (STATUS_LABELS[value as OrderStatus] ?? value) : '—'
}

function valueText(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (field === 'price' && typeof value === 'number') return `${value.toLocaleString('fr-FR')} FCFA`
  return String(value)
}

function changesText(changes: unknown): string {
  if (!Array.isArray(changes) || changes.length === 0) return '—'

  return changes
    .map((change) => {
      if (!change || typeof change !== 'object') return ''
      const { field, from, to } = change as { field?: string; from?: unknown; to?: unknown }
      if (!field) return ''
      if (FIELD_LABELS[field]) return `${FIELD_LABELS[field]} : ${valueText(field, from)} → ${valueText(field, to)}`
      return FLAG_LABELS[field] ?? field
    })
    .filter(Boolean)
    .join(' ; ')
}

export function detailsLabel(action: string, details: Details): string {
  if (!details) return '—'

  switch (action) {
    case 'order_status_changed':
      return `${statusText(details.from)} → ${statusText(details.to)}`
    case 'order_rider_assigned': {
      const from = typeof details.from === 'string' ? details.from : 'Aucun livreur'
      const to = typeof details.to === 'string' ? details.to : 'Aucun livreur'
      return `${from} → ${to}`
    }
    case 'product_created':
      return typeof details.price === 'number' ? `Prix : ${valueText('price', details.price)}` : '—'
    case 'product_updated':
    case 'category_updated':
    case 'merchant_updated':
    case 'rider_updated':
      return changesText(details.changes)
    case 'staff_created': {
      const role = typeof details.role === 'string' ? (ROLE_LABELS[details.role] ?? details.role) : '—'
      return details.matricule_generated === true ? `Rôle : ${role} · matricule généré` : `Rôle : ${role}`
    }
    case 'staff_removed': {
      const role = typeof details.role === 'string' ? (ROLE_LABELS[details.role] ?? details.role) : '—'
      return `Rôle : ${role}`
    }
    case 'product_availability_changed':
    case 'rider_availability_changed':
      return details.to === true ? 'Activé' : details.to === false ? 'Désactivé' : '—'
    default:
      return '—'
  }
}