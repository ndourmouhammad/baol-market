// Presets de tailles et utilitaires de validation et de tri
// Baol Market - 2026-10-23

export const SIZE_PRESETS = {
  letters: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
  shoes: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47'],
  pants: ['28', '30', '32', '34', '36', '38', '40', '42', '44', '46'],
} as const

const LETTER_WEIGHTS: Record<string, number> = {
  'XXS': 10,
  'XS': 20,
  'S': 30,
  'M': 40,
  'L': 50,
  'XL': 60,
  '2XL': 70,
  'XXL': 70,
  '3XL': 80,
  'XXXL': 80,
  '4XL': 90,
  '5XL': 100,
}

/**
 * Valide et normalise une liste de tailles.
 * - Doit être un tableau
 * - Chaque élément est découpé/trim
 * - Longueur de chaque taille : 1 à 12 caractères
 * - Aucun doublon
 * - Maximum 30 tailles
 * - Lève une erreur en français si invalide
 */
export function normalizeSizes(input: unknown): string[] {
  if (input === null || input === undefined) {
    return []
  }

  if (!Array.isArray(input)) {
    throw new Error('La liste des tailles doit être un tableau.')
  }

  if (input.length === 0) {
    return []
  }

  if (input.length > 30) {
    throw new Error('Le nombre maximum de tailles est de 30.')
  }

  const seen = new Set<string>()
  const result: string[] = []

  for (const item of input) {
    if (typeof item !== 'string') {
      throw new Error('Chaque taille doit être une chaîne de caractères.')
    }
    const trimmed = item.trim()
    if (trimmed.length < 1 || trimmed.length > 12) {
      throw new Error('Chaque taille doit comporter entre 1 et 12 caractères.')
    }

    const key = trimmed.toUpperCase()
    if (seen.has(key)) {
      throw new Error(`La taille "${trimmed}" est présente en double.`)
    }
    seen.add(key)
    result.push(trimmed)
  }

  return result
}

/**
 * Ordonne les tailles :
 * 1. Les lettres connues (S < M < L < XL < 2XL < 3XL...)
 * 2. Les nombres croissants (ex : 35, 36, 37...)
 * 3. Les autres valeurs textuelles par ordre alphabétique
 */
export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const aTrim = a.trim()
    const bTrim = b.trim()
    const aUpper = aTrim.toUpperCase()
    const bUpper = bTrim.toUpperCase()

    const aWeight = LETTER_WEIGHTS[aUpper]
    const bWeight = LETTER_WEIGHTS[bUpper]

    // Si les deux sont des lettres connues
    if (aWeight !== undefined && bWeight !== undefined) {
      return aWeight - bWeight
    }
    // Une seule est une lettre connue -> elle vient en premier
    if (aWeight !== undefined) return -1
    if (bWeight !== undefined) return 1

    // Vérifier si ce sont des nombres
    const aNum = Number(aTrim)
    const bNum = Number(bTrim)
    const aIsNum = !isNaN(aNum) && aTrim !== ''
    const bIsNum = !isNaN(bNum) && bTrim !== ''

    if (aIsNum && bIsNum) {
      return aNum - bNum
    }
    if (aIsNum) return -1
    if (bIsNum) return 1

    // Sinon comparaison alphabétique standard
    return aTrim.localeCompare(bTrim, 'fr')
  })
}
