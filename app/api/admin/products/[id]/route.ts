import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff, hasRole } from '@/lib/verifyStaff'
import { logActivity } from '@/lib/activityLog'

// Seuls ces champs peuvent être modifiés via l'API
const EDITABLE_FIELDS = ['name', 'description', 'price', 'category_id', 'merchant_id', 'image_url', 'is_available'] as const

// Pour ces champs, le journal garde l'ancienne et la nouvelle valeur.
// Pour les autres (description, image, catégorie, commerçant), il note seulement « modifié ».
const VALUE_FIELDS = ['name', 'price', 'is_available']

// "" et null sont considérés comme identiques (champ vide)
function normalize(value: unknown) {
  return value === '' || value === undefined ? null : value
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await verifyStaff(request)
  if (!staff) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params
  const body = await request.json()

  const updates: Record<string, unknown> = {}
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) updates[field] = body[field]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucune modification à appliquer.' }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin
    .from('products')
    .select('name, description, price, category_id, merchant_id, image_url, is_available')
    .eq('id', id)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ error: 'Produit introuvable.' }, { status: 404 })
  }
  const before = existing as Record<string, unknown>

  // Ce qui change réellement (pour le journal)
  const changes: { field: string; from?: unknown; to?: unknown }[] = []
  for (const field of EDITABLE_FIELDS) {
    if (!(field in updates)) continue
    const oldValue = normalize(before[field])
    const newValue = normalize(updates[field])
    const different = field === 'price' ? Number(oldValue) !== Number(newValue) : oldValue !== newValue
    if (!different) continue
    changes.push(VALUE_FIELDS.includes(field) ? { field, from: oldValue, to: newValue } : { field })
  }

  // Rien n'a changé : on n'écrit ni en base ni dans le journal
  if (changes.length === 0) {
    return NextResponse.json({ success: true })
  }

  const { error } = await supabaseAdmin.from('products').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const productName = typeof updates.name === 'string' ? updates.name : (before.name as string)
  const availabilityChange = changes.find((change) => change.field === 'is_available')
  const otherChanges = changes.filter((change) => change.field !== 'is_available')

  if (otherChanges.length > 0) {
    await logActivity(staff, {
      action: 'product_updated',
      entityType: 'product',
      entityId: id,
      details: { name: productName, changes: otherChanges },
    })
  }
  if (availabilityChange) {
    await logActivity(staff, {
      action: 'product_availability_changed',
      entityType: 'product',
      entityId: id,
      details: { name: productName, to: availabilityChange.to },
    })
  }

  return NextResponse.json({ success: true })
}

// La suppression est réservée aux admins et au super admin
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await verifyStaff(request)
  if (!staff || !hasRole(staff.role, 'admin')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params

  const { data: existing } = await supabaseAdmin.from('products').select('name').eq('id', id).maybeSingle()
  if (!existing) {
    return NextResponse.json({ error: 'Produit introuvable.' }, { status: 404 })
  }

  const { error } = await supabaseAdmin.from('products').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity(staff, {
    action: 'product_deleted',
    entityType: 'product',
    entityId: id,
    details: { name: existing.name },
  })

  return NextResponse.json({ success: true })
}