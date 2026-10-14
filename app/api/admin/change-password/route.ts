import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff } from '@/lib/verifyStaff'
import { logActivity } from '@/lib/activityLog'

const HAS_LETTER = /[A-Za-z]/
const HAS_DIGIT = /\d/

export async function POST(request: Request) {
  const staff = await verifyStaff(request, { allowPasswordChange: true })
  if (!staff) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const body = await request.json()
  const { currentPassword, newPassword } = body

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Tous les champs sont requis.' }, { status: 400 })
  }

  if (typeof newPassword !== 'string' || newPassword.length < 10) {
    return NextResponse.json({ error: 'Le nouveau mot de passe doit contenir au moins 10 caractères.' }, { status: 400 })
  }
  if (newPassword.length > 72) {
    return NextResponse.json({ error: 'Le nouveau mot de passe ne peut pas dépasser 72 caractères.' }, { status: 400 })
  }
  if (!HAS_LETTER.test(newPassword)) {
    return NextResponse.json({ error: 'Le nouveau mot de passe doit contenir au moins une lettre.' }, { status: 400 })
  }
  if (!HAS_DIGIT.test(newPassword)) {
    return NextResponse.json({ error: 'Le nouveau mot de passe doit contenir au moins un chiffre.' }, { status: 400 })
  }
  if (currentPassword === newPassword) {
    return NextResponse.json({ error: 'Le nouveau mot de passe doit être différent de l\'ancien.' }, { status: 400 })
  }

  // Vérification du mot de passe actuel via un client temporaire
  const tempClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const { error: signInError } = await tempClient.auth.signInWithPassword({
    email: staff.user.email!,
    password: currentPassword,
  })

  if (signInError) {
    return NextResponse.json({ error: 'Mot de passe actuel incorrect.' }, { status: 400 })
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(staff.user.id, {
    password: newPassword,
    app_metadata: { must_change_password: false },
  })

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await logActivity(staff, {
    action: 'staff_password_changed',
    entityType: 'staff',
    entityId: staff.user.id,
    details: { email: staff.user.email },
  })

  return NextResponse.json({ success: true })
}
