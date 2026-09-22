'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    let redirected = false

    function redirectAfterLogin(email?: string | null) {
      if (redirected) return
      redirected = true
      if (email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        router.replace('/admin')
      } else {
        router.replace('/')
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        redirectAfterLogin(session.user.email)
      }
    })

    async function handle() {
      const code = searchParams.get('code')
      if (code) {
        const { data } = await supabase.auth.exchangeCodeForSession(code)
        if (data.session) {
          redirectAfterLogin(data.session.user.email)
          return
        }
      }
      // Flux implicite (#access_token=...) : le client Supabase le détecte
      // automatiquement au chargement de la page (detectSessionInUrl est activé par défaut).
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        redirectAfterLogin(session.user.email)
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
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-12 h-12 border-4 border-terre/30 border-t-terre rounded-full animate-spin"></div>
    </div>
  )
}