import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { resend } from '@/lib/resend'
import { orderConfirmationEmail } from '@/lib/emailTemplates'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { orderId } = await request.json()

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('id, total_amount, subtotal_amount, delivery_fee, delivery_fee_confirmed, delivery_address, payment_method, customer_id, order_items(quantity, unit_price, products(name))')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  }

  if (order.customer_id !== user.id) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  if (user.email) {
    try {
      await resend.emails.send({
        from: 'Baol Market <onboarding@resend.dev>',
        to: user.email,
        subject: `Commande reçue #${order.id.slice(0, 8).toUpperCase()}`,
        html: orderConfirmationEmail(order),
      })
    } catch (e) {
      console.error('Erreur envoi email de confirmation:', e)
    }
  }

  return NextResponse.json({ success: true })
}