'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Store, MapPin, Phone } from 'lucide-react'

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
  const [loading, setLoading] = useState(true)

  async function loadMerchants() {
    setLoading(true)
    const res = await authFetch('/api/admin/merchants')
    const json = await res.json()
    if (res.ok) setMerchants(json.merchants)
    setLoading(false)
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

  if (loading && merchants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-terre">
        <Loader2 className="w-8 h-8 animate-spin text-baobab mb-4" />
        <p>Chargement des commerçants...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid gap-8 lg:grid-cols-[350px_1fr] items-start">
        {/* Formulaire d'ajout */}
        <div className="bg-white p-6 rounded-xl border border-mil/30 shadow-sm sticky top-24">
          <h2 className="text-xl font-semibold text-baobab font-fraunces mb-6">Ajouter un commerçant</h2>
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <div className="space-y-1.5">
              <label className="font-medium text-nuit-diourbel block">Nom de la boutique</label>
              <input type="text" placeholder="Ex: Boutique Diallo" value={name}
                onChange={(e) => setName(e.target.value)} required
                className="w-full border border-mil/40 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-baobab/50 focus:border-baobab outline-none transition-all" />
            </div>
            
            <div className="space-y-1.5">
              <label className="font-medium text-nuit-diourbel block">Téléphone</label>
              <input type="tel" placeholder="Ex: 77 123 45 67" value={phone}
                onChange={(e) => setPhone(e.target.value)} required
                className="w-full border border-mil/40 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-baobab/50 focus:border-baobab outline-none transition-all" />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-nuit-diourbel block">Adresse</label>
              <input type="text" placeholder="Quartier, rue..." value={address}
                onChange={(e) => setAddress(e.target.value)} required
                className="w-full border border-mil/40 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-baobab/50 focus:border-baobab outline-none transition-all" />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-nuit-diourbel block">Notes internes <span className="text-terre font-normal">(Optionnel)</span></label>
              <textarea placeholder="Informations utiles sur ce commerçant..." value={notes}
                onChange={(e) => setNotes(e.target.value)} rows={3}
                className="w-full border border-mil/40 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-baobab/50 focus:border-baobab outline-none transition-all resize-none" />
            </div>

            {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>}
            
            <button type="submit" disabled={saving} className="w-full bg-baobab text-white rounded-lg px-4 py-2.5 font-medium hover:bg-vert-feuille transition-colors flex items-center justify-center gap-2 mt-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Ajout en cours...</> : 'Ajouter le commerçant'}
            </button>
          </form>
        </div>

        {/* Liste des commerçants */}
        <div>
          <h2 className="text-2xl font-semibold text-baobab font-fraunces mb-6 flex items-center gap-3">
            Commerçants <span className="text-terre text-lg font-normal">({merchants.length})</span>
          </h2>
          
          {merchants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-mil/30 text-terre">
              <Store className="w-12 h-12 mb-4 text-mil" />
              <p className="text-lg">Aucun commerçant pour le moment.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {merchants.map((m) => (
                <div key={m.id} className="bg-white p-5 rounded-xl border border-mil/30 hover:shadow-sm transition-shadow">
                  <h3 className="font-semibold text-nuit-diourbel text-lg mb-3">{m.name}</h3>
                  <div className="space-y-2 text-sm text-nuit-diourbel mb-4">
                    <p className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-terre shrink-0" /> 
                      {m.phone}
                    </p>
                    <p className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-terre shrink-0 mt-0.5" /> 
                      <span className="leading-tight">{m.address}</span>
                    </p>
                  </div>
                  {m.notes && (
                    <div className="bg-sable/50 p-3 rounded-lg border border-mil/20">
                      <p className="text-xs font-medium text-terre mb-1 uppercase tracking-wider">Notes</p>
                      <p className="text-sm text-terre/80 italic">{m.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}