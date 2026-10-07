import { supabaseAdmin } from './supabaseAdmin'

export const PLACEMENTS = ['carousel', 'promo'] as const
export type Placement = (typeof PLACEMENTS)[number]

export const PLACEMENT_LABELS: Record<Placement, string> = {
  carousel: 'Carrousel',
  promo: 'Cartes promo',
}

// Nombre maximal de bannières enregistrées par emplacement (actives ou non)
export const MAX_BANNERS_PER_PLACEMENT = 30

// Seules les images téléversées dans le dossier "banners" sont acceptées :
// impossible d'afficher une image hébergée ailleurs.
export function bannerImagePrefix() {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/banners/`
}

const LIMITS = { title: 60, description: 140, badge: 24 }
const LINK_TYPES = ['none', 'category', 'product'] as const

export type BannerValues = {
  image_url?: string
  title?: string | null
  description?: string | null
  badge?: string | null
  link_type?: (typeof LINK_TYPES)[number]
  link_id?: string | null
  starts_at?: string | null
  ends_at?: string | null
  is_active?: boolean
  sort_order?: number
}

type ExistingBanner = {
  link_type: string
  link_id: string | null
  starts_at: string | null
  ends_at: string | null
}

/**
 * Vérifie et nettoie les champs envoyés par le navigateur. Seuls les champs prévus
 * sont retenus. `existing` sert à valider les champs qui dépendent les uns des autres
 * (lien, dates) lors d'une modification partielle.
 */
export async function parseBannerInput(
  body: Record<string, unknown>,
  existing?: ExistingBanner
): Promise<{ error: string } | { values: BannerValues }> {
  const values: BannerValues = {}

  if (body.image_url !== undefined) {
    if (
      typeof body.image_url !== 'string' ||
      body.image_url.length > 500 ||
      !body.image_url.startsWith(bannerImagePrefix())
    ) {
      return { error: 'Image invalide : téléversez une image depuis la page.' }
    }
    values.image_url = body.image_url
  }

  const textFields = [
    ['title', 'Le titre', LIMITS.title],
    ['description', 'La description', LIMITS.description],
    ['badge', "L'étiquette", LIMITS.badge],
  ] as const
  for (const [field, label, max] of textFields) {
    const raw = body[field]
    if (raw === undefined) continue
    if (raw !== null && typeof raw !== 'string') return { error: `${label} est invalide.` }
    const text = typeof raw === 'string' ? raw.trim() : ''
    if (text.length > max) return { error: `${label} est trop long (${max} caractères maximum).` }
    values[field] = text === '' ? null : text
  }

  if (body.is_active !== undefined) {
    if (typeof body.is_active !== 'boolean') return { error: 'Valeur invalide pour l\'activation.' }
    values.is_active = body.is_active
  }

  if (body.sort_order !== undefined) {
    if (typeof body.sort_order !== 'number' || !Number.isInteger(body.sort_order)) {
      return { error: "Ordre d'affichage invalide." }
    }
    values.sort_order = body.sort_order
  }

  // Lien : aucune destination, une catégorie ou un produit du site (jamais une adresse libre)
  if (body.link_type !== undefined || body.link_id !== undefined) {
    const linkType = body.link_type !== undefined ? body.link_type : existing?.link_type ?? 'none'
    if (!LINK_TYPES.includes(linkType as (typeof LINK_TYPES)[number])) {
      return { error: 'Type de lien invalide.' }
    }

    if (linkType === 'none') {
      values.link_type = 'none'
      values.link_id = null
    } else {
      const linkId = body.link_id !== undefined ? body.link_id : existing?.link_id
      if (typeof linkId !== 'string' || !linkId) {
        return { error: 'Choisissez la catégorie ou le produit du lien.' }
      }
      const table = linkType === 'category' ? 'categories' : 'products'
      const { data: target } = await supabaseAdmin.from(table).select('id').eq('id', linkId).maybeSingle()
      if (!target) return { error: "Le lien choisi n'existe pas." }
      values.link_type = linkType as 'category' | 'product'
      values.link_id = linkId
    }
  }

  // Dates de début et de fin (facultatives)
  for (const field of ['starts_at', 'ends_at'] as const) {
    const raw = body[field]
    if (raw === undefined) continue
    if (raw === null || raw === '') {
      values[field] = null
      continue
    }
    const date = typeof raw === 'string' ? new Date(raw) : null
    if (!date || Number.isNaN(date.getTime())) return { error: 'Date invalide.' }
    values[field] = date.toISOString()
  }

  const starts = values.starts_at !== undefined ? values.starts_at : existing?.starts_at
  const ends = values.ends_at !== undefined ? values.ends_at : existing?.ends_at
  if (starts && ends && new Date(ends) <= new Date(starts)) {
    return { error: 'La date de fin doit être après la date de début.' }
  }

  return { values }
}
