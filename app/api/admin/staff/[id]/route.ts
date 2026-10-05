import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff, hasRole } from '@/lib/verifyStaff'
import { logActivity } from '@/lib/activityLog'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await verifyStaff(request)
  if (!staff || !hasRole(staff.role, 'admin')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params

  if (id === staff.user.id) {
    return NextResponse.json({ error: 'Vous ne pouvez pas retirer votre propre compte.' }, { status: 403 })
  }

  const { data: target, error: targetError } = await supabaseAdmin
    .from('staff')
    .select('role, email')
    .eq('id', id)
    .single()

  if (targetError || !target) {
    return NextResponse.json({ error: 'Membre introuvable.' }, { status: 404 })
  }
  if (target.role === 'super_admin') {
    return NextResponse.json({ error: 'Impossible de supprimer un super admin.' }, { status: 403 })
  }
  if (target.role === 'admin' && staff.role !== 'super_admin') {
    return NextResponse.json({ error: 'Seul un super admin peut retirer un admin.' }, { status: 403 })
  }

  // Chaque étape est vérifiée : si la première échoue, rien d'autre n'est supprimé
  const { error: staffDeleteError } = await supabaseAdmin.from('staff').delete().eq('id', id)
  if (staffDeleteError) {
    return NextResponse.json({ error: staffDeleteError.message }, { status: 500 })
  }

  await supabaseAdmin.from('staff_matricules').delete().eq('staff_id', id)

  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(id)

  // Le membre n'a plus accès à l'équipe dans tous les cas : on journalise le retrait
  await logActivity(staff, {
    action: 'staff_removed',
    entityType: 'staff',
    entityId: id,
    details: { email: target.email, role: target.role },
  })

  if (authDeleteError) {
    return NextResponse.json(
      {
        error:
          "Le membre a été retiré de l'équipe, mais son compte de connexion n'a pas pu être supprimé : " +
          authDeleteError.message,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}