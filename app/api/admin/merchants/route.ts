import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff, hasRole } from '@/lib/verifyStaff'
import { logActivity } from '@/lib/activityLog'

export async function GET(request: Request) {
  const staff = await verifyStaff(request)
  if (!staff) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('merchants')
    .select('id, name, phone, address, notes, category_id, categories(name)')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ merchants: data })
}

export async function POST(request: Request) {
  const staff = await verifyStaff(request)
  if (!staff || !hasRole(staff.role, 'admin')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const body = await request.json()
  const { data: created, error } = await supabaseAdmin
    .from('merchants')
    .insert({
      name: body.name,
      phone: body.phone,
      address: body.address,
      notes: body.notes || null,
      category_id: body.category_id || null,
    })
    .select('id')
    .single()

  if (error || !created) {
    return NextResponse.json({ error: error?.message || 'Impossible de créer le commerçant.' }, { status: 500 })
  }

  await logActivity(staff, {
    action: 'merchant_created',
    entityType: 'merchant',
    entityId: created.id,
    details: { name: body.name },
  })

  return NextResponse.json({ success: true })
}