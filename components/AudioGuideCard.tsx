'use client'

import { Play, Pause, Loader2 } from 'lucide-react'
import { AUDIO_GUIDES, TOTAL_STEPS, type GuideId } from '@/lib/audioGuides'
import { useGuideAudio } from '@/lib/useGuideAudio'

interface AudioGuideCardProps {
  guideId: GuideId
}

export default function AudioGuideCard({ guideId }: AudioGuideCardProps) {
  const guide = AUDIO_GUIDES[guideId]
  const { status, progress, toggle, errorVisible } = useGuideAudio(guide?.src ?? null)

  if (!guide) return null

  const isPlaying = status === 'playing'
  const isLoading = status === 'loading'

  const ariaLabel = isPlaying
    ? `Mettre en pause le guide audio, étape ${guide.step} sur ${TOTAL_STEPS} : ${guide.title}`
    : status === 'paused'
    ? `Reprendre le guide audio, étape ${guide.step} sur ${TOTAL_STEPS} : ${guide.title}`
    : `Écouter le guide en wolof, étape ${guide.step} sur ${TOTAL_STEPS} : ${guide.title}`

  const subtitleText = errorVisible
    ? 'Audio indisponible pour le moment'
    : isPlaying
    ? 'Lecture en cours...'
    : 'Écouter en wolof'

  return (
    <div
      onClick={toggle}
      role="region"
      aria-label={`Guide audio : ${guide.title}`}
      className="w-full max-w-sm mx-auto text-left rounded-2xl p-4 border border-(--vert-baol)/20 bg-(--vert-baol)/8 hover:bg-(--vert-baol)/12 transition-colors cursor-pointer select-none group shadow-xs"
    >
      <div className="flex items-center gap-3.5">
        {/* Bouton rond vert 56px */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggle()
          }}
          aria-label={ariaLabel}
          aria-pressed={isPlaying}
          className="w-14 h-14 rounded-full bg-(--vert-baol) text-white flex items-center justify-center shrink-0 shadow-md group-hover:bg-(--vert-baol-fonce) active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) focus-visible:ring-offset-2"
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
          ) : isPlaying ? (
            <Pause className="w-6 h-6" aria-hidden="true" />
          ) : (
            <Play className="w-6 h-6 ml-0.5 fill-current" aria-hidden="true" />
          )}
        </button>

        {/* Textes descriptifs */}
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase font-bold tracking-wider text-(--vert-baol-fonce)">
            Étape {guide.step} sur {TOTAL_STEPS}
          </p>
          <h3 className="text-base font-bold text-(--encre) mt-0.5 truncate leading-tight">
            {guide.title}
          </h3>
          <p
            className={`text-xs mt-1 transition-colors ${
              errorVisible
                ? 'text-(--rouge-erreur) font-medium'
                : isPlaying
                ? 'text-(--vert-baol-fonce) font-medium'
                : 'text-(--gris-texte)'
            }`}
          >
            {subtitleText}
          </p>
        </div>
      </div>

      {/* Barre de progression fine (4px) en bas de carte */}
      <div
        className="w-full h-1 rounded-full bg-(--vert-baol)/20 overflow-hidden mt-3.5"
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-(--vert-baol) rounded-full transition-all duration-200 ease-out"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {/* Région d'annonce accessibilité */}
      <div className="sr-only" aria-live="polite">
        {isPlaying ? 'Lecture' : status === 'paused' ? 'Pause' : errorVisible ? 'Audio indisponible' : ''}
      </div>
    </div>
  )
}
