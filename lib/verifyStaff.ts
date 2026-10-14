import { supabaseAdmin } from './supabaseAdmin'

export type StaffRole = 'super_admin' | 'admin' | 'moderator'

const ROLE_RANK: Record<StaffRole, number> = {
  moderator: 1,
  admin: 2,
  super_admin: 3,
}

interface VerifyStaffOptions {
  /** Autoriser l'accès même si must_change_password est activé (page de changement). */
  allowPasswordChange?: boolean
}

export async function verifyStaff(request: Request, options?: VerifyStaffOptions) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return null

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null

  const { data: staffRow } = await supabaseAdmin
    .from('staff')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!staffRow) return null

  const mustChangePassword = user.app_metadata?.must_change_password === true

  // Bloquer l'accès si le mot de passe doit être changé (sauf autorisation explicite)
  if (mustChangePassword && !options?.allowPasswordChange) return null

  return { user, role: staffRow.role as StaffRole, mustChangePassword }
}

export function hasRole(role: StaffRole, minimum: StaffRole) {
  return ROLE_RANK[role] >= ROLE_RANK[minimum]
}