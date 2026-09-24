'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/Button'

type StaffRole = 'super_admin' | 'admin' | 'moderator'
type StaffMember = { id: string; email: string; role: StaffRole; created_at: string }

const ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: 'Super admin',
  admin: 'Admin',
  moderator: 'Modérateur',
}

async function authFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${session?.access_token}` },
  })
}

export default function AdminStaffPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [currentRole, setCurrentRole] = useState<StaffRole | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<StaffRole>('moderator')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id ?? null)

    if (user) {
      const { data: me } = await supabase.from('staff').select('role').eq('id', user.id).single()
      setCurrentRole((me?.role as StaffRole) ?? null)
    }

    const res = await authFetch('/api/admin/staff')
    const json = await res.json()
    if (res.ok) setStaffList(json.staff)
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setTempPassword(null)

    const res = await authFetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    })
    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(json.error)
    } else {
      setTempPassword(json.tempPassword)
      setEmail('')
      setRole('moderator')
      loadData()
    }
  }

  async function removeStaff(id: string) {
    if (!confirm("Retirer ce membre de l'équipe ? Son compte sera supprimé.")) return
    await authFetch(`/api/admin/staff/${id}`, { method: 'DELETE' })
    loadData()
  }

  if (loading) return <p className="p-4 text-(--gris-texte)">Chargement...</p>

  const canCreateAdmin = currentRole === 'super_admin'

  return (
    <div className="grid gap-8 md:grid-cols-[350px_1fr]">
      <div>
        <h2 className="text-xl font-bold text-(--encre) mb-4">Ajouter un membre</h2>
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="space-y-1.5">
            <label className="font-bold text-(--encre) block">Email</label>
            <input
              type="email" placeholder="Email" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-(--encre) focus:ring-2 focus:ring-(--vert-baol) outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-bold text-(--encre) block">Rôle</label>
            <select
              value={role} onChange={(e) => setRole(e.target.value as StaffRole)}
              className="w-full border border-gray-200 bg-white rounded-xl px-4 py-3 text-(--encre) focus:ring-2 focus:ring-(--vert-baol) outline-none"
            >
              <option value="moderator">Modérateur</option>
              {canCreateAdmin && <option value="admin">Admin</option>}
            </select>
          </div>
          {error && <p className="text-red-600 text-sm font-medium bg-red-50 p-2 rounded-lg">{error}</p>}
          <Button type="submit" disabled={saving} className="w-full mt-2">
            {saving ? 'Création...' : 'Créer le compte'}
          </Button>
        </form>

        {tempPassword && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
            <p className="text-sm font-bold text-(--encre) mb-2">Mot de passe temporaire (à communiquer, affiché une seule fois) :</p>
            <p className="font-mono text-xl font-bold text-(--encre)">{tempPassword}</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold text-(--encre) mb-4">Équipe ({staffList.length})</h2>
        <div className="space-y-3">
          {staffList.map((s) => (
            <div key={s.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
              <div>
                <p className="font-bold text-(--encre) text-lg">{s.email}</p>
                <p className="text-sm text-(--gris-texte) font-medium mt-1">{ROLE_LABELS[s.role]}</p>
              </div>
              {s.role !== 'super_admin' && s.id !== currentUserId && (s.role !== 'admin' || currentRole === 'super_admin') && (
                <button onClick={() => removeStaff(s.id)} className="text-sm font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2 hover:bg-red-100 transition-colors">
                  Retirer
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}