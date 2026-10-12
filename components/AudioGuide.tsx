'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { Volume2, Pause, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

// Constantes des chemins audio (faciles à modifier)
export const AUDIO_GUIDE_1 = '/audio/guide-1-accueil.mp3'
export const AUDIO_GUIDE_2 = '/audio/guide-2-connecte.mp3'
export const AUDIO_GUIDE_3 = '/audio/guide-3-apres-commande.mp3'

// Constantes des libellés et textes du bouton
export const LABEL_DEFAULT = 'Écouter en wolof'
export const LABEL_PAUSE = 'Pause'
export const LABEL_ERROR = 'Audio indisponible pour le moment'

// Paramètres de configuration
const STORAGE_KEY_SEEN = 'baol-market-audio-seen'
const AUTO_COLLAPSE_DELAY_MS = 8000
const ERROR_DISPLAY_DURATION_MS = 3000

type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

/**
 * Détermine le fichier audio correspondant selon le chemin et l'état de connexion.
 * Retourne null si aucun bouton ne doit être affiché sur la page courante.
 */
function resolveAudioGuide(pathname: string, isLoggedIn: boolean): string | null {
  // Normalisation du chemin (retrait du slash final éventuel sauf racine)
  const normalizedPath = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname

  if (normalizedPath === '/') {
    return isLoggedIn ? AUDIO_GUIDE_2 : AUDIO_GUIDE_1
  }

  if (normalizedPath === '/signup') {
    return AUDIO_GUIDE_1
  }

  if (
    normalizedPath === '/panier' ||
    normalizedPath === '/commande' ||
    normalizedPath.startsWith('/order/')
  ) {
    return AUDIO_GUIDE_2
  }

  if (normalizedPath === '/paiement/succes' || normalizedPath === '/orders') {
    return AUDIO_GUIDE_3
  }

  // Toute autre page (/admin, /login, /paiement/annule, /mot-de-passe-oublie, /cgv, /mentions-legales, /produits, /categorie...)
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

  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle')
  const [srAnnouncement, setSrAnnouncement] = useState('')

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const collapseTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  // Détermination du guide audio à jouer
  const targetSrc = useMemo(() => {
    return resolveAudioGuide(pathname, !!user)
  }, [pathname, user])

  // Arrêt et libération complète de l'objet audio
  const stopAndCleanAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.removeAttribute('src')
      audioRef.current.load()
      audioRef.current = null
    }
  }, [])

  // Gestion des erreurs de lecture audio
  const triggerErrorState = useCallback(() => {
    stopAndCleanAudio()
    setPlaybackState('error')
    setSrAnnouncement('Audio indisponible')

    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current)
    }

    errorTimeoutRef.current = setTimeout(() => {
      setPlaybackState('idle')
      setSrAnnouncement('')
    }, ERROR_DISPLAY_DURATION_MS)
  }, [stopAndCleanAudio])

  // Changement de page, de source ou de compte : réinitialisation complète
  useEffect(() => {
    stopAndCleanAudio()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- retour à l'état de repos lors d'une transition
    setPlaybackState('idle')
    setSrAnnouncement('')

    // Réinitialisation du minuteur de 8 secondes pour afficher le texte
    setIsTimerActive(true)

    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current)
    }

    collapseTimeoutRef.current = setTimeout(() => {
      setIsTimerActive(false)
    }, AUTO_COLLAPSE_DELAY_MS)

    return () => {
      if (collapseTimeoutRef.current) {
        clearTimeout(collapseTimeoutRef.current)
      }
      stopAndCleanAudio()
    }
  }, [pathname, targetSrc, user?.id, stopAndCleanAudio])

  // Mise en pause quand l'onglet passe en arrière-plan
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause()
        setPlaybackState('paused')
        setSrAnnouncement('Pause')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Nettoyage global au démontage
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current)
      }
      if (collapseTimeoutRef.current) {
        clearTimeout(collapseTimeoutRef.current)
      }
      stopAndCleanAudio()
    }
  }, [stopAndCleanAudio])

  // Gestion du clic utilisateur
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

    // 1. Si en cours de lecture : mettre en pause
    if (playbackState === 'playing') {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      setPlaybackState('paused')
      setSrAnnouncement('Pause')
      return
    }

    // 2. Si en pause : reprendre la lecture
    if (playbackState === 'paused' && audioRef.current) {
      setPlaybackState('loading')
      audioRef.current
        .play()
        .then(() => {
          setPlaybackState('playing')
          setSrAnnouncement('Lecture')
        })
        .catch(() => {
          triggerErrorState()
        })
      return
    }

    // 3. Si en repos ou premier clic : création de l'objet Audio uniquement ici
    if (!targetSrc) return

    stopAndCleanAudio()
    setPlaybackState('loading')

    const audio = new Audio(targetSrc)
    audio.preload = 'none'
    audioRef.current = audio

    audio.onwaiting = () => {
      setPlaybackState('loading')
    }

    audio.onplaying = () => {
      setPlaybackState('playing')
      setSrAnnouncement('Lecture')
    }

    audio.onended = () => {
      stopAndCleanAudio()
      setPlaybackState('idle')
      setSrAnnouncement('')
    }

    audio.onerror = () => {
      triggerErrorState()
    }

    audio
      .play()
      .then(() => {
        setPlaybackState('playing')
        setSrAnnouncement('Lecture')
      })
      .catch(() => {
        triggerErrorState()
      })
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
  if (!targetSrc) {
    return null
  }

  // État étendu : le bouton reste pilule pendant les 8 premières secondes, au survol, au focus,
  // pendant la lecture, le chargement ou en cas d'erreur
  const isExpanded =
    isTimerActive ||
    isHovered ||
    isFocused ||
    playbackState === 'playing' ||
    playbackState === 'loading' ||
    playbackState === 'error'

  // Calcul du texte et de l'icône selon l'état
  const displayText =
    playbackState === 'error'
      ? LABEL_ERROR
      : playbackState === 'playing'
      ? LABEL_PAUSE
      : LABEL_DEFAULT

  const ariaLabel =
    playbackState === 'playing'
      ? 'Mettre en pause le guide audio'
      : playbackState === 'paused'
      ? 'Reprendre le guide audio'
      : playbackState === 'error'
      ? LABEL_ERROR
      : 'Écouter le guide en wolof'

  return (
    <>
      <div
        className="fixed z-30 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-[calc(1rem+env(safe-area-inset-left,0px))] md:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] md:left-[calc(1.5rem+env(safe-area-inset-left,0px))] pointer-events-auto"
      >
        <button
          type="button"
          onClick={handleTogglePlay}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          aria-label={ariaLabel}
          aria-pressed={playbackState === 'playing'}
          className={`group relative h-12 flex items-center justify-center bg-(--vert-baol) text-white font-medium text-sm rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--vert-baol)/40 focus-visible:ring-offset-2 ${
            isExpanded ? 'px-4 w-auto' : 'w-12 px-0'
          }`}
        >
          {/* Anneau pulsant discret à la première visite uniquement (désactivé si prefers-reduced-motion) */}
          {!hasSeen && (
            <span
              aria-hidden="true"
              className="absolute -inset-1 rounded-full ring-2 ring-(--vert-baol) ring-offset-2 animate-pulse motion-reduce:hidden pointer-events-none"
            />
          )}

          {/* Icône selon l'état */}
          <span className="flex items-center justify-center shrink-0">
            {playbackState === 'loading' ? (
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            ) : playbackState === 'playing' ? (
              <Pause className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Volume2 className="w-5 h-5" aria-hidden="true" />
            )}
          </span>

          {/* Libellé texte avec transition douce vers l'état replié (icône seule) */}
          <span
            className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-out motion-reduce:transition-none ${
              isExpanded
                ? 'max-w-64 opacity-100 ml-2.5'
                : 'max-w-0 opacity-0 ml-0 group-hover:max-w-64 group-hover:opacity-100 group-hover:ml-2.5 group-focus-visible:max-w-64 group-focus-visible:opacity-100 group-focus-visible:ml-2.5'
            }`}
          >
            {displayText}
          </span>
        </button>
      </div>

      {/* Région d'annonce d'accessibilité (sr-only polite) */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {srAnnouncement}
      </div>
    </>
  )
}
