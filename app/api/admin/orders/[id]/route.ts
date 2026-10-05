import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff } from '@/lib/verifyStaff'
import { canCancelOrder, ORDER_STATUSES } from '@/lib/orderStatus'
import { createOrderNotification } from '@/lib/orderNotifications'
import { getStaffIdsWithMatricule, verifyMatricule } from '@/lib/matricule'
import { logActivity } from '@/lib/activityLog'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await verifyStaff(request)
  if (!staff) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()

  const { data: current, error: currentError } = await supabaseAdmin
    .from('orders')
    .select('status, rider_id')
    .eq('id', id)
    .single()

  if (currentError || !current) {
    return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 })
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

  // --- Changement de statut ---
  let statusChanging = false
  if (body.status !== undefined) {
    if (!ORDER_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 })
    }
    if (body.status === 'cancelled' && !canCancelOrder(current.status) && current.status !== 'cancelled') {
      return NextResponse.json(
        { error: 'Cette commande ne peut plus être annulée (déjà confirmée ou au-delà).' },
        { status: 400 }
      )
    }

    // Demander le même statut ne change rien : pas de notification en double
    statusChanging = body.status !== current.status

    if (statusChanging) {
      // Un modérateur doit confirmer son identité avec son matricule (vérifié ici, côté serveur)
      if (staff.role === 'moderator') {
        const provided = typeof body.matricule === 'string' ? body.matricule : ''

        if (!provided.trim()) {
          const withMatricule = await getStaffIdsWithMatricule([staff.user.id])
          if (!withMatricule.has(staff.user.id)) {
            return NextResponse.json(
              {
                error: "Aucun matricule n'est défini pour votre compte. Demandez à un admin d'en générer un.",
                code: 'MATRICULE_NOT_SET',
              },
              { status: 403 }
            )
          }
          return NextResponse.json(
            { error: 'Matricule requis pour changer le statut.', code: 'MATRICULE_REQUIRED' },
            { status: 403 }
          )
        }

        const check = await verifyMatricule(staff.user.id, provided)
        if (!check.ok) {
          const code =
            check.reason === 'locked' ? 'MATRICULE_LOCKED'
            : check.reason === 'not_set' ? 'MATRICULE_NOT_SET'
            : 'MATRICULE_INVALID'
          return NextResponse.json({ error: check.message, code }, { status: 403 })
        }
      }
      updateData.status = body.status
    }
  }

  // --- Affectation d'un livreur (pas de matricule demandé, mais journalisée) ---
  const newRiderId: string | null = body.rider_id !== undefined ? (body.rider_id || null) : current.rider_id
  const riderChanging = body.rider_id !== undefined && newRiderId !== current.rider_id
  if (riderChanging) {
    updateData.rider_id = newRiderId
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

  if (statusChanging) {
    await createOrderNotification(id, body.status)
    await logActivity(staff, {
      action: 'order_status_changed',
      entityType: 'order',
      entityId: id,
      details: { from: current.status, to: body.status },
    })
  }

  if (riderChanging) {
    const riderIds = [current.rider_id, newRiderId].filter(Boolean) as string[]
    const { data: riders } = await supabaseAdmin.from('riders').select('id, name').in('id', riderIds)
    const nameOf = (riderId: string | null) =>
      riderId ? riders?.find((r) => r.id === riderId)?.name ?? riderId : null

    await logActivity(staff, {
      action: 'order_rider_assigned',
      entityType: 'order',
      entityId: id,
      details: { from: nameOf(current.rider_id), to: nameOf(newRiderId) },
    })
  }

  return NextResponse.json({ success: true })
}