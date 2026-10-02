'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Store, MapPin, Phone, Edit, Trash2, AlertTriangle, ChevronLeft, ChevronRight, Lock, Tag } from 'lucide-react'

const ITEMS_PER_PAGE = 8

type StaffRole = 'super_admin' | 'admin' | 'moderator'
type Category = { id: string; name: string }
type Merchant = {
  id: string
  name: string
  phone: string
  address: string
  notes: string | null
  category_id: string | null
  categories: { name: string } | null
}

async function authFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${session?.access_token}` },
  })
}

export default function AdminMerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [role, setRole] = useState<StaffRole | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [categoryId, setCategoryId] = useState('')

  const [filterCategoryId, setFilterCategoryId] = useState('')

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

    const { data: cats } = await supabase.from('categories').select('id, name').order('name')
    setCategories(cats || [])

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
      body: JSON.stringify({ name, phone, address, notes, category_id: categoryId || null }),
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
    setCategoryId(merchant.category_id || '')
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setName('')
    setPhone('')
    setAddress('')
    setNotes('')
    setCategoryId('')
    setError('')
  }

  async function deleteMerchant(id: string) {
    await authFetch(`/api/admin/merchants/${id}`, { method: 'DELETE' })
    setMerchantToDelete(null)
    loadMerchants()
  }

  if (loading && merchants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-(--gris-texte)">
        <Loader2 className="w-8 h-8 animate-spin text-(--vert-baol) mb-4" />
        <p>Chargement des commerçants...</p>
      </div>
    )
  }

  const filteredMerchants = filterCategoryId
    ? merchants.filter((m) => m.category_id === filterCategoryId)
    : merchants

  const totalPages = Math.ceil(filteredMerchants.length / ITEMS_PER_PAGE)
  const paginatedMerchants = filteredMerchants.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  return (
    <div className="max-w-6xl mx-auto">
      <div className={`grid gap-8 items-start ${canWrite ? 'lg:grid-cols-[350px_1fr]' : ''}`}>
        {canWrite ? (
          <div className="bg-white p-5 rounded-xl border border-mil/30 shadow-sm lg:sticky lg:top-24">
            <h2 className="text-lg font-bold text-(--encre) mb-4">
              {editingId ? 'Modifier le commerçant' : 'Ajouter un commerçant'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
              <div className="space-y-1">
                <label className="font-bold text-(--encre) block">Nom de la boutique</label>
                <input type="text" placeholder="Ex: Boutique Diallo" value={name}
                  onChange={(e) => setName(e.target.value)} required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-(--encre) focus:ring-2 focus:ring-(--vert-baol) outline-none transition-all" />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-(--encre) block">Téléphone</label>
                <input type="tel" placeholder="Ex: 77 123 45 67" value={phone}
                  onChange={(e) => setPhone(e.target.value)} required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-(--encre) focus:ring-2 focus:ring-(--vert-baol) outline-none transition-all" />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-(--encre) block">Adresse</label>
                <input type="text" placeholder="Quartier, rue..." value={address}
                  onChange={(e) => setAddress(e.target.value)} required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-(--encre) focus:ring-2 focus:ring-(--vert-baol) outline-none transition-all" />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-(--encre) block">Catégorie</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-(--encre) focus:ring-2 focus:ring-(--vert-baol) outline-none transition-all bg-white">
                  <option value="">Aucune catégorie</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-(--encre) block">Notes internes <span className="text-(--gris-texte) font-medium">(Optionnel)</span></label>
                <textarea placeholder="Informations utiles sur ce commerçant..." value={notes}
                  onChange={(e) => setNotes(e.target.value)} rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-(--encre) focus:ring-2 focus:ring-(--vert-baol) outline-none transition-all resize-none" />
              </div>
              {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded-lg font-medium">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-(--vert-baol) text-white rounded-xl px-4 py-2.5 font-bold hover:bg-(--vert-baol-fonce) transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {saving ? 'En cours...' : editingId ? 'Enregistrer' : 'Ajouter'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 bg-white text-(--gris-texte) border border-gray-200 rounded-xl px-4 py-2.5 font-bold hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : (
          <div className="hidden lg:flex flex-col items-center justify-center bg-white p-6 rounded-2xl border border-gray-100 text-(--gris-texte) text-center">
            <Lock className="w-8 h-8 mb-3 text-gray-300" />
            <p className="text-sm font-medium">Accès en lecture seule.<br />Contacte un admin pour modifier cette liste.</p>
          </div>
        )}

        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <h2 className="text-2xl font-bold text-(--encre) flex items-center gap-3">
              Commerçants <span className="text-(--gris-texte) text-lg font-normal">({filteredMerchants.length})</span>
            </h2>
            <div className="relative">
              <select
                value={filterCategoryId}
                onChange={(e) => { setFilterCategoryId(e.target.value); setCurrentPage(1) }}
                className="appearance-none text-sm font-bold pl-8 pr-8 py-2 rounded-xl border border-gray-200 bg-gray-50 text-(--encre) outline-none cursor-pointer focus:ring-2 focus:ring-(--vert-baol) transition-colors"
              >
                <option value="">Toutes les catégories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <Tag className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-(--gris-texte) pointer-events-none" />
            </div>
          </div>

          {filteredMerchants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 text-(--gris-texte)">
              <Store className="w-12 h-12 mb-4 text-gray-300" />
              <p className="text-lg">
                {filterCategoryId ? 'Aucun commerçant dans cette catégorie.' : 'Aucun commerçant pour le moment.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {paginatedMerchants.map((m) => (
                  <div key={m.id} className="bg-white p-5 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="font-bold text-(--encre) text-lg">{m.name}</h3>
                        {m.categories?.name && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-(--vert-baol)/10 text-(--vert-baol-fonce) shrink-0">
                            {m.categories.name}
                          </span>
                        )}
                      </div>
                      <div className="space-y-2 text-sm text-(--encre) mb-4">
                        <p className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-(--gris-texte) shrink-0" />
                          <span className="font-medium">{m.phone}</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-(--gris-texte) shrink-0 mt-0.5" />
                          <span className="leading-tight font-medium">{m.address}</span>
                        </p>
                      </div>
                      {m.notes && (
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-4">
                          <p className="text-xs font-bold text-(--gris-texte) mb-1 uppercase tracking-wider">Notes</p>
                          <p className="text-sm text-(--encre) italic">{m.notes}</p>
                        </div>
                      )}
                    </div>

                    {canWrite && (
                      <div className="grid grid-cols-2 gap-2 mt-auto">
                        <button
                          onClick={() => startEdit(m)}
                          className="border border-gray-200 text-(--gris-texte) hover:bg-gray-50 hover:text-(--encre) rounded-xl px-3 py-2.5 transition-colors flex items-center justify-center gap-2 text-sm font-bold"
                        >
                          <Edit className="w-4 h-4" /> Modifier
                        </button>
                        <button
                          onClick={() => setMerchantToDelete(m.id)}
                          className="text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl px-3 py-2.5 transition-colors flex items-center justify-center gap-2 text-sm font-bold"
                        >
                          <Trash2 className="w-4 h-4" /> Supprimer
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

      {merchantToDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-4 text-red-600">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-(--encre)">Supprimer le commerçant ?</h3>
            </div>
            <p className="text-(--gris-texte) mb-6 font-medium">
              Êtes-vous sûr de vouloir supprimer ce commerçant ? Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setMerchantToDelete(null)}
                className="px-4 py-2.5 text-(--gris-texte) hover:bg-gray-100 rounded-xl font-bold transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteMerchant(merchantToDelete)}
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