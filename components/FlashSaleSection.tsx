'use client'

import { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'
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
      <span className="min-w-10 sm:min-w-12 text-center bg-(--encre) text-white font-bold text-base sm:text-xl rounded-lg px-2 py-1.5 tabular-nums">
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-(--gris-texte) mt-1">{label}</span>
    </div>
  )
}

function Countdown({ endsAt }: { endsAt: string }) {
  const remaining = useRemainingTime(endsAt)

  if (remaining === null) {
    // Avant le démarrage dans le navigateur : on réserve la place pour éviter un saut de mise en page
    return <div className="h-14" aria-hidden="true" />
  }
  if (remaining === 0) {
    return <p className="text-sm font-bold text-(--rouge-baol)">Vente flash terminée</p>
  }

  const totalSeconds = Math.floor(remaining / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="flex items-end gap-2" role="timer" aria-label="Temps restant avant la fin des ventes flash">
      {days > 0 && <TimeBox value={String(days)} label={days > 1 ? 'jours' : 'jour'} />}
      <TimeBox value={pad(hours)} label="heures" />
      <TimeBox value={pad(minutes)} label="min" />
      <TimeBox value={pad(seconds)} label="sec" />
    </div>
  )
}

/**
 * Section « Ventes flash » de l'accueil.
 * Le compte à rebours vise la fin de la vente flash qui se termine en premier.
 */
export function FlashSaleSection({ products, endsAt }: { products: FlashProduct[]; endsAt: string }) {
  if (products.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-10" aria-label="Ventes flash">
      <div className="rounded-2xl border border-(--rouge-baol)/20 bg-(--rouge-baol)/5 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-(--rouge-baol) text-white p-2.5 rounded-xl">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-(--encre)">Ventes flash</h2>
              <p className="text-sm text-(--gris-texte)">Des prix réduits, pour une durée limitée</p>
            </div>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-(--gris-texte) pb-2">Se termine dans</span>
            <Countdown endsAt={endsAt} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )
}
