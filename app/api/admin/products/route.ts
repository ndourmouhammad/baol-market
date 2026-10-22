import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff } from '@/lib/verifyStaff'
import { logActivity } from '@/lib/activityLog'
import { parseFlashInput } from '@/lib/flashSale'

export async function GET(request: Request) {
  const staff = await verifyStaff(request)
  if (!staff) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id, name, description, price, image_url, is_available, category_id, merchant_id, flash_price, flash_starts_at, flash_ends_at, categories(name), merchants(name)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ products: data })
}

export async function POST(request: Request) {
  const staff = await verifyStaff(request)
  if (!staff) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const body = await request.json()

  // Vente flash facultative dès la création
  const flash = parseFlashInput(body, Number(body.price), null)
  if ('error' in flash) return NextResponse.json({ error: flash.error }, { status: 400 })

  // Si un commerçant est spécifié, vérifier que son dossier est complet
  if (body.merchant_id) {
    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('id, name, region, department, photo_path, id_document_path')
      .eq('id', body.merchant_id)
      .maybeSingle()

    if (!merchant) {
      return NextResponse.json({ error: 'Commerçant introuvable.' }, { status: 404 })
    }
    const isComplete = Boolean(merchant.region && merchant.department && merchant.photo_path && merchant.id_document_path)
    if (!isComplete) {
      return NextResponse.json(
        { error: 'Ce commerçant ne peut pas être associé à un produit car son dossier est incomplet (adresse, photo ou CNI manquante).' },
        { status: 400 }
      )
    }
  }

  const { data: created, error } = await supabaseAdmin
    .from('products')
    .insert({
      name: body.name,
      description: body.description,
      price: body.price,
      category_id: body.category_id || null,
      merchant_id: body.merchant_id || null,
      image_url: body.image_url || null,
      is_available: true,
      ...(flash.values ?? {}),
    })
    .select('id')
    .single()

  if (error || !created) {
    return NextResponse.json({ error: error?.message || 'Impossible de créer le produit.' }, { status: 500 })
  }

  await logActivity(staff, {
    action: 'product_created',
    entityType: 'product',
    entityId: created.id,
    details: { name: body.name, price: body.price },
  })

  return NextResponse.json({ success: true })
}
