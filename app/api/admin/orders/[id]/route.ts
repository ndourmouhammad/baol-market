import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff } from '@/lib/verifyStaff'
import { canCancelOrder, ORDER_STATUSES } from '@/lib/orderStatus'
import { createOrderNotification } from '@/lib/orderNotifications'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await verifyStaff(request)
  if (!staff) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()

  const { data: current, error: currentError } = await supabaseAdmin
    .from('orders')
    .select('status')
    .eq('id', id)
    .single()

  if (currentError || !current) {
    return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 })
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.status !== undefined) {
    if (!ORDER_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 })
    }
    if (body.status === 'cancelled' && !canCancelOrder(current.status)) {
      return NextResponse.json(
        { error: 'Cette commande ne peut plus être annulée (déjà confirmée ou au-delà).' },
        { status: 400 }
      )
    }
    updateData.status = body.status
  }

  if (body.rider_id !== undefined) {
    updateData.rider_id = body.rider_id || null
  }

  // Les frais de livraison ne sont plus modifiables après coup : le montant payé
  // par le client sur PayTech est définitif.

  const { error } = await supabaseAdmin
    .from('orders')
    .update(updateData)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (body.status !== undefined) {
    await createOrderNotification(id, body.status)
  }

  return NextResponse.json({ success: true })
}