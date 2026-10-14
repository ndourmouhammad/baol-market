'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/Button'
import { LogOut } from 'lucide-react'

async function authFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${session?.access_token}` },
  })
}

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const router = useRouter()

  function validate(): boolean {
    const errors: Record<string, string> = {}

    if (!currentPassword) {
      errors.currentPassword = 'Champ requis.'
    }
    if (!newPassword) {
      errors.newPassword = 'Champ requis.'
    } else if (newPassword.length < 10) {
      errors.newPassword = '10 caractères minimum.'
    } else if (newPassword.length > 72) {
      errors.newPassword = '72 caractères maximum.'
    } else if (!/[A-Za-z]/.test(newPassword)) {
      errors.newPassword = 'Au moins une lettre requise.'
    } else if (!/\d/.test(newPassword)) {
      errors.newPassword = 'Au moins un chiffre requis.'
    } else if (newPassword === currentPassword) {
      errors.newPassword = 'Le nouveau mot de passe doit être différent.'
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Champ requis.'
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = 'Les mots de passe ne correspondent pas.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!validate()) return

    setSaving(true)

    try {
      const res = await authFetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Une erreur est survenue.')
        setSaving(false)
        return
      }

      // Rafraîchir la session pour que app_metadata soit à jour
      await supabase.auth.refreshSession()

      // Déterminer le rôle pour la redirection
      const { data: { user } } = await supabase.auth.getUser()
      const { data: staffRow } = await supabase
        .from('staff')
        .select('role')
        .eq('id', user?.id ?? '')
        .maybeSingle()

      const home = staffRow?.role === 'moderator' ? '/admin/orders' : '/admin'
      router.replace(home)
    } catch {
      setError('Une erreur réseau est survenue.')
      setSaving(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--encre)">Choisissez votre mot de passe</h1>
        <p className="mt-2 text-sm text-(--gris-texte) leading-relaxed">
          Pour protéger votre compte, remplacez le mot de passe temporaire reçu par e-mail.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Mot de passe temporaire"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword((e.target as HTMLInputElement).value)}
          error={fieldErrors.currentPassword}
          autoComplete="current-password"
          required
        />
        <FormField
          label="Nouveau mot de passe"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword((e.target as HTMLInputElement).value)}
          error={fieldErrors.newPassword}
          helperText="10 caractères minimum, avec au moins une lettre et un chiffre"
          autoComplete="new-password"
          required
        />
        <FormField
          label="Confirmer le nouveau mot de passe"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword((e.target as HTMLInputElement).value)}
          error={fieldErrors.confirmPassword}
          autoComplete="new-password"
          required
        />

        {error && (
          <p className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>
        )}

        <Button type="submit" loading={saving} fullWidth className="mt-2">
          Enregistrer
        </Button>
      </form>

      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 text-sm font-medium text-(--gris-texte) hover:text-red-600 transition-colors py-2"
      >
        <LogOut size={16} />
        Se déconnecter
      </button>
    </div>
  )
}
