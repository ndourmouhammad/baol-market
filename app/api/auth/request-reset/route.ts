import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { resend } from '@/lib/resend'
import { normalizePhone, phoneToSyntheticEmail } from '@/lib/phoneAuth'
import { SITE_URL } from '@/lib/siteUrl'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

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
    options: {
      redirectTo: `${SITE_URL}/reinitialiser-mot-de-passe`,
    },
  })

  if (linkError || !linkData) {
    console.error('Erreur génération lien de réinitialisation:', linkError)
    return genericResponse
  }

  const safeFirstName = profile.first_name ? escapeHtml(profile.first_name) : ''
  const greeting = profile.first_name ? `Bonjour ${profile.first_name},` : 'Bonjour,'
  const resetLink = linkData.properties.action_link

  const textContent = `${greeting}

Vous avez demandé la réinitialisation de votre mot de passe Baol Market.

Pour réinitialiser votre mot de passe, cliquez sur le lien suivant :
${resetLink}

Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.

Baol Market, Diourbel, Sénégal. Besoin d'aide ? Écrivez-nous sur WhatsApp au +221 78 150 75 05.`

  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Baol Market <noreply@baolmarket.boutique>',
      replyTo: 'mohamedsawbusiness@gmail.com',
      to: profile.email,
      subject: 'Réinitialisation de votre mot de passe Baol Market',
      text: textContent,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <p>Bonjour${safeFirstName ? ` ${safeFirstName}` : ''},</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe Baol Market.</p>
          <p><a href="${resetLink}" style="background:#009A3D;color:white;padding:12px 20px;text-decoration:none;border-radius:4px;display:inline-block;">Réinitialiser mon mot de passe</a></p>
          <p style="color:#666;font-size:13px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
          <p style="color:#888;font-size:12px;margin-top:24px;border-top:1px solid #eee;padding-top:12px;">Baol Market, Diourbel, Sénégal. Besoin d&#39;aide ? Écrivez-nous sur WhatsApp au +221 78 150 75 05.</p>
        </div>
      `,
    })

    if (result.error) {
      console.error('Échec envoi e-mail de réinitialisation :', result.error.message || result.error)
    }
  } catch (e) {
    console.error('Erreur envoi email réinitialisation:', e)
  }

  return genericResponse
}