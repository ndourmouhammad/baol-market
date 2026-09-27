import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff } from '@/lib/verifyStaff'
import { resend } from '@/lib/resend'
import { orderStatusUpdateEmail, STATUS_LABELS } from '@/lib/emailTemplates'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await verifyStaff(request)
  if (!staff) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id } = await params
  const body = await request.json()

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status !== undefined) updateData.status = body.status
  if (body.rider_id !== undefined) updateData.rider_id = body.rider_id || null

  if (body.delivery_fee !== undefined) {
    const { data: current } = await supabaseAdmin
      .from('orders')
      .select('subtotal_amount')
      .eq('id', id)
      .single()

    const subtotal = current?.subtotal_amount ?? 0
    updateData.delivery_fee = body.delivery_fee
    updateData.delivery_fee_confirmed = true
    updateData.total_amount = subtotal + Number(body.delivery_fee)
  }

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .update(updateData)
    .eq('id', id)
    .select('id, status, customer_id, guest_email, total_amount, subtotal_amount, delivery_fee, delivery_fee_confirmed')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if ((body.status !== undefined || body.delivery_fee !== undefined) && order) {
    try {
      let email: string | null | undefined = order.guest_email

      if (order.customer_id) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(order.customer_id)
        email = userData?.user?.email
      }

      if (email) {
        const subject = body.status !== undefined
          ? `Commande #${order.id.slice(0, 8).toUpperCase()} - ${STATUS_LABELS[order.status] ?? order.status}`
          : `Commande #${order.id.slice(0, 8).toUpperCase()} - Frais de livraison confirmés`

        await resend.emails.send({
          from: 'Baol Market <onboarding@resend.dev>',
          to: email,
          subject,
          html: orderStatusUpdateEmail(order),
        })
      }
    } catch (e) {
      console.error('Erreur envoi email:', e)
    }
  }

  return NextResponse.json({ success: true })
}