'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function Confirmation() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code')

  return (
    <div className="bg-sable min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white border border-terre/20 p-8 text-center">
        <svg className="w-12 h-12 text-vert-feuille mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <h1 className="font-serif text-2xl font-bold text-baobab mb-2">Commande enregistrée !</h1>
        <p className="text-baobab/70 mb-6">Notez bien ce code, il vous permettra de suivre votre commande :</p>
        <div className="bg-sable border-2 border-dashed border-terre/40 py-4 mb-6">
          <p className="font-mono text-2xl font-bold text-terre tracking-wider">{code}</p>
        </div>
        <Link href="/suivi" className="block w-full bg-terre text-sable py-3 font-medium hover:bg-terre/90 transition-colors mb-3">
          Suivre ma commande
        </Link>
        <Link href="/" className="block text-sm text-baobab/60 hover:underline">
          Retour au catalogue
        </Link>
      </div>
    </div>
  )
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={null}>
      <Confirmation />
    </Suspense>
  )
}