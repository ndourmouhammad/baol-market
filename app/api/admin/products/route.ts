import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff } from '@/lib/verifyStaff'
import { logActivity } from '@/lib/activityLog'

export async function GET(request: Request) {
  const staff = await verifyStaff(request)
  if (!staff) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id, name, description, price, image_url, is_available, category_id, merchant_id, categories(name), merchants(name)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ products: data })
}

export async function POST(request: Request) {
  const staff = await verifyStaff(request)
  if (!staff) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const body = await request.json()

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