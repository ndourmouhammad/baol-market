import { supabaseAdmin } from './supabaseAdmin'

export type StaffRole = 'super_admin' | 'admin' | 'moderator'

const ROLE_RANK: Record<StaffRole, number> = {
  moderator: 1,
  admin: 2,
  super_admin: 3,
}

export async function verifyStaff(request: Request) {
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

  return { user, role: staffRow.role as StaffRole }
}

export function hasRole(role: StaffRole, minimum: StaffRole) {
  return ROLE_RANK[role] >= ROLE_RANK[minimum]
}