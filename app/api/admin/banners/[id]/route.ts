import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff, hasRole } from '@/lib/verifyStaff'
import { logActivity } from '@/lib/activityLog'
import { PLACEMENT_LABELS, bannerImagePrefix, parseBannerInput, type Placement } from '@/lib/banners'

const COLUMNS =
  'placement, image_url, title, description, badge, link_type, link_id, sort_order, is_active, starts_at, ends_at'

// Pour ces champs, le journal garde l'ancienne et la nouvelle valeur (titre, étiquette, activation).
// Pour les autres (image, description, lien, dates), il note seulement « modifié ».
const VALUE_FIELDS = ['title', 'badge', 'is_active']
const LOGGED_FIELDS = ['image_url', 'title', 'description', 'badge', 'link_type', 'link_id', 'starts_at', 'ends_at', 'is_active']

// "" et null sont considérés comme identiques (champ vide)
function normalize(value: unknown) {
  return value === '' || value === undefined ? null : value
}

// Modification ouverte à toute l'équipe (modérateurs compris)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await verifyStaff(request)
  if (!staff) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params
  const body = await request.json()

  const { data: existing } = await supabaseAdmin.from('banners').select(COLUMNS).eq('id', id).maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Bannière introuvable.' }, { status: 404 })
  const before = existing as Record<string, unknown>

  const parsed = await parseBannerInput(body, {
    link_type: existing.link_type,
    link_id: existing.link_id,
    starts_at: existing.starts_at,
    ends_at: existing.ends_at,
  })
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const values = parsed.values as Record<string, unknown>
  if (Object.keys(values).length === 0) {
    return NextResponse.json({ error: 'Aucune modification à appliquer.' }, { status: 400 })
  }

  // Ce qui change réellement (pour le journal). L'ordre d'affichage n'est pas journalisé.
  const changes: { field: string; from?: unknown; to?: unknown }[] = []
  let anyChange = false
  for (const field of Object.keys(values)) {
    const oldValue = normalize(before[field])
    const newValue = normalize(values[field])
    if (oldValue === newValue) continue
    anyChange = true
    if (!LOGGED_FIELDS.includes(field)) continue
    changes.push(VALUE_FIELDS.includes(field) ? { field, from: oldValue, to: newValue } : { field })
  }

  // Rien n'a changé : on n'écrit ni en base ni dans le journal
  if (!anyChange) return NextResponse.json({ success: true })

  const { error } = await supabaseAdmin
    .from('banners')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const placement = existing.placement as Placement
  const name = (typeof values.title === 'string' ? values.title : (before.title as string | null)) || PLACEMENT_LABELS[placement]
  const activityChange = changes.find((change) => change.field === 'is_active')
  const otherChanges = changes.filter((change) => change.field !== 'is_active')

  if (otherChanges.length > 0) {
    await logActivity(staff, {
      action: 'banner_updated',
      entityType: 'banner',
      entityId: id,
      details: { name, placement, changes: otherChanges },
    })
  }
  if (activityChange) {
    await logActivity(staff, {
      action: 'banner_availability_changed',
      entityType: 'banner',
      entityId: id,
      details: { name, placement, to: activityChange.to },
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

  const { data: existing } = await supabaseAdmin
    .from('banners')
    .select('placement, title, image_url')
    .eq('id', id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Bannière introuvable.' }, { status: 404 })

  const { error } = await supabaseAdmin.from('banners').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Nettoyage du fichier image (sans bloquer si ça échoue)
  const prefix = bannerImagePrefix()
  if (typeof existing.image_url === 'string' && existing.image_url.startsWith(prefix)) {
    const fileName = existing.image_url.slice(prefix.length)
    if (fileName && !fileName.includes('/')) {
      await supabaseAdmin.storage.from('banners').remove([fileName])
    }
  }

  await logActivity(staff, {
    action: 'banner_deleted',
    entityType: 'banner',
    entityId: id,
    details: {
      name: existing.title || PLACEMENT_LABELS[existing.placement as Placement],
      placement: existing.placement,
    },
  })

  return NextResponse.json({ success: true })
}
