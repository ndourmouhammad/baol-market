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

function SignupContent() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, phone, password, email: email.trim() || undefined }),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error)
      setLoading(false)
      return
    }

    const canonicalPhone = normalizePhone(phone)!
    const syntheticEmail = phoneToSyntheticEmail(canonicalPhone)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: syntheticEmail, password })

    setLoading(false)

    const next = searchParams.get('next')
    if (signInError) {
      router.push(`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`)
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
            Créez votre compte pour suivre vos commandes facilement et simplifier vos prochains achats en un clic.
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

            <h2 className="text-2xl font-bold text-(--encre) mb-2">Créer votre compte</h2>
            <p className="text-(--gris-texte) mb-8 text-sm">Rejoignez-nous pour gérer facilement vos commandes.</p>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Prénom"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  placeholder="Mamadou"
                  autoComplete="given-name"
                />
                <FormField
                  label="Nom"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  placeholder="Diop"
                  autoComplete="family-name"
                />
              </div>

              <FormField
                label="Numéro de téléphone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="78 150 75 05"
                autoComplete="tel"
              />

              <FormField
                label="Adresse e-mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com (optionnel)"
                helperText="Optionnel mais recommandé pour pouvoir réinitialiser votre mot de passe."
                autoComplete="email"
              />

              <FormField
                label="Mot de passe"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Au moins 6 caractères"
                autoComplete="new-password"
              />

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
                S&apos;inscrire
              </Button>
            </form>
          </div>

          <div className="mt-8 text-center">
            <p className="text-(--gris-texte) text-sm">
              Vous avez déjà un compte ?{' '}
              <Link
                href="/login"
                className="text-(--vert-baol) font-bold hover:text-(--vert-baol-fonce) transition-colors underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded-sm"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupContent />
    </Suspense>
  )
}