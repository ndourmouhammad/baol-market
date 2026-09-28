/**
 * Normalise un numéro saisi (avec ou sans +221, espaces, tirets) en format
 * canonique "221XXXXXXXXX" (9 chiffres après l'indicatif). Retourne null si invalide.
 */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/[^\d]/g, '')

  if (digits.startsWith('221')) {
    digits = digits.slice(3)
  }

  if (digits.length !== 9) return null

  return `221${digits}`
}

/**
 * Génère l'email technique interne associé à un numéro canonique.
 * Cet email n'est jamais montré au client et ne reçoit aucun message réel.
 */
export function phoneToSyntheticEmail(canonicalPhone: string): string {
  return `${canonicalPhone}@phone.baolmarket.internal`
}

/** Formate un numéro canonique pour l'affichage : "221781507505" -> "+221 78 150 75 05" */
export function formatPhoneDisplay(canonicalPhone: string): string {
  const local = canonicalPhone.slice(3)
  return `+221 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 7)} ${local.slice(7, 9)}`
}