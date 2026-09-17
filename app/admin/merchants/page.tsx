'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Merchant = { id: string; name: string; phone: string; address: string; notes: string | null }

async function authFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${session?.access_token}` },
  })
}

export default function AdminMerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadMerchants() {
    const res = await authFetch('/api/admin/merchants')
    const json = await res.json()
    if (res.ok) setMerchants(json.merchants)
  }

  useEffect(() => { loadMerchants() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await authFetch('/api/admin/merchants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, address, notes }),
    })

    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(json.error)
    } else {
      setName(''); setPhone(''); setAddress(''); setNotes('')
      loadMerchants()
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-[350px_1fr]">
      <div>
        <h2 className="text-xl font-semibold text-baobab mb-4">Ajouter un commerçant</h2>
        <form onSubmit={handleSubmit} className="space-y-3 bg-white p-4 rounded-lg border border-mil/30">
          <input type="text" placeholder="Nom du commerçant / boutique" value={name}
            onChange={(e) => setName(e.target.value)} required
            className="w-full border border-mil/40 rounded px-3 py-2" />
          <input type="text" placeholder="Téléphone" value={phone}
            onChange={(e) => setPhone(e.target.value)} required
            className="w-full border border-mil/40 rounded px-3 py-2" />
          <input type="text" placeholder="Adresse / quartier" value={address}
            onChange={(e) => setAddress(e.target.value)} required
            className="w-full border border-mil/40 rounded px-3 py-2" />
          <textarea placeholder="Notes internes (optionnel)" value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-mil/40 rounded px-3 py-2" />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" disabled={saving} className="w-full bg-baobab text-white rounded px-3 py-2">
            {saving ? 'Ajout...' : 'Ajouter le commerçant'}
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-baobab mb-4">Commerçants ({merchants.length})</h2>
        <div className="space-y-3">
          {merchants.map((m) => (
            <div key={m.id} className="bg-white p-4 rounded-lg border border-mil/30">
              <p className="font-medium text-nuit-diourbel">{m.name}</p>
              <p className="text-sm text-terre">{m.phone} · {m.address}</p>
              {m.notes && <p className="text-sm text-terre/70 italic">{m.notes}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}