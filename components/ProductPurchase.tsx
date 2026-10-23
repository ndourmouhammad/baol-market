'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Check, ArrowRight, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'
import { useCart } from '@/components/CartContext'
import { Button } from '@/components/Button'

interface ProductPurchaseProps {
  productId: string
  name: string
  imageUrl: string | null
  currentPrice: number
  sizeOptions?: string[] | null
  sizeNotes?: string | null
}

export function ProductPurchase({
  productId,
  name,
  imageUrl,
  currentPrice,
  sizeOptions,
  sizeNotes,
}: ProductPurchaseProps) {
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [added, setAdded] = useState(false)
  const [hasAdded, setHasAdded] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const hasSizes = Array.isArray(sizeOptions) && sizeOptions.length > 0
  const isMissingSize = hasSizes && !selectedSize

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
    if (isMissingSize) return

    addItem(
      {
        productId,
        name,
        price: currentPrice,
        imageUrl,
        size: selectedSize,
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

  const buyNowUrl = hasSizes && selectedSize
    ? `/order/${productId}?qte=${quantity}&taille=${encodeURIComponent(selectedSize)}`
    : `/order/${productId}?qte=${quantity}`

  return (
    <div className="space-y-5 my-6">
      {/* Sélecteur de taille (si le produit a des options de taille) */}
      {hasSizes && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-(--gris-texte) uppercase tracking-wider">
              Taille <span className="text-(--rouge-baol)">*</span>
              {selectedSize && (
                <span className="ml-2 font-bold text-(--encre) normal-case text-sm">
                  : {selectedSize}
                </span>
              )}
            </label>
          </div>

          {/* Pastilles de taille (min 44px de hauteur pour confort tactile) */}
          <div className="flex flex-wrap gap-2.5">
            {sizeOptions.map((size) => {
              const isSelected = selectedSize === size
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(isSelected ? null : size)}
                  aria-pressed={isSelected}
                  className={`min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-xl text-sm font-bold border transition-all select-none flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) ${
                    isSelected
                      ? 'bg-(--vert-baol) text-white border-(--vert-baol) shadow-sm'
                      : 'bg-white text-(--encre) border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {size}
                </button>
              )
            })}
          </div>

          {/* Message d'aide si aucune taille n'est choisie */}
          {isMissingSize && (
            <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-2">
              Choisissez une taille pour continuer
            </p>
          )}

          {/* Mesures spécifiques si renseignées */}
          {sizeNotes && (
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-(--gris-texte) space-y-1">
              <span className="font-semibold text-(--encre) block">Mesures du produit :</span>
              <p className="whitespace-pre-line leading-relaxed">{sizeNotes}</p>
            </div>
          )}

          {/* Lien repliable : Comment choisir ma taille ? */}
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => setIsGuideOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-(--vert-baol) hover:text-(--vert-baol-fonce) transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Comment choisir ma taille ?</span>
              {isGuideOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {isGuideOpen && (
              <div className="mt-2.5 p-3.5 bg-gray-50/90 rounded-xl border border-gray-200/70 text-xs text-(--gris-texte) space-y-2">
                <p className="font-semibold text-(--encre)">Conseils généraux pour bien choisir :</p>
                <ul className="space-y-1.5 list-disc pl-4 leading-relaxed">
                  <li>Comparez avec un vêtement ou une paire de chaussures qui vous va déjà bien.</li>
                  <li>Pour les vêtements, prenez vos mesures à plat à l&apos;aide d&apos;un mètre ruban sans serrer.</li>
                  <li>En cas de doute entre deux tailles, nous vous conseillons de choisir la taille au-dessus.</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

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
          disabled={isMissingSize}
          className="min-h-[48px] py-3.5 px-6 font-semibold text-base gap-2 flex-1 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-(--vert-baol) disabled:opacity-50 disabled:cursor-not-allowed"
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

        {isMissingSize ? (
          <Button
            type="button"
            variant="primary"
            fullWidth
            disabled
            className="min-h-[48px] py-3.5 px-6 font-semibold text-base flex-1 shadow-sm opacity-50 cursor-not-allowed"
          >
            Acheter maintenant
          </Button>
        ) : (
          <Link
            href={buyNowUrl}
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
        )}
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
