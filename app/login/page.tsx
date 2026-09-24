'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/Button'
import { FormField } from '@/components/FormField'
import { ErrorMessage } from '@/components/ErrorMessage'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
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
    } else if (data?.user) {
      const { data: staffRow } = await supabase.from('staff').select('role').eq('id', data.user.id).maybeSingle()
      if (!staffRow) {
        router.push('/')
      } else if (staffRow.role === 'moderator') {
        router.push('/admin/orders')
      } else {
        router.push('/admin')
      }
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
  }

  return (
    <div className="flex min-h-screen">
      {/* Colonne Gauche - Identité de marque (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-(--vert-baol-fonce) text-white flex-col justify-center px-12 xl:px-24">
        <h1 className="text-5xl xl:text-6xl font-bold mb-6">Baol Market</h1>
        <p className="text-xl xl:text-2xl font-light leading-relaxed max-w-lg">
          La qualité vérifiée, en bas de chez vous. Notre équipe s'assure personnellement de la fiabilité de chaque produit pour vous garantir une confiance totale.
        </p>
      </div>

      {/* Colonne Droite - Formulaire */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">
          {/* Titre Mobile uniquement */}
          <div className="lg:hidden mb-10 text-center">
            <h1 className="text-4xl font-bold text-(--encre) mb-3">Baol Market</h1>
          </div>

          <div className="bg-white rounded-none p-8 lg:p-0">
            <Link href="/" className="inline-flex items-center text-sm font-medium text-(--vert-baol) hover:text-(--vert-baol-fonce) transition-colors mb-6 group">
              <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
              Retour à l'accueil
            </Link>
            <h2 className="text-3xl font-semibold text-(--encre) mb-8">Se connecter</h2>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 border border-gray-200 bg-white py-3.5 px-4 font-medium text-(--encre) rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-(--vert-baol) transition-all mb-6"
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
              <div className="h-px bg-gray-200 flex-1" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">ou</span>
              <div className="h-px bg-gray-200 flex-1" />
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <FormField 
                label="Email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                placeholder="votre@email.com" 
              />
              <FormField 
                label="Mot de passe" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="Votre mot de passe" 
              />
              
              <ErrorMessage message={error} />

              <Button type="submit" disabled={loading} fullWidth>
                {loading ? 'Connexion...' : 'Se connecter'}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <Link href="/signup" className="text-sm text-(--vert-baol) hover:text-(--vert-baol-fonce) transition-colors underline underline-offset-4">
                Pas encore de compte ? Créer un compte
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}