'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  ShoppingCart,
  Package,
  Store,
  Bike,
  LogOut,
  Menu,
  X,
  Loader2,
  Tags
} from 'lucide-react'

const navItems = [
  { href: '/admin/orders', label: 'Commandes', icon: ShoppingCart },
  { href: '/admin/categories', label: 'Catégories', icon: Tags },
  { href: '/admin/products', label: 'Produits', icon: Package },
  { href: '/admin/merchants', label: 'Commerçants', icon: Store },
  { href: '/admin/riders', label: 'Livreurs', icon: Bike },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        router.push('/login')
        return
      }
      setChecking(false)
    }
    checkAdmin()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-sable flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-baobab animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sable md:flex">
      {/* Navbar Mobile (Hamburger) */}
      <div className="md:hidden bg-baobab text-white p-4 flex justify-between items-center sticky top-0 z-30">
        <h1 className="font-semibold text-lg font-fraunces">Baol Admin</h1>
        <button onClick={() => setIsMobileMenuOpen(true)}>
          <Menu size={24} />
        </button>
      </div>

      {/* Overlay mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Desktop & Mobile */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-mil/30
        transform transition-transform duration-200 ease-in-out flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 md:p-6 flex justify-between items-center border-b border-mil/30 md:border-none">
          <h1 className="text-2xl font-semibold text-baobab font-fraunces">Baol Admin</h1>
          <button className="md:hidden text-terre hover:text-nuit-diourbel transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-baobab text-white' 
                    : 'text-terre hover:bg-mil/20 hover:text-nuit-diourbel'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-mil/30">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            <LogOut size={20} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}