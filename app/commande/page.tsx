'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/components/CartContext'
import { Button } from '@/components/Button'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { PAYMENT_TITLE, PAYMENT_DETAIL } from '@/lib/paymentInfo'
import {
  DeliveryChooser,
  type DeliveryChoice,
  type DeliveryZone,
  isDeliveryChoiceValid,
  getDeliveryFee,
} from '@/components/DeliveryChooser'

const DRAFT_KEY = 'baol-market-checkout-draft'
// Doit rester identique à la clé utilisée dans app/paiement/succes/page.tsx
const PENDING_CART_ORDER_KEY = 'baol-market-pending-cart-order'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, lines, subtotal, hasUnavailable, refreshPrices } = useCart()

  const [user, setUser] = useState<User | null>(null)
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [deliveryChoice, setDeliveryChoice] = useState<DeliveryChoice>({
    mode: null,
    zoneId: '',
  })
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      const { data: zonesData } = await supabase
        .from('delivery_zones')
        .select('id, name, fee, is_variable, display_group, zone_kind')
        .order('sort_order')
      setZones(zonesData || [])

      try {
        const draft = localStorage.getItem(DRAFT_KEY)
        if (draft) {
          const parsed = JSON.parse(draft)
          const mode = parsed.mode
          const zoneId = typeof parsed.zoneId === 'string' ? parsed.zoneId : ''
          const validModes = ['delivery', 'pickup', 'self_arranged']
          if (validModes.includes(mode)) {
            setDeliveryChoice({ mode, zoneId })
          } else if (zoneId) {
            setDeliveryChoice({ mode: 'delivery', zoneId })
          }
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
      localStorage.setItem(DRAFT_KEY, JSON.stringify(deliveryChoice))
    } catch (e) {
      console.error('Erreur sauvegarde brouillon:', e)
    }
  }, [deliveryChoice, initLoading])

  const deliveryFee = getDeliveryFee(deliveryChoice, zones)
  const total = subtotal + deliveryFee
  const isDeliveryValid = isDeliveryChoiceValid(deliveryChoice, zones)
  const isFormValid = items.length > 0 && isDeliveryValid && !!user && !hasUnavailable

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) {
      router.push('/login?next=/commande')
      return
    }
    if (!isFormValid) return

    setLoading(true)
    setError('')

    // Dernière vérification des prix auprès du serveur, juste avant le paiement :
    // le client ne découvre jamais un autre montant sur la page PayTech.
    const freshPrices = await refreshPrices()
    if (freshPrices) {
      if (items.some((i) => freshPrices[i.productId]?.available === false)) {
        setLoading(false)
        setError("Un produit de votre panier n'est plus disponible. Retirez-le depuis le panier avant de payer.")
        return
      }
      const freshSubtotal = items.reduce(
        (sum, i) => sum + (freshPrices[i.productId]?.unitPrice ?? i.price) * i.quantity,
        0
      )
      if (freshSubtotal !== subtotal) {
        setLoading(false)
        setError('Les prix ont changé. Vérifiez votre total mis à jour, puis validez à nouveau.')
        return
      }
    }

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
        deliveryMode: deliveryChoice.mode,
        ...(deliveryChoice.mode !== 'pickup' ? { deliveryZoneId: deliveryChoice.zoneId } : {}),
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

  let deliverySummary = '—'
  if (deliveryChoice.mode === 'pickup') {
    deliverySummary = 'Gratuit (retrait)'
  } else if (deliveryChoice.mode === 'self_arranged') {
    deliverySummary = '0 FCFA (gérée par vous)'
  } else if (deliveryChoice.mode === 'delivery') {
    deliverySummary = deliveryChoice.zoneId ? `${deliveryFee.toLocaleString('fr-SN')} FCFA` : '—'
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
            <label className="block text-sm font-semibold text-(--encre) mb-3">Mode de livraison</label>
            <DeliveryChooser
              zones={zones}
              value={deliveryChoice}
              onChange={setDeliveryChoice}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-(--encre) mb-2">Mode de paiement</label>
            <div className="border border-(--vert-baol) bg-(--vert-baol)/5 rounded-xl p-4">
              <p className="font-semibold text-(--encre)">{PAYMENT_TITLE}</p>
              <p className="text-sm text-(--gris-texte)">{PAYMENT_DETAIL}</p>
            </div>
          </div>

          {hasUnavailable && (
            <div className="bg-red-50 border-l-4 border-(--rouge-erreur) p-4">
              <p className="text-(--rouge-erreur) text-sm font-medium">
                Un produit de votre panier n&#39;est plus disponible.{' '}
                <Link href="/panier" className="underline font-bold">Retirez-le depuis le panier</Link> pour continuer.
              </p>
            </div>
          )}

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
            {lines.map((item) => (
              <li key={item.productId} className="flex justify-between text-(--gris-texte)">
                <span className={item.available ? '' : 'line-through'}>{item.quantity}× {item.name}</span>
                {item.available ? (
                  <span>{(item.unitPrice * item.quantity).toLocaleString('fr-SN')} FCFA</span>
                ) : (
                  <span className="text-(--rouge-erreur) font-medium">Indisponible</span>
                )}
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
              <span>{deliverySummary}</span>
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