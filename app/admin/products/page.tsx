'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Trash2, Power, PowerOff, PackageSearch, AlertTriangle } from 'lucide-react'

type Category = { id: string; name: string }
type Merchant = { id: string; name: string }
type Product = {
  id: string
  name: string
  description: string
  price: number
  is_available: boolean
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

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [merchantId, setMerchantId] = useState('')
  const [saving, setSaving] = useState(false)
  
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
    loadData()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await authFetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        price: Number(price),
        category_id: categoryId,
        merchant_id: merchantId,
      }),
    })

    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(json.error)
    } else {
      setName('')
      setDescription('')
      setPrice('')
      setCategoryId('')
      setMerchantId('')
      loadData()
    }
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
      <div className="flex flex-col items-center justify-center py-20 text-terre">
        <Loader2 className="w-8 h-8 animate-spin text-baobab mb-4" />
        <p>Chargement des produits...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid gap-8 lg:grid-cols-[350px_1fr] items-start">
        {/* Formulaire d'ajout */}
        <div className="bg-white p-6 rounded-xl border border-mil/30 shadow-sm sticky top-24">
          <h2 className="text-xl font-semibold text-baobab font-fraunces mb-6">Ajouter un produit</h2>
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <div className="space-y-1.5">
              <label className="font-medium text-nuit-diourbel block">Nom du produit</label>
              <input
                type="text" placeholder="Ex: Riz parfumé 5kg" value={name}
                onChange={(e) => setName(e.target.value)} required
                className="w-full border border-mil/40 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-baobab/50 focus:border-baobab outline-none transition-all"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="font-medium text-nuit-diourbel block">Description</label>
              <textarea
                placeholder="Détails du produit..." value={description}
                onChange={(e) => setDescription(e.target.value)} rows={3}
                className="w-full border border-mil/40 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-baobab/50 focus:border-baobab outline-none transition-all resize-none"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="font-medium text-nuit-diourbel block">Prix (FCFA)</label>
              <input
                type="number" placeholder="Ex: 2500" value={price}
                onChange={(e) => setPrice(e.target.value)} required min="0"
                className="w-full border border-mil/40 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-baobab/50 focus:border-baobab outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-nuit-diourbel block">Catégorie</label>
              <select
                value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required
                className="w-full border border-mil/40 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-baobab/50 focus:border-baobab outline-none transition-all bg-white"
              >
                <option value="" disabled>Choisir une catégorie</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-nuit-diourbel block">Commerçant</label>
              <select
                value={merchantId} onChange={(e) => setMerchantId(e.target.value)} required
                className="w-full border border-mil/40 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-baobab/50 focus:border-baobab outline-none transition-all bg-white"
              >
                <option value="" disabled>Choisir un commerçant</option>
                {merchants.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>

            {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>}
            
            <button 
              type="submit" 
              disabled={saving} 
              className="w-full bg-baobab text-white rounded-lg px-4 py-2.5 font-medium hover:bg-vert-feuille transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Ajout en cours...</> : 'Ajouter le produit'}
            </button>
          </form>
        </div>

        {/* Liste des produits */}
        <div>
          <h2 className="text-2xl font-semibold text-baobab font-fraunces mb-6 flex items-center gap-3">
            Produits <span className="text-terre text-lg font-normal">({products.length})</span>
          </h2>
          
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-mil/30 text-terre">
              <PackageSearch className="w-12 h-12 mb-4 text-mil" />
              <p className="text-lg">Aucun produit pour le moment.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {products.map((p) => (
                <div key={p.id} className={`bg-white p-4 rounded-xl border transition-all ${p.is_available ? 'border-mil/30 hover:shadow-sm' : 'border-mil/30 opacity-75 bg-gray-50/50'} flex flex-col justify-between gap-4`}>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-nuit-diourbel text-base leading-tight">{p.name}</h3>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${p.is_available ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {p.is_available ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                    <p className="text-sm text-terre line-clamp-2 mb-3">{p.description || "Aucune description"}</p>
                    
                    <div className="space-y-1 text-sm text-nuit-diourbel">
                      <p className="flex justify-between border-b border-mil/20 pb-1">
                        <span className="text-terre">Prix</span> 
                        <span className="font-semibold">{p.price.toLocaleString('fr-FR')} FCFA</span>
                      </p>
                      <p className="flex justify-between border-b border-mil/20 pb-1 pt-1">
                        <span className="text-terre">Catégorie</span> 
                        <span>{p.categories?.name}</span>
                      </p>
                      <p className="flex justify-between pt-1">
                        <span className="text-terre">Commerçant</span> 
                        <span className="truncate max-w-[120px] text-right">{p.merchants?.name}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={() => toggleAvailability(p)} 
                      className={`flex-1 flex items-center justify-center gap-1.5 text-sm rounded-lg px-3 py-2 transition-colors border ${
                        p.is_available 
                          ? 'border-mil/40 text-terre hover:bg-gray-50' 
                          : 'border-baobab/30 text-baobab hover:bg-baobab/5'
                      }`}
                    >
                      {p.is_available ? <><PowerOff className="w-4 h-4"/> Désactiver</> : <><Power className="w-4 h-4"/> Activer</>}
                    </button>
                    <button 
                      onClick={() => setProductToDelete(p.id)} 
                      className="text-red-600 bg-red-50 hover:bg-red-100 rounded-lg px-3 py-2 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de suppression */}
      {productToDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-4 text-red-600">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold font-fraunces text-nuit-diourbel">Supprimer le produit ?</h3>
            </div>
            <p className="text-terre mb-6">
              Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible et supprimera le produit de manière permanente.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 text-terre hover:bg-mil/20 rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={() => deleteProduct(productToDelete)}
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