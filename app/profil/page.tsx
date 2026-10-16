'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatPhoneDisplay } from '@/lib/phoneAuth'
import { Button } from '@/components/Button'
import { PushToggle } from '@/components/PushToggle'
import { unsubscribeFromPush } from '@/lib/pushClient'
import {
  User,
  Mail,
  Lock,
  ShoppingBag,
  LogOut,
  Phone,
  Eye,
  EyeOff,
  ChevronRight,
  Shield,
  Edit3,
} from 'lucide-react'
import Link from 'next/link'

/* ────────────────────────────────────────── Types ────────────────────── */

interface ProfileData {
  firstName: string
  lastName: string
  phone: string
  email: string | null
}

/* ─────────────────────────────── Squelettes de chargement ────────────── */

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 animate-pulse">
      <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
      <div className="space-y-3">
        <div className="h-10 bg-gray-100 rounded-xl" />
        <div className="h-10 bg-gray-100 rounded-xl" />
      </div>
    </div>
  )
}

/* ──────────────────────────────────── Helpers ────────────────────────── */

async function apiFetch(path: string, options?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Non connecté.')
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...options?.headers,
    },
  })
}

/* ═══════════════════════════════ Page Profil ═════════════════════════ */

export default function ProfilPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<ProfileData | null>(null)

  // Charger le profil au montage
  const loadProfile = useCallback(async () => {
    try {
      const res = await apiFetch('/api/profile')
      if (res.status === 401) {
        router.replace('/login')
        return
      }
      if (!res.ok) return
      const data = await res.json()
      setProfile(data)
    } catch {
      // silence
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfile()
  }, [loadProfile])

  // Déconnexion
  const handleLogout = async () => {
    await unsubscribeFromPush()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* En-tête */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-(--vert-baol)/10 text-(--vert-baol-fonce) flex items-center justify-center font-serif font-bold text-xl sm:text-2xl border-2 border-(--vert-baol)/20 shrink-0">
              {profile?.firstName
                ? profile.firstName.charAt(0).toUpperCase()
                : <User className="w-7 h-7" />}
            </div>
            <div className="min-w-0">
              {loading ? (
                <div className="space-y-2">
                  <div className="h-6 w-36 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <h1 className="text-lg sm:text-xl font-bold text-(--encre) truncate">
                    {profile?.firstName && profile?.lastName
                      ? `${profile.firstName} ${profile.lastName}`
                      : 'Mon profil'}
                  </h1>
                  {profile?.phone && (
                    <p className="text-sm text-(--gris-texte) flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      {formatPhoneDisplay(profile.phone)}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : profile ? (
          <>
            {/* ── Carte 1 : Informations personnelles ── */}
            <InfoCard profile={profile} onUpdate={loadProfile} />

            {/* ── Carte 2 : Coordonnées & e-mail ── */}
            <EmailCard profile={profile} onUpdate={loadProfile} />

            {/* ── Carte 3 : Sécurité (mot de passe) ── */}
            <PasswordCard />

            {/* ── Carte 4 : Notifications ── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
              <h2 className="text-base font-bold text-(--encre) mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <span className="text-base">🔔</span>
                </span>
                Notifications
              </h2>
              <PushToggle className="w-full" />
            </div>

            {/* ── Lien Mes commandes ── */}
            <Link
              href="/orders"
              className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 hover:border-(--vert-baol)/30 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-(--vert-baol)/10 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4 text-(--vert-baol)" />
                </span>
                <span className="font-medium text-(--encre) group-hover:text-(--vert-baol) transition-colors">
                  Mes commandes
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-(--vert-baol) transition-colors" />
            </Link>

            {/* ── Déconnexion ── */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50/60 py-3.5 text-sm font-semibold text-(--rouge-erreur) hover:bg-red-100/80 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </button>
          </>
        ) : (
          <div className="text-center py-12 text-(--gris-texte)">
            <p>Impossible de charger le profil.</p>
            <Button variant="primary" size="sm" className="mt-4" onClick={() => { setLoading(true); loadProfile() }}>
              Réessayer
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════ Carte Informations ═════════════════════ */

function InfoCard({ profile, onUpdate }: { profile: ProfileData; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false)
  const [firstName, setFirstName] = useState(profile.firstName)
  const [lastName, setLastName] = useState(profile.lastName)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = async () => {
    setMessage(null)
    setSaving(true)
    try {
      const res = await apiFetch('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ firstName, lastName }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Erreur inconnue.' })
      } else {
        setMessage({ type: 'success', text: 'Informations mises à jour.' })
        setEditing(false)
        onUpdate()
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur réseau.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-(--encre) flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-(--vert-baol)/10 flex items-center justify-center">
            <User className="w-4 h-4 text-(--vert-baol)" />
          </span>
          Informations personnelles
        </h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-sm font-medium text-(--vert-baol) hover:text-(--vert-baol-fonce) flex items-center gap-1 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Modifier
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <label htmlFor="profile-firstname" className="block text-sm font-medium text-(--gris-texte) mb-1">
              Prénom
            </label>
            <input
              id="profile-firstname"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:border-(--vert-baol) focus:ring-2 focus:ring-(--vert-baol)/20 focus:bg-white outline-none transition-all text-(--encre)"
            />
          </div>
          <div>
            <label htmlFor="profile-lastname" className="block text-sm font-medium text-(--gris-texte) mb-1">
              Nom
            </label>
            <input
              id="profile-lastname"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:border-(--vert-baol) focus:ring-2 focus:ring-(--vert-baol)/20 focus:bg-white outline-none transition-all text-(--encre)"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
              Enregistrer
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(false)
                setFirstName(profile.firstName)
                setLastName(profile.lastName)
                setMessage(null)
              }}
            >
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-(--gris-texte) w-16 shrink-0">Prénom</span>
            <span className="font-medium text-(--encre)">{profile.firstName || '—'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-(--gris-texte) w-16 shrink-0">Nom</span>
            <span className="font-medium text-(--encre)">{profile.lastName || '—'}</span>
          </div>
        </div>
      )}

      {message && (
        <p
          aria-live="polite"
          className={`mt-3 text-sm font-medium ${message.type === 'success' ? 'text-(--vert-baol)' : 'text-(--rouge-erreur)'}`}
        >
          {message.text}
        </p>
      )}
    </div>
  )
}

/* ═════════════════════════════ Carte E-mail ══════════════════════════ */

function EmailCard({ profile, onUpdate }: { profile: ProfileData; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false)
  const [email, setEmail] = useState(profile.email ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = async () => {
    setMessage(null)
    setSaving(true)
    try {
      const res = await apiFetch('/api/profile/email', {
        method: 'PATCH',
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Erreur inconnue.' })
      } else {
        setMessage({ type: 'success', text: 'Adresse e-mail mise à jour.' })
        setEditing(false)
        setPassword('')
        onUpdate()
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur réseau.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-(--encre) flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Mail className="w-4 h-4 text-blue-500" />
          </span>
          Coordonnées
        </h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-sm font-medium text-(--vert-baol) hover:text-(--vert-baol-fonce) flex items-center gap-1 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Modifier
          </button>
        )}
      </div>

      {/* Téléphone (toujours en lecture seule) */}
      <div className="flex items-center gap-3 text-sm mb-3">
        <Phone className="w-4 h-4 text-(--gris-texte) shrink-0" />
        <span className="text-(--gris-texte) w-20 shrink-0">Téléphone</span>
        <span className="font-medium text-(--encre)">
          {profile.phone ? formatPhoneDisplay(profile.phone) : '—'}
        </span>
      </div>

      {editing ? (
        <div className="space-y-3 pt-1 border-t border-gray-50">
          <div className="pt-3">
            <label htmlFor="profile-email" className="block text-sm font-medium text-(--gris-texte) mb-1">
              Adresse e-mail
            </label>
            <input
              id="profile-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemple@email.com"
              className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:border-(--vert-baol) focus:ring-2 focus:ring-(--vert-baol)/20 focus:bg-white outline-none transition-all text-(--encre) placeholder:text-gray-400"
            />
          </div>
          <div>
            <label htmlFor="profile-email-password" className="block text-sm font-medium text-(--gris-texte) mb-1">
              Mot de passe (confirmation)
            </label>
            <div className="relative">
              <input
                id="profile-email-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                className="w-full px-4 py-2.5 pr-11 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:border-(--vert-baol) focus:ring-2 focus:ring-(--vert-baol)/20 focus:bg-white outline-none transition-all text-(--encre) placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
              Enregistrer
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(false)
                setEmail(profile.email ?? '')
                setPassword('')
                setShowPassword(false)
                setMessage(null)
              }}
            >
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-sm">
          <Mail className="w-4 h-4 text-(--gris-texte) shrink-0" />
          <span className="text-(--gris-texte) w-20 shrink-0">E-mail</span>
          <span className={`font-medium ${profile.email ? 'text-(--encre)' : 'text-gray-400 italic'}`}>
            {profile.email || 'Non renseigné'}
          </span>
        </div>
      )}

      {message && (
        <p
          aria-live="polite"
          className={`mt-3 text-sm font-medium ${message.type === 'success' ? 'text-(--vert-baol)' : 'text-(--rouge-erreur)'}`}
        >
          {message.text}
        </p>
      )}
    </div>
  )
}

/* ═══════════════════════════ Carte Mot de passe ═════════════════════ */

function PasswordCard() {
  const [editing, setEditing] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const resetForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setShowCurrent(false)
    setShowNew(false)
    setMessage(null)
  }

  const handleSave = async () => {
    setMessage(null)
    setSaving(true)
    try {
      const res = await apiFetch('/api/profile/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Erreur inconnue.' })
      } else {
        setMessage({ type: 'success', text: 'Mot de passe modifié avec succès.' })
        resetForm()
        setEditing(false)
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur réseau.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-(--encre) flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
            <Shield className="w-4 h-4 text-purple-500" />
          </span>
          Sécurité
        </h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-sm font-medium text-(--vert-baol) hover:text-(--vert-baol-fonce) flex items-center gap-1 transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            Changer
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <label htmlFor="profile-current-password" className="block text-sm font-medium text-(--gris-texte) mb-1">
              Mot de passe actuel
            </label>
            <div className="relative">
              <input
                id="profile-current-password"
                type={showCurrent ? 'text' : 'password'}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2.5 pr-11 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:border-(--vert-baol) focus:ring-2 focus:ring-(--vert-baol)/20 focus:bg-white outline-none transition-all text-(--encre)"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showCurrent ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="profile-new-password" className="block text-sm font-medium text-(--gris-texte) mb-1">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <input
                id="profile-new-password"
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 pr-11 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:border-(--vert-baol) focus:ring-2 focus:ring-(--vert-baol)/20 focus:bg-white outline-none transition-all text-(--encre)"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showNew ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              8 à 72 caractères, au moins une lettre et un chiffre.
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
              Changer le mot de passe
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(false)
                resetForm()
              }}
            >
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-(--gris-texte)">
          Mot de passe défini. Cliquez sur « Changer » pour le modifier.
        </p>
      )}

      {message && (
        <p
          aria-live="polite"
          className={`mt-3 text-sm font-medium ${message.type === 'success' ? 'text-(--vert-baol)' : 'text-(--rouge-erreur)'}`}
        >
          {message.text}
        </p>
      )}
    </div>
  )
}
