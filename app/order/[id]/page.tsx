'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { Button } from '@/components/Button'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Breadcrumb } from '@/components/Breadcrumb'
import { fetchLivePrices, type LivePrice } from '@/lib/livePrices'
import { PAYMENT_TITLE, PAYMENT_DETAIL } from '@/lib/paymentInfo'
import { ShieldCheck, Truck, ShoppingBag, MapPin } from 'lucide-react'
import Image from 'next/image'
import {
  DeliveryChooser,
  type DeliveryChoice,
  type DeliveryZone,
  isDeliveryChoiceValid,
  getDeliveryFee,
} from '@/components/DeliveryChooser'

type Product = {
  id: string
  name: string
  price: number
  image_url?: string
}

export default function OrderPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [product, setProduct] = useState<Product | null>(null)
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [deliveryChoice, setDeliveryChoice] = useState<DeliveryChoice>({
    mode: null,
    zoneId: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [initLoading, setInitLoading] = useState(true)
  const [livePrice, setLivePrice] = useState<LivePrice | null>(null)

  // Après connexion ou création de compte, le client revient sur ce produit
  const nextParam = encodeURIComponent(`/order/${id}`)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      // Seuls les produits disponibles peuvent être commandés
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, name, price, image_url')
        .eq('id', id)
        .eq('is_available', true)
        .single()

      const { data: zonesData } = await supabase
        .from('delivery_zones')
        .select('id, name, fee, is_variable, display_group, zone_kind')
        .order('sort_order')

      if (productError || !productData) {
        setError('Ce produit est introuvable ou indisponible.')
      } else {
        setProduct(productData)
      }
      setZones(zonesData || [])
      setInitLoading(false)

      const rawQte = new URLSearchParams(window.location.search).get('qte')
      if (rawQte) {
        const parsed = parseInt(rawQte, 10)
        if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 20) {
          setQuantity(parsed)
        }
      }
    }
    loadData()
  }, [id])

  // Prix actuel du produit (heure du serveur) : à l'arrivée, toutes les minutes et au retour sur l'onglet
  useEffect(() => {
    let cancelled = false

    async function refresh() {
      const prices = await fetchLivePrices([id])
      if (!cancelled && prices && prices[id]) setLivePrice(prices[id])
    }

    refresh()
    const timer = setInterval(refresh, 60_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [id])

  const deliveryFee = getDeliveryFee(deliveryChoice, zones)
  const isDeliveryValid = isDeliveryChoiceValid(deliveryChoice, zones)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!user) {
      router.push(`/login?next=${nextParam}`)
      return
    }
    if (!product || !isDeliveryValid) return

    setLoading(true)
    setError('')

    // Dernière vérification du prix auprès du serveur, juste avant le paiement :
    // le client ne découvre jamais un autre montant sur la page PayTech.
    const displayedUnitPrice = livePrice ? livePrice.unitPrice : product.price
    const freshPrices = await fetchLivePrices([product.id])
    const fresh = freshPrices?.[product.id]
    if (fresh) {
      setLivePrice(fresh)
      if (!fresh.available) {
        setLoading(false)
        setError("Ce produit n'est plus disponible.")
        return
      }
      if (fresh.unitPrice !== displayedUnitPrice) {
        setLoading(false)
        setError('Le prix a changé. Vérifiez le total mis à jour, puis validez à nouveau.')
        return
      }
    }

    // Le serveur identifie le client grâce au jeton de session
    const { data: { session } } = await supabase.auth.getSession()

    // Même route que le panier : les prix sont recalculés côté serveur
    const res = await fetch('/api/orders/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        items: [{ productId: product.id, quantity }],
        deliveryMode: deliveryChoice.mode,
        deliveryZoneId: deliveryChoice.zoneId,
      }),
    })
    const json = await res.json()

    if (!res.ok) {
      setLoading(false)
      setError(json.error)
      return
    }

    // Redirection vers la page de paiement hébergée par PayTech
    window.location.href = json.redirectUrl
  }

  const increaseQty = () => setQuantity(q => q + 1)
  const decreaseQty = () => setQuantity(q => Math.max(1, q - 1))

  const isFormValid = isDeliveryValid && !!user && livePrice?.available !== false

  if (initLoading) {
    return (
      <div className="flex items-center justify-center p-6 py-32 bg-(--fond) min-h-[70vh]">
        <div className="w-12 h-12 border-4 border-(--vert-baol)/30 border-t-(--vert-baol) rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error && !product) {
    return (
      <div className="flex flex-col items-center justify-center p-6 py-32 text-center bg-(--fond) min-h-[70vh]">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-(--encre) mb-4">Produit introuvable</h1>
        <p className="text-(--gris-texte) mb-8 max-w-md mx-auto">{error}</p>
        <Button onClick={() => router.push('/produits')} variant="primary">
          Retour au catalogue
        </Button>
      </div>
    )
  }

  if (!product) return null

  // Prix actuel donné par le serveur ; avant sa réponse, le prix du catalogue
  const unitPrice = livePrice ? livePrice.unitPrice : product.price
  const regularPrice = livePrice ? livePrice.regularPrice : product.price
  const onSale = unitPrice < regularPrice
  const subtotal = unitPrice * quantity
  const total = subtotal + deliveryFee

  let deliverySummary = '—'
  if (deliveryChoice.mode === 'self_arranged') {
    deliverySummary = '0 FCFA (gérée par vous)'
  } else if (deliveryChoice.mode === 'delivery') {
    deliverySummary = deliveryChoice.zoneId ? `${deliveryFee.toLocaleString('fr-SN')} FCFA` : '—'
  }

  return (
    <div className="bg-(--fond) pb-20 pt-8 px-4 sm:px-6 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Breadcrumb items={[
            { label: 'Catalogue', href: '/produits' },
            { label: 'Commande', href: '#' }
          ]} />
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

          {/* Formulaire de commande (Gauche) */}
          <div className="w-full lg:w-3/5">
            <div className="mb-10">
              <h1 className="text-3xl md:text-4xl font-bold text-(--encre) mb-3">Finaliser votre commande</h1>
              <p className="text-(--gris-texte) text-base">
                {!user
                  ? 'Connectez-vous pour commander et payer en ligne.'
                  : 'Vérifiez vos informations et passez au paiement.'}
              </p>
            </div>

            {!user && (
              <div className="bg-(--vert-baol)/10 border border-(--vert-baol)/20 rounded-xl p-4 mb-6">
                <p className="text-(--encre) font-medium mb-3">Un compte est nécessaire pour passer commande.</p>
                <div className="flex gap-3">
                  <Link href={`/login?next=${nextParam}`}>
                    <Button size="sm">Se connecter</Button>
                  </Link>
                  <Link href={`/signup?next=${nextParam}`}>
                    <Button variant="secondary" size="sm">Créer un compte</Button>
                  </Link>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-10 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100">

              {/* Section 1: Quantité */}
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-8 h-8 flex items-center justify-center bg-(--vert-baol)/10 text-(--vert-baol) font-bold rounded-lg shrink-0">1</span>
                  <h2 className="text-lg font-bold text-(--encre)">Quantité souhaitée</h2>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl w-max border border-gray-100">
                  <button type="button" onClick={decreaseQty} className="w-10 h-10 flex items-center justify-center rounded-lg bg-white text-(--encre) shadow-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol)" aria-label="Diminuer la quantité">
                    <svg width="14" height="2" viewBox="0 0 16 2" fill="currentColor"><rect width="16" height="2" rx="1"/></svg>
                  </button>
                  <div className="w-12 h-10 flex items-center justify-center font-bold text-lg text-(--encre)">
                    {quantity}
                  </div>
                  <button type="button" onClick={increaseQty} className="w-10 h-10 flex items-center justify-center rounded-lg bg-white text-(--encre) shadow-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol)" aria-label="Augmenter la quantité">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M9 7V1a1 1 0 0 0-2 0v6H1a1 1 0 0 0 0 2h6v6a1 1 0 0 0 2 0V9h6a1 1 0 0 0 0-2H9z"/></svg>
                  </button>
                </div>
              </section>

              {/* Section 2: Livraison */}
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-8 h-8 flex items-center justify-center bg-(--vert-baol)/10 text-(--vert-baol) font-bold rounded-lg shrink-0">2</span>
                  <h2 className="text-lg font-bold text-(--encre)">Mode de livraison</h2>
                </div>

                <DeliveryChooser
                  zones={zones}
                  value={deliveryChoice}
                  onChange={setDeliveryChoice}
                />
              </section>

              {/* Section 3: Paiement */}
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-8 h-8 flex items-center justify-center bg-(--vert-baol)/10 text-(--vert-baol) font-bold rounded-lg shrink-0">3</span>
                  <h2 className="text-lg font-bold text-(--encre)">Mode de paiement</h2>
                </div>
                <div className="border border-(--vert-baol) bg-(--vert-baol)/5 rounded-xl p-4">
                  <p className="font-semibold text-(--encre)">{PAYMENT_TITLE}</p>
                  <p className="text-sm text-(--gris-texte)">{PAYMENT_DETAIL}</p>
                </div>
              </section>

              {livePrice?.available === false && (
                <div className="pt-2">
                  <ErrorMessage message="Ce produit n'est plus disponible." />
                </div>
              )}

              {error && (
                <div className="pt-2">
                  <ErrorMessage message={error} />
                </div>
              )}

              <div className="pt-6 border-t border-gray-100 hidden lg:block">
                <Button
                  type="submit"
                  disabled={loading || !isFormValid}
                  fullWidth
                  className="py-4 text-lg"
                >
                  {loading ? 'Redirection vers le paiement...' : `Payer — ${total.toLocaleString('fr-SN')} FCFA`}
                </Button>
                <p className="text-center text-xs text-(--gris-texte) mt-4 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Paiement 100% sécurisé
                </p>
                <p className="text-center text-xs text-(--gris-texte) mt-2">
                  En payant, vous confirmez avoir lu les{' '}
                  <Link href="/cgv" target="_blank" rel="noopener noreferrer" className="underline hover:text-(--encre) transition-colors">CGV</Link>.
                </p>
              </div>
            </form>
          </div>

          {/* Récapitulatif (Droite / Sticky) */}
          <div className="w-full lg:w-2/5">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 lg:p-8 sticky top-24 shadow-sm">
              <h2 className="text-xl font-bold text-(--encre) mb-6">Résumé de l&apos;article</h2>

              <div className="flex gap-4 mb-6">
                <div className="w-24 h-24 shrink-0 rounded-xl bg-gray-50 overflow-hidden relative border border-gray-100">
                  {product.image_url ? (
                    <Image src={product.image_url} alt={product.name} fill className="object-cover" sizes="96px" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="font-bold text-(--encre) line-clamp-2 leading-snug mb-1">{product.name}</h3>
                  {onSale ? (
                    <p className="text-sm flex items-baseline gap-2 flex-wrap">
                      <span className="font-bold text-(--rouge-baol)">{unitPrice.toLocaleString('fr-SN')} FCFA</span>
                      <span className="text-gray-400 line-through">{regularPrice.toLocaleString('fr-SN')} FCFA</span>
                    </p>
                  ) : (
                    <p className="text-(--gris-texte) text-sm font-medium">{unitPrice.toLocaleString('fr-SN')} FCFA</p>
                  )}
                  <div className="flex items-center gap-1 mt-2 text-xs font-bold text-(--vert-baol) bg-(--vert-baol)/10 px-2 py-1 rounded-md w-max">
                    <ShieldCheck className="w-3.5 h-3.5" /> Produit vérifié
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6 space-y-4 text-sm mb-6">
                <div className="flex justify-between items-center text-(--gris-texte)">
                  <span>Sous-total ({quantity} article{quantity > 1 ? 's' : ''})</span>
                  <span className="font-medium text-(--encre)">{subtotal.toLocaleString('fr-SN')} FCFA</span>
                </div>
                <div className="flex justify-between items-center text-(--gris-texte)">
                  <span>Livraison</span>
                  <span className="font-medium text-(--encre)">
                    {deliverySummary}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <div className="flex justify-between items-end mb-6">
                  <span className="text-base font-bold text-(--encre)">Total à régler</span>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-(--vert-baol) block">{total.toLocaleString('fr-SN')} <span className="text-xl">FCFA</span></span>
                  </div>
                </div>

                {/* Bouton dupliqué sur mobile (le bouton du formulaire est caché sur petit écran) */}
                <div className="lg:hidden">
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading || !isFormValid}
                    fullWidth
                    className="py-4 text-lg"
                  >
                    {loading ? 'Redirection vers le paiement...' : `Payer — ${total.toLocaleString('fr-SN')} FCFA`}
                  </Button>
                  <p className="text-center text-xs text-(--gris-texte) mt-3">
                    En payant, vous confirmez avoir lu les{' '}
                    <Link href="/cgv" target="_blank" rel="noopener noreferrer" className="underline hover:text-(--encre) transition-colors">CGV</Link>.
                  </p>
                </div>
              </div>

              {deliveryChoice.mode === 'self_arranged' ? (
                <div className="mt-8 bg-gray-50 rounded-xl p-4 flex gap-3 text-sm">
                  <MapPin className="w-5 h-5 text-(--vert-baol) shrink-0 mt-0.5" />
                  <p className="text-(--gris-texte) leading-relaxed">
                    Vous organisez vous-même la livraison depuis Diourbel.
                  </p>
                </div>
              ) : (
                <div className="mt-8 bg-gray-50 rounded-xl p-4 flex gap-3 text-sm">
                  <Truck className="w-5 h-5 text-(--vert-baol) shrink-0 mt-0.5" />
                  <p className="text-(--gris-texte) leading-relaxed">
                    Livraison suivie. Un livreur vous contactera une fois la commande confirmée.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
