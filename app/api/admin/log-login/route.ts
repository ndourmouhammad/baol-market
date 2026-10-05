import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff } from '@/lib/verifyStaff'
import { logActivity } from '@/lib/activityLog'

// Enregistre au journal la connexion d'un modérateur. Appelée par la page de connexion
// juste après une connexion réussie. Les admins et le super admin ne sont pas journalisés.
export async function POST(request: Request) {
  const staff = await verifyStaff(request)
  if (!staff) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  if (staff.role !== 'moderator') {
    return NextResponse.json({ success: true })
  }

  // Anti-doublon : pas plus d'une ligne de connexion par minute pour un même modérateur
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
  const { data: recent } = await supabaseAdmin
    .from('staff_activity_log')
    .select('id')
    .eq('actor_id', staff.user.id)
    .eq('action', 'staff_login')
    .gte('created_at', oneMinuteAgo)
    .limit(1)

  if (recent && recent.length > 0) {
    return NextResponse.json({ success: true })
  }

  await logActivity(staff, {
    action: 'staff_login',
    entityType: 'staff',
    entityId: staff.user.id,
    details: { email: staff.user.email },
  })

  return NextResponse.json({ success: true })
}