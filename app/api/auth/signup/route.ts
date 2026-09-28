import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { normalizePhone, phoneToSyntheticEmail } from '@/lib/phoneAuth'

export async function POST(request: Request) {
  const body = await request.json()
  const { firstName, lastName, phone, password, email } = body

  if (!firstName?.trim() || !lastName?.trim() || !phone || !password) {
    return NextResponse.json({ error: 'Tous les champs obligatoires doivent être remplis.' }, { status: 400 })
  }

  const canonicalPhone = normalizePhone(phone)
  if (!canonicalPhone) {
    return NextResponse.json(
      { error: 'Numéro invalide. Utilisez 9 chiffres après l\'indicatif (ex. 78 150 75 05).' },
      { status: 400 }
    )
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('phone', canonicalPhone)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Ce numéro est déjà associé à un compte.' }, { status: 400 })
  }

  const syntheticEmail = phoneToSyntheticEmail(canonicalPhone)

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: syntheticEmail,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName, phone: canonicalPhone },
  })

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message || 'Impossible de créer le compte.' }, { status: 500 })
  }

  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: created.user.id,
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    phone: canonicalPhone,
    email: email?.trim() || null,
  })

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}