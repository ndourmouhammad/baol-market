import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: Request) {
  const { phone, trackingCode } = await request.json()

  if (!phone || !trackingCode) {
    return NextResponse.json({ error: 'Téléphone et code de suivi requis.' }, { status: 400 })
  }

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, status, payment_method, total_amount, delivery_address, created_at,
      order_items ( quantity, unit_price, products ( name ) )
    `)
    .eq('tracking_code', trackingCode.trim().toUpperCase())
    .eq('guest_phone', phone.trim())
    .maybeSingle()

  if (error || !order) {
    return NextResponse.json({ error: 'Aucune commande trouvée avec ces informations.' }, { status: 404 })
  }

  return NextResponse.json({ order })
}