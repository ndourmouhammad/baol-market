import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff, hasRole } from '@/lib/verifyStaff'
import { logActivity } from '@/lib/activityLog'

// "" et null sont considérés comme identiques (champ vide)
function normalize(value: unknown) {
  return value === '' || value === undefined ? null : value
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await verifyStaff(request)
  if (!staff) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params
  const body = await request.json()

  if (typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'Le nom de la catégorie est obligatoire.' }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin
    .from('categories')
    .select('name, description, image_url')
    .eq('id', id)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ error: 'Catégorie introuvable.' }, { status: 404 })
  }

  const slug = body.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const newValues = {
    name: body.name,
    description: body.description || null,
    image_url: body.image_url || null,
  }

  // Ce qui change réellement (pour le journal)
  const changes: { field: string; from?: unknown; to?: unknown }[] = []
  if (existing.name !== newValues.name) {
    changes.push({ field: 'name', from: existing.name, to: newValues.name })
  }
  if (normalize(existing.description) !== normalize(newValues.description)) {
    changes.push({ field: 'description' })
  }
  if (normalize(existing.image_url) !== normalize(newValues.image_url)) {
    changes.push({ field: 'image_url' })
  }

  // Rien n'a changé : on n'écrit ni en base ni dans le journal
  if (changes.length === 0) {
    return NextResponse.json({ success: true })
  }

  const { error } = await supabaseAdmin.from('categories').update({ ...newValues, slug }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity(staff, {
    action: 'category_updated',
    entityType: 'category',
    entityId: id,
    details: { name: newValues.name, changes },
  })

  return NextResponse.json({ success: true })
}

// La suppression est réservée aux admins et au super admin
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await verifyStaff(request)
  if (!staff || !hasRole(staff.role, 'admin')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params

  const { data: existing } = await supabaseAdmin.from('categories').select('name').eq('id', id).maybeSingle()
  if (!existing) {
    return NextResponse.json({ error: 'Catégorie introuvable.' }, { status: 404 })
  }

  const { error } = await supabaseAdmin.from('categories').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity(staff, {
    action: 'category_deleted',
    entityType: 'category',
    entityId: id,
    details: { name: existing.name },
  })

  return NextResponse.json({ success: true })
}