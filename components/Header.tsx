'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Menu, X, ShoppingBag, LogOut, User, LayoutDashboard } from 'lucide-react'

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const isAdmin = user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL

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

  // Fermer le menu mobile au resize desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileMenuOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Empêcher le scroll du body quand le menu est ouvert
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileMenuOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setMobileMenuOpen(false)
    router.push('/login')
  }

  if (pathname === '/login' || pathname === '/signup') {
    return null
  }

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          isScrolled
            ? 'bg-sable/95 backdrop-blur-md border-b border-terre/10 shadow-sm'
            : 'bg-sable'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 bg-terre rounded-lg flex items-center justify-center group-hover:bg-baobab transition-colors">
                <svg className="w-5 h-5 text-sable" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="font-serif font-bold text-xl text-baobab">
                Baol Market
              </span>
            </Link>

            {/* Navigation Desktop */}
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/orders"
                className="flex items-center gap-1.5 text-sm font-medium text-baobab/80 hover:text-terre transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                Mes commandes
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 text-sm font-medium text-vert-feuille hover:text-vert-feuille/80 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Admin
                </Link>
              )}

              {user ? (
                <div className="flex items-center gap-3 pl-2 border-l border-terre/15">
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-terre to-mil text-sable flex items-center justify-center font-serif font-bold text-sm">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-sm font-medium text-baobab/60 hover:text-terre transition-colors flex items-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Déconnexion
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="text-sm font-medium bg-terre text-sable px-5 py-2 rounded-lg hover:bg-terre/90 transition-colors shadow-sm"
                >
                  Se connecter
                </Link>
              )}
            </nav>

            {/* Bouton Menu Mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-baobab hover:text-terre transition-colors"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Overlay Mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-60 animate-fade-in md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Drawer Mobile */}
      {mobileMenuOpen && (
        <div className="fixed inset-y-0 right-0 w-70 bg-sable z-70 shadow-2xl animate-slide-in-right md:hidden flex flex-col">
          {/* Drawer Header */}
          <div className="flex items-center justify-between p-4 border-b border-terre/10">
            <span className="font-serif font-bold text-lg text-baobab">Menu</span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-baobab hover:text-terre transition-colors rounded-lg hover:bg-terre/5"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User info */}
          {user && (
            <div className="px-4 py-4 bg-terre/5 border-b border-terre/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-terre to-mil text-sable flex items-center justify-center font-serif font-bold">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-baobab truncate">{user.email}</p>
                  <p className="text-xs text-terre/70">Connecté</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-baobab hover:bg-terre/5 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-terre" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
              </svg>
              Accueil
            </Link>

            <Link
              href="/orders"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-baobab hover:bg-terre/5 rounded-lg transition-colors"
            >
              <ShoppingBag className="w-5 h-5 text-terre" />
              Mes commandes
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-vert-feuille hover:bg-vert-feuille/5 rounded-lg transition-colors"
              >
                <LayoutDashboard className="w-5 h-5" />
                Tableau de bord Admin
              </Link>
            )}
          </nav>

          {/* Bottom actions */}
          <div className="p-4 border-t border-terre/10">
            {user ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Se déconnecter
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium bg-terre text-sable rounded-lg hover:bg-terre/90 transition-colors"
              >
                <User className="w-4 h-4" />
                Se connecter
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  )
}
