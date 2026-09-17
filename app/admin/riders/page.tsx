'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Bike, Phone, CheckCircle2, XCircle } from 'lucide-react'

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
  const [loading, setLoading] = useState(true)

  async function loadRiders() {
    setLoading(true)
    const res = await authFetch('/api/admin/riders')
    const json = await res.json()
    if (res.ok) setRiders(json.riders)
    setLoading(false)
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

  if (loading && riders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-terre">
        <Loader2 className="w-8 h-8 animate-spin text-baobab mb-4" />
        <p>Chargement des livreurs...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid gap-8 lg:grid-cols-[350px_1fr] items-start">
        {/* Formulaire d'ajout */}
        <div className="bg-white p-6 rounded-xl border border-mil/30 shadow-sm sticky top-24">
          <h2 className="text-xl font-semibold text-baobab font-fraunces mb-6">Ajouter un livreur</h2>
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <div className="space-y-1.5">
              <label className="font-medium text-nuit-diourbel block">Nom du livreur</label>
              <input type="text" placeholder="Ex: Modou Fall" value={name}
                onChange={(e) => setName(e.target.value)} required
                className="w-full border border-mil/40 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-baobab/50 focus:border-baobab outline-none transition-all" />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-nuit-diourbel block">Téléphone</label>
              <input type="tel" placeholder="Ex: 77 123 45 67" value={phone}
                onChange={(e) => setPhone(e.target.value)} required
                className="w-full border border-mil/40 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-baobab/50 focus:border-baobab outline-none transition-all" />
            </div>

            {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>}
            
            <button type="submit" disabled={saving} className="w-full bg-baobab text-white rounded-lg px-4 py-2.5 font-medium hover:bg-vert-feuille transition-colors flex items-center justify-center gap-2 mt-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Ajout en cours...</> : 'Ajouter le livreur'}
            </button>
          </form>
        </div>

        {/* Liste des livreurs */}
        <div>
          <h2 className="text-2xl font-semibold text-baobab font-fraunces mb-6 flex items-center gap-3">
            Livreurs <span className="text-terre text-lg font-normal">({riders.length})</span>
          </h2>
          
          {riders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-mil/30 text-terre">
              <Bike className="w-12 h-12 mb-4 text-mil" />
              <p className="text-lg">Aucun livreur pour le moment.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {riders.map((r) => (
                <div key={r.id} className="bg-white p-5 rounded-xl border border-mil/30 hover:shadow-sm transition-shadow flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-semibold text-nuit-diourbel text-lg">{r.name}</h3>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        r.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {r.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {r.is_active ? 'Actif' : 'Inactif'}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-nuit-diourbel text-sm bg-sable/30 p-3 rounded-lg border border-mil/10">
                      <Phone className="w-4 h-4 text-terre shrink-0" />
                      <span className="font-medium">{r.phone}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}