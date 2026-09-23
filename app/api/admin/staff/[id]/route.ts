import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff, hasRole } from '@/lib/verifyStaff'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await verifyStaff(request)
  if (!staff || !hasRole(staff.role, 'admin')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params

  const { data: target, error: targetError } = await supabaseAdmin
    .from('staff')
    .select('role')
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

  await supabaseAdmin.from('staff').delete().eq('id', id)
  await supabaseAdmin.auth.admin.deleteUser(id)

  return NextResponse.json({ success: true })
}