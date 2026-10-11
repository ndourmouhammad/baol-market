'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, BellRing } from 'lucide-react'
import { requestPushPermissionAndSubscribe, unsubscribeFromPush } from '@/lib/pushClient'

type PushState = 'loading' | 'unsupported' | 'ios-no-pwa' | 'denied' | 'default' | 'granted'

async function checkPushState(): Promise<PushState> {
  if (typeof window === 'undefined') return 'loading'

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    // iOS Safari hors mode standalone (non installée comme PWA) ne supporte pas le push
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isStandalone =
      ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone) ||
      window.matchMedia('(display-mode: standalone)').matches
    if (isIOS && !isStandalone) return 'ios-no-pwa'
    return 'unsupported'
  }

  if (!('Notification' in window)) return 'unsupported'

  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission === 'default') return 'default'

  // Permission 'granted' : vérifier si une souscription active existe
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return subscription ? 'granted' : 'default'
  } catch {
    return 'granted'
  }
}

export function PushToggle({ className = '' }: { className?: string }) {
  const [state, setState] = useState<PushState>('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let mounted = true
    checkPushState().then((s) => {
      if (mounted) setState(s)
    })
    return () => {
      mounted = false
    }
  }, [])

  if (state === 'loading') return null

  if (state === 'unsupported') {
    return (
      <div className={`text-xs text-(--gris-texte) px-4 py-2 flex items-center gap-2 ${className}`}>
        <BellOff className="w-4 h-4 shrink-0" />
        <span>Notifications non disponibles sur ce navigateur.</span>
      </div>
    )
  }

  if (state === 'ios-no-pwa') {
    return (
      <div className={`text-xs text-(--gris-texte) px-4 py-2 flex items-start gap-2 bg-amber-50/70 border border-amber-200/50 rounded-xl ${className}`}>
        <Bell className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
        <span>
          Sur iPhone, ajoutez l&apos;application à l&apos;écran d&apos;accueil pour activer les notifications
          <span className="text-(--encre) font-medium"> (Partager → Sur l&apos;écran d&apos;accueil)</span>.
        </span>
      </div>
    )
  }

  if (state === 'denied') {
    return (
      <div className={`text-xs text-amber-800 bg-amber-50 px-4 py-2.5 rounded-xl flex items-center gap-2 ${className}`}>
        <BellOff className="w-4 h-4 shrink-0" />
        <span>Notifications bloquées dans les paramètres de votre navigateur.</span>
      </div>
    )
  }

  if (state === 'granted') {
    return (
      <div className={`flex items-center justify-between text-xs text-emerald-800 bg-emerald-50 px-3.5 py-2.5 rounded-xl border border-emerald-100 ${className}`}>
        <span className="flex items-center gap-2 font-medium">
          <BellRing className="w-4 h-4 text-emerald-600 shrink-0" />
          Notifications activées
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            await unsubscribeFromPush()
            const next = await checkPushState()
            setState(next)
            setBusy(false)
          }}
          className="text-[11px] text-gray-500 hover:text-red-600 transition-colors underline ml-2 shrink-0 disabled:opacity-50"
        >
          {busy ? '...' : 'Désactiver'}
        </button>
      </div>
    )
  }

  // state === 'default'
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        const ok = await requestPushPermissionAndSubscribe()
        if (ok) {
          setState('granted')
        } else {
          const next = await checkPushState()
          setState(next)
        }
        setBusy(false)
      }}
      className={`flex items-center justify-center gap-2 w-full text-left text-xs font-semibold text-(--vert-baol-fonce) bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50 ${className}`}
    >
      <Bell className="w-4 h-4 shrink-0" />
      <span>{busy ? 'Activation en cours...' : 'Activer les notifications'}</span>
    </button>
  )
}
