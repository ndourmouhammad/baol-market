'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Menu, X, ShoppingBag, LogOut, User, LayoutDashboard, Store, MapPin } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/Button'

import type { User as SupabaseUser } from '@supabase/supabase-js'

export default function Header() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
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

  // Masquer sur les pages d'auth
  if (pathname === '/login' || pathname === '/signup') {
    return null
  }

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 border-b ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm border-gray-100'
            : 'bg-white border-transparent'
        } text-(--encre)`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            {/* Logo */}
            <Link 
              href="/" 
              className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) focus-visible:ring-offset-2"
              aria-label="Baol Market - Retour à l'accueil"
            >
              <Image 
                src="/logo-bm.png" 
                alt="Baol Market Logo" 
                width={140} 
                height={40} 
                className="h-8 md:h-10 w-auto object-contain"
                priority
              />
            </Link>

            {/* Navigation Desktop */}
            <nav className="hidden md:flex items-center gap-6 lg:gap-8">
              <Link
                href="/produits"
                className={`flex items-center gap-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded-md px-2 py-1 ${
                  pathname === '/produits' ? 'text-(--vert-baol)' : 'text-(--gris-texte) hover:text-(--encre)'
                }`}
              >
                <Store className="w-4 h-4" />
                Catalogue
              </Link>
              <Link
                href="/suivi"
                className={`flex items-center gap-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded-md px-2 py-1 ${
                  pathname === '/suivi' ? 'text-(--vert-baol)' : 'text-(--gris-texte) hover:text-(--encre)'
                }`}
              >
                <MapPin className="w-4 h-4" />
                Suivi
              </Link>

              {user && (
                <Link
                  href="/orders"
                  className={`flex items-center gap-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded-md px-2 py-1 ${
                    pathname === '/orders' ? 'text-(--vert-baol)' : 'text-(--gris-texte) hover:text-(--encre)'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  Mes commandes
                </Link>
              )}

              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 text-sm font-bold text-(--or-senegal) hover:text-yellow-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--or-senegal) rounded-md px-2 py-1"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Admin
                </Link>
              )}

              <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
                {user ? (
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-(--vert-baol)/10 text-(--vert-baol-fonce) flex items-center justify-center font-serif font-bold text-sm border border-(--vert-baol)/20">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <button
                      onClick={handleLogout}
                      className="text-sm font-medium text-(--gris-texte) hover:text-(--rouge-erreur) transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--rouge-erreur) rounded-md px-2 py-1"
                      aria-label="Se déconnecter"
                    >
                      <LogOut className="w-4 h-4" />
                      Déconnexion
                    </button>
                  </div>
                ) : (
                  <Link href="/login" tabIndex={-1}>
                    <Button variant="primary" size="sm" className="shadow-sm">
                      <User className="w-4 h-4 mr-2" />
                      Se connecter
                    </Button>
                  </Link>
                )}
              </div>
            </nav>

            {/* Bouton Menu Mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -mr-2 text-(--encre) hover:text-(--vert-baol) hover:bg-gray-50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol)"
              aria-label="Ouvrir le menu principal"
              aria-expanded={mobileMenuOpen}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Overlay Mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] animate-fade-in md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer Mobile */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-y-0 right-0 w-4/5 max-w-sm bg-white z-[70] shadow-2xl animate-slide-in-right md:hidden flex flex-col text-(--encre)"
          role="dialog"
          aria-modal="true"
          aria-label="Menu principal"
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
            <Image 
              src="/logo-bm.png" 
              alt="Baol Market" 
              width={120} 
              height={32} 
              className="h-7 w-auto object-contain" 
            />
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-gray-500 hover:text-(--encre) hover:bg-gray-100 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol)"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User info mobile */}
          {user && (
            <div className="px-4 py-5 bg-gray-50/50 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-(--vert-baol) text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-(--encre) truncate">{user.email}</p>
                  <p className="text-xs text-(--vert-baol) font-medium mt-0.5">Compte client</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links Mobile */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            <Link
              href="/produits"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3.5 text-base font-medium rounded-xl transition-colors ${
                pathname === '/produits' ? 'bg-(--vert-baol)/10 text-(--vert-baol-fonce)' : 'text-(--encre) hover:bg-gray-50'
              }`}
            >
              <Store className={`w-5 h-5 ${pathname === '/produits' ? 'text-(--vert-baol)' : 'text-gray-400'}`} />
              Catalogue
            </Link>

            <Link
              href="/suivi"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3.5 text-base font-medium rounded-xl transition-colors ${
                pathname === '/suivi' ? 'bg-(--vert-baol)/10 text-(--vert-baol-fonce)' : 'text-(--encre) hover:bg-gray-50'
              }`}
            >
              <MapPin className={`w-5 h-5 ${pathname === '/suivi' ? 'text-(--vert-baol)' : 'text-gray-400'}`} />
              Suivre ma commande
            </Link>

            {user && (
              <Link
                href="/orders"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 text-base font-medium rounded-xl transition-colors ${
                  pathname === '/orders' ? 'bg-(--vert-baol)/10 text-(--vert-baol-fonce)' : 'text-(--encre) hover:bg-gray-50'
                }`}
              >
                <ShoppingBag className={`w-5 h-5 ${pathname === '/orders' ? 'text-(--vert-baol)' : 'text-gray-400'}`} />
                Mes commandes
              </Link>
            )}

            {isAdmin && (
              <>
                <div className="h-px bg-gray-100 my-4" />
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 text-base font-bold text-(--or-senegal) bg-yellow-50 hover:bg-yellow-100 rounded-xl transition-colors"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  Espace Administrateur
                </Link>
              </>
            )}
          </nav>

          {/* Bottom actions mobile */}
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            {user ? (
              <Button
                variant="ghost"
                onClick={handleLogout}
                fullWidth
                className="text-(--rouge-erreur) hover:bg-red-50 hover:text-red-700 justify-start px-4"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Se déconnecter
              </Button>
            ) : (
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} tabIndex={-1} className="block w-full">
                <Button variant="primary" fullWidth>
                  <User className="w-5 h-5 mr-2" />
                  Se connecter
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  )
}
