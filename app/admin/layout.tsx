'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Store,
  Bike,
  LogOut,
  Menu,
  X,
  Loader2,
  Tags,
  Users
} from 'lucide-react'

type StaffRole = 'super_admin' | 'admin' | 'moderator'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [role, setRole] = useState<StaffRole | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    async function checkStaff() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: staffRow } = await supabase
        .from('staff')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (!staffRow) {
        router.push('/login')
        return
      }

      setRole(staffRow.role as StaffRole)
      setChecking(false)
    }
    checkStaff()
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

  const canManageStaff = role === 'admin' || role === 'super_admin'

  const navItems = [
    ...(canManageStaff ? [{ href: '/admin', label: 'Tableau de Bord', icon: LayoutDashboard }] : []),
    { href: '/admin/orders', label: 'Commandes', icon: ShoppingCart },
    { href: '/admin/categories', label: 'Catégories', icon: Tags },
    { href: '/admin/products', label: 'Produits', icon: Package },
    { href: '/admin/merchants', label: 'Commerçants', icon: Store },
    { href: '/admin/riders', label: 'Livreurs', icon: Bike },
    ...(canManageStaff ? [{ href: '/admin/equipe', label: 'Équipe', icon: Users }] : []),
  ]

  return (
    <div className="min-h-screen bg-sable md:flex">
      <div className="md:hidden bg-baobab text-white p-4 flex justify-between items-center sticky top-0 z-30">
        <h1 className="font-semibold text-lg font-fraunces">Baol Admin</h1>
        <button onClick={() => setIsMobileMenuOpen(true)}>
          <Menu size={24} />
        </button>
      </div>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

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

        <div className="p-4 border-t border-mil/30 space-y-1">
          {role && (
            <p className="px-4 text-xs text-terre/70 mb-1">
              Connecté en tant que {role === 'super_admin' ? 'Super admin' : role === 'admin' ? 'Admin' : 'Modérateur'}
            </p>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            <LogOut size={20} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}