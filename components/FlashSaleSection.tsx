'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Zap, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { ProductCard } from './ProductCard'
import type { FlashDisplay } from '@/lib/flashSale'

type FlashProduct = {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  flash: FlashDisplay
}

// Temps restant en millisecondes ; null tant que le navigateur n'a pas démarré le compte à rebours
function useRemainingTime(endsAt: string) {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    const target = new Date(endsAt).getTime()
    const tick = () => setRemaining(Math.max(0, target - Date.now()))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [endsAt])

  return remaining
}

function TimeBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="min-w-8 sm:min-w-10 text-center bg-white text-(--rouge-baol) font-bold text-sm sm:text-lg rounded-md px-1.5 py-1 tabular-nums shadow-sm">
        {value}
      </span>
      <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/70 mt-0.5">{label}</span>
    </div>
  )
}

function Countdown({ endsAt }: { endsAt: string }) {
  const remaining = useRemainingTime(endsAt)

  if (remaining === null) {
    // Avant le démarrage dans le navigateur : on réserve la place pour éviter un saut de mise en page
    return <div className="h-10" aria-hidden="true" />
  }
  if (remaining === 0) {
    return <p className="text-sm font-bold text-white/90">Vente flash terminée</p>
  }

  const totalSeconds = Math.floor(remaining / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="flex items-end gap-1.5 sm:gap-2" role="timer" aria-label="Temps restant avant la fin des ventes flash">
      {days > 0 && <TimeBox value={String(days)} label={days > 1 ? 'jours' : 'jour'} />}
      <TimeBox value={pad(hours)} label="heures" />
      <span className="text-white font-bold text-lg pb-1 hidden sm:block">:</span>
      <TimeBox value={pad(minutes)} label="min" />
      <span className="text-white font-bold text-lg pb-1 hidden sm:block">:</span>
      <TimeBox value={pad(seconds)} label="sec" />
    </div>
  )
}

/**
 * Section « Ventes flash » de l'accueil — bande rouge avec défilement horizontal.
 * Le compte à rebours vise la fin de la vente flash qui se termine en premier.
 */
export function FlashSaleSection({ products, endsAt }: { products: FlashProduct[]; endsAt: string }) {
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
    // Recalculer si le conteneur change de taille
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
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-10" aria-label="Ventes flash">
      <div className="rounded-2xl overflow-hidden shadow-lg">
        {/* En-tête rouge */}
        <div className="bg-(--rouge-baol) px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Ventes flash</h2>
              <p className="text-xs text-white/70 hidden sm:block">Prix réduits, durée limitée</p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-white/80">Se termine dans</span>
              <Countdown endsAt={endsAt} />
            </div>
            <Link
              href="/ventes-flash"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-white bg-white/20 hover:bg-white/30 rounded-full px-3 py-1.5 transition-colors whitespace-nowrap"
            >
              Voir tout
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Zone de défilement horizontal des produits */}
        <div className="bg-white relative group/scroll">
          {/* Bouton précédent */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scroll('left')}
              className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center bg-white rounded-full shadow-lg border border-gray-200 text-(--encre) hover:bg-gray-50 transition-colors opacity-0 group-hover/scroll:opacity-100"
              aria-label="Défiler vers la gauche"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 sm:px-6 py-4 sm:py-5"
          >
            {products.map((product) => (
              <div
                key={product.id}
                className="w-44 sm:w-52 md:w-56 lg:w-60 shrink-0 snap-start"
              >
                <ProductCard product={product} />
              </div>
            ))}

            {/* Carte « Voir tout » en fin de rangée */}
            <Link
              href="/ventes-flash"
              className="w-44 sm:w-52 md:w-56 lg:w-60 shrink-0 snap-start flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-(--rouge-baol)/30 bg-(--rouge-baol)/5 hover:bg-(--rouge-baol)/10 transition-colors min-h-[200px]"
            >
              <div className="w-12 h-12 rounded-full bg-(--rouge-baol)/10 flex items-center justify-center">
                <ArrowRight className="w-6 h-6 text-(--rouge-baol)" />
              </div>
              <span className="text-sm font-bold text-(--rouge-baol)">Voir tout</span>
            </Link>
          </div>

          {/* Bouton suivant */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scroll('right')}
              className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center bg-white rounded-full shadow-lg border border-gray-200 text-(--encre) hover:bg-gray-50 transition-colors opacity-0 group-hover/scroll:opacity-100"
              aria-label="Défiler vers la droite"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Lien mobile « Voir tout » */}
        <div className="sm:hidden bg-white border-t border-gray-100 px-4 py-3">
          <Link
            href="/ventes-flash"
            className="flex items-center justify-center gap-1.5 text-sm font-bold text-(--rouge-baol) hover:text-(--rouge-baol)/80 transition-colors"
          >
            Voir toutes les ventes flash
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
