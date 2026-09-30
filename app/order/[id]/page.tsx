'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { Button } from '@/components/Button'
import { FormField } from '@/components/FormField'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Breadcrumb } from '@/components/Breadcrumb'
import { ShieldCheck, Truck, ShoppingBag, MapPin, CheckCircle } from 'lucide-react'
import Image from 'next/image'

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
    if (!product || !paymentMethod || !zoneId) return
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
    paymentMethod === 'a_la_livraison' &&
    !!zoneId &&
    (!!user || phone.trim().length >= 8)

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

  const paymentActiveClass = 'border-(--vert-baol) bg-(--vert-baol)/5 ring-1 ring-(--vert-baol)'
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
                  ? 'Pas besoin de compte. Indiquez vos coordonnées pour la livraison.'
                  : 'Vérifiez vos informations et confirmez votre commande.'}
              </p>
            </div>

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
                  <h2 className="text-lg font-bold text-(--encre)">Zone et adresse de livraison</h2>
                </div>
                
                <div className="space-y-5">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="zone-select" className="text-sm font-bold text-(--encre)">Quartier / Zone</label>
                    <select
                      id="zone-select"
                      value={zoneId}
                      onChange={(e) => setZoneId(e.target.value)}
                      required
                      className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-(--encre) focus:border-(--vert-baol) focus:outline-none focus:ring-2 focus:ring-(--vert-baol) transition-all shadow-sm"
                    >
                      <option value="" disabled>Sélectionnez votre zone de livraison</option>
                      {Object.entries(zoneGroups).map(([group, groupZones]) => (
                        <optgroup key={group} label={group} className="font-bold">
                          {groupZones.map((z) => (
                            <option key={z.id} value={z.id} className="font-medium text-(--encre)">{z.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {selectedZone && selectedZone.fee === 0 && (
                    <div className="flex gap-3 text-sm text-(--vert-baol-fonce) bg-(--vert-baol)/10 border border-(--vert-baol)/20 rounded-xl p-4">
                      <MapPin className="w-5 h-5 shrink-0" />
                      <p>
                        Pour les zones hors Diourbel, vous gérez vous-même la livraison. Aucun frais n&#39;est appliqué.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* Section 3: Coordonnées (Invité) */}
              {!user && (
                <section>
                  <div className="flex items-center gap-3 mb-5">
                    <span className="w-8 h-8 flex items-center justify-center bg-(--vert-baol)/10 text-(--vert-baol) font-bold rounded-lg shrink-0">3</span>
                    <h2 className="text-lg font-bold text-(--encre)">Vos coordonnées</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <FormField
                      label="Téléphone *"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="Ex: 77 123 45 67"
                    />
                    <FormField
                      label="Email (Optionnel)"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Pour le suivi par email"
                    />
                  </div>
                </section>
              )}

              {/* Section 4: Paiement */}
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-8 h-8 flex items-center justify-center bg-(--vert-baol)/10 text-(--vert-baol) font-bold rounded-lg shrink-0">{user ? 3 : 4}</span>
                  <h2 className="text-lg font-bold text-(--encre)">Mode de paiement</h2>
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
                    <span className="font-bold text-(--encre) text-base mb-1">À la livraison</span>
                    <span className="text-sm text-(--gris-texte)">En espèces lors de la réception.</span>
                    {paymentMethod === 'a_la_livraison' && (
                      <div className="absolute top-4 right-4 text-(--vert-baol)">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                    )}
                  </label>

                  <label className="cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 p-4 flex flex-col relative opacity-60">
                    <input type="radio" name="payment_method" value="en_ligne" disabled className="sr-only" />
                    <span className="font-bold text-(--encre) text-base mb-1">En ligne</span>
                    <span className="text-sm text-(--gris-texte)">Wave, Orange Money ou Carte.</span>
                    <span className="mt-3 text-xs font-bold uppercase tracking-wider text-(--vert-baol-fonce) bg-(--vert-baol)/10 rounded-full px-3 py-1 w-max">Bientôt disponible</span>
                  </label>
                </div>
              </section>

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
                  {loading ? 'Création de la commande...' : 'Confirmer la commande'}
                </Button>
                <p className="text-center text-xs text-(--gris-texte) mt-4 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Commande 100% sécurisée
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
                  <p className="text-(--gris-texte) text-sm font-medium">{product.price.toLocaleString('fr-SN')} FCFA</p>
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
                  <span>Frais de livraison</span>
                  <span className="font-medium text-(--encre)">
                    {zoneId
                      ? `${deliveryFee.toLocaleString('fr-SN')} FCFA${selectedZone?.is_variable ? '*' : ''}`
                      : 'Calculés après sélection'}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <div className="flex justify-between items-end mb-6">
                  <span className="text-base font-bold text-(--encre)">Total à régler</span>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-(--vert-baol) block">{total.toLocaleString('fr-SN')} <span className="text-xl">FCFA</span></span>
                    {selectedZone?.is_variable && (
                      <span className="text-xs text-(--gris-texte) block mt-1">* Montant final sujet à confirmation</span>
                    )}
                  </div>
                </div>

                {/* Bouton dupliqué sur mobile (car caché dans le form sur grand écran ou en bas) */}
                <div className="lg:hidden">
                  <Button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={loading || !isFormValid}
                    fullWidth
                    className="py-4 text-lg"
                  >
                    {loading ? 'Création de la commande...' : 'Confirmer la commande'}
                  </Button>
                </div>
              </div>

              <div className="mt-8 bg-gray-50 rounded-xl p-4 flex gap-3 text-sm">
                <Truck className="w-5 h-5 text-(--vert-baol) shrink-0 mt-0.5" />
                <p className="text-(--gris-texte) leading-relaxed">
                  Livraison suivie. Une fois la commande confirmée, un coursier vous contactera.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}