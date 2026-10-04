import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff, hasRole } from '@/lib/verifyStaff'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await verifyStaff(request)
  if (!staff) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params
  const body = await request.json()

  if (typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'Le nom de la catégorie est obligatoire.' }, { status: 400 })
  }

  const slug = body.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const { error } = await supabaseAdmin.from('categories').update({
    name: body.name,
    slug,
    description: body.description || null,
    image_url: body.image_url || null,
  }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// La suppression est réservée aux admins et au super admin
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await verifyStaff(request)
  if (!staff || !hasRole(staff.role, 'admin')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params
  const { error } = await supabaseAdmin.from('categories').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}