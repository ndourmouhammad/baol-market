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
 * Les 14 régions du Sénégal avec leurs départements (y compris Diourbel).
 * Utilisé par les fiches partenaires (admin). Le sélecteur client (hors Diourbel)
 * continue d'utiliser SENEGAL_DEPARTMENTS_BY_REGION ci-dessus.
 */
export const ALL_REGIONS_WITH_DEPARTMENTS: Record<string, string[]> = {
  ...SENEGAL_DEPARTMENTS_BY_REGION,
  Diourbel: DIOURBEL_DEPARTMENTS,
}

/**
 * Retourne les 14 régions et leurs départements (trié par nom de région).
 */
export function getAllRegionsWithDepartments(): Record<string, string[]> {
  return ALL_REGIONS_WITH_DEPARTMENTS
}

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
 * Cherche dans les 13 régions hors Diourbel uniquement (pour le sélecteur client).
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
 * Récupère la liste des départements pour une région donnée parmi les 14 (incluant Diourbel).
 * Utilisé par les fiches partenaires (admin).
 */
export function getDepartmentsForAllRegions(regionName: string): string[] {
  if (!regionName) return []
  const norm = normalizeSenegalName(regionName)
  for (const [region, depts] of Object.entries(ALL_REGIONS_WITH_DEPARTMENTS)) {
    if (normalizeSenegalName(region) === norm) {
      return depts
    }
  }
  return []
}

/**
 * Vérifie si un département est valide pour une région donnée (13 régions hors Diourbel).
 */
export function isValidDepartmentForRegion(regionName: string, departmentName: string): boolean {
  if (!regionName || !departmentName) return false
  const depts = getDepartmentsForRegion(regionName)
  const normDept = normalizeSenegalName(departmentName)
  return depts.some((d) => normalizeSenegalName(d) === normDept)
}

/**
 * Valide qu'une région existe et que le département lui appartient (14 régions).
 * Utilisé par les routes API admin pour les fiches partenaires.
 */
export function validateRegionDepartment(region: string, department: string): { valid: boolean; error?: string } {
  if (!region) return { valid: false, error: 'La région est obligatoire.' }
  if (!department) return { valid: false, error: 'Le département est obligatoire.' }

  const norm = normalizeSenegalName(region)
  const regionEntry = Object.keys(ALL_REGIONS_WITH_DEPARTMENTS).find(
    (r) => normalizeSenegalName(r) === norm
  )
  if (!regionEntry) return { valid: false, error: `Région inconnue : ${region}` }

  const depts = ALL_REGIONS_WITH_DEPARTMENTS[regionEntry]
  const normDept = normalizeSenegalName(department)
  const found = depts.some((d) => normalizeSenegalName(d) === normDept)
  if (!found) return { valid: false, error: `Le département « ${department} » n'appartient pas à la région « ${regionEntry} ».` }

  return { valid: true }
}
