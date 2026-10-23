/** Constantes partagées pour le type de bannière (safe côté client et serveur). */

export const BANNER_KINDS = ['promo', 'new_arrival'] as const
export type BannerKind = (typeof BANNER_KINDS)[number]

export const BANNER_KIND_LABELS: Record<BannerKind, string> = {
  promo: 'Promotion',
  new_arrival: 'Nouvel arrivage',
}
