'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [merchantId, setMerchantId] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadData() {
    const { data: cats } = await supabase.from('categories').select('id, name')
    setCategories(cats || [])

    const merchantsRes = await authFetch('/api/admin/merchants')
    const merchantsJson = await merchantsRes.json()
    setMerchants(merchantsJson.merchants || [])

    const productsRes = await authFetch('/api/admin/products')
    const productsJson = await productsRes.json()
    if (!productsRes.ok) setError(productsJson.error)
    else setProducts(productsJson.products)
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
    if (!confirm('Supprimer ce produit ?')) return
    await authFetch(`/api/admin/products/${id}`, { method: 'DELETE' })
    loadData()
  }

  return (
    <div className="grid gap-8 md:grid-cols-[350px_1fr]">
      <div>
        <h2 className="text-xl font-semibold text-baobab mb-4">Ajouter un produit</h2>
        <form onSubmit={handleSubmit} className="space-y-3 bg-white p-4 rounded-lg border border-mil/30">
          <input
            type="text" placeholder="Nom du produit" value={name}
            onChange={(e) => setName(e.target.value)} required
            className="w-full border border-mil/40 rounded px-3 py-2"
          />
          <textarea
            placeholder="Description" value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-mil/40 rounded px-3 py-2"
          />
          <input
            type="number" placeholder="Prix (FCFA)" value={price}
            onChange={(e) => setPrice(e.target.value)} required
            className="w-full border border-mil/40 rounded px-3 py-2"
          />
          <select
            value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required
            className="w-full border border-mil/40 rounded px-3 py-2"
          >
            <option value="">Choisir une catégorie</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={merchantId} onChange={(e) => setMerchantId(e.target.value)} required
            className="w-full border border-mil/40 rounded px-3 py-2"
          >
            <option value="">Choisir un commerçant</option>
            {merchants.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" disabled={saving} className="w-full bg-baobab text-white rounded px-3 py-2">
            {saving ? 'Ajout...' : 'Ajouter le produit'}
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-baobab mb-4">Produits ({products.length})</h2>
        <div className="space-y-3">
          {products.map((p) => (
            <div key={p.id} className="bg-white p-4 rounded-lg border border-mil/30 flex justify-between items-center">
              <div>
                <p className="font-medium text-nuit-diourbel">{p.name}</p>
                <p className="text-sm text-terre">{p.categories?.name} · {p.merchants?.name} · {p.price} FCFA</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleAvailability(p)} className="text-sm border border-mil/40 rounded px-2 py-1">
                  {p.is_available ? 'Désactiver' : 'Activer'}
                </button>
                <button onClick={() => deleteProduct(p.id)} className="text-sm text-red-600 border border-red-300 rounded px-2 py-1">
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}