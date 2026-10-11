'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { syncPushSubscription } from '@/lib/pushClient'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => {
          syncPushSubscription()
        })
        .catch(() => {
          // Enregistrement silencieux sans bruit en cas d'échec
        })
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        syncPushSubscription()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return null
}
