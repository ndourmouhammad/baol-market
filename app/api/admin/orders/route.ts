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

  let fullOrders = orders

  const customerIds = Array.from(new Set(orders.map(o => o.customer_id).filter(Boolean)))
  if (customerIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, phone, first_name, last_name, email')
      .in('id', customerIds)

    const profileMap = new Map((profiles || []).map(p => [p.id, p]))
    
    fullOrders = orders.map(order => ({
      ...order,
      profiles: order.customer_id ? profileMap.get(order.customer_id) || null : null
    })) as typeof orders & { profiles: any }[]
  } else {
    fullOrders = orders.map(order => ({
      ...order,
      profiles: null
    })) as typeof orders & { profiles: null }[]
  }

  return NextResponse.json({ orders: fullOrders })
}