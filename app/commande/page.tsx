'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/components/CartContext'
import { Button } from '@/components/Button'
import type { User } from '@supabase/supabase-js'

type DeliveryZone = {
  id: string
  name: string
  fee: number
  is_variable: boolean
  display_group: string | null
}

const DRAFT_KEY = 'baol-market-checkout-draft'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, subtotal, clearCart } = useCart()

  const [user, setUser] = useState<User | null>(null)
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [address, setAddress] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('a_la_livraison')
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)
  const [error, setError] = useState('')

  // Charger l'utilisateur + les zones + restaurer un brouillon éventuel
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      const { data: zonesData } = await supabase
        .from('delivery_zones')
        .select('id, name, fee, is_variable, display_group')
        .order('sort_order')
      setZones(zonesData || [])

      try {
        const draft = localStorage.getItem(DRAFT_KEY)
        if (draft) {
          const parsed = JSON.parse(draft)
          setAddress(parsed.address ?? '')
          setZoneId(parsed.zoneId ?? '')
          setPhone(parsed.phone ?? '')
          setEmail(parsed.email ?? '')
          setPaymentMethod(parsed.paymentMethod ?? 'a_la_livraison')
        }
      } catch (e) {
        console.error('Erreur lecture brouillon:', e)
      }

      setInitLoading(false)
    }
    init()
  }, [])

  // Sauvegarder le brouillon à chaque changement (protège contre une fermeture accidentelle)
  useEffect(() => {
    if (initLoading) return
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ address, zoneId, phone, email, paymentMethod }))
    } catch (e) {
      console.error('Erreur sauvegarde brouillon:', e)
    }
  }, [address, zoneId, phone, email, paymentMethod, initLoading])

  const selectedZone = zones.find((z) => z.id === zoneId)
  const deliveryFee = selectedZone?.fee ?? 0
  const total = subtotal + deliveryFee

  const isFormValid =
    items.length > 0 &&
    address.trim().length > 0 &&
    !!zoneId &&
    (!!user || phone.trim().length >= 8)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isFormValid) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        address,
        paymentMethod,
        deliveryZoneId: zoneId,
        phone: user ? undefined : phone,
        email: user ? undefined : (email.trim() || undefined),
        customerId: user?.id,
      }),
    })
    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(json.error)
      return
    }

    // Commande réussie : on peut nettoyer panier + brouillon
    clearCart()
    localStorage.removeItem(DRAFT_KEY)

    if (user) {
      router.push('/orders')
    } else {
      router.push(`/commande-confirmee?code=${encodeURIComponent(json.trackingCode)}`)
    }
  }

  const zoneGroups = zones.reduce<Record<string, DeliveryZone[]>>((acc, zone) => {
    const group = zone.display_group ?? 'Autres zones'
    if (!acc[group]) acc[group] = []
    acc[group].push(zone)
    return acc
  }, {})

  if (initLoading) {
    return (
      <div className="flex items-center justify-center p-6 py-32">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-(--vert-baol) rounded-full animate-spin"></div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-(--encre) mb-3">Votre panier est vide</h1>
        <p className="text-(--gris-texte) mb-6">Ajoutez des produits avant de passer commande.</p>
        <Button onClick={() => router.push('/produits')}>Voir le catalogue</Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl md:text-3xl font-bold text-(--encre) mb-8">Finaliser la commande</h1>

      <div className="grid md:grid-cols-[1fr_320px] gap-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-(--encre) mb-2">Zone de livraison</label>
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-(--vert-baol)"
            >
              <option value="" disabled>Choisissez votre quartier</option>
              {Object.entries(zoneGroups).map(([group, groupZones]) => (
                <optgroup key={group} label={group}>
                  {groupZones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {selectedZone?.is_variable && (
              <p className="text-xs text-(--or-senegal) bg-yellow-50 border-l-4 border-(--or-senegal) p-3 mt-2">
                Frais de livraison à partir de {selectedZone.fee.toLocaleString('fr-SN')} FCFA — montant confirmé par téléphone.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-(--encre) mb-2">Adresse précise</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-(--vert-baol)"
              placeholder="Rue, repère — ex. Rue 15 près du marché"
            />
          </div>

          {!user && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-(--encre) mb-2">Téléphone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-(--vert-baol)"
                  placeholder="Numéro de téléphone (obligatoire)"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-(--encre) mb-2">Email (optionnel)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-(--vert-baol)"
                  placeholder="Pour recevoir un suivi par email"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-(--encre) mb-2">Mode de paiement</label>
            <div className="border border-(--vert-baol) bg-(--vert-baol)/5 rounded-xl p-4">
              <p className="font-semibold text-(--encre)">Paiement à la livraison</p>
              <p className="text-sm text-(--gris-texte)">Paiement en espèces à la réception.</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-(--rouge-erreur) p-4">
              <p className="text-(--rouge-erreur) text-sm font-medium">{error}</p>
            </div>
          )}

          <Button type="submit" fullWidth size="lg" disabled={loading || !isFormValid}>
            {loading ? 'Enregistrement...' : `Confirmer — ${total.toLocaleString('fr-SN')} FCFA`}
          </Button>
        </form>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 h-fit">
          <h2 className="font-bold text-(--encre) mb-4">Récapitulatif</h2>
          <ul className="space-y-2 mb-4 text-sm">
            {items.map((item) => (
              <li key={item.productId} className="flex justify-between text-(--gris-texte)">
                <span>{item.quantity}× {item.name}</span>
                <span>{(item.price * item.quantity).toLocaleString('fr-SN')} FCFA</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-gray-100 pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-(--gris-texte)">
              <span>Sous-total</span>
              <span>{subtotal.toLocaleString('fr-SN')} FCFA</span>
            </div>
            <div className="flex justify-between text-(--gris-texte)">
              <span>Livraison</span>
              <span>{zoneId ? `${deliveryFee.toLocaleString('fr-SN')} FCFA` : '—'}</span>
            </div>
            <div className="flex justify-between font-bold text-(--encre) pt-2 border-t border-gray-100">
              <span>Total</span>
              <span>{total.toLocaleString('fr-SN')} FCFA</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}