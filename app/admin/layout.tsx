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
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}