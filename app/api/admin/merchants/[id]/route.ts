import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff, hasRole } from '@/lib/verifyStaff'
import { logActivity } from '@/lib/activityLog'

// Seuls ces champs peuvent être modifiés via l'API
const EDITABLE_FIELDS = ['name', 'phone', 'address', 'notes', 'category_id'] as const

// Le journal garde l'ancienne et la nouvelle valeur du nom seulement. Pour le téléphone, l'adresse,
// les notes et la catégorie, il note « modifié » sans recopier de données personnelles.
const VALUE_FIELDS = ['name']

// "" et null sont considérés comme identiques (champ vide)
function normalize(value: unknown) {
  return value === '' || value === undefined ? null : value
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await verifyStaff(request)
  if (!staff || !hasRole(staff.role, 'admin')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()

  const updates: Record<string, unknown> = {}
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) updates[field] = body[field]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucune modification à appliquer.' }, { status: 400 })
  }
  if ('name' in updates && (typeof updates.name !== 'string' || !updates.name.trim())) {
    return NextResponse.json({ error: 'Le nom du commerçant est obligatoire.' }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin
    .from('merchants')
    .select('name, phone, address, notes, category_id')
    .eq('id', id)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ error: 'Commerçant introuvable.' }, { status: 404 })
  }
  const before = existing as Record<string, unknown>

  // Ce qui change réellement (pour le journal)
  const changes: { field: string; from?: unknown; to?: unknown }[] = []
  for (const field of EDITABLE_FIELDS) {
    if (!(field in updates)) continue
    const oldValue = normalize(before[field])
    const newValue = normalize(updates[field])
    if (oldValue === newValue) continue
    changes.push(VALUE_FIELDS.includes(field) ? { field, from: oldValue, to: newValue } : { field })
  }

  // Rien n'a changé : on n'écrit ni en base ni dans le journal
  if (changes.length === 0) {
    return NextResponse.json({ success: true })
  }

  const { error } = await supabaseAdmin.from('merchants').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity(staff, {
    action: 'merchant_updated',
    entityType: 'merchant',
    entityId: id,
    details: {
      name: typeof updates.name === 'string' ? updates.name : before.name,
      changes,
    },
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await verifyStaff(request)
  if (!staff || !hasRole(staff.role, 'admin')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params

  const { data: existing } = await supabaseAdmin.from('merchants').select('name').eq('id', id).maybeSingle()
  if (!existing) {
    return NextResponse.json({ error: 'Commerçant introuvable.' }, { status: 404 })
  }

  const { error } = await supabaseAdmin.from('merchants').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logActivity(staff, {
    action: 'merchant_deleted',
    entityType: 'merchant',
    entityId: id,
    details: { name: existing.name },
  })

  return NextResponse.json({ success: true })
}