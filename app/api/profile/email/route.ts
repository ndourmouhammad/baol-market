import { NextResponse } from 'next/server'
import { getCustomer, verifyCurrentPassword } from '@/lib/customerAuth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * PATCH /api/profile/email — Met à jour l'e-mail réel du client.
 * L'email technique de connexion (221…@phone.baolmarket.internal) n'est JAMAIS modifié.
 * Seul le champ profiles.email est mis à jour.
 */
export async function PATCH(request: Request) {
  const customer = await getCustomer(request)
  if (!customer) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const { user } = customer
  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email) {
    return NextResponse.json({ error: 'L\u0027adresse e-mail est obligatoire.' }, { status: 400 })
  }

  // Validation basique du format e-mail
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Adresse e-mail invalide.' }, { status: 400 })
  }

  if (!password) {
    return NextResponse.json({ error: 'Le mot de passe est obligatoire pour modifier l\u0027e-mail.' }, { status: 400 })
  }

  // Vérifier le mot de passe actuel avec l'email technique de connexion
  const loginEmail = user.email
  if (!loginEmail) {
    return NextResponse.json({ error: 'Impossible de vérifier l\u0027identité.' }, { status: 400 })
  }

  const passwordOk = await verifyCurrentPassword(loginEmail, password)
  if (!passwordOk) {
    return NextResponse.json({ error: 'Mot de passe incorrect.' }, { status: 403 })
  }

  // Mettre à jour profiles.email uniquement (pas l'email auth)
  const { error: dbError } = await supabaseAdmin
    .from('profiles')
    .update({ email })
    .eq('id', user.id)

  if (dbError) {
    return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
