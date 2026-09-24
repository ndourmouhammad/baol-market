'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Bike, Phone, CheckCircle2, XCircle, Edit, Trash2, AlertTriangle, Power, PowerOff, ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { Button } from '@/components/Button'
import { FormField } from '@/components/FormField'

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

  // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <div className="flex flex-col items-center justify-center py-20 text-(--gris-texte)">
        <Loader2 className="w-8 h-8 animate-spin text-(--vert-baol) mb-4" />
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
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:sticky lg:top-24">
            <h2 className="text-xl font-bold text-(--encre) mb-6">
              {editingId ? 'Modifier le livreur' : 'Ajouter un livreur'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <FormField
                label="Nom du livreur"
                type="text"
                placeholder="Ex: Modou Fall"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <FormField
                label="Téléphone"
                type="tel"
                placeholder="Ex: 77 123 45 67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded-lg font-medium">{error}</p>}
              <div className="flex gap-2 mt-4">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? 'En cours...' : editingId ? 'Enregistrer' : 'Ajouter'}
                </Button>
                {editingId && (
                  <Button type="button" variant="secondary" onClick={cancelEdit} className="flex-1">
                    Annuler
                  </Button>
                )}
              </div>
            </form>
          </div>
        ) : (
          <div className="hidden lg:flex flex-col items-center justify-center bg-white p-8 rounded-2xl border border-gray-100 text-(--gris-texte) text-center">
            <Lock className="w-10 h-10 mb-4 text-gray-300" />
            <p className="font-medium">Accès en lecture seule.<br />Contacte un admin pour modifier cette liste.</p>
          </div>
        )}

        <div>
          <h2 className="text-2xl font-bold text-(--encre) mb-6 flex items-center gap-3">
            Livreurs <span className="text-(--gris-texte) text-lg font-normal">({riders.length})</span>
          </h2>

          {riders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 text-(--gris-texte)">
              <Bike className="w-12 h-12 mb-4 text-gray-300" />
              <p className="text-lg">Aucun livreur pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {paginatedRiders.map((r) => (
                  <div key={r.id} className="bg-white p-5 rounded-2xl border border-gray-100 hover:shadow-sm transition-shadow flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-5">
                        <h3 className="font-bold text-(--encre) text-lg">{r.name}</h3>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          r.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {r.is_active ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          {r.is_active ? 'Actif' : 'Inactif'}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-(--encre) text-sm bg-gray-50 p-4 rounded-xl border border-gray-100 mb-5">
                        <Phone className="w-5 h-5 text-(--gris-texte) shrink-0" />
                        <span className="font-bold">{r.phone}</span>
                      </div>
                    </div>

                    {canWrite && (
                      <div className="grid grid-cols-[1fr_auto_auto] gap-2 mt-auto">
                        <button
                          onClick={() => toggleActive(r)}
                          className={`flex items-center justify-center gap-2 text-sm font-bold rounded-xl px-3 py-2.5 transition-colors border ${
                            r.is_active
                              ? 'border-gray-200 text-(--gris-texte) hover:bg-gray-50 hover:text-(--encre)'
                              : 'border-(--vert-baol)/30 text-(--vert-baol) hover:bg-(--vert-baol)/10'
                          }`}
                          title={r.is_active ? 'Désactiver' : 'Activer'}
                        >
                          {r.is_active ? <PowerOff className="w-4 h-4"/> : <Power className="w-4 h-4"/>}
                          <span className="hidden sm:inline">{r.is_active ? 'Désactiver' : 'Activer'}</span>
                        </button>
                        <button
                          onClick={() => startEdit(r)}
                          className="border border-gray-200 text-(--gris-texte) hover:bg-gray-50 hover:text-(--encre) rounded-xl px-4 py-2.5 transition-colors flex items-center justify-center"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setRiderToDelete(r.id)}
                          className="text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl px-4 py-2.5 transition-colors flex items-center justify-center"
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
                <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-100 rounded-2xl mt-6">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-(--gris-texte) hover:text-(--encre) disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Précédent
                  </button>
                  <span className="text-sm text-(--gris-texte) font-medium">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-(--gris-texte) hover:text-(--encre) disabled:opacity-50 transition-colors"
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
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-4 text-red-600">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-(--encre)">Supprimer le livreur ?</h3>
            </div>
            <p className="text-(--gris-texte) mb-6 font-medium">
              Êtes-vous sûr de vouloir supprimer ce livreur ? Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRiderToDelete(null)}
                className="px-4 py-2.5 text-(--gris-texte) hover:bg-gray-100 rounded-xl font-bold transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteRider(riderToDelete)}
                className="px-4 py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-xl font-bold transition-colors"
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