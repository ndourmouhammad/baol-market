import crypto from 'crypto'
import { supabaseAdmin } from './supabaseAdmin'

// Après 3 erreurs de saisie, le matricule est bloqué pendant 15 minutes
export const MAX_FAILED_ATTEMPTS = 3
export const LOCK_MINUTES = 15

/** Génère un code à 6 chiffres avec un générateur cryptographiquement sûr. */
function generateCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

/** Affichage : "482913" -> "MOD-482913" */
export function formatMatricule(code: string): string {
  return `MOD-${code}`
}

/** Accepte "MOD-482913", "mod 482913" ou "482913". Retourne les 6 chiffres, ou null si invalide. */
export function normalizeMatriculeInput(input: string): string | null {
  const cleaned = input.trim().toUpperCase().replace(/^MOD[-\s]?/, '').replace(/\s/g, '')
  return /^\d{6}$/.test(cleaned) ? cleaned : null
}

/**
 * Empreinte du matricule : HMAC avec un secret serveur. Un code à 6 chiffres seul
 * se retrouverait en quelques secondes par essais si la base fuitait ; avec le
 * secret, l'empreinte seule ne permet pas de le retrouver.
 */
function hashMatricule(staffId: string, code: string): string {
  const secret = process.env.MATRICULE_SECRET
  if (!secret) throw new Error('MATRICULE_SECRET manquant dans la configuration.')
  return crypto.createHmac('sha256', secret).update(`${staffId}:${code}`).digest('hex')
}

/**
 * Génère (ou régénère) le matricule d'un membre. L'ancien devient invalide et
 * le blocage éventuel est levé. Le matricule en clair n'est retourné qu'ici,
 * il n'est jamais stocké.
 */
export async function setMatricule(staffId: string): Promise<{ matricule: string } | { error: string }> {
  try {
    const code = generateCode()
    const { error } = await supabaseAdmin.from('staff_matricules').upsert(
      {
        staff_id: staffId,
        matricule_hash: hashMatricule(staffId, code),
        failed_attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'staff_id' }
    )
    if (error) return { error: error.message }
    return { matricule: formatMatricule(code) }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

/** Retourne l'ensemble des identifiants qui ont déjà un matricule. */
export async function getStaffIdsWithMatricule(staffIds: string[]): Promise<Set<string>> {
  if (staffIds.length === 0) return new Set()
  const { data } = await supabaseAdmin
    .from('staff_matricules')
    .select('staff_id')
    .in('staff_id', staffIds)
  return new Set((data || []).map((row) => row.staff_id as string))
}

export type MatriculeCheck =
  | { ok: true }
  | { ok: false; reason: 'not_set' | 'locked' | 'wrong'; message: string }

/**
 * Vérifie le matricule saisi par un membre (utilisé à l'étape suivante, pour
 * confirmer les changements de statut). Gère le compteur d'erreurs et le blocage.
 */
export async function verifyMatricule(staffId: string, input: string): Promise<MatriculeCheck> {
  const { data: row } = await supabaseAdmin
    .from('staff_matricules')
    .select('matricule_hash, failed_attempts, locked_until')
    .eq('staff_id', staffId)
    .maybeSingle()

  if (!row) {
    return {
      ok: false,
      reason: 'not_set',
      message: "Aucun matricule n'est défini pour votre compte. Demandez à un admin d'en générer un.",
    }
  }

  if (row.locked_until && new Date(row.locked_until) > new Date()) {
    const minutes = Math.ceil((new Date(row.locked_until).getTime() - Date.now()) / 60000)
    return {
      ok: false,
      reason: 'locked',
      message: `Trop d'erreurs. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`,
    }
  }

  const code = normalizeMatriculeInput(input)
  let valid = false
  if (code) {
    const expected = Buffer.from(row.matricule_hash, 'hex')
    const provided = Buffer.from(hashMatricule(staffId, code), 'hex')
    valid = provided.length === expected.length && crypto.timingSafeEqual(provided, expected)
  }

  if (valid) {
    if (row.failed_attempts > 0 || row.locked_until) {
      await supabaseAdmin
        .from('staff_matricules')
        .update({ failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString() })
        .eq('staff_id', staffId)
    }
    return { ok: true }
  }

  // Un blocage expiré remet le compteur à zéro
  const baseAttempts = row.locked_until ? 0 : row.failed_attempts
  const attempts = baseAttempts + 1

  if (attempts >= MAX_FAILED_ATTEMPTS) {
    await supabaseAdmin
      .from('staff_matricules')
      .update({
        failed_attempts: 0,
        locked_until: new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('staff_id', staffId)
    return {
      ok: false,
      reason: 'locked',
      message: `Trop d'erreurs. Matricule bloqué pendant ${LOCK_MINUTES} minutes.`,
    }
  }

  await supabaseAdmin
    .from('staff_matricules')
    .update({ failed_attempts: attempts, locked_until: null, updated_at: new Date().toISOString() })
    .eq('staff_id', staffId)

  const remaining = MAX_FAILED_ATTEMPTS - attempts
  return {
    ok: false,
    reason: 'wrong',
    message: `Matricule incorrect. Il vous reste ${remaining} essai${remaining > 1 ? 's' : ''}.`,
  }
}