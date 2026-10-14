'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle2, AlertCircle, ArrowLeft, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/Button'
import { FormField } from '@/components/FormField'
import { ErrorMessage } from '@/components/ErrorMessage'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasValidSession, setHasValidSession] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let mounted = true

    async function initSession() {
      // 1. Échange éventuel du code PKCE
      const code = searchParams.get('code')
      if (code) {
        try {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (!exchangeError && data.session && mounted) {
            setHasValidSession(true)
            setCheckingSession(false)
            return
          }
        } catch {
          // Ignoré, on passe à la vérification de session standard
        }
      }

      // 2. Vérification de la session active (mise en place par le hash #access_token de Supabase)
      const { data: { session } } = await supabase.auth.getSession()
      if (session && mounted) {
        setHasValidSession(true)
        setCheckingSession(false)
        return
      }

      // 3. Écoute de l'événement PASSWORD_RECOVERY
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return
        if (event === 'PASSWORD_RECOVERY' || session) {
          setHasValidSession(true)
          setCheckingSession(false)
        }
      })

      // Délai de grâce pour laisser le temps au client Supabase d'extraire le hash de l'URL
      const timer = setTimeout(() => {
        if (mounted && checkingSession) {
          setCheckingSession(false)
        }
      }, 2000)

      return () => {
        authListener.subscription.unsubscribe()
        clearTimeout(timer)
      }
    }

    initSession()

    return () => {
      mounted = false
    }
  }, [searchParams, checkingSession])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Le mot de passe doit comporter au moins 6 caractères.')
      return
    }

    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        setError(updateError.message || 'Impossible de mettre à jour le mot de passe. Veuillez réessayer.')
        setLoading(false)
        return
      }

      setSuccess(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Une erreur inattendue est survenue.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-6 py-12 bg-(--fond)">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center flex justify-center">
          <Link href="/">
            <Image
              src="/logo-bm.png"
              alt="Baol Market"
              width={160}
              height={52}
              className="object-contain"
              priority
            />
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-8 lg:p-10 shadow-sm border border-gray-100">
          {checkingSession ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
              <div className="w-10 h-10 border-4 border-(--vert-baol)/30 border-t-(--vert-baol) rounded-full animate-spin" />
              <p className="text-sm text-(--gris-texte) font-medium">Vérification du lien de récupération...</p>
            </div>
          ) : success ? (
            <div className="space-y-6 text-center">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-(--encre) mb-2">Mot de passe modifié !</h1>
                <p className="text-(--gris-texte) text-sm leading-relaxed">
                  Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
                </p>
              </div>

              <Button
                variant="primary"
                className="w-full text-base py-3 font-semibold"
                onClick={() => router.push('/login')}
              >
                Se connecter
              </Button>
            </div>
          ) : !hasValidSession ? (
            <div className="space-y-6 text-center">
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div>
                <h1 className="text-xl font-bold text-(--encre) mb-2">Lien invalide ou expiré</h1>
                <p className="text-(--gris-texte) text-sm leading-relaxed">
                  Ce lien de réinitialisation n&apos;est plus valable ou a déjà été utilisé. Veuillez faire une nouvelle demande.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <Link href="/mot-de-passe-oublie" className="block w-full">
                  <Button variant="primary" className="w-full text-base py-3">
                    Demander un nouveau lien
                  </Button>
                </Link>
                <Link href="/login" className="block w-full">
                  <Button variant="ghost" className="w-full border border-gray-200">
                    Retour à la connexion
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex items-center text-sm font-medium text-(--vert-baol) hover:text-(--vert-baol-fonce) transition-colors mb-6 group outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded-md"
              >
                <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
                Retour à la connexion
              </Link>

              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-(--vert-baol)/10 flex items-center justify-center text-(--vert-baol)">
                  <Lock className="w-5 h-5" />
                </div>
                <h1 className="text-2xl font-bold text-(--encre)">Nouveau mot de passe</h1>
              </div>

              <p className="text-(--gris-texte) mb-8 text-sm leading-relaxed">
                Choisissez un nouveau mot de passe sécurisé pour votre compte Baol Market.
              </p>

              {error && (
                <div className="mb-6">
                  <ErrorMessage message={error} />
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <FormField
                  label="Nouveau mot de passe"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Au moins 6 caractères"
                  required
                  autoComplete="new-password"
                  autoFocus
                />

                <FormField
                  label="Confirmer le mot de passe"
                  name="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Retapez le mot de passe"
                  required
                  autoComplete="new-password"
                />

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full text-base py-3.5 font-semibold mt-2"
                  disabled={loading}
                >
                  {loading ? 'Enregistrement...' : 'Enregistrer le nouveau mot de passe'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-(--fond)">
          <div className="w-10 h-10 border-4 border-(--vert-baol)/30 border-t-(--vert-baol) rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}
