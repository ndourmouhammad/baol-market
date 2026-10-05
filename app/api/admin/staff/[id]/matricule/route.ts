import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff, hasRole } from '@/lib/verifyStaff'
import { setMatricule } from '@/lib/matricule'

// Réinitialise le matricule d'un modérateur (oubli, blocage, ou modérateur créé avant
// l'introduction des matricules). L'ancien matricule devient invalide.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await verifyStaff(request)
  if (!staff || !hasRole(staff.role, 'admin')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params

  const { data: target } = await supabaseAdmin
    .from('staff')
    .select('role')
    .eq('id', id)
    .maybeSingle()

  if (!target) {
    return NextResponse.json({ error: 'Membre introuvable.' }, { status: 404 })
  }
  if (target.role !== 'moderator') {
    return NextResponse.json({ error: 'Seuls les modérateurs ont un matricule.' }, { status: 400 })
  }

  const result = await setMatricule(id)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ success: true, matricule: result.matricule })
}