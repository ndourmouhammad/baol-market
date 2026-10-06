'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/components/CartContext'
import { Button } from '@/components/Button'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'

type DeliveryZone = {
  id: string
  name: string
  fee: number
  is_variable: boolean
  display_group: string | null
}

const DRAFT_KEY = 'baol-market-checkout-draft'
// Doit rester identique à la clé utilisée dans app/paiement/succes/page.tsx
const PENDING_CART_ORDER_KEY = 'baol-market-pending-cart-order'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, subtotal } = useCart()

  const [user, setUser] = useState<User | null>(null)
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [zoneId, setZoneId] = useState('')
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)
  const [error, setError] = useState('')

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
          setZoneId(parsed.zoneId ?? '')
        }
      } catch (e) {
        console.error('Erreur lecture brouillon:', e)
      }

      setInitLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (initLoading) return
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ zoneId }))
    } catch (e) {
      console.error('Erreur sauvegarde brouillon:', e)
    }
  }, [zoneId, initLoading])

  const selectedZone = zones.find((z) => z.id === zoneId)
  const deliveryFee = selectedZone?.fee ?? 0
  const total = subtotal + deliveryFee
  const isFormValid = items.length > 0 && !!zoneId && !!user

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) {
      router.push('/login?next=/commande')
      return
    }
    if (!isFormValid) return

    setLoading(true)
    setError('')

    // Le serveur identifie le client grâce au jeton de session
    const { data: { session } } = await supabase.auth.getSession()

    const res = await fetch('/api/orders/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        deliveryZoneId: zoneId,
      }),
    })
    const json = await res.json()

    if (!res.ok) {
      setLoading(false)
      setError(json.error)
      return
    }

    // On retient la commande issue du panier : la page de succès videra le panier
    // seulement quand le paiement de CETTE commande sera confirmé.
    try {
      localStorage.setItem(PENDING_CART_ORDER_KEY, json.orderId)
    } catch (e) {
      console.error('Erreur sauvegarde commande en cours:', e)
    }

    // Redirection vers la page de paiement hébergée par PayTech
    window.location.href = json.redirectUrl
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

      {!user && (
        <div className="bg-(--vert-baol)/10 border border-(--vert-baol)/20 rounded-xl p-4 mb-6">
          <p className="text-(--encre) font-medium mb-2">Un compte est nécessaire pour passer commande.</p>
          <div className="flex gap-3">
            <Link href="/login?next=/commande">
              <Button size="sm">Se connecter</Button>
            </Link>
            <Link href="/signup?next=/commande">
              <Button variant="secondary" size="sm">Créer un compte</Button>
            </Link>
          </div>
        </div>
      )}

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
            {selectedZone && selectedZone.fee === 0 && (
              <p className="text-xs text-(--vert-baol-fonce) bg-(--vert-baol)/10 border-l-4 border-(--vert-baol) p-3 mt-2">
                Pour les zones hors Diourbel, vous gérez vous-même la livraison. Aucun frais n&#39;est appliqué.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-(--encre) mb-2">Mode de paiement</label>
            <div className="border border-(--vert-baol) bg-(--vert-baol)/5 rounded-xl p-4">
              <p className="font-semibold text-(--encre)">Paiement en ligne sécurisé</p>
              <p className="text-sm text-(--gris-texte)">Orange Money, Wave, Free Money ou carte bancaire, via PayTech.</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-(--rouge-erreur) p-4">
              <p className="text-(--rouge-erreur) text-sm font-medium">{error}</p>
            </div>
          )}

          <Button type="submit" fullWidth size="lg" disabled={loading || !isFormValid}>
            {loading ? 'Redirection vers le paiement...' : `Payer — ${total.toLocaleString('fr-SN')} FCFA`}
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