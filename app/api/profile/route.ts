import { NextResponse } from 'next/server'
import { getCustomer } from '@/lib/customerAuth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * GET /api/profile — Retourne les informations du profil client.
 */
export async function GET(request: Request) {
  const customer = await getCustomer(request)
  if (!customer) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const { user } = customer

  // Lire la ligne profiles
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('first_name, last_name, phone, email')
    .eq('id', user.id)
    .maybeSingle()

  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>

  return NextResponse.json({
    firstName: profile?.first_name ?? meta.first_name ?? '',
    lastName: profile?.last_name ?? meta.last_name ?? '',
    phone: profile?.phone ?? meta.phone ?? '',
    email: profile?.email ?? null,
  })
}

/**
 * PATCH /api/profile — Met à jour le prénom et/ou le nom.
 */
export async function PATCH(request: Request) {
  const customer = await getCustomer(request)
  if (!customer) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const { user } = customer
  let body: { firstName?: string; lastName?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 })
  }

  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : undefined
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : undefined

  if (firstName !== undefined && firstName.length === 0) {
    return NextResponse.json({ error: 'Le prénom est obligatoire.' }, { status: 400 })
  }
  if (lastName !== undefined && lastName.length === 0) {
    return NextResponse.json({ error: 'Le nom est obligatoire.' }, { status: 400 })
  }
  if (firstName !== undefined && firstName.length > 50) {
    return NextResponse.json({ error: 'Le prénom ne doit pas dépasser 50 caractères.' }, { status: 400 })
  }
  if (lastName !== undefined && lastName.length > 50) {
    return NextResponse.json({ error: 'Le nom ne doit pas dépasser 50 caractères.' }, { status: 400 })
  }

  // Construire les mises à jour
  const profileUpdate: Record<string, string> = {}
  const metaUpdate: Record<string, string> = {}
  if (firstName !== undefined) {
    profileUpdate.first_name = firstName
    metaUpdate.first_name = firstName
  }
  if (lastName !== undefined) {
    profileUpdate.last_name = lastName
    metaUpdate.last_name = lastName
  }

  if (Object.keys(profileUpdate).length === 0) {
    return NextResponse.json({ error: 'Aucune modification.' }, { status: 400 })
  }

  // Mettre à jour profiles
  const { error: dbError } = await supabaseAdmin
    .from('profiles')
    .update(profileUpdate)
    .eq('id', user.id)

  if (dbError) {
    return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 })
  }

  // Fusionner dans user_metadata (les clés existantes sont conservées)
  const currentMeta = (user.user_metadata ?? {}) as Record<string, unknown>
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...currentMeta, ...metaUpdate },
  })

  if (authError) {
    return NextResponse.json({ error: 'Erreur lors de la synchronisation.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
