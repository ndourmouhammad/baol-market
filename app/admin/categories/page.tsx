'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Tags, Trash2, Edit, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'

const ITEMS_PER_PAGE = 8

type Category = { id: string; name: string; slug: string }

async function authFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${session?.access_token}` },
  })
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  async function loadCategories() {
    setLoading(true)
    const res = await authFetch('/api/admin/categories')
    const json = await res.json()
    if (res.ok) setCategories(json.categories)
    setLoading(false)
  }

  useEffect(() => { loadCategories() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const url = editingId ? `/api/admin/categories/${editingId}` : '/api/admin/categories'
    const method = editingId ? 'PATCH' : 'POST'

    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })

    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(json.error)
    } else {
      setName('')
      setEditingId(null)
      loadCategories()
    }
  }

  function startEdit(category: Category) {
    setEditingId(category.id)
    setName(category.name)
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setName('')
    setError('')
  }

  async function deleteCategory(id: string) {
    await authFetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
    setCategoryToDelete(null)
    loadCategories()
  }

  if (loading && categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-terre">
        <Loader2 className="w-8 h-8 animate-spin text-baobab mb-4" />
        <p>Chargement des catégories...</p>
      </div>
    )
  }

  const totalPages = Math.ceil(categories.length / ITEMS_PER_PAGE)
  const paginatedCategories = categories.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid gap-8 lg:grid-cols-[350px_1fr] items-start">
        {/* Formulaire */}
        <div className="bg-white p-6 rounded-xl border border-mil/30 shadow-sm lg:sticky lg:top-24">
          <h2 className="text-xl font-semibold text-baobab font-fraunces mb-6">
            {editingId ? 'Modifier la catégorie' : 'Ajouter une catégorie'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <div className="space-y-1.5">
              <label className="font-medium text-nuit-diourbel block">Nom de la catégorie</label>
              <input
                type="text" placeholder="Ex: Céréales" value={name}
                onChange={(e) => setName(e.target.value)} required
                className="w-full border border-mil/40 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-baobab/50 focus:border-baobab outline-none transition-all"
              />
            </div>
            
            {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>}
            
            <div className="flex gap-2 mt-2">
              <button 
                type="submit" 
                disabled={saving} 
                className="flex-1 bg-baobab text-white rounded-lg px-4 py-2.5 font-medium hover:bg-vert-feuille transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? 'Enregistrement...' : editingId ? 'Enregistrer' : 'Ajouter'}
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

        {/* Liste */}
        <div>
          <h2 className="text-2xl font-semibold text-baobab font-fraunces mb-6 flex items-center gap-3">
            Catégories <span className="text-terre text-lg font-normal">({categories.length})</span>
          </h2>
          
          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-mil/30 text-terre">
              <Tags className="w-12 h-12 mb-4 text-mil" />
              <p className="text-lg">Aucune catégorie pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {paginatedCategories.map((c) => (
                  <div key={c.id} className="bg-white p-5 rounded-xl border border-mil/30 hover:shadow-sm transition-shadow flex flex-col justify-between">
                    <div className="mb-4">
                      <h3 className="font-semibold text-nuit-diourbel text-lg">{c.name}</h3>
                      <p className="text-sm text-terre">/{c.slug}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => startEdit(c)} 
                        className="flex-1 flex items-center justify-center gap-1.5 text-sm rounded-lg px-3 py-2 transition-colors border border-mil/40 text-terre hover:bg-gray-50"
                      >
                        <Edit className="w-4 h-4" /> Modifier
                      </button>
                      <button 
                        onClick={() => setCategoryToDelete(c.id)} 
                        className="text-red-600 bg-red-50 hover:bg-red-100 rounded-lg px-3 py-2 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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

      {/* Modal de suppression */}
      {categoryToDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-4 text-red-600">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold font-fraunces text-nuit-diourbel">Supprimer la catégorie ?</h3>
            </div>
            <p className="text-terre mb-6">
              Êtes-vous sûr de vouloir supprimer cette catégorie ? Les produits associés risquent de perdre leur catégorie.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 text-terre hover:bg-mil/20 rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={() => deleteCategory(categoryToDelete)}
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