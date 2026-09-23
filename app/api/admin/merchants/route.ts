import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff, hasRole } from '@/lib/verifyStaff'

export async function GET(request: Request) {
  const staff = await verifyStaff(request)
  if (!staff) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('merchants')
    .select('id, name, phone, address, notes')
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
  const { error } = await supabaseAdmin.from('merchants').insert({
    name: body.name,
    phone: body.phone,
    address: body.address,
    notes: body.notes || null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}