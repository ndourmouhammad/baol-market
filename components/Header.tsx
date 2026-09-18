'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)

    return () => {
      authListener.subscription.unsubscribe()
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header 
      className={`sticky top-0 z-50 w-full bg-sable transition-all duration-300 ${
        isScrolled ? 'border-b border-terre/10 shadow-sm' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Wordmark */}
          <Link href="/" className="flex items-center gap-2 group">
            <svg className="w-8 h-8 text-baobab group-hover:text-terre transition-colors" viewBox="0 0 100 100" fill="currentColor">
              <path d="M50 0C22.4 0 0 22.4 0 50s22.4 50 50 50 50-22.4 50-50S77.6 0 50 0zm0 90C27.9 90 10 72.1 10 50S27.9 10 50 10s40 17.9 40 40-17.9 40-40 40zm15-45.5L47.5 62c-1.2 1.2-3.1 1.2-4.2 0l-8.3-8.3c-1.2-1.2-1.2-3.1 0-4.2 1.2-1.2 3.1-1.2 4.2 0l6.2 6.2 15.4-15.4c1.2-1.2 3.1-1.2 4.2 0 1.2 1.1 1.2 3 0 4.2z" />
            </svg>
            <span className="font-serif font-bold text-xl text-baobab group-hover:text-terre transition-colors">
              Baol Market
            </span>
          </Link>

          {/* Navigation Droite */}
          <div className="flex items-center gap-4">
            <Link 
              href="/orders" 
              className="text-sm font-medium text-baobab hover:text-terre transition-colors hidden sm:block"
            >
              Mes commandes
            </Link>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-terre/10 text-terre flex items-center justify-center font-serif font-bold text-sm">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <button 
                  onClick={handleLogout}
                  className="text-sm font-medium text-baobab/70 hover:text-terre transition-colors"
                >
                  Déconnexion
                </button>
              </div>
            ) : (
              <Link 
                href="/login" 
                className="text-sm font-medium bg-baobab text-sable px-4 py-2 hover:bg-baobab/90 transition-colors"
              >
                Se connecter
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
