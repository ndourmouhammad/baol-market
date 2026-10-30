import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff, hasRole } from '@/lib/verifyStaff'
import { createOrderNotification } from '@/lib/orderNotifications'
import { logActivity } from '@/lib/activityLog'
import { refundWaveCheckout } from '@/lib/wave'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await verifyStaff(request)
  if (!staff) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  if (!hasRole(staff.role, 'admin')) {
    return NextResponse.json({ error: 'Seuls les administrateurs peuvent marquer un remboursement.' }, { status: 403 })
  }

  const { id } = await params

  // --- Validation du body ---
  let body: { reference?: unknown } = {}
  try {
    body = await request.json()
  } catch {
    // Body optionnel si l'opération se fait via Wave
  }

  const rawReference = typeof body.reference === 'string' ? body.reference.trim() : ''

  // --- Vérifier les conditions ---
  const { data: order, error: fetchError } = await supabaseAdmin
    .from('orders')
    .select('id, status, paid_at, refunded_at, total_amount, wave_checkout_id')
    .eq('id', id)
    .single()

  if (fetchError || !order) {
    return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 })
  }

  if (order.status !== 'cancelled') {
    return NextResponse.json(
      { error: "Cette commande n'est pas annulée. Seule une commande annulée peut être remboursée." },
      { status: 400 }
    )
  }

  if (!order.paid_at) {
    return NextResponse.json(
      { error: "Cette commande n'a pas été payée. Rien à rembourser." },
      { status: 400 }
    )
  }

  if (order.refunded_at) {
    return NextResponse.json(
      { error: 'Cette commande a déjà été remboursée.' },
      { status: 400 }
    )
  }

  // --- Remboursement Wave ou référence manuelle (PayTech) ---
  let reference = rawReference
  if (order.wave_checkout_id) {
    const waveRes = await refundWaveCheckout(order.wave_checkout_id)
    if (!waveRes.ok) {
      console.error('[Admin Orders Refund] Échec remboursement Wave:', {
        orderId: id,
        waveCheckoutId: order.wave_checkout_id,
        status: waveRes.status,
        code: waveRes.code,
      })
      return NextResponse.json(
        { error: "Le remboursement Wave n'a pas pu être effectué pour le moment." },
        { status: 400 }
      )
    }
    if (!reference) {
      reference = order.wave_checkout_id
    }
  } else {
    if (reference.length < 3 || reference.length > 100) {
      return NextResponse.json(
        { error: 'La référence de remboursement doit faire entre 3 et 100 caractères.' },
        { status: 400 }
      )
    }
  }

  // --- Mise à jour atomique (empêche le double-clic) ---
  const now = new Date().toISOString()
  const { data: updated } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'refunded',
      refunded_at: now,
      refund_reference: reference,
      updated_at: now,
    })
    .eq('id', id)
    .eq('status', 'cancelled')
    .is('refunded_at', null)
    .select('id')

  if (!updated || updated.length === 0) {
    return NextResponse.json(
      { error: 'Conflit : cette commande a déjà été remboursée ou son statut a changé entre-temps.' },
      { status: 409 }
    )
  }

  // --- Notification et journal ---
  await createOrderNotification(id, 'refunded')
  await logActivity(staff, {
    action: 'order_refunded',
    entityType: 'order',
    entityId: id,
    details: { reference, amount: order.total_amount },
  })

  return NextResponse.json({ success: true })
}
