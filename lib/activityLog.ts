import { supabaseAdmin } from './supabaseAdmin'
import type { StaffRole } from './verifyStaff'

type Actor = {
  user: { id: string; email?: string | null }
  role: StaffRole
}

type ActivityEntry = {
  action: string
  entityType?: string
  entityId?: string
  details?: Record<string, unknown>
}

/**
 * Écrit une ligne dans le journal d'activité de l'équipe.
 * Si l'écriture échoue, on ne bloque jamais l'action de l'utilisateur :
 * l'erreur est seulement affichée dans les logs du serveur.
 */
export async function logActivity(actor: Actor, entry: ActivityEntry) {
  try {
    const { error } = await supabaseAdmin.from('staff_activity_log').insert({
      actor_id: actor.user.id,
      actor_email: actor.user.email ?? 'inconnu',
      actor_role: actor.role,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      details: entry.details ?? {},
    })
    if (error) console.error('Erreur écriture du journal:', error.message)
  } catch (e) {
    console.error('Erreur écriture du journal:', e)
  }
}