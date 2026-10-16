'use client'

import { useState, useEffect, useRef, useSyncExternalStore } from 'react'

function subscribe(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getSnapshot(): boolean {
  return navigator.onLine
}

function getServerSnapshot(): boolean {
  return true
}

export default function OfflineBanner() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [showRestored, setShowRestored] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasOfflineRef = useRef(false)

  useEffect(() => {
    if (!navigator.onLine) {
      wasOfflineRef.current = true
    }

    const handleOnline = () => {
      if (wasOfflineRef.current) {
        setShowRestored(true)
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
          setShowRestored(false)
          timerRef.current = null
        }, 3000)
      }
      wasOfflineRef.current = false
    }

    const handleOffline = () => {
      wasOfflineRef.current = true
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setShowRestored(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  if (!isOnline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="w-full bg-[#1F2937] text-white text-sm text-center py-2 px-4"
      >
        Vous êtes hors connexion. Certaines fonctions sont indisponibles.
      </div>
    )
  }

  if (showRestored) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="w-full text-white text-sm text-center py-2 px-4 bg-[var(--vert-baol,#009A3D)]"
      >
        Connexion rétablie
      </div>
    )
  }

  return null
}
