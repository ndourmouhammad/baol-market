'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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

  if (loading) return <p className="p-4 text-terre">Chargement...</p>

  const canCreateAdmin = currentRole === 'super_admin'

  return (
    <div className="grid gap-8 md:grid-cols-[350px_1fr]">
      <div>
        <h2 className="text-xl font-semibold text-baobab mb-4">Ajouter un membre</h2>
        <form onSubmit={handleSubmit} className="space-y-3 bg-white p-4 rounded-lg border border-mil/30">
          <input
            type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} required
            className="w-full border border-mil/40 rounded px-3 py-2"
          />
          <select
            value={role} onChange={(e) => setRole(e.target.value as StaffRole)}
            className="w-full border border-mil/40 rounded px-3 py-2"
          >
            <option value="moderator">Modérateur</option>
            {canCreateAdmin && <option value="admin">Admin</option>}
          </select>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" disabled={saving} className="w-full bg-baobab text-white rounded px-3 py-2">
            {saving ? 'Création...' : 'Créer le compte'}
          </button>
        </form>

        {tempPassword && (
          <div className="mt-4 bg-yellow-50 border border-yellow-300 rounded p-4">
            <p className="text-sm font-medium text-baobab mb-1">Mot de passe temporaire (à communiquer, affiché une seule fois) :</p>
            <p className="font-mono text-lg text-terre">{tempPassword}</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-baobab mb-4">Équipe ({staffList.length})</h2>
        <div className="space-y-3">
          {staffList.map((s) => (
            <div key={s.id} className="bg-white p-4 rounded-lg border border-mil/30 flex justify-between items-center">
              <div>
                <p className="font-medium text-nuit-diourbel">{s.email}</p>
                <p className="text-sm text-terre">{ROLE_LABELS[s.role]}</p>
              </div>
              {s.role !== 'super_admin' && s.id !== currentUserId && (s.role !== 'admin' || currentRole === 'super_admin') && (
                <button onClick={() => removeStaff(s.id)} className="text-sm text-red-600 border border-red-300 rounded px-2 py-1">
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