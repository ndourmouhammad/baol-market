import { SITE_URL } from './siteUrl'

export const VISIT_WHATSAPP_PHONE = '221781507505'

export type FulfillmentType = 'standard' | 'express' | 'visit'

export const FULFILLMENT_LABELS: Record<FulfillmentType, string> = {
  standard: 'Standard',
  express: 'Express',
  visit: 'Visite',
}

/**
 * Détermine si un produit relève d'une catégorie de type « visite » (immobilier, véhicules, etc.)
 */
export function isVisitProduct(product?: {
  fulfillment_type?: string | null
  categories?: { fulfillment_type?: string | null } | { fulfillment_type?: string | null }[] | null
} | null): boolean {
  if (!product) return false
  if (product.fulfillment_type === 'visit') return true
  if (Array.isArray(product.categories)) {
    return product.categories[0]?.fulfillment_type === 'visit'
  }
  return product.categories?.fulfillment_type === 'visit'
}

/**
 * Construit l'URL WhatsApp de demande de visite pour un produit.
 * Message attendu : « Bonjour, je souhaite visiter : {nom du produit} {URL de la fiche} »
 */
export function getVisitWhatsAppUrl(product: { id: string; name: string }): string {
  const productUrl = `${SITE_URL}/produit/${product.id}`
  const message = `Bonjour, je souhaite visiter : ${product.name} ${productUrl}`
  return `https://wa.me/${VISIT_WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`
}
