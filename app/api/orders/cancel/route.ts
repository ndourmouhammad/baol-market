import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { canCancelOrder } from '@/lib/orderStatus'
import { createOrderNotification } from '@/lib/orderNotifications'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const { orderId } = await request.json()

  const { data: order, error: fetchError } = await supabaseAdmin
    .from('orders')
    .select('id, status, customer_id')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) {
    return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 })
  }
  if (order.customer_id !== user.id) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }
  if (!canCancelOrder(order.status)) {
    return NextResponse.json({ error: 'Cette commande ne peut plus être annulée.' }, { status: 400 })
  }

  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', orderId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await createOrderNotification(orderId, 'cancelled')

  return NextResponse.json({ success: true })
}