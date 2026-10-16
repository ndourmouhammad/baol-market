import { NextResponse } from 'next/server'
import { getCustomer, verifyCurrentPassword, validateNewPassword } from '@/lib/customerAuth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * POST /api/profile/password — Change le mot de passe du client.
 */
export async function POST(request: Request) {
  const customer = await getCustomer(request)
  if (!customer) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const { user, token } = customer
  let body: { currentPassword?: string; newPassword?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

  if (!currentPassword) {
    return NextResponse.json({ error: 'Le mot de passe actuel est obligatoire.' }, { status: 400 })
  }
  if (!newPassword) {
    return NextResponse.json({ error: 'Le nouveau mot de passe est obligatoire.' }, { status: 400 })
  }

  // Valider le nouveau mot de passe
  const validationError = validateNewPassword(newPassword, currentPassword)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  // Vérifier le mot de passe actuel
  const loginEmail = user.email
  if (!loginEmail) {
    return NextResponse.json({ error: 'Impossible de vérifier l\u0027identité.' }, { status: 400 })
  }

  const passwordOk = await verifyCurrentPassword(loginEmail, currentPassword)
  if (!passwordOk) {
    return NextResponse.json({ error: 'Mot de passe actuel incorrect.' }, { status: 403 })
  }

  // Mettre à jour le mot de passe
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password: newPassword,
  })

  if (updateError) {
    return NextResponse.json({ error: 'Erreur lors du changement de mot de passe.' }, { status: 500 })
  }

  // Déconnecter toutes les autres sessions (garder la session courante)
  await supabaseAdmin.auth.admin.signOut(token, 'others')

  return NextResponse.json({ ok: true })
}
