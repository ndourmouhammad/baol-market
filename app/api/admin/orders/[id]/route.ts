import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAdmin } from '@/lib/verifyAdmin'
import { resend } from '@/lib/resend'
import { orderStatusUpdateEmail, STATUS_LABELS } from '@/lib/emailTemplates'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await verifyAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status !== undefined) updateData.status = body.status
  if (body.rider_id !== undefined) updateData.rider_id = body.rider_id || null

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .update(updateData)
    .eq('id', id)
    .select('id, status, customer_id, guest_email, total_amount')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (body.status !== undefined && order) {
    try {
      let email: string | null | undefined = order.guest_email

      if (order.customer_id) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(order.customer_id)
        email = userData?.user?.email
      }

      if (email) {
        await resend.emails.send({
          from: 'Baol Market <onboarding@resend.dev>',
          to: email,
          subject: `Commande #${order.id.slice(0, 8).toUpperCase()} — ${STATUS_LABELS[order.status] ?? order.status}`,
          html: orderStatusUpdateEmail(order),
        })
      }
    } catch (e) {
      console.error('Erreur envoi email de statut:', e)
    }
  }

  return NextResponse.json({ success: true })
}