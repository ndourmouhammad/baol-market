'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Tags, Trash2, Edit, AlertTriangle, ChevronLeft, ChevronRight, ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/Button'
import { FormField } from '@/components/FormField'

const ITEMS_PER_PAGE = 8

type Category = { id: string; name: string; slug: string; description: string | null; image_url: string | null }

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
  const [description, setDescription] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)

  async function loadCategories() {
    setLoading(true)
    const res = await authFetch('/api/admin/categories')
    const json = await res.json()
    if (res.ok) setCategories(json.categories)
    setLoading(false)
  }

  useEffect(() => { loadCategories() }, [])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError('')
  }

  function removeImage() {
    setImageFile(null)
    setImagePreview(null)
    setExistingImageUrl(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    let imageUrl = existingImageUrl

    if (imageFile) {
      setUploading(true)
      const { data: { session } } = await supabase.auth.getSession()
      const formData = new FormData()
      formData.append('file', imageFile)
      formData.append('bucket', 'categories')

      const uploadRes = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      })
      const uploadJson = await uploadRes.json()
      setUploading(false)

      if (!uploadRes.ok) {
        setError(uploadJson.error)
        setSaving(false)
        return
      }
      imageUrl = uploadJson.url
    }

    const url = editingId ? `/api/admin/categories/${editingId}` : '/api/admin/categories'
    const method = editingId ? 'PATCH' : 'POST'

    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, image_url: imageUrl }),
    })

    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(json.error)
    } else {
      resetForm()
      loadCategories()
    }
  }

  function startEdit(category: Category) {
    setEditingId(category.id)
    setName(category.name)
    setDescription(category.description || '')
    setExistingImageUrl(category.image_url)
    setImagePreview(category.image_url)
    setImageFile(null)
    setError('')
  }

  function resetForm() {
    setEditingId(null)
    setName('')
    setDescription('')
    setImageFile(null)
    setImagePreview(null)
    setExistingImageUrl(null)
    setError('')
  }

  async function deleteCategory(id: string) {
    await authFetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
    setCategoryToDelete(null)
    loadCategories()
  }

  if (loading && categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-(--gris-texte)">
        <Loader2 className="w-8 h-8 animate-spin text-(--vert-baol) mb-4" />
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
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:sticky lg:top-24">
          <h2 className="text-xl font-bold text-(--encre) mb-6">
            {editingId ? 'Modifier la catégorie' : 'Ajouter une catégorie'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <div className="space-y-1.5">
              <label className="font-bold text-(--encre) block">Image (optionnelle)</label>
              {imagePreview ? (
                <div className="relative w-full h-32 rounded-xl overflow-hidden border border-gray-200">
                  <img src={imagePreview} alt="Aperçu" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 hover:bg-white shadow-sm"
                    title="Retirer l'image"
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <ImagePlus className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-(--gris-texte) text-xs font-medium">Choisir une image</span>
                  <span className="text-gray-400 text-xs mt-0.5">Sinon une icône générique sera utilisée</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} className="hidden" />
                </label>
              )}
            </div>

            <FormField
              label="Nom de la catégorie"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ex: Céréales"
            />

            <div className="space-y-1.5">
              <label className="font-bold text-(--encre) block">Description (optionnelle)</label>
              <textarea
                placeholder="Courte description affichée sur la page catégorie" value={description}
                onChange={(e) => setDescription(e.target.value)} rows={3}
                className="w-full border border-gray-200 bg-white rounded-xl px-4 py-3 text-(--encre) focus:ring-2 focus:ring-(--vert-baol) focus:border-(--vert-baol) outline-none transition-all resize-none"
              />
            </div>

            {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded-lg font-medium">{error}</p>}

            <div className="flex gap-2 mt-4">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? (uploading ? 'Envoi...' : 'En cours...') : editingId ? 'Enregistrer' : 'Ajouter'}
              </Button>
              {editingId && (
                <Button type="button" variant="secondary" onClick={resetForm} className="flex-1">
                  Annuler
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Liste */}
        <div>
          <h2 className="text-2xl font-bold text-(--encre) mb-6 flex items-center gap-3">
            Catégories <span className="text-(--gris-texte) text-lg font-normal">({categories.length})</span>
          </h2>

          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 text-(--gris-texte)">
              <Tags className="w-12 h-12 mb-4 text-gray-300" />
              <p className="text-lg">Aucune catégorie pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {paginatedCategories.map((c) => (
                  <div key={c.id} className="bg-white p-5 rounded-2xl border border-gray-100 hover:shadow-sm transition-shadow flex flex-col justify-between">
                    <div className="flex gap-3 mb-4">
                      {c.image_url ? (
                        <img src={c.image_url} alt={c.name} className="w-14 h-14 rounded-xl object-cover border border-gray-100 shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 shrink-0">
                          <Tags className="w-5 h-5 text-gray-300" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-bold text-(--encre) text-lg">{c.name}</h3>
                        <p className="text-sm text-(--gris-texte) font-medium">/{c.slug}</p>
                        {c.description && <p className="text-sm text-(--gris-texte) line-clamp-2 mt-1">{c.description}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(c)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium rounded-xl px-3 py-2 transition-colors border border-gray-200 text-(--gris-texte) hover:bg-gray-50 hover:text-(--encre)"
                      >
                        <Edit className="w-4 h-4" /> Modifier
                      </button>
                      <button
                        onClick={() => setCategoryToDelete(c.id)}
                        className="text-red-600 bg-red-50 hover:bg-red-100 rounded-xl px-3 py-2 transition-colors border border-red-100"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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

      {/* Modal de suppression */}
      {categoryToDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-4 text-red-600">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-(--encre)">Supprimer la catégorie ?</h3>
            </div>
            <p className="text-(--gris-texte) mb-6 font-medium">
              Êtes-vous sûr de vouloir supprimer cette catégorie ? Les produits associés risquent de perdre leur catégorie.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2.5 text-(--gris-texte) hover:bg-gray-100 rounded-xl font-bold transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => categoryToDelete && deleteCategory(categoryToDelete)}
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