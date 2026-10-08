// Règles des ventes flash, partagées entre l'affichage (navigateur) et la commande (serveur).
// Ce fichier ne dépend de rien d'autre : il peut être importé partout.

export type FlashFields = {
  price: number | string
  flash_price?: number | string | null
  flash_starts_at?: string | null
  flash_ends_at?: string | null
}

export type FlashState = 'none' | 'scheduled' | 'active' | 'ended'

/** État de la vente flash d'un produit à un instant donné. */
export function flashState(product: FlashFields, now: Date = new Date()): FlashState {
  if (product.flash_price === null || product.flash_price === undefined || !product.flash_ends_at) return 'none'
  if (product.flash_starts_at && new Date(product.flash_starts_at) > now) return 'scheduled'
  if (new Date(product.flash_ends_at) <= now) return 'ended'
  return 'active'
}

export function isFlashActive(product: FlashFields, now: Date = new Date()): boolean {
  return flashState(product, now) === 'active'
}

/** Prix à facturer : le prix flash tant que la vente flash est en cours, sinon le prix normal. */
export function effectivePrice(product: FlashFields, now: Date = new Date()): number {
  return isFlashActive(product, now) ? Number(product.flash_price) : Number(product.price)
}

/** Pourcentage de remise (entier), 0 si pas de vente flash en cours. */
export function discountPercent(product: FlashFields, now: Date = new Date()): number {
  const normal = Number(product.price)
  if (!isFlashActive(product, now) || normal <= 0) return 0
  return Math.round((1 - Number(product.flash_price) / normal) * 100)
}

/** Vente flash prête à afficher sur une carte produit (calculée côté serveur). */
export type FlashDisplay = {
  price: number
  percent: number
  endsAt: string
}

/**
 * Données d'affichage de la vente flash d'un produit, ou null s'il n'y en a pas en ce moment.
 * Les pages serveur l'appellent une fois et passent le résultat aux cartes : l'écran affiche
 * toujours exactement ce que le serveur a calculé (pas de décalage entre serveur et navigateur).
 */
export function flashDisplay(product: FlashFields, now: Date = new Date()): FlashDisplay | null {
  if (!isFlashActive(product, now)) return null
  return {
    price: Number(product.flash_price),
    percent: discountPercent(product, now),
    endsAt: product.flash_ends_at as string,
  }
}

// --- Vérification des champs envoyés par l'admin (utilisée par les routes API) ---

type FlashExisting = {
  flash_price: number | string | null
  flash_starts_at: string | null
  flash_ends_at: string | null
}

export type FlashValues = {
  flash_price: number | null
  flash_starts_at: string | null
  flash_ends_at: string | null
}

// Retourne une date ISO, null si vide, undefined si invalide
function toIso(raw: unknown): string | null | undefined {
  if (raw === null || raw === '') return null
  if (typeof raw !== 'string') return undefined
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

/**
 * Vérifie la vente flash d'un produit.
 * - `values: null` : rien à changer pour la vente flash.
 * - `values` rempli : les trois colonnes à enregistrer (toutes nulles pour retirer la vente flash).
 * `price` est le prix normal (nouveau ou actuel) du produit.
 */
export function parseFlashInput(
  body: Record<string, unknown>,
  price: number,
  existing: FlashExisting | null
): { error: string } | { values: FlashValues | null } {
  const touched = ['flash_price', 'flash_starts_at', 'flash_ends_at'].some((key) => body[key] !== undefined)
  const existingPrice =
    existing && existing.flash_price !== null && existing.flash_price !== undefined
      ? Number(existing.flash_price)
      : null

  // Seul le prix normal change : il doit rester supérieur au prix de la vente flash en cours
  if (!touched) {
    if (existingPrice !== null && Number.isFinite(price) && existingPrice >= price) {
      return {
        error:
          'Le prix normal doit rester supérieur au prix de la vente flash. Modifiez ou retirez d\'abord la vente flash.',
      }
    }
    return { values: null }
  }

  const rawPrice = body.flash_price !== undefined ? body.flash_price : existingPrice

  // Prix vide : on retire la vente flash (prix et dates)
  if (rawPrice === null || rawPrice === '' || rawPrice === undefined) {
    return { values: { flash_price: null, flash_starts_at: null, flash_ends_at: null } }
  }

  if (!Number.isFinite(price) || price <= 0) return { error: 'Prix du produit invalide.' }

  const flashPrice = typeof rawPrice === 'number' ? rawPrice : Number(rawPrice)
  if (!Number.isInteger(flashPrice) || flashPrice <= 0) {
    return { error: 'Le prix de la vente flash doit être un nombre entier de FCFA supérieur à 0.' }
  }
  if (flashPrice >= price) {
    return { error: 'Le prix de la vente flash doit être inférieur au prix normal.' }
  }

  const ends = body.flash_ends_at !== undefined ? toIso(body.flash_ends_at) : existing?.flash_ends_at ?? null
  const starts = body.flash_starts_at !== undefined ? toIso(body.flash_starts_at) : existing?.flash_starts_at ?? null
  if (ends === undefined || starts === undefined) return { error: 'Date de vente flash invalide.' }
  if (!ends) return { error: 'Indiquez la date de fin de la vente flash.' }
  if (starts && new Date(ends) <= new Date(starts)) {
    return { error: 'La date de fin de la vente flash doit être après sa date de début.' }
  }

  return { values: { flash_price: flashPrice, flash_starts_at: starts, flash_ends_at: ends } }
}
