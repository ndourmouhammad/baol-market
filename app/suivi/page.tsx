'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import { StatusBadge } from '@/components/StatusBadge'
import { ErrorMessage } from '@/components/ErrorMessage'
import OrderTimeline from '@/components/OrderTimeline'
import { Search, MapPin, Phone, Hash, Box } from 'lucide-react'

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
    <div className="bg-(--fond) min-h-[80vh] py-12 md:py-20 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-(--encre) mb-3">Suivre ma commande</h1>
          <p className="text-(--gris-texte) text-base max-w-md mx-auto">
            Renseignez votre numéro de téléphone et le code de suivi reçu lors de votre commande pour connaître son état.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Formulaire */}
          <div className="w-full lg:w-1/2">
            <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="space-y-5 mb-8">
                <div>
                  <label className="block text-sm font-bold text-(--encre) mb-2">Téléphone associé</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Phone className="w-5 h-5" />
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="Ex: 77 123 45 67"
                      className="block w-full pl-10 pr-4 py-3 border border-gray-200 bg-white rounded-xl text-(--encre) placeholder-gray-400 focus:outline-none focus:border-(--vert-baol) focus:ring-1 focus:ring-(--vert-baol) transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-(--encre) mb-2">Code de suivi</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Hash className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      value={trackingCode}
                      onChange={(e) => setTrackingCode(e.target.value)}
                      required
                      placeholder="BM-XXXXXX"
                      className="block w-full pl-10 pr-4 py-3 border border-gray-200 bg-white rounded-xl text-(--encre) placeholder-gray-400 uppercase focus:outline-none focus:border-(--vert-baol) focus:ring-1 focus:ring-(--vert-baol) transition-colors font-mono"
                    />
                  </div>
                </div>
              </div>
              
              {error && (
                <div className="mb-6">
                  <ErrorMessage message={error} />
                </div>
              )}
              
              <Button
                type="submit" disabled={loading} fullWidth className="py-3 shadow-md"
              >
                {loading ? 'Recherche en cours...' : (
                  <>
                    <Search className="w-4 h-4 mr-2 inline" /> Rechercher
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Résultat */}
          <div className="w-full lg:w-1/2">
            {!order && !loading && (
              <div className="h-full bg-gray-50 border border-gray-100 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
                <Box className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-(--gris-texte) font-medium">Les informations de votre commande apparaîtront ici.</p>
              </div>
            )}
            
            {loading && (
              <div className="h-full bg-white border border-gray-100 rounded-2xl flex flex-col items-center justify-center p-8 min-h-[300px] shadow-sm">
                <div className="w-10 h-10 border-4 border-(--vert-baol)/30 border-t-(--vert-baol) rounded-full animate-spin mb-4"></div>
                <p className="text-(--gris-texte) text-sm font-medium animate-pulse">Récupération des données...</p>
              </div>
            )}

            {order && (
              <div className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden animate-fade-in-up">
                <div className="absolute top-0 left-0 w-1 h-full bg-(--vert-baol)"></div>
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-(--encre)">Commande {trackingCode.toUpperCase()}</h2>
                    <p className="text-sm text-(--gris-texte) mt-1">
                      Passée le {new Date(order.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                
                <div className="mb-8">
                  <OrderTimeline status={order.status} />
                </div>
                
                <div className="border-t border-gray-100 pt-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-(--encre) uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Box className="w-4 h-4 text-gray-400" /> Articles commandés
                    </h3>
                    <ul className="text-sm text-(--encre) space-y-3">
                      {order.order_items.map((item, i) => (
                        <li key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <span className="font-medium">{item.products?.name ?? 'Produit'}</span>
                          <span className="text-(--gris-texte) font-bold bg-white px-2 py-1 rounded-md border border-gray-200 shrink-0 ml-2">x{item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                    <div>
                      <h3 className="text-sm font-bold text-(--encre) uppercase tracking-wider mb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" /> Livraison
                      </h3>
                      <p className="text-sm text-(--gris-texte) leading-relaxed">{order.delivery_address}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-(--encre) uppercase tracking-wider mb-2">Total</h3>
                      <p className="text-2xl font-bold text-(--vert-baol) leading-none">{order.total_amount.toLocaleString('fr-FR')} <span className="text-base text-(--encre)">FCFA</span></p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}