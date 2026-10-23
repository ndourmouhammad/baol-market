'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/components/CartContext'
import { NotificationBell } from '@/components/NotificationBell'
import { Menu, X, ShoppingBag, LogOut, User, LayoutDashboard, Store, ShoppingCart, Search, ChevronRight, MessageCircle, HardHat } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/Button'
import { formatPhoneDisplay } from '@/lib/phoneAuth'
import { unsubscribeFromPush } from '@/lib/pushClient'
import { PushToggle } from '@/components/PushToggle'
import { CategoryBar } from '@/components/CategoryBar'

import type { User as SupabaseUser } from '@supabase/supabase-js'

export default function Header() {
  type StaffRole = 'super_admin' | 'admin' | 'moderator'
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isStaff, setIsStaff] = useState(false)
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null)

  const staffLabel = staffRole === 'super_admin' ? 'Super Admin' : staffRole === 'admin' ? 'Admin' : 'Modération'
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  type CategoryItem = { id: string; name: string; slug: string }
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [showAllCategories, setShowAllCategories] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { totalItems } = useCart()

  const isHiddenPath =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/commande') ||
    pathname.startsWith('/paiement') ||
    pathname.startsWith('/panier')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = searchQuery.trim()
    if (!trimmed) return
    setMobileMenuOpen(false)
    router.push(`/produits?q=${encodeURIComponent(trimmed)}`)
  }

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data: staffRow } = await supabase.from('staff').select('id, role').eq('id', user.id).maybeSingle()
        setIsStaff(!!staffRow)
        setStaffRole((staffRow?.role as StaffRole) ?? null)
      } else {
        setIsStaff(false)
        setStaffRole(null)
      }
    }
    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        supabase.from('staff').select('id, role').eq('id', session.user.id).maybeSingle().then(({ data }) => {
          setIsStaff(!!data)
          setStaffRole((data?.role as StaffRole) ?? null)
        })
      } else {
        setIsStaff(false)
        setStaffRole(null)
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
    async function fetchCategories() {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug')
          .order('name')
        if (!error && data) {
          setCategories(data)
        }
      } catch (err) {
        console.error('Erreur chargement catégories menu:', err)
      }
    }
    fetchCategories()
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
    await unsubscribeFromPush()
    await supabase.auth.signOut()
    setMobileMenuOpen(false)
    router.push('/login')
  }

  if (pathname === '/login' || pathname === '/signup') {
    return null
  }

  // Identité affichée : les comptes clients par téléphone ont une adresse technique
  // (221…@phone.baolmarket.internal) qu'on ne montre jamais ; le prénom et le nom
  // enregistrés à l'inscription sont utilisés à la place.
  const meta = (user?.user_metadata ?? {}) as { first_name?: string; last_name?: string; phone?: string }
  const isPhoneAccount = !!user?.email?.endsWith('@phone.baolmarket.internal')
  const displayName = [meta.first_name, meta.last_name].filter(Boolean).join(' ')
  const initial = meta.first_name
    ? meta.first_name.charAt(0).toUpperCase()
    : !isPhoneAccount && user?.email
      ? user.email.charAt(0).toUpperCase()
      : null
  const menuName = displayName || (isPhoneAccount ? 'Mon compte' : user?.email ?? '')
  const menuContact = isPhoneAccount
    ? (meta.phone && meta.phone.length === 12 ? formatPhoneDisplay(meta.phone) : '')
    : displayName ? user?.email ?? '' : ''

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
              className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) focus-visible:ring-offset-2 shrink-0"
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

            {!isHiddenPath && (
              <form
                role="search"
                onSubmit={handleSearchSubmit}
                className="hidden md:flex flex-1 max-w-xs lg:max-w-md xl:max-w-lg mx-3 lg:mx-6 items-center"
              >
                <label htmlFor="header-search-desktop" className="sr-only">
                  Rechercher un produit
                </label>
                <div className="relative w-full flex items-center">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
                  <input
                    id="header-search-desktop"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cherchez un produit ou une catégorie"
                    className="w-full pl-10 pr-10 lg:pr-28 py-2 text-sm bg-gray-100/80 hover:bg-gray-100 focus:bg-white text-(--encre) placeholder:text-(--gris-texte) rounded-full border border-transparent focus:border-(--vert-baol) focus:outline-none focus:ring-2 focus:ring-(--vert-baol)/20 transition-all"
                  />
                  <button
                    type="submit"
                    aria-label="Rechercher"
                    className="absolute right-1 px-3 py-1.5 bg-(--vert-baol) hover:bg-(--vert-baol-fonce) text-white text-xs font-semibold rounded-full flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol)"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">Rechercher</span>
                  </button>
                </div>
              </form>
            )}

            <nav className="hidden md:flex items-center gap-4 lg:gap-6 shrink-0">
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
                href="/services"
                className={`flex items-center gap-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded-md px-2 py-1 ${
                  pathname.startsWith('/services') ? 'text-(--vert-baol)' : 'text-(--gris-texte) hover:text-(--encre)'
                }`}
              >
                <HardHat className="w-4 h-4" />
                Services
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
                  {staffLabel}
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
                    {!isStaff ? (
                      <Link
                        href="/profil"
                        aria-label="Mon profil"
                        title={menuName}
                        className="w-9 h-9 rounded-full bg-(--vert-baol)/10 text-(--vert-baol-fonce) flex items-center justify-center font-serif font-bold text-sm border border-(--vert-baol)/20 hover:border-(--vert-baol)/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) focus-visible:ring-offset-2"
                      >
                        {initial ?? <User className="w-4 h-4" />}
                      </Link>
                    ) : (
                      <div
                        className="w-9 h-9 rounded-full bg-(--vert-baol)/10 text-(--vert-baol-fonce) flex items-center justify-center font-serif font-bold text-sm border border-(--vert-baol)/20"
                        title={menuName}
                      >
                        {initial ?? <User className="w-4 h-4" />}
                      </div>
                    )}
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

        {/* Barre de catégories desktop fixée dans le header (style Jumia) */}
        {!isHiddenPath && categories.length > 0 && (
          <CategoryBar categories={categories} />
        )}
      </header>

      {!isHiddenPath && (
        <div className="md:hidden bg-white border-b border-gray-100 px-4 py-2.5">
          <form
            role="search"
            onSubmit={handleSearchSubmit}
            className="relative flex items-center"
          >
            <label htmlFor="header-search-mobile" className="sr-only">
              Rechercher un produit
            </label>
            <div className="relative w-full flex items-center">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
              <input
                id="header-search-mobile"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cherchez un produit ou une catégorie"
                className="w-full pl-10 pr-24 py-2 text-sm bg-gray-100/80 hover:bg-gray-100 focus:bg-white text-(--encre) placeholder:text-(--gris-texte) rounded-full border border-transparent focus:border-(--vert-baol) focus:outline-none focus:ring-2 focus:ring-(--vert-baol)/20 transition-all"
              />
              <button
                type="submit"
                aria-label="Rechercher"
                className="absolute right-1 px-3 py-1.5 bg-(--vert-baol) hover:bg-(--vert-baol-fonce) text-white text-xs font-semibold rounded-full flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol)"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Rechercher</span>
              </button>
            </div>
          </form>
        </div>
      )}

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
            <div className="px-4 py-4 bg-gray-50/50 border-b border-gray-100 space-y-3">
              {!isStaff ? (
                <Link
                  href="/profil"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 hover:opacity-85 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded-xl"
                  aria-label="Mon profil"
                >
                  <div className="w-12 h-12 rounded-full bg-(--vert-baol) text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                    {initial ?? <User className="w-6 h-6" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-(--encre) truncate">{menuName}</p>
                    {menuContact && <p className="text-xs text-(--gris-texte) truncate">{menuContact}</p>}
                    <p className="text-xs text-(--vert-baol) font-medium mt-0.5">Compte client</p>
                  </div>
                </Link>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-(--vert-baol) text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                    {initial ?? <User className="w-6 h-6" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-(--encre) truncate">{menuName}</p>
                    {menuContact && <p className="text-xs text-(--gris-texte) truncate">{menuContact}</p>}
                    <p className="text-xs text-(--vert-baol) font-medium mt-0.5">{staffLabel}</p>
                  </div>
                </div>
              )}
              <PushToggle />
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
              href="/services"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3.5 text-base font-medium rounded-xl transition-colors ${
                pathname.startsWith('/services') ? 'bg-(--vert-baol)/10 text-(--vert-baol-fonce)' : 'text-(--encre) hover:bg-gray-50'
              }`}
            >
              <HardHat className={`w-5 h-5 ${pathname.startsWith('/services') ? 'text-(--vert-baol)' : 'text-gray-400'}`} />
              Services
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

            {user && !isStaff && (
              <Link
                href="/profil"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 text-base font-medium rounded-xl transition-colors ${
                  pathname === '/profil' ? 'bg-(--vert-baol)/10 text-(--vert-baol-fonce)' : 'text-(--encre) hover:bg-gray-50'
                }`}
              >
                <User className={`w-5 h-5 ${pathname === '/profil' ? 'text-(--vert-baol)' : 'text-gray-400'}`} />
                Mon profil
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
                  {staffRole === 'moderator' ? 'Espace Modération' : 'Espace Administrateur'}
                </Link>
              </>
            )}

            {categories.length > 0 && (
              <>
                <div className="h-px bg-gray-100 my-4" />
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-(--gris-texte)">
                      Nos catégories
                    </span>
                    {categories.length > 6 && (
                      <button
                        type="button"
                        onClick={() => setShowAllCategories((prev) => !prev)}
                        className="text-xs font-bold text-(--vert-baol) hover:text-(--vert-baol-fonce) transition-colors py-1 px-2 -mr-2 rounded-lg"
                      >
                        {showAllCategories ? 'Voir moins' : 'Voir plus'}
                      </button>
                    )}
                  </div>

                  <Link
                    href="/produits"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between min-h-[44px] px-3 py-2.5 text-base text-(--encre) hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    <span className="font-medium">Tous les produits</span>
                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                  </Link>

                  {(showAllCategories ? categories : categories.slice(0, 6)).map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/categorie/${cat.slug}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between min-h-[44px] px-3 py-2.5 text-base text-(--encre) hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      <span>{cat.name}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                    </Link>
                  ))}
                </div>
              </>
            )}

            <div className="h-px bg-gray-100 my-4" />
            <div className="space-y-1">
              <div className="px-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-(--gris-texte)">
                  Besoin d&apos;aide ?
                </span>
              </div>
              <a
                href="https://wa.me/221781507505"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between min-h-[44px] px-3 py-2.5 text-base text-(--vert-baol-fonce) bg-emerald-50/70 hover:bg-emerald-100/70 rounded-xl font-medium transition-colors border border-emerald-100/60"
              >
                <span className="flex items-center gap-2.5">
                  <MessageCircle className="w-5 h-5 text-(--vert-baol) shrink-0" />
                  <span>Nous contacter sur WhatsApp</span>
                </span>
                <ChevronRight className="w-4 h-4 text-emerald-600/70 shrink-0" />
              </a>
            </div>
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