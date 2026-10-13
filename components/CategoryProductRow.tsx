'use client'

import { useRef, useState, useCallback, useEffect, type ComponentProps } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { ProductCard } from './ProductCard'

type ProductItem = ComponentProps<typeof ProductCard>['product']

export interface CategoryProductRowProps {
  title: string
  href: string
  products: ProductItem[]
}

/**
 * Rangée défilante horizontale de produits pour une catégorie sur la page d'accueil.
 */
export function CategoryProductRow({ title, href, products }: CategoryProductRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [hasOverflow, setHasOverflow] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const overflow = el.scrollWidth > el.clientWidth + 1
    setHasOverflow(overflow)
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)

    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(checkScroll)
      ro.observe(el)
    }

    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
      ro?.disconnect()
    }
  }, [checkScroll])

  function scroll(direction: 'left' | 'right') {
    const el = scrollRef.current
    if (!el) return
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const amount = el.clientWidth * 0.8
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    })
  }

  if (!products || products.length === 0) {
    return null
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 md:p-6 overflow-hidden">
      {/* En-tête : Titre à gauche, Lien « Voir tout » à droite */}
      <div className="flex items-center justify-between gap-4 mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-(--encre)">
          {title}
        </h2>
        <Link
          href={href}
          className="min-h-[40px] inline-flex items-center gap-1.5 text-sm font-bold text-(--vert-baol) hover:text-(--vert-baol-fonce) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded-lg px-2 shrink-0"
        >
          <span>Voir tout</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Rangée défilante horizontale */}
      <div className="relative group/scroll">
        {/* Boutons de navigation sur ordinateur (affichés seulement si la rangée déborde) */}
        {hasOverflow && (
          <>
            <button
              type="button"
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              aria-label="Produits précédents"
              className={`hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center bg-white rounded-full shadow-md border border-gray-200 text-(--encre) transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) ${
                !canScrollLeft
                  ? 'opacity-0 pointer-events-none'
                  : 'opacity-90 hover:opacity-100 hover:scale-105 hover:bg-gray-50'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              aria-label="Produits suivants"
              className={`hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center bg-white rounded-full shadow-md border border-gray-200 text-(--encre) transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) ${
                !canScrollRight
                  ? 'opacity-0 pointer-events-none'
                  : 'opacity-90 hover:opacity-100 hover:scale-105 hover:bg-gray-50'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth motion-reduce:scroll-auto items-stretch -mx-4 px-4 md:mx-0 md:px-0 py-1"
          tabIndex={0}
          role="region"
          aria-label={`Produits de la catégorie ${title}`}
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="w-44 sm:w-52 lg:w-60 shrink-0 snap-start flex flex-col"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
