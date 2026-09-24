'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Trash2, Power, PowerOff, PackageSearch, AlertTriangle, Edit, ChevronLeft, ChevronRight, ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/Button'
import { FormField } from '@/components/FormField'

const ITEMS_PER_PAGE = 4

type Category = { id: string; name: string }
type Merchant = { id: string; name: string }
type Product = {
  id: string
  name: string
  description: string
  price: number
  is_available: boolean
  category_id: string | null
  merchant_id: string | null
  image_url: string | null
  categories: { name: string } | null
  merchants: { name: string } | null
}

async function authFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${session?.access_token}`,
    },
  })
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [merchantId, setMerchantId] = useState('')
  const [saving, setSaving] = useState(false)

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const [productToDelete, setProductToDelete] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    const { data: cats } = await supabase.from('categories').select('id, name')
    setCategories(cats || [])

    const merchantsRes = await authFetch('/api/admin/merchants')
    const merchantsJson = await merchantsRes.json()
    setMerchants(merchantsJson.merchants || [])

    const productsRes = await authFetch('/api/admin/products')
    const productsJson = await productsRes.json()
    if (!productsRes.ok) setError(productsJson.error)
    else setProducts(productsJson.products)

    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [])

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

    const url = editingId ? `/api/admin/products/${editingId}` : '/api/admin/products'
    const method = editingId ? 'PATCH' : 'POST'

    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        price: Number(price),
        category_id: categoryId || null,
        merchant_id: merchantId || null,
        image_url: imageUrl,
      }),
    })

    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(json.error)
    } else {
      cancelEdit()
      loadData()
    }
  }

  function startEdit(product: Product) {
    setEditingId(product.id)
    setName(product.name)
    setDescription(product.description || '')
    setPrice(product.price.toString())
    setCategoryId(product.category_id || '')
    setMerchantId(product.merchant_id || '')
    setExistingImageUrl(product.image_url)
    setImagePreview(product.image_url)
    setImageFile(null)
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setName('')
    setDescription('')
    setPrice('')
    setCategoryId('')
    setMerchantId('')
    setImageFile(null)
    setImagePreview(null)
    setExistingImageUrl(null)
    setError('')
  }

  async function toggleAvailability(product: Product) {
    await authFetch(`/api/admin/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_available: !product.is_available }),
    })
    loadData()
  }

  async function deleteProduct(id: string) {
    await authFetch(`/api/admin/products/${id}`, { method: 'DELETE' })
    setProductToDelete(null)
    loadData()
  }

  if (loading && products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-(--gris-texte)">
        <Loader2 className="w-8 h-8 animate-spin text-(--vert-baol) mb-4" />
        <p>Chargement des produits...</p>
      </div>
    )
  }

  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE)
  const paginatedProducts = products.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid gap-8 lg:grid-cols-[350px_1fr] items-start">
        {/* Formulaire d'ajout / modification */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:sticky lg:top-24">
          <h2 className="text-xl font-bold text-(--encre) mb-6">
            {editingId ? 'Modifier le produit' : 'Ajouter un produit'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <div className="space-y-1.5">
              <label className="font-bold text-(--encre) block">Photo du produit</label>
              {imagePreview ? (
                <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-200">
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
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-200 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <ImagePlus className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-(--gris-texte) text-sm font-medium">Choisir une photo</span>
                  <span className="text-gray-400 text-xs mt-1">JPEG, PNG, WEBP ou GIF — 5 Mo max</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} className="hidden" />
                </label>
              )}
            </div>

            <FormField
              label="Nom du produit"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ex: Riz parfumé 5kg"
            />

            <div className="space-y-1.5">
              <label className="font-bold text-(--encre) block">Description</label>
              <textarea
                placeholder="Détails du produit..." value={description}
                onChange={(e) => setDescription(e.target.value)} rows={3}
                className="w-full border border-gray-200 bg-white rounded-xl px-4 py-3 text-(--encre) focus:ring-2 focus:ring-(--vert-baol) focus:border-(--vert-baol) outline-none transition-all resize-none"
              />
            </div>

            <FormField
              label="Prix (FCFA)"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              placeholder="Ex: 2500"
              min="0"
            />

            <div className="space-y-1.5">
              <label className="font-bold text-(--encre) block">Catégorie</label>
              <select
                value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-(--encre) focus:ring-2 focus:ring-(--vert-baol) focus:border-(--vert-baol) outline-none transition-all bg-white"
              >
                <option value="" disabled>Choisir une catégorie</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-(--encre) block">Commerçant</label>
              <select
                value={merchantId} onChange={(e) => setMerchantId(e.target.value)} required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-(--encre) focus:ring-2 focus:ring-(--vert-baol) focus:border-(--vert-baol) outline-none transition-all bg-white"
              >
                <option value="" disabled>Choisir un commerçant</option>
                {merchants.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>

            {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded-lg font-medium">{error}</p>}

            <div className="flex gap-2 mt-4">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? (uploading ? 'Envoi...' : 'En cours...') : editingId ? 'Enregistrer' : 'Ajouter'}
              </Button>
              {editingId && (
                <Button type="button" variant="secondary" onClick={cancelEdit} className="flex-1">
                  Annuler
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Liste des produits */}
        <div>
          <h2 className="text-2xl font-bold text-(--encre) mb-6 flex items-center gap-3">
            Produits <span className="text-(--gris-texte) text-lg font-normal">({products.length})</span>
          </h2>

          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 text-(--gris-texte)">
              <PackageSearch className="w-12 h-12 mb-4 text-gray-300" />
              <p className="text-lg">Aucun produit pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {paginatedProducts.map((p) => (
                  <div key={p.id} className={`bg-white p-4 rounded-2xl border transition-all ${p.is_available ? 'border-gray-200 hover:shadow-sm' : 'border-gray-100 opacity-75 bg-gray-50/50'} flex flex-col justify-between gap-4`}>
                    <div>
                      <div className="flex gap-3 mb-2">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-16 h-16 rounded-xl object-cover border border-gray-100 shrink-0" />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 shrink-0">
                            <ImagePlus className="w-5 h-5 text-gray-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-bold text-(--encre) text-base leading-tight">{p.name}</h3>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shrink-0 ${p.is_available ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-(--gris-texte)'}`}>
                              {p.is_available ? 'Actif' : 'Inactif'}
                            </span>
                          </div>
                          <p className="text-sm text-(--gris-texte) line-clamp-2 mt-1">{p.description || "Aucune description"}</p>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-sm text-(--encre) mt-4">
                        <p className="flex justify-between border-b border-gray-100 pb-1.5">
                          <span className="text-(--gris-texte)">Prix</span>
                          <span className="font-bold text-(--vert-baol)">{p.price.toLocaleString('fr-FR')} FCFA</span>
                        </p>
                        <p className="flex justify-between border-b border-gray-100 pb-1.5 pt-1.5">
                          <span className="text-(--gris-texte)">Catégorie</span>
                          <span className="font-medium">{p.categories?.name}</span>
                        </p>
                        <p className="flex justify-between pt-1.5">
                          <span className="text-(--gris-texte)">Commerçant</span>
                          <span className="font-medium truncate max-w-30 text-right">{p.merchants?.name}</span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_auto] gap-2 mt-2">
                      <button
                        onClick={() => toggleAvailability(p)}
                        className={`flex items-center justify-center gap-1.5 text-sm font-medium rounded-xl px-2 py-2 transition-colors border ${
                          p.is_available
                            ? 'border-gray-200 text-(--gris-texte) hover:bg-gray-50 hover:text-(--encre)'
                            : 'border-(--vert-baol)/30 text-(--vert-baol) hover:bg-(--vert-baol)/10'
                        }`}
                        title={p.is_available ? 'Désactiver' : 'Activer'}
                      >
                        {p.is_available ? <PowerOff className="w-4 h-4"/> : <Power className="w-4 h-4"/>}
                        <span className="hidden sm:inline">{p.is_available ? 'Désactiver' : 'Activer'}</span>
                      </button>
                      <button
                        onClick={() => startEdit(p)}
                        className="border border-gray-200 text-(--gris-texte) hover:bg-gray-50 hover:text-(--encre) rounded-xl px-3 py-2 transition-colors flex items-center justify-center"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setProductToDelete(p.id)}
                        className="text-red-600 bg-red-50 hover:bg-red-100 rounded-xl px-3 py-2 transition-colors flex items-center justify-center border border-red-100"
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
      {productToDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-4 text-red-600">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-(--encre)">Supprimer le produit ?</h3>
            </div>
            <p className="text-(--gris-texte) mb-6 font-medium">
              Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible et supprimera le produit de manière permanente.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2.5 text-(--gris-texte) hover:bg-gray-100 rounded-xl font-bold transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteProduct(productToDelete)}
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