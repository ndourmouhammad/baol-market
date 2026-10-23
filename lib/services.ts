/**
 * Définitions et utilitaires pour la rubrique Services (professionnels de Diourbel).
 */

import { DIOURBEL_DEPARTMENTS } from './senegalDepartments'

export const SERVICE_PROFESSIONS = [
  'mason',
  'plumber',
  'carpenter',
  'electrician',
  'painter',
  'taxi',
] as const

export type ServiceProfession = (typeof SERVICE_PROFESSIONS)[number]

export interface ProfessionMeta {
  key: ServiceProfession
  label: string
  labelPlural: string
}

export const PROFESSIONS: Record<ServiceProfession, ProfessionMeta> = {
  mason: { key: 'mason', label: 'Maçon', labelPlural: 'Maçons' },
  plumber: { key: 'plumber', label: 'Plombier', labelPlural: 'Plombiers' },
  carpenter: { key: 'carpenter', label: 'Menuisier', labelPlural: 'Menuisiers' },
  electrician: { key: 'electrician', label: 'Électricien', labelPlural: 'Électriciens' },
  painter: { key: 'painter', label: 'Peintre', labelPlural: 'Peintres' },
  taxi: { key: 'taxi', label: 'Taximan', labelPlural: 'Taximen' },
}

export const PROFESSIONS_LIST = Object.values(PROFESSIONS)

/**
 * Représentation souple d'un prestataire (base de données ou API client).
 * Permet d'évaluer la complétude avec photo_path/id_document_path ou has_photo/has_id_document.
 */
export interface ServiceProviderLike {
  id?: string
  first_name?: string | null
  last_name?: string | null
  profession?: string | null
  years_experience?: number | null
  department?: string | null
  neighborhood?: string | null
  address_details?: string | null
  phone?: string | null
  is_active?: boolean | null
  photo_path?: string | null
  id_document_path?: string | null
  license_path?: string | null
  insurance_path?: string | null
  has_photo?: boolean | null
  has_id_document?: boolean | null
  has_license?: boolean | null
  has_insurance?: boolean | null
  license_expires_on?: string | null
  insurance_expires_on?: string | null
}

/**
 * Retourne la date courante au fuseau horaire de Dakar au format YYYY-MM-DD.
 */
export function getTodayDakar(): string {
  return new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Africa/Dakar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/**
 * Vérifie si le département fait partie des départements officiels de Diourbel.
 */
export function isValidDiourbelDepartment(department: string | null | undefined): boolean {
  if (!department) return false
  return DIOURBEL_DEPARTMENTS.includes(department.trim())
}

function hasPresence(value: string | null | undefined, boolFlag?: boolean | null): boolean {
  if (boolFlag !== undefined && boolFlag !== null) return boolFlag
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Vérifie si le dossier d'un prestataire est complet :
 * - Prénom, nom, métier valide, département de Diourbel
 * - Photo et CNI présents
 * - Si taxi : permis ET assurance présents avec leurs dates de fin renseignées
 */
export function isDossierComplete(provider: ServiceProviderLike): boolean {
  const firstNameOk = typeof provider.first_name === 'string' && provider.first_name.trim().length > 0
  const lastNameOk = typeof provider.last_name === 'string' && provider.last_name.trim().length > 0
  const professionOk = typeof provider.profession === 'string' && SERVICE_PROFESSIONS.includes(provider.profession as ServiceProfession)
  const departmentOk = isValidDiourbelDepartment(provider.department)
  const photoOk = hasPresence(provider.photo_path, provider.has_photo)
  const idDocumentOk = hasPresence(provider.id_document_path, provider.has_id_document)

  if (!firstNameOk || !lastNameOk || !professionOk || !departmentOk || !photoOk || !idDocumentOk) {
    return false
  }

  if (provider.profession === 'taxi') {
    const licenseOk = hasPresence(provider.license_path, provider.has_license)
    const insuranceOk = hasPresence(provider.insurance_path, provider.has_insurance)
    const licenseExpiresOk = typeof provider.license_expires_on === 'string' && provider.license_expires_on.trim().length > 0
    const insuranceExpiresOk = typeof provider.insurance_expires_on === 'string' && provider.insurance_expires_on.trim().length > 0

    if (!licenseOk || !insuranceOk || !licenseExpiresOk || !insuranceExpiresOk) {
      return false
    }
  }

  return true
}

/**
 * Vérifie si le prestataire est visible publiquement :
 * - is_active = true
 * - dossier complet
 * - pour 'taxi', permis et assurance non expirés (fuseau Africa/Dakar)
 */
export function isPubliclyVisible(provider: ServiceProviderLike): boolean {
  if (!provider.is_active) return false
  if (!isDossierComplete(provider)) return false

  if (provider.profession === 'taxi') {
    const today = getTodayDakar()
    if (!provider.license_expires_on || provider.license_expires_on < today) return false
    if (!provider.insurance_expires_on || provider.insurance_expires_on < today) return false
  }

  return true
}

/**
 * Retourne la liste des éléments manquants ou expirés d'un dossier en français.
 */
export function dossierIssues(provider: ServiceProviderLike): string[] {
  const issues: string[] = []
  const today = getTodayDakar()

  if (!provider.first_name?.trim()) issues.push('Prénom manquant')
  if (!provider.last_name?.trim()) issues.push('Nom manquant')
  if (!provider.profession || !SERVICE_PROFESSIONS.includes(provider.profession as ServiceProfession)) {
    issues.push('Métier non renseigné ou invalide')
  }
  if (!provider.department?.trim()) {
    issues.push('Département manquant')
  } else if (!isValidDiourbelDepartment(provider.department)) {
    issues.push(`Département hors de Diourbel (${DIOURBEL_DEPARTMENTS.join(', ')})`)
  }

  if (!hasPresence(provider.photo_path, provider.has_photo)) {
    issues.push('Photo de profil manquante')
  }
  if (!hasPresence(provider.id_document_path, provider.has_id_document)) {
    issues.push("Pièce d'identité (CNI) manquante")
  }

  if (provider.profession === 'taxi') {
    if (!hasPresence(provider.license_path, provider.has_license)) {
      issues.push('Permis de conduire manquant')
    }
    if (!provider.license_expires_on?.trim()) {
      issues.push('Date de validité du permis manquante')
    } else if (provider.license_expires_on < today) {
      issues.push('Permis de conduire expiré')
    }

    if (!hasPresence(provider.insurance_path, provider.has_insurance)) {
      issues.push('Attestation d’assurance manquante')
    }
    if (!provider.insurance_expires_on?.trim()) {
      issues.push('Date de validité de l’assurance manquante')
    } else if (provider.insurance_expires_on < today) {
      issues.push('Assurance expirée')
    }
  }

  return issues
}

/**
 * Statut d'expiration d'une date :
 * - 'expired' si date < today
 * - 'expiring_soon' si date >= today et date <= today + 30j
 * - 'valid' sinon
 * - null si pas de date
 */
export function getExpiryStatus(dateStr: string | null | undefined): 'expired' | 'expiring_soon' | 'valid' | null {
  if (!dateStr) return null
  const todayStr = getTodayDakar()
  if (dateStr < todayStr) return 'expired'

  const today = new Date(todayStr)
  const target = new Date(dateStr)
  const diffTime = target.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays <= 30) return 'expiring_soon'
  return 'valid'
}

/**
 * Formate le nom public d'un prestataire : « Prénom I. »
 * Ex: "Moussa Diop" -> "Moussa D."
 */
export function formatProviderPublicName(firstName: string, lastName: string): string {
  const f = firstName.trim()
  const l = lastName.trim()
  if (!l) return f
  const initial = l.charAt(0).toUpperCase()
  return `${f} ${initial}.`
}

/**
 * Formate les années d'expérience en français.
 * - 0 -> "Moins d'un an"
 * - 1 -> "1 an d'expérience"
 * - N -> "N ans d'expérience"
 */
export function formatYearsExperience(years: number): string {
  if (years <= 0) return "Moins d'un an"
  if (years === 1) return "1 an d'expérience"
  return `${years} ans d'expérience`
}
