'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/Button'
import { FormField } from '@/components/FormField'
import { ErrorMessage } from '@/components/ErrorMessage'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      <div className="hidden lg:flex lg:w-1/2 bg-(--vert-baol-fonce) text-white flex-col justify-center px-12 xl:px-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-black/10 z-0"></div>
        <div className="relative z-10">
          <Link href="/">
            <Image src="/logo-bm.png" alt="Baol Market" width={180} height={60} className="mb-10 brightness-0 invert opacity-90 hover:opacity-100 transition-opacity" />
          </Link>
          <h1 className="text-4xl xl:text-5xl font-bold mb-6 leading-tight">La qualité vérifiée,<br/>en bas de chez vous.</h1>
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
              <Image src="/logo-bm.png" alt="Baol Market" width={140} height={46} className="object-contain" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-8 lg:p-10 shadow-sm border border-gray-100">
            <Link href="/" className="inline-flex items-center text-sm font-medium text-(--vert-baol) hover:text-(--vert-baol-fonce) transition-colors mb-6 group outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded-md">
              <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
              Retour à l&apos;accueil
            </Link>
            
            <h2 className="text-2xl font-bold text-(--encre) mb-2">Bon retour parmi nous</h2>
            <p className="text-(--gris-texte) mb-8 text-sm">Veuillez vous connecter pour accéder à votre compte.</p>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 border border-gray-200 bg-white py-3 px-4 font-bold text-(--encre) rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-(--vert-baol) transition-all mb-6 shadow-sm disabled:opacity-70"
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
              </svg>
              {googleLoading ? 'Connexion en cours...' : 'Continuer avec Google'}
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="h-px bg-gray-200 flex-1" />
              <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">ou avec votre email</span>
              <div className="h-px bg-gray-200 flex-1" />
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <FormField 
                label="Adresse e-mail" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                placeholder="votre@email.com" 
              />
              
              <div className="relative">
                <FormField 
                  label="Mot de passe" 
                  type={showPassword ? 'text' : 'password'} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  placeholder="Votre mot de passe" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-gray-400 hover:text-(--encre) focus:outline-none p-1 rounded-md"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {error && (
                <div className="pt-2">
                  <ErrorMessage message={error} />
                </div>
              )}

              <Button type="submit" disabled={loading} fullWidth className="py-3 shadow-md mt-2">
                {loading ? 'Connexion en cours...' : 'Se connecter'}
              </Button>
            </form>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-(--gris-texte) text-sm">
              Vous n&apos;avez pas encore de compte ?{' '}
              <Link href="/signup" className="text-(--vert-baol) font-bold hover:text-(--vert-baol-fonce) transition-colors underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded-sm">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}