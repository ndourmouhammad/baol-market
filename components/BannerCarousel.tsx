'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PromoBanner } from './PromoBanner'

export type CarouselSlide = {
  id: string
  imageUrl: string
  title: string | null
  description: string | null
  badge: string | null
  href: string | null
}

const AUTOPLAY_MS = 5000
const SWIPE_THRESHOLD_PX = 50

export function BannerCarousel({ slides }: { slides: CarouselSlide[] }) {
  const count = slides.length
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  const current = Math.min(index, Math.max(count - 1, 0))

  function go(direction: -1 | 1) {
    setIndex((i) => (i + direction + count) % count)
  }

  // Défilement automatique : s'arrête au survol, au toucher, au focus clavier,
  // et pour les personnes qui ont demandé moins d'animations.
  // Le minuteur repart de zéro après chaque changement de bannière.
  useEffect(() => {
    if (count < 2 || paused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % count)
    }, AUTOPLAY_MS)
    return () => clearInterval(timer)
  }, [count, paused, index])

  if (count === 0) return null

  return (
    <div
      className="group relative overflow-hidden rounded-2xl"
      role="region"
      aria-roledescription="carrousel"
      aria-label="Offres du moment"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => {
        setPaused(true)
        setTouchStartX(e.touches[0].clientX)
      }}
      onTouchEnd={(e) => {
        if (touchStartX !== null && count > 1) {
          const deltaX = e.changedTouches[0].clientX - touchStartX
          if (Math.abs(deltaX) > SWIPE_THRESHOLD_PX) go(deltaX < 0 ? 1 : -1)
        }
        setTouchStartX(null)
        setPaused(false)
      }}
    >
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((slide, i) => {
          const banner = (
            <PromoBanner
              variant="carousel"
              imageUrl={slide.imageUrl}
              title={slide.title}
              description={slide.description}
              badge={slide.badge}
              priority={i === 0}
            />
          )
          return (
            <div key={slide.id} className="w-full shrink-0" aria-hidden={i !== current}>
              {slide.href ? (
                <Link
                  href={slide.href}
                  tabIndex={i === current ? 0 : -1}
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) focus-visible:ring-inset rounded-2xl"
                >
                  {banner}
                </Link>
              ) : (
                banner
              )}
            </div>
          )
        })}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-white/90 text-(--encre) shadow-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol)"
            aria-label="Bannière précédente"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-white/90 text-(--encre) shadow-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol)"
            aria-label="Bannière suivante"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  i === current ? 'w-6 bg-white' : 'w-2.5 bg-white/60 hover:bg-white/80'
                }`}
                aria-label={`Aller à la bannière ${i + 1}`}
                aria-current={i === current}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
