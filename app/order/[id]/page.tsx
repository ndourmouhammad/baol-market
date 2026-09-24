'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { Button } from '@/components/Button'
import { FormField } from '@/components/FormField'
import { ErrorMessage } from '@/components/ErrorMessage'

type Product = {
  id: string
  name: string
  price: number
  image_url?: string
}

type DeliveryZone = {
  id: string
  name: string
  fee: number
  is_variable: boolean
  display_group: string | null
}

export default function OrderPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [product, setProduct] = useState<Product | null>(null)
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [address, setAddress] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('a_la_livraison')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [initLoading, setInitLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, name, price, image_url')
        .eq('id', id)
        .single()

      const { data: zonesData } = await supabase
        .from('delivery_zones')
        .select('id, name, fee, is_variable, display_group')
        .order('sort_order')

      if (productError) {
        setError('Ce produit est introuvable ou indisponible.')
      } else {
        setProduct(productData)
      }
      setZones(zonesData || [])
      setInitLoading(false)
    }
    loadData()
  }, [id])

  const selectedZone = zones.find((z) => z.id === zoneId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!product || !address.trim() || !paymentMethod || !zoneId) return
    if (!user && phone.trim().length < 8) {
      setError('Un numéro de téléphone valide est requis.')
      return
    }

    setLoading(true)
    setError('')

    const subtotalAmount = product.price * quantity
    const deliveryFee = selectedZone?.fee ?? 0
    const totalAmount = subtotalAmount + deliveryFee

    if (user) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          status: 'created',
          payment_method: paymentMethod,
          subtotal_amount: subtotalAmount,
          delivery_fee: deliveryFee,
          delivery_fee_confirmed: !selectedZone?.is_variable,
          total_amount: totalAmount,
          delivery_address: address,
          delivery_zone_id: zoneId,
        })
        .select()
        .single()

      if (orderError) {
        setError("Une erreur est survenue lors de la création de votre commande. Veuillez réessayer.")
        setLoading(false)
        return
      }

      const { error: itemError } = await supabase.from('order_items').insert({
        order_id: order.id,
        product_id: product.id,
        quantity,
        unit_price: product.price,
      })

      if (itemError) {
        setLoading(false)
        setError("Votre commande a été créée, mais un souci est survenu avec les articles. Contactez le support.")
        return
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()
        await fetch('/api/notifications/order-confirmation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ orderId: order.id }),
        })
      } catch (e) {
        console.error("L'email de confirmation n'a pas pu être envoyé:", e)
      }

      setLoading(false)
      router.push('/orders')
    } else {
      const res = await fetch('/api/orders/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity,
          address,
          paymentMethod,
          phone,
          email: email.trim() || undefined,
          deliveryZoneId: zoneId,
        }),
      })
      const json = await res.json()
      setLoading(false)

      if (!res.ok) {
        setError(json.error)
      } else {
        router.push(`/commande-confirmee?code=${encodeURIComponent(json.trackingCode)}`)
      }
    }
  }

  const increaseQty = () => setQuantity(q => q + 1)
  const decreaseQty = () => setQuantity(q => Math.max(1, q - 1))

  const isFormValid =
    address.trim().length > 0 &&
    paymentMethod === 'a_la_livraison' &&
    !!zoneId &&
    (!!user || phone.trim().length >= 8)

  if (initLoading) {
    return (
      <div className="flex items-center justify-center p-6 py-32 bg-(--fond) min-h-screen">
        <div className="w-12 h-12 border-4 border-(--vert-baol)/30 border-t-(--vert-baol) rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error && !product) {
    return (
      <div className="flex flex-col items-center justify-center p-6 py-32 text-center bg-(--fond) min-h-screen">
        <h1 className="text-3xl font-bold text-(--encre) mb-4">Produit introuvable</h1>
        <p className="text-(--gris-texte) mb-6">{error}</p>
        <button onClick={() => router.push('/')} className="bg-(--vert-baol) text-white px-6 py-3 font-medium rounded-xl hover:bg-(--vert-baol-fonce) transition-colors">
          Retour au catalogue
        </button>
      </div>
    )
  }

  if (!product) return null

  const paymentActiveClass = 'border-(--vert-baol) bg-(--vert-baol)/5'
  const paymentInactiveClass = 'border-gray-200 hover:border-gray-300'

  const subtotal = product.price * quantity
  const deliveryFee = selectedZone?.fee ?? 0
  const total = subtotal + deliveryFee

  const zoneGroups = zones.reduce<Record<string, DeliveryZone[]>>((acc, zone) => {
    const group = zone.display_group ?? 'Autres zones'
    if (!acc[group]) acc[group] = []
    acc[group].push(zone)
    return acc
  }, {})

  return (
    <div className="bg-(--fond) py-12 px-4 sm:px-6 min-h-screen">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8">

        <div className="w-full md:w-1/3">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 sticky top-24 shadow-sm">
            <h2 className="text-2xl font-bold text-(--encre) mb-6 border-b border-gray-100 pb-4">Récapitulatif</h2>

            <div className="aspect-4/3 w-full overflow-hidden bg-gray-50 rounded-xl mb-4 flex items-center justify-center">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-2">
                  <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            <h3 className="text-xl font-bold text-(--encre)">{product.name}</h3>
            <p className="text-(--gris-texte) mt-1">{product.price.toLocaleString('fr-SN')} FCFA / unité</p>

            <div className="mt-6 pt-4 border-t border-gray-100 space-y-2 text-sm">
              <div className="flex justify-between text-(--gris-texte)">
                <span>Sous-total</span>
                <span>{subtotal.toLocaleString('fr-SN')} FCFA</span>
              </div>
              <div className="flex justify-between text-(--gris-texte)">
                <span>Livraison</span>
                <span>
                  {zoneId
                    ? `${deliveryFee.toLocaleString('fr-SN')} FCFA${selectedZone?.is_variable ? ' (à confirmer)' : ''}`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between font-bold text-(--encre) pt-3 border-t border-gray-100 mt-2">
                <span>Total</span>
                <span>{total.toLocaleString('fr-SN')} FCFA</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 space-y-3">
              <div className="flex items-center gap-2 text-xs text-(--vert-baol) font-medium">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Produit vérifié physiquement
              </div>
              <div className="flex items-center gap-2 text-xs text-(--gris-texte) font-medium">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Transaction sécurisée
              </div>
            </div>
          </div>
        </div>

        <div className="w-full md:w-2/3">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 shadow-sm">
            <h1 className="text-3xl font-bold text-(--encre) mb-2">Finaliser la commande</h1>
            {!user && (
              <p className="text-sm text-(--gris-texte) mb-8">
                Pas besoin de compte — indiquez juste votre téléphone.{' '}
                <a href="/login" className="text-(--vert-baol) font-medium hover:underline">Vous avez déjà un compte ?</a>
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-0">

              <div className="pb-8 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-7 h-7 flex items-center justify-center bg-(--vert-baol) text-white text-sm font-bold rounded-full shrink-0">1</span>
                  <label className="text-sm font-bold text-(--encre) uppercase tracking-wider">Quantité</label>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={decreaseQty} className="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-50 text-(--encre) hover:bg-gray-100 transition-colors focus:outline-none" aria-label="Diminuer la quantité">
                    <svg width="16" height="2" viewBox="0 0 16 2" fill="currentColor"><rect width="16" height="2" rx="1"/></svg>
                  </button>
                  <div className="w-16 h-12 flex items-center justify-center font-bold text-lg text-(--encre)">
                    {quantity}
                  </div>
                  <button type="button" onClick={increaseQty} className="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-50 text-(--encre) hover:bg-gray-100 transition-colors focus:outline-none" aria-label="Augmenter la quantité">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M9 7V1a1 1 0 0 0-2 0v6H1a1 1 0 0 0 0 2h6v6a1 1 0 0 0 2 0V9h6a1 1 0 0 0 0-2H9z"/></svg>
                  </button>
                </div>
              </div>

              <div className="py-8 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-7 h-7 flex items-center justify-center bg-(--vert-baol) text-white text-sm font-bold rounded-full shrink-0">2</span>
                  <label className="text-sm font-bold text-(--encre) uppercase tracking-wider">Zone de livraison</label>
                </div>
                
                <select
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  required
                  className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-(--encre) focus:border-(--vert-baol) focus:outline-none focus:ring-1 focus:ring-(--vert-baol) transition-colors mb-4"
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
                  <p className="text-xs text-(--vert-baol-fonce) bg-(--vert-baol)/10 rounded-lg p-3 mb-4">
                    Frais de livraison à partir de {selectedZone.fee.toLocaleString('fr-SN')} FCFA — le montant exact vous sera confirmé par téléphone.
                  </p>
                )}

                <FormField
                  label="Adresse détaillée"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  placeholder="Précisez : rue, repère — ex. Rue 15 près du marché"
                />
              </div>

              {!user && (
                <div className="py-8 border-b border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-7 h-7 flex items-center justify-center bg-(--vert-baol) text-white text-sm font-bold rounded-full shrink-0">3</span>
                    <label className="text-sm font-bold text-(--encre) uppercase tracking-wider">Vos coordonnées</label>
                  </div>
                  <div className="space-y-4">
                    <FormField
                      label="Téléphone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="Numéro de téléphone (obligatoire)"
                    />
                    <FormField
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email (optionnel — pour recevoir un suivi par mail)"
                    />
                  </div>
                </div>
              )}

              <div className="py-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-7 h-7 flex items-center justify-center bg-(--vert-baol) text-white text-sm font-bold rounded-full shrink-0">{user ? 3 : 4}</span>
                  <label className="text-sm font-bold text-(--encre) uppercase tracking-wider">Mode de paiement</label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <label className={`cursor-pointer rounded-xl border p-4 flex flex-col relative transition-all ${paymentMethod === 'a_la_livraison' ? paymentActiveClass : paymentInactiveClass}`}>
                    <input
                      type="radio"
                      name="payment_method"
                      value="a_la_livraison"
                      checked={paymentMethod === 'a_la_livraison'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="sr-only"
                    />
                    <span className="font-bold text-(--encre) text-lg mb-1">À la livraison</span>
                    <span className="text-sm text-(--gris-texte)">Paiement en espèces lors de la réception.</span>
                    {paymentMethod === 'a_la_livraison' && (
                      <div className="absolute top-4 right-4 text-(--vert-baol)">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      </div>
                    )}
                  </label>

                  <label className="cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 p-4 flex flex-col relative opacity-60">
                    <input type="radio" name="payment_method" value="en_ligne" disabled className="sr-only" />
                    <span className="font-bold text-(--encre) text-lg mb-1">En ligne</span>
                    <span className="text-sm text-(--gris-texte)">Carte bancaire ou Mobile Money.</span>
                    <span className="mt-3 text-xs font-bold uppercase tracking-wider text-(--vert-baol-fonce) bg-(--vert-baol)/10 rounded-full px-3 py-1 w-max">Bientôt disponible</span>
                  </label>

                </div>
              </div>

              {error && (
                <div className="mb-6">
                  <ErrorMessage message={error} />
                </div>
              )}

              <div className="pt-6 border-t border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-lg text-(--encre)">Total à régler</span>
                  <span className="text-3xl font-bold text-(--vert-baol)">{total.toLocaleString('fr-SN')} FCFA</span>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !isFormValid}
                  fullWidth
                  className="py-4 text-lg"
                >
                  {loading ? 'Enregistrement...' : 'Confirmer la commande'}
                </Button>

                <p className="text-center text-xs text-(--gris-texte) mt-4">
                  Paiement sécurisé · Produit vérifié avant expédition · Suivi de commande en temps réel
                </p>
              </div>

            </form>
          </div>
        </div>

      </div>
    </div>
  )
}