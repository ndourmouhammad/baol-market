'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/components/CartContext'
import { NotificationBell } from '@/components/NotificationBell'
import { Menu, X, ShoppingBag, LogOut, User, LayoutDashboard, Store, MapPin, ShoppingCart } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/Button'

import type { User as SupabaseUser } from '@supabase/supabase-js'

export default function Header() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isStaff, setIsStaff] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { totalItems } = useCart()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data: staffRow } = await supabase.from('staff').select('id').eq('id', user.id).maybeSingle()
        setIsStaff(!!staffRow)
      } else {
        setIsStaff(false)
      }
    }
    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        supabase.from('staff').select('id').eq('id', session.user.id).maybeSingle().then(({ data }) => {
          setIsStaff(!!data)
        })
      } else {
        setIsStaff(false)
      }
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
        className={`sticky top-0 z-50 w-full transition-all duration-300 border-b ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm border-gray-100'
            : 'bg-white border-transparent'
        } text-(--encre)`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            <Link 
              href="/" 
              className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) focus-visible:ring-offset-2"
              aria-label="Baol Market - Retour à l'accueil"
            >
              <Image 
                src="/logo-bm.png" 
                alt="Baol Market Logo" 
                width={180} 
                height={52} 
                className="h-11 md:h-14 w-auto object-contain"
                priority
              />
              <span className="text-lg md:text-xl font-bold text-(--encre) hidden sm:inline">Baol Market</span>
            </Link>

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

              {user && !isStaff && (
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

              {isStaff && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 text-sm font-bold text-(--or-senegal) hover:text-yellow-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--or-senegal) rounded-md px-2 py-1"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Admin
                </Link>
              )}

              {user && !isStaff && <NotificationBell userId={user.id} />}

              <Link
                href="/panier"
                className="relative flex items-center gap-2 text-sm font-medium text-(--gris-texte) hover:text-(--encre) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded-md px-2 py-1"
                aria-label={`Panier${totalItems > 0 ? ` (${totalItems} article${totalItems > 1 ? 's' : ''})` : ''}`}
              >
                <ShoppingCart className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-(--vert-baol) text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Link>

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

            <div className="flex items-center gap-1 md:hidden">
              {user && !isStaff && <NotificationBell userId={user.id} />}
              <Link
                href="/panier"
                className="relative p-2 text-(--encre)"
                aria-label={`Panier${totalItems > 0 ? ` (${totalItems} article${totalItems > 1 ? 's' : ''})` : ''}`}
              >
                <ShoppingCart className="w-6 h-6" />
                {totalItems > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-(--vert-baol) text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Link>
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 -mr-2 text-(--encre) hover:text-(--vert-baol) hover:bg-gray-50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol)"
                aria-label="Ouvrir le menu principal"
                aria-expanded={mobileMenuOpen}
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] animate-fade-in md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {mobileMenuOpen && (
        <div 
          className="fixed inset-y-0 right-0 w-4/5 max-w-sm bg-white z-[70] shadow-2xl animate-slide-in-right md:hidden flex flex-col text-(--encre)"
          role="dialog"
          aria-modal="true"
          aria-label="Menu principal"
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-2">
              <Image 
                src="/logo-bm.png" 
                alt="Baol Market" 
                width={140} 
                height={38} 
                className="h-9 w-auto object-contain" 
              />
              <span className="text-base font-bold text-(--encre)">Baol Market</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-gray-500 hover:text-(--encre) hover:bg-gray-100 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol)"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

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
              href="/panier"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3.5 text-base font-medium rounded-xl transition-colors ${
                pathname === '/panier' ? 'bg-(--vert-baol)/10 text-(--vert-baol-fonce)' : 'text-(--encre) hover:bg-gray-50'
              }`}
            >
              <ShoppingCart className={`w-5 h-5 ${pathname === '/panier' ? 'text-(--vert-baol)' : 'text-gray-400'}`} />
              Panier {totalItems > 0 ? `(${totalItems})` : ''}
            </Link>

            {user && !isStaff && (
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

            {isStaff && (
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