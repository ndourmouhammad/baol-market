'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

export type AudioGuideStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

interface ActiveSession {
  stop: () => void
}

// Référence de module unique : un seul audio actif à la fois dans toute l'application
let currentActiveSession: ActiveSession | null = null

const ERROR_DISPLAY_DURATION_MS = 3000
const TIMEUPDATE_THROTTLE_MS = 250 // Max 4 mises à jour par seconde

export function useGuideAudio(src: string | null) {
  const [status, setStatus] = useState<AudioGuideStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [errorVisible, setErrorVisible] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastTimeUpdateRef = useRef<number>(0)
  const sessionRef = useRef<ActiveSession | null>(null)

  // Nettoyage et libération du composant Audio natif
  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.removeAttribute('src')
      audioRef.current.load()
      audioRef.current = null
    }
    if (sessionRef.current && currentActiveSession === sessionRef.current) {
      currentActiveSession = null
    }
  }, [])

  // Arrêt complet et retour à l'état de repos
  const stop = useCallback(() => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current)
      errorTimeoutRef.current = null
    }
    cleanupAudio()
    setStatus('idle')
    setProgress(0)
    setErrorVisible(false)
  }, [cleanupAudio])

  // Définition de l'objet de session pour le contrôle global (un seul audio actif)
  useEffect(() => {
    sessionRef.current = { stop }
  }, [stop])

  // Gestion des erreurs
  const triggerError = useCallback(() => {
    cleanupAudio()
    setStatus('error')
    setErrorVisible(true)
    setProgress(0)

    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current)
    }

    errorTimeoutRef.current = setTimeout(() => {
      setErrorVisible(false)
      setStatus('idle')
    }, ERROR_DISPLAY_DURATION_MS)
  }, [cleanupAudio])

  // Bascule lecture / pause
  const toggle = useCallback(() => {
    if (!src) return

    // 1. En lecture -> mise en pause
    if (status === 'playing') {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      setStatus('paused')
      return
    }

    // 2. En pause -> reprise
    if (status === 'paused' && audioRef.current) {
      // Arrêter tout autre audio en cours ailleurs dans l'application
      if (currentActiveSession && currentActiveSession !== sessionRef.current) {
        currentActiveSession.stop()
      }
      currentActiveSession = sessionRef.current

      setStatus('loading')
      audioRef.current
        .play()
        .then(() => {
          setStatus('playing')
        })
        .catch(() => {
          triggerError()
        })
      return
    }

    // 3. Au repos ou en erreur -> création de new Audio uniquement au premier clic
    if (currentActiveSession && currentActiveSession !== sessionRef.current) {
      currentActiveSession.stop()
    }
    currentActiveSession = sessionRef.current

    cleanupAudio()
    setStatus('loading')
    setErrorVisible(false)

    const audio = new Audio(src)
    audio.preload = 'none'
    audioRef.current = audio

    audio.onwaiting = () => {
      setStatus('loading')
    }

    audio.onplaying = () => {
      setStatus('playing')
    }

    audio.ontimeupdate = () => {
      if (!audio.duration || isNaN(audio.duration)) return
      const now = performance.now()
      if (now - lastTimeUpdateRef.current >= TIMEUPDATE_THROTTLE_MS) {
        lastTimeUpdateRef.current = now
        setProgress(Math.min(1, Math.max(0, audio.currentTime / audio.duration)))
      }
    }

    audio.onended = () => {
      cleanupAudio()
      setStatus('idle')
      setProgress(0)
    }

    audio.onerror = () => {
      triggerError()
    }

    audio
      .play()
      .then(() => {
        setStatus('playing')
      })
      .catch(() => {
        triggerError()
      })
  }, [src, status, cleanupAudio, triggerError])

  // Arrêt lors d'un changement de source (ex: navigation vers un autre guide)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- réinitialisation de l'audio lors d'un changement de guide
    stop()
  }, [src, stop])

  // Mise en pause quand l'onglet passe en arrière-plan
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause()
        setStatus('paused')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Nettoyage au démontage du composant
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current)
      }
      cleanupAudio()
    }
  }, [cleanupAudio])

  return {
    status,
    progress,
    toggle,
    stop,
    errorVisible,
  }
}
