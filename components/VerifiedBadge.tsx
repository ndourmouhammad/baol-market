export default function VerifiedBadge() {
  return (
    <div className="absolute top-3 left-3 bg-vert-feuille text-sable text-xs font-semibold px-2.5 py-1 flex items-center gap-1 shadow-sm rounded-full z-10">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      Vérifié
    </div>
  )
}
