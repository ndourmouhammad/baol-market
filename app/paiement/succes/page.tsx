'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/components/CartContext'

// Statuts qui prouvent que le paiement a bien eu lieu (la commande a pu avancer depuis)
const PAID_STATUSES = ['paid', 'preparing', 'confirmed', 'delivering', 'delivered']

// Doit rester identique à la clé utilisée dans app/commande/page.tsx
const PENDING_CART_ORDER_KEY = 'baol-market-pending-cart-order'

function SuccessContent() {
  const searchParams = useSearchParams()
  const ref = searchParams.get('ref')
  const { clearCart } = useCart()
  const [status, setStatus] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!ref) {
      setChecking(false)
      return
    }

    // Le panier n'est vidé que si la commande payée est bien celle qui en est issue :
    // un achat direct ("Commander") ne touche jamais au panier.
    function emptyCartIfThisOrder() {
      try {
        if (localStorage.getItem(PENDING_CART_ORDER_KEY) === ref) {
          clearCart()
          localStorage.removeItem(PENDING_CART_ORDER_KEY)
        }
      } catch (e) {
        console.error('Erreur vidage du panier:', e)
      }
    }

    let attempts = 0
    const interval = setInterval(async () => {
      attempts += 1
      const { data } = await supabase.from('orders').select('status').eq('id', ref).maybeSingle()
      if (data) setStatus(data.status)

      const isPaid = !!data && PAID_STATUSES.includes(data.status)
      if (isPaid) emptyCartIfThisOrder()

      if (isPaid || attempts >= 6) {
        clearInterval(interval)
        setChecking(false)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [ref, clearCart])

  const isPaid = status !== null && PAID_STATUSES.includes(status)

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      {checking ? (
        <>
          <div className="w-12 h-12 border-4 border-gray-200 border-t-(--vert-baol) rounded-full animate-spin mx-auto mb-6"></div>
          <h1 className="text-2xl font-bold text-(--encre) mb-2">Confirmation du paiement...</h1>
          <p className="text-(--gris-texte)">Un instant, nous vérifions votre paiement.</p>
        </>
      ) : isPaid ? (
        <>
          <div className="w-16 h-16 bg-(--vert-baol)/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-(--vert-baol)" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-(--encre) mb-2">Paiement confirmé !</h1>
          <p className="text-(--gris-texte) mb-8">Votre commande est en cours de préparation.</p>
          <Link href="/orders" className="inline-block bg-(--vert-baol) text-white px-6 py-3 rounded-xl font-medium hover:bg-(--vert-baol-fonce) transition-colors">
            Voir mes commandes
          </Link>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-(--encre) mb-2">Paiement en cours de traitement</h1>
          <p className="text-(--gris-texte) mb-8">
            Ça peut prendre quelques instants. Vérifiez le statut de votre commande dans quelques minutes.
          </p>
          <Link href="/orders" className="inline-block bg-(--vert-baol) text-white px-6 py-3 rounded-xl font-medium hover:bg-(--vert-baol-fonce) transition-colors">
            Voir mes commandes
          </Link>
        </>
      )}
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  )
}
