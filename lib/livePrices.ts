// Prix actuels des produits, tels que le serveur les facturera à cet instant.
// Ce fichier ne dépend de rien d'autre : il peut être importé côté navigateur comme côté serveur.

export type LivePrice = {
  /** false si le produit est désactivé ou supprimé */
  available: boolean
  /** prix à payer maintenant (prix flash si une vente flash est en cours) */
  unitPrice: number
  /** prix normal du produit */
  regularPrice: number
  /** fin de la vente flash en cours, sinon null */
  flashEndsAt: string | null
}

/**
 * Demande au serveur le prix actuel de produits.
 * Retourne null si la demande échoue (hors connexion, serveur indisponible) :
 * l'appelant garde alors les prix qu'il connaît, et le serveur facturera de toute façon le bon prix.
 */
export async function fetchLivePrices(ids: string[]): Promise<Record<string, LivePrice> | null> {
  if (ids.length === 0) return {}
  try {
    const res = await fetch('/api/cart/prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.prices as Record<string, LivePrice>
  } catch {
    return null
  }
}
