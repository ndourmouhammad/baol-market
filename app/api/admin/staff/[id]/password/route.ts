import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff, hasRole } from '@/lib/verifyStaff'
import { logActivity } from '@/lib/activityLog'
import { generateSimplePassword, sendStaffEmail } from '@/lib/staffEmail'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await verifyStaff(request)
  if (!staff || !hasRole(staff.role, 'admin')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params

  // Interdit de se réinitialiser soi-même
  if (id === staff.user.id) {
    return NextResponse.json({ error: 'Vous ne pouvez pas réinitialiser votre propre mot de passe ici.' }, { status: 403 })
  }

  const { data: target, error: targetError } = await supabaseAdmin
    .from('staff')
    .select('role, email')
    .eq('id', id)
    .single()

  if (targetError || !target) {
    return NextResponse.json({ error: 'Membre introuvable.' }, { status: 404 })
  }

  // Impossible de cibler un super_admin
  if (target.role === 'super_admin') {
    return NextResponse.json({ error: 'Impossible de réinitialiser le mot de passe d\'un super admin.' }, { status: 403 })
  }

  // Seul un super_admin peut cibler un admin
  if (target.role === 'admin' && staff.role !== 'super_admin') {
    return NextResponse.json({ error: 'Seul un super admin peut réinitialiser le mot de passe d\'un admin.' }, { status: 403 })
  }

  const tempPassword = generateSimplePassword()

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(id, {
    password: tempPassword,
    app_metadata: { must_change_password: true },
  })

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const emailSent = await sendStaffEmail({
    to: target.email,
    role: target.role,
    tempPassword,
    kind: 'reset',
  })

  await logActivity(staff, {
    action: 'staff_password_reset',
    entityType: 'staff',
    entityId: id,
    // Jamais le mot de passe dans le journal
    details: { email: target.email, email_sent: emailSent },
  })

  return NextResponse.json({
    success: true,
    emailSent,
    ...(emailSent ? {} : { tempPassword }),
  })
}
