import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff } from '@/lib/verifyStaff'
import { logActivity } from '@/lib/activityLog'
import {
  PLACEMENTS,
  PLACEMENT_LABELS,
  MAX_BANNERS_PER_PLACEMENT,
  parseBannerInput,
  type Placement,
} from '@/lib/banners'

const COLUMNS =
  'id, placement, image_url, title, description, badge, link_type, link_id, sort_order, is_active, starts_at, ends_at'

export async function GET(request: Request) {
  const staff = await verifyStaff(request)
  if (!staff) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('banners')
    .select(COLUMNS)
    .order('placement')
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ banners: data })
}

// Création : ouverte à toute l'équipe (modérateurs compris), et journalisée
export async function POST(request: Request) {
  const staff = await verifyStaff(request)
  if (!staff) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const body = await request.json()

  if (!PLACEMENTS.includes(body.placement)) {
    return NextResponse.json({ error: 'Emplacement invalide.' }, { status: 400 })
  }
  const placement = body.placement as Placement

  if (body.image_url === undefined) {
    return NextResponse.json({ error: 'Ajoutez une image.' }, { status: 400 })
  }

  const parsed = await parseBannerInput(body)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  // Limite par emplacement + ordre d'affichage : à la fin de la liste
  const { data: existing } = await supabaseAdmin
    .from('banners')
    .select('sort_order')
    .eq('placement', placement)
    .order('sort_order', { ascending: false })

  if ((existing?.length ?? 0) >= MAX_BANNERS_PER_PLACEMENT) {
    return NextResponse.json(
      { error: `Limite atteinte (${MAX_BANNERS_PER_PLACEMENT} bannières). Supprimez-en une avant d'en ajouter.` },
      { status: 400 }
    )
  }
  const nextOrder = existing && existing.length > 0 ? (existing[0].sort_order as number) + 1 : 1

  const { data: created, error } = await supabaseAdmin
    .from('banners')
    .insert({ ...parsed.values, placement, sort_order: nextOrder })
    .select('id')
    .single()

  if (error || !created) {
    return NextResponse.json({ error: error?.message || 'Impossible de créer la bannière.' }, { status: 500 })
  }

  await logActivity(staff, {
    action: 'banner_created',
    entityType: 'banner',
    entityId: created.id,
    details: { name: parsed.values.title || PLACEMENT_LABELS[placement], placement },
  })

  return NextResponse.json({ success: true })
}
