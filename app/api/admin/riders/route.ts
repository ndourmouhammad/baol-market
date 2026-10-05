import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff, hasRole } from '@/lib/verifyStaff'
import { logActivity } from '@/lib/activityLog'

export async function GET(request: Request) {
  const staff = await verifyStaff(request)
  if (!staff) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('riders')
    .select('id, name, phone, is_active')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ riders: data })
}

export async function POST(request: Request) {
  const staff = await verifyStaff(request)
  if (!staff || !hasRole(staff.role, 'admin')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const body = await request.json()
  const { data: created, error } = await supabaseAdmin
    .from('riders')
    .insert({
      name: body.name,
      phone: body.phone,
      is_active: true,
    })
    .select('id')
    .single()

  if (error || !created) {
    return NextResponse.json({ error: error?.message || 'Impossible de créer le livreur.' }, { status: 500 })
  }

  await logActivity(staff, {
    action: 'rider_created',
    entityType: 'rider',
    entityId: created.id,
    details: { name: body.name },
  })

  return NextResponse.json({ success: true })
}