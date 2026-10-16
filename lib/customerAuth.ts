import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from './supabaseAdmin'

/**
 * Authentifie un client (non staff) via le header Authorization Bearer.
 * Retourne { user, token } ou null si invalide / membre de l'équipe.
 */
export async function getCustomer(request: Request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return null

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null

  // Exclure les comptes staff — ils ont leur propre espace
  const { data: staffRow } = await supabaseAdmin
    .from('staff')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (staffRow) return null

  return { user, token }
}

/**
 * Vérifie le mot de passe actuel de l'utilisateur en tentant une connexion
 * avec un client Supabase temporaire (jamais stocké ni réutilisé).
 */
export async function verifyCurrentPassword(email: string, password: string): Promise<boolean> {
  const tempClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const { error } = await tempClient.auth.signInWithPassword({ email, password })
  return !error
}

/**
 * Valide un nouveau mot de passe côté serveur.
 * Retourne un message d'erreur en français ou null si valide.
 */
export function validateNewPassword(newPassword: string, currentPassword: string): string | null {
  if (newPassword.length < 8) {
    return 'Le mot de passe doit contenir au moins 8 caractères.'
  }
  if (newPassword.length > 72) {
    return 'Le mot de passe ne doit pas dépasser 72 caractères.'
  }
  if (!/[a-zA-Z]/.test(newPassword)) {
    return 'Le mot de passe doit contenir au moins une lettre.'
  }
  if (!/[0-9]/.test(newPassword)) {
    return 'Le mot de passe doit contenir au moins un chiffre.'
  }
  if (newPassword === currentPassword) {
    return 'Le nouveau mot de passe doit être différent de l\u0027ancien.'
  }
  return null
}
