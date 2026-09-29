import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff } from '@/lib/verifyStaff'
import { expireStaleOrders } from '@/lib/expireStaleOrders'

export async function GET(request: Request) {
  const staff = await verifyStaff(request)
  if (!staff) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  await expireStaleOrders()

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, status, payment_method, total_amount, subtotal_amount, delivery_fee, delivery_fee_confirmed,
      delivery_address, created_at, customer_id, rider_id,
      guest_phone, guest_email, tracking_code,
      order_items ( quantity, unit_price, products ( name ) ),
      riders ( id, name ),
      delivery_zones ( id, name )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ orders })
}