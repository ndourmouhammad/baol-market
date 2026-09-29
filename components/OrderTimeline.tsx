import { STATUS_LABELS, type OrderStatus } from '@/lib/orderStatus'
import { XCircle } from 'lucide-react'

/** Étapes visibles dans la timeline de progression client */
const STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'created', label: 'Créée' },
  { key: 'paid', label: 'Payée' },
  { key: 'preparing', label: 'En préparation' },
  { key: 'confirmed', label: 'Confirmée' },
  { key: 'delivering', label: 'En livraison' },
  { key: 'delivered', label: 'Livrée' },
]

export default function OrderTimeline({ status }: { status: string }) {
  // ── Commandes annulées / remboursées : affichage spécial ──
  if (status === 'cancelled' || status === 'refunded') {
    const label = STATUS_LABELS[status as OrderStatus] ?? status
    return (
      <div className="flex items-center gap-3 mt-6 mb-2 py-3 px-4 rounded-xl bg-red-50 border border-red-200">
        <XCircle className="w-5 h-5 text-(--rouge-erreur) shrink-0" />
        <span className="text-sm font-bold text-(--rouge-erreur)">
          Commande {label.toLowerCase()}
        </span>
      </div>
    )
  }

  // ── Timeline de progression normale ──
  const currentIndex = STEPS.findIndex((s) => s.key === status)
  const safeIndex = currentIndex === -1 ? 0 : currentIndex
  const progressWidth = `${(safeIndex / (STEPS.length - 1)) * 100}%`

  return (
    <div className="w-full mt-6 mb-2">
      <div className="relative">
        {/* Ligne de fond */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 rounded-full"></div>

        {/* Ligne de progression */}
        <div
          className="absolute top-1/2 left-0 h-1 bg-(--vert-baol) -translate-y-1/2 rounded-full transition-all duration-500 ease-in-out"
          style={{ width: progressWidth }}
        ></div>

        {/* Étapes */}
        <div className="relative flex justify-between w-full">
          {STEPS.map((step, index) => {
            const isCompleted = index <= safeIndex
            const isCurrent = index === safeIndex

            const circleClass = isCompleted
              ? 'bg-(--vert-baol) text-white'
              : 'bg-white border-2 border-gray-200 text-transparent'

            const labelClass = isCurrent
              ? 'text-(--vert-baol)'
              : isCompleted
                ? 'text-(--encre)'
                : 'text-gray-400'

            return (
              <div key={step.key} className="flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 transition-colors duration-500 ${circleClass}`}>
                  {isCompleted && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`mt-2 text-xs font-bold uppercase tracking-wider text-center max-w-20 ${labelClass}`}>
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
