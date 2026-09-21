'use client'

import { useState } from 'react'
import { STATUS_LABELS } from '@/lib/emailTemplates'

type OrderItem = { quantity: number; unit_price: number; products: { name: string } | null }
type Order = {
  id: string
  status: string
  payment_method: string
  total_amount: number
  delivery_address: string
  created_at: string
  order_items: OrderItem[]
}

export default function TrackingPage() {
  const [phone, setPhone] = useState('')
  const [trackingCode, setTrackingCode] = useState('')
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setOrder(null)

    const res = await fetch('/api/orders/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, trackingCode }),
    })
    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(json.error)
    } else {
      setOrder(json.order)
    }
  }

  return (
    <div className="bg-sable min-h-[70vh] py-12 px-4 sm:px-6">
      <div className="max-w-md mx-auto">
        <h1 className="font-serif text-3xl font-bold text-baobab mb-2">Suivre ma commande</h1>
        <p className="text-baobab/70 mb-8">Entrez votre numéro de téléphone et le code reçu lors de votre commande.</p>

        <form onSubmit={handleSubmit} className="bg-white border border-terre/20 p-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-baobab uppercase tracking-wider block mb-2">Téléphone</label>
            <input
              type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required
              className="block w-full border border-terre/30 bg-sable/20 px-4 py-3 text-baobab focus:border-terre focus:outline-none focus:ring-1 focus:ring-terre"
              placeholder="77 123 45 67"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-baobab uppercase tracking-wider block mb-2">Code de suivi</label>
            <input
              type="text" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} required
              className="block w-full border border-terre/30 bg-sable/20 px-4 py-3 text-baobab focus:border-terre focus:outline-none focus:ring-1 focus:ring-terre uppercase"
              placeholder="BM-7X4K2"
            />
          </div>
          {error && <p className="text-terre text-sm bg-terre/10 border-l-4 border-terre p-3">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-terre text-sable py-3 font-medium hover:bg-terre/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Recherche...' : 'Suivre ma commande'}
          </button>
        </form>

        {order && (
          <div className="bg-white border border-terre/20 p-6 mt-6">
            <p className="text-xs text-terre mb-2">
              Commande #{order.id.slice(0, 8).toUpperCase()} • {new Date(order.created_at).toLocaleDateString('fr-FR')}
            </p>
            <p className="font-serif text-2xl font-bold text-baobab mb-1">
              {STATUS_LABELS[order.status] ?? order.status}
            </p>
            <p className="text-baobab/70 mb-4">{order.total_amount.toLocaleString('fr-FR')} FCFA</p>
            <ul className="text-sm text-baobab/80 space-y-1 mb-4">
              {order.order_items.map((item, i) => (
                <li key={i}>{item.quantity}× {item.products?.name ?? 'Produit'}</li>
              ))}
            </ul>
            <p className="text-sm text-baobab/60">Adresse : {order.delivery_address}</p>
          </div>
        )}
      </div>
    </div>
  )
}