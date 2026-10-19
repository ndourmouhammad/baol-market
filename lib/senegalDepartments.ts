/**
 * Données statiques des départements du Sénégal par région (hors Diourbel pour le sélecteur client).
 * Source de référence : découpage administratif du Sénégal (46 départements, 14 régions).
 */

export const SENEGAL_DEPARTMENTS_BY_REGION: Record<string, string[]> = {
  Dakar: ['Dakar', 'Guédiawaye', 'Pikine', 'Rufisque', 'Keur Massar'],
  Fatick: ['Fatick', 'Foundiougne', 'Gossas'],
  Kaffrine: ['Birkelane', 'Kaffrine', 'Koungheul', 'Malem Hodar'],
  Kaolack: ['Guinguinéo', 'Kaolack', 'Nioro du Rip'],
  Kédougou: ['Kédougou', 'Salémata', 'Saraya'],
  Kolda: ['Kolda', 'Médina Yoro Foulah', 'Vélingara'],
  Louga: ['Kébémer', 'Linguère', 'Louga'],
  Matam: ['Kanel', 'Matam', 'Ranérou-Ferlo'],
  'Saint-Louis': ['Dagana', 'Podor', 'Saint-Louis'],
  Sédhiou: ['Bounkiling', 'Goudomp', 'Sédhiou'],
  Tambacounda: ['Bakel', 'Goudiry', 'Koumpentoum', 'Tambacounda'],
  Thiès: ['Mbour', 'Thiès', 'Tivaouane'],
  Ziguinchor: ['Bignona', 'Oussouye', 'Ziguinchor'],
}

// Diourbel pour mémoire (non proposé par le sélecteur Hors Diourbel)
export const DIOURBEL_DEPARTMENTS: string[] = ['Bambey', 'Diourbel', 'Mbacké']

/**
 * Normalise une chaîne pour comparaison insensible à la casse et aux accents.
 */
export function normalizeSenegalName(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Comparaison de deux noms de région ou département tolérante à la casse et aux accents.
 */
export function areSenegalNamesEqual(a: string, b: string): boolean {
  return normalizeSenegalName(a) === normalizeSenegalName(b)
}

/**
 * Récupère la liste des départements pour une région donnée (tolérant aux accents et à la casse).
 */
export function getDepartmentsForRegion(regionName: string): string[] {
  if (!regionName) return []
  const norm = normalizeSenegalName(regionName)
  for (const [region, depts] of Object.entries(SENEGAL_DEPARTMENTS_BY_REGION)) {
    if (normalizeSenegalName(region) === norm) {
      return depts
    }
  }
  return []
}

/**
 * Vérifie si un département est valide pour une région donnée.
 */
export function isValidDepartmentForRegion(regionName: string, departmentName: string): boolean {
  if (!regionName || !departmentName) return false
  const depts = getDepartmentsForRegion(regionName)
  const normDept = normalizeSenegalName(departmentName)
  return depts.some((d) => normalizeSenegalName(d) === normDept)
}
