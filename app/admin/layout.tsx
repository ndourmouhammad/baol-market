'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const router = useRouter()

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

  if (checking) return <p className="p-6 text-baobab">Vérification...</p>

  return (
    <div className="min-h-screen bg-sable">
      <header className="bg-baobab text-white px-6 py-4">
        <h1 className="font-semibold">Baol Market — Back-office</h1>
        <nav className="flex gap-4 mt-2 text-sm">
          <a href="/admin/orders" className="hover:underline">Commandes</a>
          <a href="/admin/products" className="hover:underline">Produits</a>
          <a href="/admin/merchants" className="hover:underline">Commerçants</a>
          <a href="/admin/riders" className="hover:underline">Livreurs</a>
        </nav>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}