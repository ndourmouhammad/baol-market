'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const getFriendlyErrorMessage = (errMsg: string) => {
    if (errMsg.toLowerCase().includes('user already registered')) return 'Cet email est déjà utilisé. Veuillez vous connecter.';
    if (errMsg.toLowerCase().includes('password should be at least')) return 'Le mot de passe doit contenir au moins 6 caractères.';
    return errMsg;
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })

    setLoading(false)

    if (error) {
      setError(getFriendlyErrorMessage(error.message))
    } else {
      router.push('/login')
    }
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
            <h2 className="font-serif text-3xl font-semibold text-baobab mb-8">Créer un compte</h2>
            
            <form onSubmit={handleSignup} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-baobab mb-2">
                  Nom complet
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="block w-full rounded-none border border-terre/30 bg-white/50 px-4 py-3 text-baobab placeholder-baobab/50 focus:border-terre focus:outline-none focus:ring-1 focus:ring-terre transition-colors"
                  placeholder="Mamadou Diop"
                />
              </div>

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
                    minLength={6}
                    className="block w-full rounded-none border border-terre/30 bg-white/50 px-4 py-3 pr-12 text-baobab placeholder-baobab/50 focus:border-terre focus:outline-none focus:ring-1 focus:ring-terre transition-colors"
                    placeholder="Au moins 6 caractères"
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
                {loading ? 'Création...' : "S'inscrire"}
              </button>
            </form>

            <div className="mt-8 text-center">
              <Link href="/login" className="text-sm text-baobab/80 hover:text-terre transition-colors underline decoration-terre/30 underline-offset-4">
                Déjà un compte ? Se connecter
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}