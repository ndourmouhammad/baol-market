'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { requestPushPermissionAndSubscribe } from '@/lib/pushClient'

const STORAGE_KEY = 'baol-market-push-invite'
const COOLDOWN_DAYS = 7
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000
const MAX_DISMISS_COUNT = 3

interface CooldownData {
  dismissedAt: number
  dismissCount: number
}

function getStoredCooldown(): { ok: boolean; data: CooldownData } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { ok: true, data: { dismissedAt: 0, dismissCount: 0 } }
    }
    const parsed = JSON.parse(raw)
    return {
      ok: true,
      data: {
        dismissedAt: typeof parsed.dismissedAt === 'number' ? parsed.dismissedAt : 0,
        dismissCount: typeof parsed.dismissCount === 'number' ? parsed.dismissCount : 0,
      },
    }
  } catch {
    // Si localStorage est indisponible ou bloque l'accès
    return { ok: false, data: { dismissedAt: 0, dismissCount: 0 } }
  }
}

function saveCooldown(data: CooldownData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent.toLowerCase()
  const isIos = /iphone|ipad|ipod/.test(ua)
  const isIpadOs = window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1
  return isIos || isIpadOs
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function checkBrowserSupport(): boolean {
  if (typeof window === 'undefined') return false
  if (!('serviceWorker' in navigator)) return false
  if (!('PushManager' in window)) return false
  if (!('Notification' in window)) return false
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return false
  if (Notification.permission !== 'default') return false

  // Sur iPhone/iPad : éligible uniquement si l'application est déjà installée en mode standalone
  if (isIosDevice() && !isStandaloneMode()) {
    return false
  }

  return true
}

export type PushInviteStatus = 'idle' | 'loading' | 'enabled' | 'denied' | 'error'

export interface UsePushInviteOptions {
  respectCooldown?: boolean
}

export function usePushInvite(options: UsePushInviteOptions = {}) {
  const { respectCooldown = true } = options
  const [eligible, setEligible] = useState(false)
  const [status, setStatus] = useState<PushInviteStatus>('idle')
  const [isDismissed, setIsDismissed] = useState(false)
  const isMountedRef = useRef(true)

  const evaluateEligibility = useCallback(async () => {
    // 1. Vérifications matérielles et API web
    if (!checkBrowserSupport()) {
      if (isMountedRef.current) setEligible(false)
      return
    }

    // 2. Limitation de fréquence si activée
    if (respectCooldown) {
      const storage = getStoredCooldown()
      // Si le stockage est indisponible, rester non éligible plutôt que d'insister
      if (!storage.ok) {
        if (isMountedRef.current) setEligible(false)
        return
      }
      const { dismissedAt, dismissCount } = storage.data
      if (dismissCount >= MAX_DISMISS_COUNT) {
        if (isMountedRef.current) setEligible(false)
        return
      }
      if (dismissedAt > 0 && Date.now() - dismissedAt < COOLDOWN_MS) {
        if (isMountedRef.current) setEligible(false)
        return
      }
    }

    // 3. Utilisateur connecté et absent de la table staff
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (isMountedRef.current) setEligible(false)
        return
      }

      const { data: staffRow } = await supabase
        .from('staff')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (!isMountedRef.current) return

      if (staffRow) {
        setEligible(false)
      } else {
        setEligible(true)
      }
    } catch {
      if (isMountedRef.current) setEligible(false)
    }
  }, [respectCooldown])

  useEffect(() => {
    isMountedRef.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialisation asynchrone de l'éligibilité
    evaluateEligibility()

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      evaluateEligibility()
    })

    return () => {
      isMountedRef.current = false
      authListener.subscription.unsubscribe()
    }
  }, [evaluateEligibility])

  const enable = useCallback(async () => {
    setStatus('loading')
    try {
      const success = await requestPushPermissionAndSubscribe()
      if (!isMountedRef.current) return

      if (success) {
        setStatus('enabled')
      } else {
        const perm = typeof Notification !== 'undefined' ? Notification.permission : 'default'
        if (perm === 'denied') {
          setStatus('denied')
          // Enregistrer dismissCount à 3 pour ne plus jamais proposer
          saveCooldown({
            dismissedAt: Date.now(),
            dismissCount: MAX_DISMISS_COUNT,
          })
        } else {
          setStatus('error')
        }
      }
    } catch {
      if (isMountedRef.current) {
        setStatus('error')
      }
    }
  }, [])

  const dismiss = useCallback((permanent = false) => {
    setIsDismissed(true)
    const storage = getStoredCooldown()
    const currentCount = storage.ok ? storage.data.dismissCount : 0
    saveCooldown({
      dismissedAt: Date.now(),
      dismissCount: permanent ? MAX_DISMISS_COUNT : currentCount + 1,
    })
  }, [])

  return {
    eligible: eligible && !isDismissed,
    status,
    enable,
    dismiss,
  }
}
