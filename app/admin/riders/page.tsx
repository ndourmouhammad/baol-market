'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Rider = { id: string; name: string; phone: string; is_active: boolean }

async function authFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${session?.access_token}` },
  })
}

export default function AdminRidersPage() {
  const [riders, setRiders] = useState<Rider[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadRiders() {
    const res = await authFetch('/api/admin/riders')
    const json = await res.json()
    if (res.ok) setRiders(json.riders)
  }

  useEffect(() => { loadRiders() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await authFetch('/api/admin/riders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone }),
    })

    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(json.error)
    } else {
      setName(''); setPhone('')
      loadRiders()
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-[350px_1fr]">
      <div>
        <h2 className="text-xl font-semibold text-baobab mb-4">Ajouter un livreur</h2>
        <form onSubmit={handleSubmit} className="space-y-3 bg-white p-4 rounded-lg border border-mil/30">
          <input type="text" placeholder="Nom du livreur" value={name}
            onChange={(e) => setName(e.target.value)} required
            className="w-full border border-mil/40 rounded px-3 py-2" />
          <input type="text" placeholder="Téléphone" value={phone}
            onChange={(e) => setPhone(e.target.value)} required
            className="w-full border border-mil/40 rounded px-3 py-2" />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" disabled={saving} className="w-full bg-baobab text-white rounded px-3 py-2">
            {saving ? 'Ajout...' : 'Ajouter le livreur'}
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-baobab mb-4">Livreurs ({riders.length})</h2>
        <div className="space-y-3">
          {riders.map((r) => (
            <div key={r.id} className="bg-white p-4 rounded-lg border border-mil/30">
              <p className="font-medium text-nuit-diourbel">{r.name}</p>
              <p className="text-sm text-terre">{r.phone}</p>
              <p className="text-sm">{r.is_active ? '✅ Actif' : '⏸️ Inactif'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}