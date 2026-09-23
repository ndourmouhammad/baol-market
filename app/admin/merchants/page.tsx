'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Store, MapPin, Phone, Edit, Trash2, AlertTriangle, ChevronLeft, ChevronRight, Lock } from 'lucide-react'

const ITEMS_PER_PAGE = 8

type StaffRole = 'super_admin' | 'admin' | 'moderator'
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
  const [role, setRole] = useState<StaffRole | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [merchantToDelete, setMerchantToDelete] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  async function loadMerchants() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: staffRow } = await supabase.from('staff').select('role').eq('id', user.id).maybeSingle()
      setRole((staffRow?.role as StaffRole) ?? null)
    }
    const res = await authFetch('/api/admin/merchants')
    const json = await res.json()
    if (res.ok) setMerchants(json.merchants)
    setLoading(false)
  }

  useEffect(() => { loadMerchants() }, [])

  const canWrite = role === 'admin' || role === 'super_admin'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const url = editingId ? `/api/admin/merchants/${editingId}` : '/api/admin/merchants'
    const method = editingId ? 'PATCH' : 'POST'

    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, address, notes }),
    })

    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(json.error)
    } else {
      cancelEdit()
      loadMerchants()
    }
  }

  function startEdit(merchant: Merchant) {
    setEditingId(merchant.id)
    setName(merchant.name)
    setPhone(merchant.phone)
    setAddress(merchant.address)
    setNotes(merchant.notes || '')
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setName('')
    setPhone('')
    setAddress('')
    setNotes('')
    setError('')
  }

  async function deleteMerchant(id: string) {
    await authFetch(`/api/admin/merchants/${id}`, { method: 'DELETE' })
    setMerchantToDelete(null)
    loadMerchants()
  }

  if (loading && merchants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-terre">
        <Loader2 className="w-8 h-8 animate-spin text-baobab mb-4" />
        <p>Chargement des commerçants...</p>
      </div>
    )
  }

  const totalPages = Math.ceil(merchants.length / ITEMS_PER_PAGE)
  const paginatedMerchants = merchants.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  return (
    <div className="max-w-6xl mx-auto">
      <div className={`grid gap-8 items-start ${canWrite ? 'lg:grid-cols-[350px_1fr]' : ''}`}>
        {canWrite ? (
          <div className="bg-white p-6 rounded-xl border border-mil/30 shadow-sm lg:sticky lg:top-24">
            <h2 className="text-xl font-semibold text-baobab font-fraunces mb-6">
              {editingId ? 'Modifier le commerçant' : 'Ajouter un commerçant'}
            </h2>
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
              <div className="flex gap-2 mt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-baobab text-white rounded-lg px-4 py-2.5 font-medium hover:bg-vert-feuille transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {saving ? 'En cours...' : editingId ? 'Enregistrer' : 'Ajouter'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 bg-white text-terre border border-mil/40 rounded-lg px-4 py-2.5 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : (
          <div className="hidden lg:flex flex-col items-center justify-center bg-white p-6 rounded-xl border border-mil/30 text-terre text-center">
            <Lock className="w-8 h-8 mb-3 text-mil" />
            <p className="text-sm">Accès en lecture seule.<br />Contacte un admin pour modifier cette liste.</p>
          </div>
        )}

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
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {paginatedMerchants.map((m) => (
                  <div key={m.id} className="bg-white p-5 rounded-xl border border-mil/30 hover:shadow-sm transition-shadow flex flex-col justify-between">
                    <div>
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
                        <div className="bg-sable/50 p-3 rounded-lg border border-mil/20 mb-4">
                          <p className="text-xs font-medium text-terre mb-1 uppercase tracking-wider">Notes</p>
                          <p className="text-sm text-terre/80 italic">{m.notes}</p>
                        </div>
                      )}
                    </div>

                    {canWrite && (
                      <div className="grid grid-cols-2 gap-2 mt-auto">
                        <button
                          onClick={() => startEdit(m)}
                          className="border border-mil/40 text-terre hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          <Edit className="w-4 h-4" /> Modifier
                        </button>
                        <button
                          onClick={() => setMerchantToDelete(m.id)}
                          className="text-red-600 bg-red-50 hover:bg-red-100 rounded-lg px-3 py-2 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          <Trash2 className="w-4 h-4" /> Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-4 py-3 border border-mil/30 rounded-xl mt-6">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-terre hover:text-nuit-diourbel disabled:opacity-50 disabled:hover:text-terre transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Précédent
                  </button>
                  <span className="text-sm text-terre font-medium">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-terre hover:text-nuit-diourbel disabled:opacity-50 disabled:hover:text-terre transition-colors"
                  >
                    Suivant <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {merchantToDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-4 text-red-600">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold font-fraunces text-nuit-diourbel">Supprimer le commerçant ?</h3>
            </div>
            <p className="text-terre mb-6">
              Êtes-vous sûr de vouloir supprimer ce commerçant ? Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setMerchantToDelete(null)}
                className="px-4 py-2 text-terre hover:bg-mil/20 rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteMerchant(merchantToDelete)}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium transition-colors"
              >
                Oui, supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}