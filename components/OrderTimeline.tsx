export default function OrderTimeline({ status }: { status: string }) {
  const STEPS = [
    { key: 'confirmed', label: 'Confirmée' },
    { key: 'preparing', label: 'En préparation' },
    { key: 'delivering', label: 'En livraison' },
    { key: 'delivered', label: 'Livrée' },
  ]

  const getStatusIndex = () => {
    if (status === 'created' || status === 'payment_pending') return 0
    const index = STEPS.findIndex(s => s.key === status)
    return index === -1 ? 0 : index
  }

  const currentIndex = getStatusIndex()
  const progressWidth = `${(currentIndex / (STEPS.length - 1)) * 100}%`

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
            const isCompleted = index <= currentIndex
            const isCurrent = index === currentIndex

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
