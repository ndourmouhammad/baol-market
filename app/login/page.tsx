'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const getFriendlyErrorMessage = (errMsg: string) => {
    if (errMsg.toLowerCase().includes('invalid login credentials')) return 'Email ou mot de passe incorrect.';
    if (errMsg.toLowerCase().includes('email not confirmed')) return 'Veuillez confirmer votre adresse email avant de vous connecter.';
    return errMsg;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (error) {
      setError(getFriendlyErrorMessage(error.message))
    } else if (data?.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
      router.push('/admin')
    } else {
      router.push('/')
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
    // Sinon, redirection automatique vers Google — pas besoin de gérer la suite ici
  }

  return (
    <div className="flex min-h-screen">
      {/* Colonne Gauche - Identité de marque (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-nuit-diourbel text-sable flex-col justify-center px-12 xl:px-24">
        <h1 className="font-serif text-5xl xl:text-6xl font-bold mb-6">Baol Market</h1>
        <p className="text-xl xl:text-2xl font-light leading-relaxed max-w-lg">
          La qualité vérifiée, en bas de chez vous. Notre équipe s'assure personnellement de la fiabilité de chaque produit pour vous garantir une confiance totale.
        </p>
      </div>

      {/* Colonne Droite - Formulaire */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-sable">
        <div className="w-full max-w-md">
          {/* Titre Mobile uniquement */}
          <div className="lg:hidden mb-10 text-center">
            <h1 className="font-serif text-4xl font-bold text-baobab mb-3">Baol Market</h1>
          </div>

          <div className="bg-sable lg:bg-transparent lg:border-none border border-terre/20 rounded-none p-8 lg:p-0">
            <Link href="/" className="inline-flex items-center text-sm font-medium text-terre hover:text-terre/80 transition-colors mb-6 group">
              <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
              Retour à l'accueil
            </Link>
            <h2 className="font-serif text-3xl font-semibold text-baobab mb-8">Se connecter</h2>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 border border-terre/30 bg-white py-3.5 px-4 font-medium text-baobab hover:bg-sable/50 focus:outline-none focus:ring-2 focus:ring-terre focus:ring-offset-2 focus:ring-offset-sable disabled:opacity-70 transition-all mb-6"
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
              </svg>
              {googleLoading ? 'Connexion...' : 'Continuer avec Google'}
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="h-px bg-terre/20 flex-1" />
              <span className="text-xs text-baobab/50 uppercase tracking-wider">ou</span>
              <div className="h-px bg-terre/20 flex-1" />
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-baobab mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full rounded-none border border-terre/30 bg-white/50 px-4 py-3 text-baobab placeholder-baobab/50 focus:border-terre focus:outline-none focus:ring-1 focus:ring-terre transition-colors"
                  placeholder="votre@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-baobab mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="block w-full rounded-none border border-terre/30 bg-white/50 px-4 py-3 pr-12 text-baobab placeholder-baobab/50 focus:border-terre focus:outline-none focus:ring-1 focus:ring-terre transition-colors"
                    placeholder="Votre mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-baobab/70 hover:text-terre focus:outline-none p-1"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-terre/10 border-l-4 border-terre p-4">
                  <p className="text-terre text-sm font-medium">{error}</p>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-terre text-sable py-3.5 px-4 font-medium hover:bg-terre/90 focus:outline-none focus:ring-2 focus:ring-terre focus:ring-offset-2 focus:ring-offset-sable disabled:opacity-70 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>

            <div className="mt-8 text-center">
              <Link href="/signup" className="text-sm text-baobab/80 hover:text-terre transition-colors underline decoration-terre/30 underline-offset-4">
                Pas encore de compte ? Créer un compte
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}