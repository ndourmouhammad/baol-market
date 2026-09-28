import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { resend } from '@/lib/resend'
import { normalizePhone, phoneToSyntheticEmail } from '@/lib/phoneAuth'

export async function POST(request: Request) {
  const { phone } = await request.json()
  const canonicalPhone = normalizePhone(phone)

  if (!canonicalPhone) {
    return NextResponse.json({ error: 'Numéro invalide.' }, { status: 400 })
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, email, first_name')
    .eq('phone', canonicalPhone)
    .maybeSingle()

  // Réponse volontairement identique dans tous les cas, pour ne pas révéler
  // si un numéro existe ou non dans la base.
  const genericResponse = NextResponse.json({
    success: true,
    message: "Si ce numéro est associé à un compte avec un email, un lien de réinitialisation a été envoyé.",
  })

  if (!profile || !profile.email) {
    return genericResponse
  }

  const syntheticEmail = phoneToSyntheticEmail(canonicalPhone)

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: syntheticEmail,
  })

  if (linkError || !linkData) {
    console.error('Erreur génération lien de réinitialisation:', linkError)
    return genericResponse
  }

  try {
    await resend.emails.send({
      from: 'Baol Market <onboarding@resend.dev>',
      to: profile.email,
      subject: 'Réinitialisation de votre mot de passe Baol Market',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <p>Bonjour ${profile.first_name},</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe Baol Market.</p>
          <p><a href="${linkData.properties.action_link}" style="background:#8B5E3C;color:white;padding:12px 20px;text-decoration:none;border-radius:4px;display:inline-block;">Réinitialiser mon mot de passe</a></p>
          <p style="color:#666;font-size:13px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
        </div>
      `,
    })
  } catch (e) {
    console.error('Erreur envoi email réinitialisation:', e)
  }

  return genericResponse
}