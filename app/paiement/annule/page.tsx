'use client'

import Link from 'next/link'

export default function PaymentCancelPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-(--rouge-erreur)" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-(--encre) mb-2">Paiement annulé</h1>
      <p className="text-(--gris-texte) mb-8">Votre commande n&#39;a pas été finalisée. Vous pouvez réessayer à tout moment.</p>
      <Link href="/panier" className="inline-block bg-(--vert-baol) text-white px-6 py-3 rounded-xl font-medium hover:bg-(--vert-baol-fonce) transition-colors">
        Retour au panier
      </Link>
    </div>
  )
}