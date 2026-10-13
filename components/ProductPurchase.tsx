'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Check, ArrowRight } from 'lucide-react'
import { useCart } from '@/components/CartContext'
import { Button } from '@/components/Button'

interface ProductPurchaseProps {
  productId: string
  name: string
  imageUrl: string | null
  currentPrice: number
}

export function ProductPurchase({
  productId,
  name,
  imageUrl,
  currentPrice,
}: ProductPurchaseProps) {
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [hasAdded, setHasAdded] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleDecrease = () => {
    setQuantity((q) => Math.max(1, q - 1))
  }

  const handleIncrease = () => {
    setQuantity((q) => Math.min(20, q + 1))
  }

  const handleAddToCart = () => {
    addItem(
      {
        productId,
        name,
        price: currentPrice,
        imageUrl,
      },
      quantity
    )
    setAdded(true)
    setHasAdded(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setAdded(false)
    }, 1500)
  }

  return (
    <div className="space-y-4 my-6">
      {/* Sélecteur de quantité */}
      <div>
        <label className="block text-xs font-semibold text-(--gris-texte) uppercase tracking-wider mb-2">
          Quantité
        </label>
        <div className="inline-flex items-center rounded-xl border border-gray-200 bg-gray-50/80 p-1">
          <button
            type="button"
            onClick={handleDecrease}
            disabled={quantity <= 1}
            aria-label="Diminuer la quantité"
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-white text-(--encre) shadow-xs hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol)"
          >
            <span className="text-xl font-bold leading-none select-none">−</span>
          </button>
          <div
            className="w-14 text-center font-bold text-lg text-(--encre) select-none"
            aria-live="polite"
          >
            {quantity}
          </div>
          <button
            type="button"
            onClick={handleIncrease}
            disabled={quantity >= 20}
            aria-label="Augmenter la quantité"
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-white text-(--encre) shadow-xs hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol)"
          >
            <span className="text-xl font-bold leading-none select-none">+</span>
          </button>
        </div>
        {quantity >= 20 && (
          <p className="text-xs text-(--gris-texte) mt-1.5 font-medium">
            Maximum 20 par commande
          </p>
        )}
      </div>

      {/* Boutons d'action */}
      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <Button
          type="button"
          variant="secondary"
          onClick={handleAddToCart}
          className="min-h-[48px] py-3.5 px-6 font-semibold text-base gap-2 flex-1 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-(--vert-baol)"
        >
          {added ? (
            <>
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Ajouté au panier</span>
            </>
          ) : (
            <>
              <Plus className="w-5 h-5 shrink-0" />
              <span>Ajouter au panier</span>
            </>
          )}
        </Button>

        <Link
          href={`/order/${productId}?qte=${quantity}`}
          className="flex-1 block outline-none"
        >
          <Button
            type="button"
            variant="primary"
            fullWidth
            className="min-h-[48px] py-3.5 px-6 font-semibold text-base shadow-sm hover:shadow-md transition-all focus-visible:ring-2 focus-visible:ring-(--vert-baol)"
          >
            Acheter maintenant
          </Button>
        </Link>
      </div>

      {/* Petit lien « Voir le panier » visible après un ajout */}
      {hasAdded && (
        <div className="pt-1 text-sm">
          <Link
            href="/panier"
            className="inline-flex items-center gap-1.5 font-semibold text-(--vert-baol) hover:text-(--vert-baol-fonce) transition-colors underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded"
          >
            <span>Voir le panier</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  )
}
