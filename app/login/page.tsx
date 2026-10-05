'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { phoneToSyntheticEmail, normalizePhone } from '@/lib/phoneAuth'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/Button'
import { FormField } from '@/components/FormField'
import { ErrorMessage } from '@/components/ErrorMessage'

// Signale au serveur qu'un modérateur vient de se connecter (pour le journal d'activité).
// Si l'envoi échoue ou tarde trop, la connexion n'est jamais bloquée.
async function reportModeratorLogin(accessToken: string | undefined) {
  if (!accessToken) return
  try {
    await fetch('/api/admin/log-login', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(3000),
    })
  } catch {
    // Volontairement ignoré
  }
}

function LoginContent() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  async function handleLogin(e: React.FormEvent) {
  e.preventDefault()
  setLoading(true)
  setError('')

  const isEmailLogin = phone.includes('@')
  let emailToUse: string

  if (isEmailLogin) {
    // Connexion staff (admin/super admin/modérateur), comptes créés avec un vrai email
    emailToUse = phone.trim()
  } else {
    const canonicalPhone = normalizePhone(phone)
    if (!canonicalPhone) {
      setError("Numéro invalide. Utilisez 9 chiffres après l'indicatif (ex. 78 150 75 05).")
      setLoading(false)
      return
    }
    emailToUse = phoneToSyntheticEmail(canonicalPhone)
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email: emailToUse, password })

  setLoading(false)

  if (error) {
    setError(isEmailLogin ? 'Email ou mot de passe incorrect.' : 'Numéro ou mot de passe incorrect.')
    return
  }

  const next = searchParams.get('next')

  if (data?.user) {
    const { data: staffRow } = await supabase.from('staff').select('role').eq('id', data.user.id).maybeSingle()
    if (staffRow) {
      if (staffRow.role === 'moderator') {
        await reportModeratorLogin(data.session?.access_token)
      }
      router.push(staffRow.role === 'moderator' ? '/admin/orders' : '/admin')
    } else {
      router.push(next || '/')
    }
  } else {
    router.push(next || '/')
  }
}

  return (
    <div className="flex min-h-screen">
      {/* Colonne Gauche - Identité de marque (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-(--vert-baol-fonce) text-white flex-col justify-center px-12 xl:px-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10 z-0 pointer-events-none" />
        <div className="relative z-10">
          <Link href="/" className="inline-block mb-10 transition-opacity hover:opacity-90">
            <Image
              src="/logo-bm.png"
              alt="Baol Market"
              width={180}
              height={60}
              className="brightness-0 invert opacity-95"
              priority
            />
          </Link>
          <h1 className="text-4xl xl:text-5xl font-bold mb-6 leading-tight">
            La qualité vérifiée,<br />en bas de chez vous.
          </h1>
          <p className="text-lg xl:text-xl font-light leading-relaxed max-w-lg text-white/80">
            Notre équipe s&apos;assure personnellement de la fiabilité de chaque produit pour vous garantir une confiance totale.
          </p>
        </div>
      </div>

      {/* Colonne Droite - Formulaire */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-(--fond)">
        <div className="w-full max-w-md">
          {/* Logo Mobile uniquement */}
          <div className="lg:hidden mb-8 text-center flex justify-center">
            <Link href="/">
              <Image
                src="/logo-bm.png"
                alt="Baol Market"
                width={140}
                height={46}
                className="object-contain"
                priority
              />
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-8 lg:p-10 shadow-sm border border-gray-100">
            <Link
              href="/"
              className="inline-flex items-center text-sm font-medium text-(--vert-baol) hover:text-(--vert-baol-fonce) transition-colors mb-6 group outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded-md"
            >
              <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
              Retour à l&apos;accueil
            </Link>

            <h2 className="text-2xl font-bold text-(--encre) mb-2">Bon retour parmi nous</h2>
            <p className="text-(--gris-texte) mb-8 text-sm">Veuillez vous connecter pour accéder à votre compte.</p>

            <form onSubmit={handleLogin} className="space-y-5">
              <FormField
                label="Téléphone (ou email pour l'équipe)"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="78 150 75 05"
                autoComplete="username"
              />

              <div className="space-y-1.5">
                <FormField
                  label="Mot de passe"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Votre mot de passe"
                  autoComplete="current-password"
                />
                <div className="text-right">
                  <Link
                    href="/mot-de-passe-oublie"
                    className="text-xs text-(--gris-texte) hover:text-(--vert-baol) font-medium underline underline-offset-2 transition-colors"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
              </div>

              {error && (
                <div className="pt-1">
                  <ErrorMessage message={error} />
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                loading={loading}
                fullWidth
                className="py-3.5 shadow-md text-base font-semibold mt-2"
              >
                Se connecter
              </Button>
            </form>
          </div>

          <div className="mt-8 text-center">
            <p className="text-(--gris-texte) text-sm">
              Vous n&apos;avez pas encore de compte ?{' '}
              <Link
                href="/signup"
                className="text-(--vert-baol) font-bold hover:text-(--vert-baol-fonce) transition-colors underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded-sm"
              >
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}