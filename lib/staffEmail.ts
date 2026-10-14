import crypto from 'crypto'
import { resend } from './resend'

// Alphabet sans ambiguïté (pas de 0/O, 1/l/I)
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

const HAS_LETTER = /[A-Za-z]/
const HAS_DIGIT = /\d/

/**
 * Génère un mot de passe simple de 10 caractères avec au moins une lettre et un chiffre.
 * Utilise `crypto.randomInt` pour un tirage cryptographiquement sûr.
 */
export function generateSimplePassword(): string {
  for (;;) {
    let pwd = ''
    for (let i = 0; i < 10; i++) {
      pwd += ALPHABET[crypto.randomInt(0, ALPHABET.length)]
    }
    if (HAS_LETTER.test(pwd) && HAS_DIGIT.test(pwd)) return pwd
  }
}

// Correspondance rôle → libellé français
const ROLE_FR: Record<string, string> = {
  super_admin: 'Super admin',
  admin: 'Admin',
  moderator: 'Modérateur',
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

type SendStaffEmailParams = {
  to: string
  role: string
  tempPassword: string
  kind: 'welcome' | 'reset'
}

/**
 * Envoie un e-mail de bienvenue ou de réinitialisation au membre.
 * Retourne true si l'envoi a réussi, false sinon (sans lever d'exception).
 */
export async function sendStaffEmail({ to, role, tempPassword, kind }: SendStaffEmailParams): Promise<boolean> {
  const from = process.env.EMAIL_FROM || 'Baol Market <noreply@baolmarket.boutique>'
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://baolmarket.boutique').replace(/\/+$/, '')
  const loginUrl = `${baseUrl}/login`

  const roleFr = escapeHtml(ROLE_FR[role] ?? role)
  const emailSafe = escapeHtml(to)
  const passwordSafe = escapeHtml(tempPassword)

  const isWelcome = kind === 'welcome'
  const subject = isWelcome
    ? 'Votre accès à l\'espace équipe Baol Market'
    : 'Votre nouveau mot de passe temporaire Baol Market'

  const moderatorNotice = role === 'moderator'
    ? `<p style="margin:16px 0 0;color:#555;font-size:14px;line-height:1.5;">Votre matricule vous sera remis en personne par votre administrateur. Il ne vous est jamais envoyé par e-mail.</p>`
    : ''

  const moderatorNoticePlain = role === 'moderator'
    ? '\n\nVotre matricule vous sera remis en personne par votre administrateur. Il ne vous est jamais envoyé par e-mail.'
    : ''

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background-color:#009A3D;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Baol Market</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:18px;font-weight:700;">${isWelcome ? 'Bienvenue dans l&#39;équipe !' : 'Nouveau mot de passe temporaire'}</h2>
          <p style="margin:0 0 8px;color:#555;font-size:14px;line-height:1.5;">Rôle : <strong style="color:#1a1a1a;">${roleFr}</strong></p>
          <p style="margin:0 0 8px;color:#555;font-size:14px;line-height:1.5;">Identifiant : <strong style="color:#1a1a1a;">${emailSafe}</strong></p>
          <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.5;">Mot de passe temporaire : <strong style="color:#1a1a1a;font-family:'Courier New',Courier,monospace;font-size:16px;letter-spacing:1px;">${passwordSafe}</strong></p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="background-color:#009A3D;border-radius:12px;padding:14px 28px;">
              <a href="${loginUrl}" target="_blank" style="color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">Se connecter</a>
            </td></tr>
          </table>
          <div style="background-color:#f8f8f8;border-radius:10px;padding:16px 20px;border-left:4px solid #009A3D;">
            <p style="margin:0 0 6px;color:#1a1a1a;font-size:13px;line-height:1.5;font-weight:600;">Consignes :</p>
            <ul style="margin:0;padding:0 0 0 18px;color:#555;font-size:13px;line-height:1.7;">
              <li>Connectez-vous dès réception de ce message.</li>
              <li>Vous devrez choisir un nouveau mot de passe immédiatement.</li>
              <li>Ne partagez jamais ce mot de passe.</li>
              <li>Supprimez ce message après votre première connexion.</li>
            </ul>
          </div>${moderatorNotice}
        </td></tr>
        <tr><td style="padding:16px 32px;background-color:#f8f8f8;border-top:1px solid #eee;">
          <p style="margin:0;color:#999;font-size:11px;text-align:center;">Cet e-mail a été envoyé automatiquement par Baol Market.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const text = [
    isWelcome ? 'Bienvenue dans l\'équipe Baol Market !' : 'Nouveau mot de passe temporaire Baol Market',
    '',
    `Rôle : ${ROLE_FR[role] ?? role}`,
    `Identifiant : ${to}`,
    `Mot de passe temporaire : ${tempPassword}`,
    '',
    `Se connecter : ${loginUrl}`,
    '',
    'Consignes :',
    '- Connectez-vous dès réception de ce message.',
    '- Vous devrez choisir un nouveau mot de passe immédiatement.',
    '- Ne partagez jamais ce mot de passe.',
    '- Supprimez ce message après votre première connexion.',
    moderatorNoticePlain,
  ].join('\n')

  try {
    const result = await resend.emails.send({
      from,
      to,
      replyTo: 'mohamedsawbusiness@gmail.com',
      subject,
      html,
      text,
    })

    if (result.error) {
      // On ne journalise jamais le mot de passe ni l'adresse complète
      const masked = to.split('@')[0].slice(0, 3) + '***'
      console.error(`Erreur envoi e-mail staff (${kind}) pour ${masked}:`, result.error.message)
      return false
    }
    return true
  } catch (e) {
    const masked = to.split('@')[0].slice(0, 3) + '***'
    console.error(`Exception envoi e-mail staff (${kind}) pour ${masked}:`, e)
    return false
  }
}
