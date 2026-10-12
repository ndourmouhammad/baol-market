'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { Play, Pause, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { AUDIO_GUIDES, TOTAL_STEPS, LABEL_DEFAULT, type GuideId } from '@/lib/audioGuides'
import { useGuideAudio } from '@/lib/useGuideAudio'

// Paramètres de configuration
const STORAGE_KEY_SEEN = 'baol-market-audio-seen'
const AUTO_COLLAPSE_DELAY_MS = 8000

// Mémoire de session de navigation (sans localStorage) pour le badge « Nouveau »
const sessionOfferedGuides = new Set<GuideId>()
let hasSessionStarted = false

/**
 * Détermine l'ID du guide selon le chemin et l'état de connexion.
 * Retourne null si aucun bouton ne doit être affiché sur la page courante.
 * Le bouton flottant n'est plus affiché sur /paiement/succes (remplacé par AudioGuideCard).
 */
function resolveGuideId(pathname: string, isLoggedIn: boolean): GuideId | null {
  const normalizedPath = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname

  if (normalizedPath === '/') {
    return isLoggedIn ? 2 : 1
  }

  if (normalizedPath === '/signup') {
    return 1
  }

  if (
    normalizedPath === '/panier' ||
    normalizedPath === '/commande' ||
    normalizedPath.startsWith('/order/')
  ) {
    return 2
  }

  if (normalizedPath === '/orders') {
    return 3
  }

  // Toute autre page (/paiement/succes, /admin, /login, /paiement/annule, /produits, etc.)
  return null
}

export default function AudioGuide() {
  const pathname = usePathname()

  const [user, setUser] = useState<User | null>(null)
  const [isStaff, setIsStaff] = useState(false)
  const [authLoaded, setAuthLoaded] = useState(false)

  const [hasSeen, setHasSeen] = useState(true)
  const [isTimerActive, setIsTimerActive] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const [showNewBadge, setShowNewBadge] = useState(false)

  const previousGuideIdRef = useRef<GuideId | null>(null)
  const collapseTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const badgeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Vérification de l'utilisateur et du statut membre d'équipe (staff)
  useEffect(() => {
    let isMounted = true

    const checkUser = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!isMounted) return
        setUser(currentUser)

        if (currentUser) {
          const { data: staffRow } = await supabase
            .from('staff')
            .select('id')
            .eq('id', currentUser.id)
            .maybeSingle()

          if (isMounted) {
            setIsStaff(!!staffRow)
            setAuthLoaded(true)
          }
        } else {
          if (isMounted) {
            setIsStaff(false)
            setAuthLoaded(true)
          }
        }
      } catch {
        if (isMounted) {
          setIsStaff(false)
          setAuthLoaded(true)
        }
      }
    }

    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      const nextUser = session?.user ?? null
      setUser(nextUser)

      if (nextUser) {
        supabase
          .from('staff')
          .select('id')
          .eq('id', nextUser.id)
          .maybeSingle()
          .then(
            ({ data }) => {
              if (isMounted) {
                setIsStaff(!!data)
              }
            },
            () => {
              if (isMounted) {
                setIsStaff(false)
              }
            }
          )
      } else {
        setIsStaff(false)
      }
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  // Détection de la première visite via localStorage
  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY_SEEN)
      if (!seen) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- initialisation première visite client
        setHasSeen(false)
      }
    } catch {
      // localStorage bloqué ou indisponible
    }
  }, [])

  // Détermination du guide audio courant
  const guideId = useMemo(() => {
    return resolveGuideId(pathname, !!user)
  }, [pathname, user])

  const guide = guideId ? AUDIO_GUIDES[guideId] : null

  // Hook partagé pour la lecture audio unique et différée au clic
  const { status, toggle, errorVisible } = useGuideAudio(guide?.src ?? null)

  // Gestion du timer de repli et du badge « Nouveau » lors d'un changement de guide
  useEffect(() => {
    if (!guideId) {
      previousGuideIdRef.current = null
      return
    }

    // Réinitialisation du minuteur de 8 secondes pour afficher la pilule
    // eslint-disable-next-line react-hooks/set-state-in-effect -- affichage initial de la pilule à la navigation
    setIsTimerActive(true)

    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current)
    }
    collapseTimeoutRef.current = setTimeout(() => {
      setIsTimerActive(false)
    }, AUTO_COLLAPSE_DELAY_MS)

    const isGuideChanged = previousGuideIdRef.current !== null && previousGuideIdRef.current !== guideId
    previousGuideIdRef.current = guideId

    if (!hasSessionStarted) {
      // Tout premier affichage de la session : pas de badge « Nouveau »
      hasSessionStarted = true
      sessionOfferedGuides.add(guideId)
      setShowNewBadge(false)
    } else if (isGuideChanged && !sessionOfferedGuides.has(guideId)) {
      // Guide différent et non encore proposé pendant cette session :
      sessionOfferedGuides.add(guideId)
      setShowNewBadge(true)

      if (badgeTimeoutRef.current) {
        clearTimeout(badgeTimeoutRef.current)
      }
      badgeTimeoutRef.current = setTimeout(() => {
        setShowNewBadge(false)
      }, AUTO_COLLAPSE_DELAY_MS)
    } else {
      setShowNewBadge(false)
    }

    return () => {
      if (collapseTimeoutRef.current) {
        clearTimeout(collapseTimeoutRef.current)
      }
      if (badgeTimeoutRef.current) {
        clearTimeout(badgeTimeoutRef.current)
      }
    }
  }, [guideId])

  // Clic sur le bouton
  const handleTogglePlay = () => {
    // Premier clic : enregistrement pour supprimer l'anneau pulsant
    if (!hasSeen) {
      try {
        localStorage.setItem(STORAGE_KEY_SEEN, 'true')
      } catch {
        // Ignorer
      }
      setHasSeen(true)
    }

    toggle()
  }

  // Ne jamais afficher le bouton aux membres de l'équipe (staff)
  if (isStaff) {
    return null
  }

  // Attente de l'initialisation de l'authentification pour éviter tout flash chez le staff
  if (!authLoaded) {
    return null
  }

  // Si la page courante n'a pas de guide associé, aucun bouton n'est affiché
  if (!guide) {
    return null
  }

  const isPlaying = status === 'playing'
  const isLoading = status === 'loading'

  // État étendu : le bouton reste pilule pendant les 8 premières secondes, au survol, au focus,
  // pendant la lecture, le chargement, en cas d'erreur ou tant que le badge Nouveau est affiché
  const isExpanded =
    isTimerActive ||
    isHovered ||
    isFocused ||
    isPlaying ||
    isLoading ||
    errorVisible ||
    showNewBadge

  const displayText = errorVisible
    ? 'Audio indisponible pour le moment'
    : isPlaying
    ? 'Pause'
    : LABEL_DEFAULT

  const ariaLabel = isPlaying
    ? `Mettre en pause le guide audio, étape ${guide.step} sur ${TOTAL_STEPS} : ${guide.title}`
    : status === 'paused'
    ? `Reprendre le guide audio, étape ${guide.step} sur ${TOTAL_STEPS} : ${guide.title}`
    : errorVisible
    ? 'Audio indisponible pour le moment'
    : `Écouter le guide en wolof, étape ${guide.step} sur ${TOTAL_STEPS} : ${guide.title}`

  return (
    <>
      <div className="fixed z-30 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-[calc(1rem+env(safe-area-inset-left,0px))] md:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] md:left-[calc(1.5rem+env(safe-area-inset-left,0px))] pointer-events-auto">
        <button
          type="button"
          onClick={handleTogglePlay}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          aria-label={ariaLabel}
          aria-pressed={isPlaying}
          className={`group relative h-12 flex items-center bg-(--vert-baol) text-white rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--vert-baol)/40 focus-visible:ring-offset-2 ${
            isExpanded
              ? 'px-3.5 sm:px-4 w-auto max-w-[calc(100vw-2rem)] sm:max-w-md'
              : 'w-12 px-0 justify-center'
          }`}
        >
          {/* Anneau pulsant discret à la première visite uniquement (désactivé si prefers-reduced-motion) */}
          {!hasSeen && (
            <span
              aria-hidden="true"
              className="absolute -inset-1 rounded-full ring-2 ring-(--vert-baol) ring-offset-2 animate-pulse motion-reduce:hidden pointer-events-none"
            />
          )}

          {/* Badge « Nouveau » en haut de la pilule */}
          {showNewBadge && isExpanded && (
            <span
              aria-hidden="true"
              className="absolute -top-2.5 right-4 z-10 bg-(--or-senegal) text-(--encre) text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs border border-yellow-300 animate-in fade-in zoom-in-75 duration-200 pointer-events-none"
            >
              Nouveau
            </span>
          )}

          {/* Badge avec numéro d'étape en coin du rond réduit de 48px */}
          {!isExpanded && (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-(--or-senegal) text-(--encre) text-xs font-bold flex items-center justify-center shadow-xs border-2 border-white pointer-events-none"
            >
              {guide.step}
            </span>
          )}

          {/* Icône selon l'état : Play, Pause ou Loader2 */}
          <span className="flex items-center justify-center shrink-0">
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Play className="w-5 h-5 ml-0.5 fill-current" aria-hidden="true" />
            )}
          </span>

          {/* Contenu détaillé de la pilule (texte principal, ligne secondaire et puces d'étapes) */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-out motion-reduce:transition-none flex items-center ${
              isExpanded
                ? 'max-w-xs sm:max-w-sm opacity-100 ml-2.5'
                : 'max-w-0 opacity-0 ml-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2.5 group-focus-visible:max-w-xs group-focus-visible:opacity-100 group-focus-visible:ml-2.5'
            }`}
          >
            <div className="flex flex-col text-left min-w-0 pr-1">
              <span className="text-sm font-bold leading-tight select-none truncate">
                {displayText}
              </span>
              <span className="text-[11px] text-white/90 leading-tight truncate select-none">
                Étape {guide.step} sur {TOTAL_STEPS} · {guide.title}
              </span>
            </div>

            {/* 3 petits points (puces de 6 px) */}
            <div className="flex items-center gap-1 shrink-0 ml-2.5" aria-hidden="true">
              {[1, 2, 3].map((step) => (
                <span
                  key={step}
                  className={`w-1.5 h-1.5 rounded-full border border-white transition-colors ${
                    step === guide.step ? 'bg-white' : 'bg-transparent'
                  }`}
                />
              ))}
            </div>
          </div>
        </button>
      </div>

      {/* Région d'annonce accessibilité (sr-only polite) */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isPlaying ? 'Lecture' : status === 'paused' ? 'Pause' : errorVisible ? 'Audio indisponible' : ''}
      </div>
    </>
  )
}
