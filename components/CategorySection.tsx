'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { ProductCard } from './ProductCard'
import type { FlashDisplay } from '@/lib/flashSale'

type CategoryProduct = {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  flash?: FlashDisplay | null
}

type CategorySectionProps = {
  category: {
    id: string
    name: string
    slug: string
    description?: string | null
  }
  products: CategoryProduct[]
}

/**
 * Section catégorie sur l'accueil (style Jumia) :
 * En-tête avec titre, sous-titre et bouton « Voir plus »,
 * suivi d'une ligne de produits avec défilement horizontal fluide.
 */
export function CategorySection({ category, products }: CategorySectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      ro.disconnect()
    }
  }, [checkScroll])

  function scroll(direction: 'left' | 'right') {
    const el = scrollRef.current
    if (!el) return
    const amount = el.clientWidth * 0.8
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  if (products.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-10" aria-label={category.name}>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* En-tête de la catégorie style Jumia */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 bg-linear-to-r from-emerald-50/40 via-white to-white">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-(--encre) truncate">
              {category.name}
            </h2>

            <Link
              href={`/categorie/${category.slug}`}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white bg-(--vert-baol) hover:bg-(--vert-baol-fonce) rounded-full px-3.5 py-1.5 sm:px-4 sm:py-2 transition-colors shadow-xs shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol)"
              aria-label={`Voir tous les produits de ${category.name}`}
            >
              <span>Voir plus</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <p
            className="text-xs sm:text-sm text-(--gris-texte) mt-1 line-clamp-2 max-w-3xl leading-relaxed"
            title={category.description || undefined}
          >
            {category.description || 'Meilleures offres'}
          </p>
        </div>

        {/* Défilement horizontal des produits */}
        <div className="relative group/scroll p-3 sm:p-5">
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scroll('left')}
              className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center bg-white rounded-full shadow-lg border border-gray-200 text-(--encre) hover:bg-gray-50 transition-colors opacity-0 group-hover/scroll:opacity-100 focus-visible:opacity-100"
              aria-label="Produits précédents"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {canScrollRight && (
            <button
              type="button"
              onClick={() => scroll('right')}
              className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center bg-white rounded-full shadow-lg border border-gray-200 text-(--encre) hover:bg-gray-50 transition-colors opacity-0 group-hover/scroll:opacity-100 focus-visible:opacity-100"
              aria-label="Produits suivants"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth py-1"
            tabIndex={0}
            role="region"
            aria-label={`Produits de la catégorie ${category.name}`}
          >
            {products.map((product) => (
              <div
                key={product.id}
                className="w-[160px] xs:w-[180px] sm:w-[220px] md:w-[240px] shrink-0 flex flex-col"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
