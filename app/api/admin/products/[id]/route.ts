import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff, hasRole } from '@/lib/verifyStaff'
import { logActivity } from '@/lib/activityLog'
import { parseFlashInput } from '@/lib/flashSale'
import { normalizeSizes } from '@/lib/sizes'

// Seuls ces champs peuvent être modifiés via l'API
const EDITABLE_FIELDS = ['name', 'description', 'price', 'category_id', 'merchant_id', 'image_url', 'is_available', 'size_options', 'size_notes'] as const
// La vente flash est vérifiée à part (cohérence prix / dates)
const FLASH_FIELDS = ['flash_price', 'flash_starts_at', 'flash_ends_at'] as const
const ALL_FIELDS = [...EDITABLE_FIELDS, ...FLASH_FIELDS]

// Pour ces champs, le journal garde l'ancienne et la nouvelle valeur.
// Pour les autres (description, image, catégorie, commerçant, dates, tailles, mesures), il note seulement « modifié ».
const VALUE_FIELDS = ['name', 'price', 'is_available', 'flash_price']

// "" et null sont considérés comme identiques (champ vide)
function normalize(value: unknown) {
  return value === '' || value === undefined ? null : value
}

function sameValue(field: string, a: unknown, b: unknown): boolean {
  if (field === 'price' || field === 'flash_price') {
    return (a === null ? null : Number(a)) === (b === null ? null : Number(b))
  }
  if (field === 'flash_starts_at' || field === 'flash_ends_at') {
    const timeA = a ? new Date(a as string).getTime() : null
    const timeB = b ? new Date(b as string).getTime() : null
    return timeA === timeB
  }
  if (field === 'size_options') {
    const arrA = Array.isArray(a) ? (a as string[]) : []
    const arrB = Array.isArray(b) ? (b as string[]) : []
    if (arrA.length !== arrB.length) return false
    return arrA.every((val, idx) => val === arrB[idx])
  }
  return a === b
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
  const hasFlashInput = FLASH_FIELDS.some((field) => body[field] !== undefined)

  if (Object.keys(updates).length === 0 && !hasFlashInput) {
    return NextResponse.json({ error: 'Aucune modification à appliquer.' }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin
    .from('products')
    .select('name, description, price, category_id, merchant_id, image_url, is_available, flash_price, flash_starts_at, flash_ends_at, size_options, size_notes')
    .eq('id', id)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ error: 'Produit introuvable.' }, { status: 404 })
  }
  const before = existing as Record<string, unknown>

  // Tailles facultatives
  if ('size_options' in updates) {
    if (updates.size_options === null || updates.size_options === undefined || (Array.isArray(updates.size_options) && updates.size_options.length === 0)) {
      updates.size_options = null
    } else {
      try {
        const normalized = normalizeSizes(updates.size_options)
        updates.size_options = normalized.length > 0 ? normalized : null
      } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Tailles invalides' }, { status: 400 })
      }
    }
  }

  // Mesures facultatives
  if ('size_notes' in updates) {
    if (updates.size_notes === null || updates.size_notes === undefined || updates.size_notes === '') {
      updates.size_notes = null
    } else if (typeof updates.size_notes === 'string') {
      const trimmed = updates.size_notes.trim()
      if (trimmed.length > 600) {
        return NextResponse.json({ error: 'Les mesures ne doivent pas dépasser 600 caractères.' }, { status: 400 })
      }
      updates.size_notes = trimmed.length > 0 ? trimmed : null
    }
  }

  // Vente flash : cohérence avec le prix normal (nouveau ou actuel)
  const newPrice = 'price' in updates ? Number(updates.price) : Number(before.price)
  const flash = parseFlashInput(body, newPrice, {
    flash_price: existing.flash_price,
    flash_starts_at: existing.flash_starts_at,
    flash_ends_at: existing.flash_ends_at,
  })
  if ('error' in flash) return NextResponse.json({ error: flash.error }, { status: 400 })
  if (flash.values) Object.assign(updates, flash.values)

  // Si le commerçant est modifié, vérifier que son dossier est complet
  if ('merchant_id' in updates && updates.merchant_id) {
    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('id, name, region, department, photo_path, id_document_path')
      .eq('id', updates.merchant_id)
      .maybeSingle()

    if (!merchant) {
      return NextResponse.json({ error: 'Commerçant introuvable.' }, { status: 404 })
    }
    const isComplete = Boolean(merchant.region && merchant.department && merchant.photo_path && merchant.id_document_path)
    if (!isComplete) {
      return NextResponse.json(
        { error: 'Ce commerçant ne peut pas être associé à ce produit car son dossier est incomplet (adresse, photo ou CNI manquante).' },
        { status: 400 }
      )
    }
  }

  // Ce qui change réellement (pour le journal)
  const changes: { field: string; from?: unknown; to?: unknown }[] = []
  for (const field of ALL_FIELDS) {
    if (!(field in updates)) continue
    const oldValue = normalize(before[field])
    const newValue = normalize(updates[field])
    if (sameValue(field, oldValue, newValue)) continue
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
  if (error) {
    if (
      error.code === '23503' ||
      error.message?.includes('foreign key constraint') ||
      error.message?.includes('order_items')
    ) {
      return NextResponse.json(
        {
          error:
            "Ce produit ne peut pas être supprimé car il figure dans une ou plusieurs commandes passées. Pour préserver l'historique des ventes, vous pouvez plutôt le désactiver.",
          isLinkedToOrders: true,
        },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logActivity(staff, {
    action: 'product_deleted',
    entityType: 'product',
    entityId: id,
    details: { name: existing.name },
  })

  return NextResponse.json({ success: true })
}
