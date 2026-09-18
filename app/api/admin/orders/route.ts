import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAdmin } from '@/lib/verifyAdmin'

export async function GET(request: Request) {
  const admin = await verifyAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, status, payment_method, total_amount, delivery_address, created_at, customer_id, rider_id,
      order_items ( quantity, unit_price, products ( name ) ),
      riders ( id, name )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ orders })
}