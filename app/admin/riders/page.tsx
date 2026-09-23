'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Bike, Phone, CheckCircle2, XCircle, Edit, Trash2, AlertTriangle, Power, PowerOff, ChevronLeft, ChevronRight, Lock } from 'lucide-react'

const ITEMS_PER_PAGE = 8

type StaffRole = 'super_admin' | 'admin' | 'moderator'
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
  const [role, setRole] = useState<StaffRole | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [riderToDelete, setRiderToDelete] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  async function loadRiders() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: staffRow } = await supabase.from('staff').select('role').eq('id', user.id).maybeSingle()
      setRole((staffRow?.role as StaffRole) ?? null)
    }
    const res = await authFetch('/api/admin/riders')
    const json = await res.json()
    if (res.ok) setRiders(json.riders)
    setLoading(false)
  }

  useEffect(() => { loadRiders() }, [])

  const canWrite = role === 'admin' || role === 'super_admin'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const url = editingId ? `/api/admin/riders/${editingId}` : '/api/admin/riders'
    const method = editingId ? 'PATCH' : 'POST'

    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone }),
    })

    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(json.error)
    } else {
      cancelEdit()
      loadRiders()
    }
  }

  function startEdit(rider: Rider) {
    setEditingId(rider.id)
    setName(rider.name)
    setPhone(rider.phone)
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setName('')
    setPhone('')
    setError('')
  }

  async function deleteRider(id: string) {
    await authFetch(`/api/admin/riders/${id}`, { method: 'DELETE' })
    setRiderToDelete(null)
    loadRiders()
  }

  async function toggleActive(rider: Rider) {
    await authFetch(`/api/admin/riders/${rider.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !rider.is_active }),
    })
    loadRiders()
  }

  if (loading && riders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-terre">
        <Loader2 className="w-8 h-8 animate-spin text-baobab mb-4" />
        <p>Chargement des livreurs...</p>
      </div>
    )
  }

  const totalPages = Math.ceil(riders.length / ITEMS_PER_PAGE)
  const paginatedRiders = riders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  return (
    <div className="max-w-6xl mx-auto">
      <div className={`grid gap-8 items-start ${canWrite ? 'lg:grid-cols-[350px_1fr]' : ''}`}>
        {canWrite ? (
          <div className="bg-white p-6 rounded-xl border border-mil/30 shadow-sm lg:sticky lg:top-24">
            <h2 className="text-xl font-semibold text-baobab font-fraunces mb-6">
              {editingId ? 'Modifier le livreur' : 'Ajouter un livreur'}
            </h2>
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
            Livreurs <span className="text-terre text-lg font-normal">({riders.length})</span>
          </h2>

          {riders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-mil/30 text-terre">
              <Bike className="w-12 h-12 mb-4 text-mil" />
              <p className="text-lg">Aucun livreur pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {paginatedRiders.map((r) => (
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

                      <div className="flex items-center gap-2 text-nuit-diourbel text-sm bg-sable/30 p-3 rounded-lg border border-mil/10 mb-4">
                        <Phone className="w-4 h-4 text-terre shrink-0" />
                        <span className="font-medium">{r.phone}</span>
                      </div>
                    </div>

                    {canWrite && (
                      <div className="grid grid-cols-[1fr_auto_auto] gap-2 mt-auto">
                        <button
                          onClick={() => toggleActive(r)}
                          className={`flex items-center justify-center gap-1.5 text-sm rounded-lg px-2 py-2 transition-colors border ${
                            r.is_active
                              ? 'border-mil/40 text-terre hover:bg-gray-50'
                              : 'border-baobab/30 text-baobab hover:bg-baobab/5'
                          }`}
                          title={r.is_active ? 'Désactiver' : 'Activer'}
                        >
                          {r.is_active ? <PowerOff className="w-4 h-4"/> : <Power className="w-4 h-4"/>}
                        </button>
                        <button
                          onClick={() => startEdit(r)}
                          className="border border-mil/40 text-terre hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors flex items-center justify-center"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setRiderToDelete(r.id)}
                          className="text-red-600 bg-red-50 hover:bg-red-100 rounded-lg px-3 py-2 transition-colors flex items-center justify-center"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {riderToDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-4 text-red-600">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold font-fraunces text-nuit-diourbel">Supprimer le livreur ?</h3>
            </div>
            <p className="text-terre mb-6">
              Êtes-vous sûr de vouloir supprimer ce livreur ? Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRiderToDelete(null)}
                className="px-4 py-2 text-terre hover:bg-mil/20 rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteRider(riderToDelete)}
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