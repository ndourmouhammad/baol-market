'use client'

import { useState } from 'react'
import { STATUS_LABELS } from '@/lib/emailTemplates'
import { Button } from '@/components/Button'
import { FormField } from '@/components/FormField'
import { StatusBadge } from '@/components/StatusBadge'
import { ErrorMessage } from '@/components/ErrorMessage'

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
    <div className="bg-(--fond) min-h-[70vh] py-12 px-4 sm:px-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-(--encre) mb-2">Suivre ma commande</h1>
        <p className="text-(--gris-texte) mb-8">Entrez votre numéro de téléphone et le code reçu lors de votre commande.</p>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-6 space-y-6 shadow-sm">
          <FormField
            label="Téléphone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="77 123 45 67"
          />
          <FormField
            label="Code de suivi"
            type="text"
            value={trackingCode}
            onChange={(e) => setTrackingCode(e.target.value)}
            required
            className="uppercase"
            placeholder="BM-7X4K2"
          />
          
          <ErrorMessage message={error} />
          
          <Button
            type="submit" disabled={loading} fullWidth
          >
            {loading ? 'Recherche...' : 'Suivre ma commande'}
          </Button>
        </form>

        {order && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6 mt-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs text-(--gris-texte) mb-1">
                  Commande #{order.id.slice(0, 8).toUpperCase()} • {new Date(order.created_at).toLocaleDateString('fr-FR')}
                </p>
                <div className="mt-2">
                  <StatusBadge status={order.status} />
                </div>
              </div>
            </div>
            
            <p className="text-xl font-bold text-(--encre) mb-4 pb-4 border-b border-gray-100">
              {order.total_amount.toLocaleString('fr-FR')} FCFA
            </p>
            
            <ul className="text-sm text-(--encre) space-y-2 mb-4 pb-4 border-b border-gray-100">
              {order.order_items.map((item, i) => (
                <li key={i} className="flex justify-between">
                  <span>{item.quantity}× {item.products?.name ?? 'Produit'}</span>
                </li>
              ))}
            </ul>
            
            <div className="text-sm">
              <span className="block font-bold text-(--encre) mb-1">Adresse de livraison</span>
              <p className="text-(--gris-texte)">{order.delivery_address}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}