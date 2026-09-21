'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

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
  const [user, setUser] = useState<User | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [address, setAddress] = useState('')
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

      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, image_url')
        .eq('id', id)
        .single()

      if (error) {
        setError('Ce produit est introuvable ou indisponible.')
      } else {
        setProduct(data)
      }
      setInitLoading(false)
    }
    loadData()
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!product || !address.trim() || !paymentMethod) return
    if (!user && phone.trim().length < 8) {
      setError('Un numéro de téléphone valide est requis.')
      return
    }

    setLoading(true)
    setError('')

    if (user) {
      // Parcours client connecté — inchangé
      const totalAmount = product.price * quantity

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          status: 'created',
          payment_method: paymentMethod,
          total_amount: totalAmount,
          delivery_address: address,
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
      // Parcours invité — nouveau
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
    (!!user || phone.trim().length >= 8)

  if (initLoading) {
    return (
      <div className="flex items-center justify-center p-6 py-32">
        <div className="w-12 h-12 border-4 border-terre/30 border-t-terre rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error && !product) {
    return (
      <div className="flex flex-col items-center justify-center p-6 py-32 text-center">
        <h1 className="font-serif text-3xl font-bold text-baobab mb-4">Produit introuvable</h1>
        <p className="text-baobab/80 mb-6">{error}</p>
        <button onClick={() => router.push('/')} className="bg-terre text-sable px-6 py-3 font-medium hover:bg-terre/90 transition-colors">
          Retour au catalogue
        </button>
      </div>
    )
  }

  if (!product) return null

  const paymentActiveClass = 'border-terre bg-terre/5'
  const paymentInactiveClass = 'border-terre/20 hover:border-terre/50'

  return (
    <div className="bg-sable py-12 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8">

        <div className="w-full md:w-1/3">
          <div className="bg-white border border-terre/20 p-6 sticky top-20">
            <h2 className="font-serif text-2xl font-bold text-baobab mb-6 border-b border-terre/10 pb-4">Récapitulatif</h2>

            <div className="aspect-[4/3] w-full overflow-hidden bg-sable mb-4 border border-terre/10 flex items-center justify-center">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-sable/80 flex flex-col items-center justify-center gap-2">
                  <svg className="w-10 h-10 text-terre/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            <h3 className="font-serif text-xl font-medium text-baobab">{product.name}</h3>
            <p className="text-baobab/70 mt-1">{product.price.toLocaleString('fr-SN')} FCFA / unité</p>

            <div className="mt-6 pt-4 border-t border-terre/10 space-y-2">
              <div className="flex items-center gap-2 text-xs text-vert-feuille">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Produit vérifié physiquement
              </div>
              <div className="flex items-center gap-2 text-xs text-baobab/60">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Transaction sécurisée
              </div>
            </div>
          </div>
        </div>

        <div className="w-full md:w-2/3">
          <div className="bg-white border border-terre/20 p-6 md:p-8">
            <h1 className="font-serif text-3xl font-bold text-baobab mb-2">Finaliser la commande</h1>
            {!user && (
              <p className="text-sm text-baobab/60 mb-6">
                Pas besoin de compte — indiquez juste votre téléphone.{' '}
                <a href="/login" className="text-terre underline">Vous avez déjà un compte ?</a>
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-0">

              <div className="pb-8 border-b border-terre/10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-7 h-7 flex items-center justify-center bg-terre text-sable text-sm font-bold rounded-full flex-shrink-0">1</span>
                  <label className="text-sm font-semibold text-baobab uppercase tracking-wider">Quantité</label>
                </div>
                <div className="flex items-center">
                  <button type="button" onClick={decreaseQty} className="w-12 h-12 flex items-center justify-center border border-terre/30 bg-sable/50 text-baobab hover:bg-terre/10 transition-colors focus:outline-none focus:ring-2 focus:ring-terre" aria-label="Diminuer la quantité">
                    <svg width="16" height="2" viewBox="0 0 16 2" fill="currentColor"><rect width="16" height="2" rx="1"/></svg>
                  </button>
                  <div className="w-16 h-12 flex items-center justify-center border-y border-terre/30 font-medium text-lg text-baobab">
                    {quantity}
                  </div>
                  <button type="button" onClick={increaseQty} className="w-12 h-12 flex items-center justify-center border border-terre/30 bg-sable/50 text-baobab hover:bg-terre/10 transition-colors focus:outline-none focus:ring-2 focus:ring-terre" aria-label="Augmenter la quantité">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M9 7V1a1 1 0 0 0-2 0v6H1a1 1 0 0 0 0 2h6v6a1 1 0 0 0 2 0V9h6a1 1 0 0 0 0-2H9z"/></svg>
                  </button>
                </div>
              </div>

              <div className="py-8 border-b border-terre/10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-7 h-7 flex items-center justify-center bg-terre text-sable text-sm font-bold rounded-full flex-shrink-0">2</span>
                  <label className="text-sm font-semibold text-baobab uppercase tracking-wider">Adresse de livraison</label>
                </div>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  className="block w-full border border-terre/30 bg-sable/20 px-4 py-3 text-baobab placeholder-baobab/40 focus:border-terre focus:outline-none focus:ring-1 focus:ring-terre transition-colors"
                  placeholder="Quartier, rue, repère — ex. Médina, Rue 15 près du marché"
                />
              </div>

              {!user && (
                <div className="py-8 border-b border-terre/10">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-7 h-7 flex items-center justify-center bg-terre text-sable text-sm font-bold rounded-full flex-shrink-0">3</span>
                    <label className="text-sm font-semibold text-baobab uppercase tracking-wider">Vos coordonnées</label>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="block w-full border border-terre/30 bg-sable/20 px-4 py-3 text-baobab placeholder-baobab/40 focus:border-terre focus:outline-none focus:ring-1 focus:ring-terre transition-colors"
                      placeholder="Numéro de téléphone (obligatoire)"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full border border-terre/30 bg-sable/20 px-4 py-3 text-baobab placeholder-baobab/40 focus:border-terre focus:outline-none focus:ring-1 focus:ring-terre transition-colors"
                      placeholder="Email (optionnel — pour recevoir un suivi par mail)"
                    />
                  </div>
                </div>
              )}

              <div className="py-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-7 h-7 flex items-center justify-center bg-terre text-sable text-sm font-bold rounded-full flex-shrink-0">{user ? 3 : 4}</span>
                  <label className="text-sm font-semibold text-baobab uppercase tracking-wider">Mode de paiement</label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <label className={`cursor-pointer border p-4 flex flex-col relative transition-all ${paymentMethod === 'a_la_livraison' ? paymentActiveClass : paymentInactiveClass}`}>
                    <input
                      type="radio"
                      name="payment_method"
                      value="a_la_livraison"
                      checked={paymentMethod === 'a_la_livraison'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="sr-only"
                    />
                    <span className="font-serif font-semibold text-baobab text-lg mb-1">À la livraison</span>
                    <span className="text-sm text-baobab/70">Paiement en espèces lors de la réception.</span>
                    {paymentMethod === 'a_la_livraison' && (
                      <div className="absolute top-4 right-4 text-terre">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      </div>
                    )}
                  </label>

                  <label className="cursor-not-allowed border border-baobab/10 bg-black/5 p-4 flex flex-col relative opacity-60">
                    <input type="radio" name="payment_method" value="en_ligne" disabled className="sr-only" />
                    <span className="font-serif font-semibold text-baobab/50 text-lg mb-1">En ligne</span>
                    <span className="text-sm text-baobab/50">Carte bancaire ou Mobile Money.</span>
                    <span className="mt-3 text-xs font-semibold uppercase tracking-wider text-terre/70 bg-terre/10 inline-block px-2 py-1 w-max">Bientôt disponible</span>
                  </label>

                </div>
              </div>

              {error && (
                <div className="bg-terre/10 border-l-4 border-terre p-4 mb-6">
                  <p className="text-terre text-sm font-medium">{error}</p>
                </div>
              )}

              <div className="pt-6 border-t border-terre/20">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-lg text-baobab">Total à régler</span>
                  <span className="font-serif text-3xl font-bold text-terre">{(product.price * quantity).toLocaleString('fr-SN')} FCFA</span>
                </div>

                <button
                  type="submit"
                  disabled={loading || !isFormValid}
                  className="w-full bg-terre text-sable py-4 px-4 font-medium text-lg hover:bg-terre/90 focus:outline-none focus:ring-2 focus:ring-terre focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? 'Enregistrement...' : 'Confirmer la commande'}
                </button>

                <p className="text-center text-xs text-baobab/50 mt-4">
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