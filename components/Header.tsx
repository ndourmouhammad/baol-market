'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Menu, X, ShoppingBag, LogOut, User, LayoutDashboard } from 'lucide-react'
import Image from 'next/image'

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

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileMenuOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
        className={`sticky top-0 z-50 w-full transition-all duration-300 border-b border-gray-100 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-md'
            : 'bg-white'
        } text-(--encre)`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo-bm.png" alt="Baol Market" className="h-10 w-auto" />
            </Link>

            {/* Navigation Desktop */}
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/orders"
                className="flex items-center gap-1.5 text-sm font-medium text-(--gris-texte) hover:text-(--vert-baol) transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                Mes commandes
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 text-sm font-medium text-(--gris-texte) hover:text-(--vert-baol) transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Admin
                </Link>
              )}

              {user ? (
                <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
                  <div className="w-8 h-8 rounded-full bg-(--vert-baol) text-white flex items-center justify-center font-serif font-bold text-sm">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-sm font-medium text-(--gris-texte) hover:text-(--vert-baol) transition-colors flex items-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Déconnexion
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="text-sm font-medium bg-(--vert-baol) text-white px-5 py-2 rounded-xl hover:bg-(--vert-baol-fonce) transition-colors shadow-sm"
                >
                  Se connecter
                </Link>
              )}
            </nav>

            {/* Bouton Menu Mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-(--encre) hover:text-(--vert-baol) transition-colors"
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
        <div className="fixed inset-y-0 right-0 w-72 bg-white z-70 shadow-2xl animate-slide-in-right md:hidden flex flex-col text-(--encre)">
          {/* Drawer Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-(--vert-baol-fonce) text-white">
            <span className="font-serif font-bold text-lg">Menu</span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-white/10 transition-colors rounded-lg"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User info */}
          {user && (
            <div className="px-4 py-4 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-(--vert-baol) text-white flex items-center justify-center font-bold">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user.email}</p>
                  <p className="text-xs text-(--gris-texte)">Connecté</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-3 text-sm font-medium hover:bg-gray-50 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5 text-(--vert-baol)" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
              </svg>
              Accueil
            </Link>

            <Link
              href="/orders"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-3 text-sm font-medium hover:bg-gray-50 rounded-xl transition-colors"
            >
              <ShoppingBag className="w-5 h-5 text-(--vert-baol)" />
              Mes commandes
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 text-sm font-medium hover:bg-gray-50 rounded-xl transition-colors"
              >
                <LayoutDashboard className="w-5 h-5 text-(--vert-baol)" />
                Tableau de bord Admin
              </Link>
            )}
          </nav>

          {/* Bottom actions */}
          <div className="p-4 border-t border-gray-100">
            {user ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-(--rouge-erreur) bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Se déconnecter
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium bg-(--vert-baol) text-white rounded-xl hover:bg-(--vert-baol-fonce) transition-colors"
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
