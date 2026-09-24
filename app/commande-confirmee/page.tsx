'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/Button'

function Confirmation() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code')

  return (
    <div className="bg-(--fond) min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white border border-gray-100 rounded-2xl shadow-sm p-8 text-center">
        <div className="w-16 h-16 bg-(--vert-baol)/10 text-(--vert-baol) rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-(--encre) mb-2">Commande enregistrée !</h1>
        <p className="text-(--gris-texte) mb-6">Notez bien ce code, il vous permettra de suivre votre commande :</p>
        
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl py-4 mb-8">
          <p className="font-mono text-3xl font-bold text-(--vert-baol) tracking-wider">{code}</p>
        </div>
        
        <div className="space-y-3">
          <Link href="/suivi" className="block w-full">
            <Button fullWidth variant="primary">Suivre ma commande</Button>
          </Link>
          <Link href="/" className="block w-full">
            <Button fullWidth variant="secondary" className="bg-gray-100 text-(--encre) hover:bg-gray-200">Retour au catalogue</Button>
          </Link>
        </div>
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