'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type OrderItem = {
  quantity: number
  unit_price: number
  products: { name: string } | null
}

type Order = {
  id: string
  status: string
  payment_method: string
  total_amount: number
  delivery_address: string
  created_at: string
  order_items: OrderItem[]
}

const STATUS_OPTIONS = [
  'created',
  'confirmed',
  'payment_pending',
  'paid',
  'preparing',
  'delivering',
  'delivered',
  'cancelled',
  'refunded',
]

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadOrders() {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/orders', {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error)
    } else {
      setOrders(json.orders)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadOrders()
  }, [])

  async function updateStatus(orderId: string, status: string) {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ status }),
    })
    loadOrders()
  }

  if (loading) return <p>Chargement...</p>
  if (error) return <p className="text-red-600">{error}</p>

  return (
    <div>
      <h2 className="text-xl font-semibold text-baobab mb-4">Commandes ({orders.length})</h2>
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-lg border border-mil/30 p-4">
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <p className="font-medium text-nuit-diourbel">
                  {order.order_items.map((item, i) => (
                    <span key={i}>
                      {item.quantity}× {item.products?.name ?? 'Produit'}{' '}
                    </span>
                  ))}
                </p>
                <p className="text-sm text-terre">Adresse : {order.delivery_address}</p>
                <p className="text-sm text-terre">Paiement : {order.payment_method}</p>
                <p className="text-sm font-semibold">{order.total_amount} FCFA</p>
              </div>
              <select
                value={order.status}
                onChange={(e) => updateStatus(order.id, e.target.value)}
                className="border border-mil/40 rounded px-2 py-1 text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}