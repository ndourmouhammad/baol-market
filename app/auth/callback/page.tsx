'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    let redirected = false

    async function redirectAfterLogin(userId?: string) {
      if (redirected || !userId) return
      redirected = true
      const { data: staffRow } = await supabase.from('staff').select('role').eq('id', userId).maybeSingle()
      if (!staffRow) {
        router.replace('/')
      } else if (staffRow.role === 'moderator') {
        router.replace('/admin/orders')
      } else {
        router.replace('/admin')
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        redirectAfterLogin(session.user.id)
      }
    })

    async function handle() {
      const code = searchParams.get('code')
      if (code) {
        const { data } = await supabase.auth.exchangeCodeForSession(code)
        if (data.session) {
          redirectAfterLogin(data.session.user.id)
          return
        }
      }
      // Flux implicite (#access_token=...) : le client Supabase le détecte
      // automatiquement au chargement de la page (detectSessionInUrl est activé par défaut).
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        redirectAfterLogin(session.user.id)
      }
    }
    handle()

    const timeout = setTimeout(() => {
      if (!redirected) router.replace('/login?error=auth')
    }, 6000)

    return () => {
      listener.subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [router, searchParams])

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] bg-(--fond)">
      <div className="w-12 h-12 border-4 border-(--vert-baol)/30 border-t-(--vert-baol) rounded-full animate-spin mb-4"></div>
      <p className="text-(--gris-texte) font-medium animate-pulse">Connexion en cours...</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[70vh] bg-(--fond)">
        <div className="w-12 h-12 border-4 border-(--vert-baol)/30 border-t-(--vert-baol) rounded-full animate-spin mb-4"></div>
        <p className="text-(--gris-texte) font-medium animate-pulse">Connexion en cours...</p>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}