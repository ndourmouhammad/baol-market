'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/Button'
import { CheckCircle2, Copy, Truck, ShoppingBag } from 'lucide-react'
import { useState } from 'react'

function Confirmation() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (code) {
      navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="bg-(--fond) min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full bg-white border border-gray-100 rounded-3xl shadow-lg p-8 md:p-10 text-center relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-(--vert-baol)/10 to-transparent pointer-events-none"></div>
        
        <div className="relative w-20 h-20 bg-(--vert-baol)/10 text-(--vert-baol) rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm ring-8 ring-(--vert-baol)/5">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        
        <h1 className="text-3xl font-bold text-(--encre) mb-3">Commande enregistrée !</h1>
        <p className="text-(--gris-texte) mb-8 text-base">
          Votre commande a bien été prise en compte. Vous réglerez le montant en espèces à la livraison.
        </p>
        
        {code ? (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-8 relative group transition-colors hover:border-(--vert-baol)/30 hover:bg-(--vert-baol)/5">
            <p className="text-sm font-bold text-(--gris-texte) uppercase tracking-wider mb-2">Votre code de suivi</p>
            <div className="flex items-center justify-center gap-3">
              <p className="font-mono text-3xl font-black text-(--vert-baol) tracking-widest select-all">{code}</p>
              <button 
                onClick={handleCopy}
                className="p-2 text-gray-400 hover:text-(--vert-baol) hover:bg-(--vert-baol)/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol)"
                aria-label="Copier le code"
                title="Copier"
              >
                {copied ? <CheckCircle2 className="w-5 h-5 text-(--vert-baol)" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            {copied && <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-bold text-(--vert-baol)">Copié !</span>}
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-8">
            <p className="text-sm font-bold text-blue-900 mb-1">Commande validée avec succès</p>
            <p className="text-xs text-blue-700">Vous pouvez suivre son évolution dans l&apos;historique de votre compte.</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          <Link href="/suivi" className="block w-full outline-none" tabIndex={-1}>
            <Button fullWidth variant="primary" className="py-3 shadow-md focus-visible:ring-2 focus-visible:ring-(--vert-baol) focus-visible:ring-offset-2">
              <Truck className="w-4 h-4 mr-2" />
              Suivre la livraison
            </Button>
          </Link>
          <Link href="/produits" className="block w-full outline-none" tabIndex={-1}>
            <Button fullWidth variant="secondary" className="py-3 bg-gray-50 border border-gray-200 text-(--encre) hover:bg-gray-100 hover:border-gray-300 focus-visible:ring-2 focus-visible:ring-(--vert-baol) focus-visible:ring-offset-2">
              <ShoppingBag className="w-4 h-4 mr-2 text-(--gris-texte)" />
              Continuer les achats
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="bg-(--fond) min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-(--vert-baol)/30 border-t-(--vert-baol) rounded-full animate-spin"></div>
      </div>
    }>
      <Confirmation />
    </Suspense>
  )
}