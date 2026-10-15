'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { usePushInvite } from '@/lib/pushInvite'

const INITIAL_DELAY_MS = 20000 // 20 secondes
const RETRY_INTERVAL_MS = 10000 // 10 secondes
const MAX_BANNER_RETRIES = 6

function isAllowedPath(pathname: string): boolean {
  const p = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname

  // Routes strictement interdites
  if (
    p.startsWith('/admin') ||
    p === '/login' ||
    p === '/signup' ||
    p === '/panier' ||
    p === '/commande' ||
    p.startsWith('/order/') ||
    p.startsWith('/paiement') ||
    p === '/cgv' ||
    p === '/mentions-legales'
  ) {
    return false
  }

  // Routes autorisées
  if (p === '/' || p === '/produits' || p === '/ventes-flash' || p === '/orders') {
    return true
  }
  if (p.startsWith('/categorie/') || p.startsWith('/produit/')) {
    return true
  }

  return false
}

export default function PushInvite() {
  const pathname = usePathname()
  const { eligible, status, enable, dismiss } = usePushInvite({ respectCooldown: true })
  const [visible, setVisible] = useState(false)

  // Timer d'apparition après 20 secondes, avec vérification de la bannière d'installation
  useEffect(() => {
    // Si la route n'est pas autorisée ou si l'utilisateur n'est pas éligible, ne rien planifier
    if (!isAllowedPath(pathname) || !eligible) {
      return
    }

    let retryCount = 0
    let retryInterval: NodeJS.Timeout | null = null

    const initialTimer = setTimeout(() => {
      const checkAndShow = () => {
        const installBanner = document.querySelector('[aria-label="Installation de l\'application"]')
        if (!installBanner) {
          setVisible(true)
          if (retryInterval) clearInterval(retryInterval)
          return true
        }
        return false
      }

      if (!checkAndShow()) {
        retryInterval = setInterval(() => {
          retryCount += 1
          const shown = checkAndShow()
          if (shown || retryCount >= MAX_BANNER_RETRIES) {
            if (retryInterval) clearInterval(retryInterval)
          }
        }, RETRY_INTERVAL_MS)
      }
    }, INITIAL_DELAY_MS)

    return () => {
      clearTimeout(initialTimer)
      if (retryInterval) clearInterval(retryInterval)
    }
  }, [pathname, eligible])

  // Disparition automatique après 3 secondes en cas d'activation réussie
  useEffect(() => {
    if (status === 'enabled') {
      const timer = setTimeout(() => {
        setVisible(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [status])

  if (!visible || !isAllowedPath(pathname)) {
    return null
  }

  const handleDismiss = () => {
    dismiss()
    setVisible(false)
  }

  const handleDismissDenied = () => {
    dismiss(true) // Enregistre dismissCount à 3 pour ne plus jamais proposer
    setVisible(false)
  }

  const handleEnable = async () => {
    await enable()
  }

  return (
    <aside
      role="region"
      aria-label="Notifications de commande"
      className="fixed z-40 bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xl shadow-black/10 transition-all bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-4 right-4 md:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] md:left-auto md:right-6 md:max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300 motion-reduce:animate-none"
    >
      {/* Statut : Activé */}
      {status === 'enabled' && (
        <div className="flex items-center gap-3 py-1" aria-live="polite">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-(--encre)">Notifications activées</h3>
            <p className="text-xs text-(--gris-texte) mt-0.5">Vous recevrez les mises à jour de vos commandes en direct.</p>
          </div>
        </div>
      )}

      {/* Statut : Bloqué dans le navigateur */}
      {status === 'denied' && (
        <div aria-live="polite">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-(--encre)">Notifications bloquées</h3>
              <p className="text-xs text-(--gris-texte) mt-1 leading-relaxed">
                Vous pourrez les réactiver dans les réglages de votre navigateur.
              </p>
            </div>
          </div>
          <div className="flex justify-end mt-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={handleDismissDenied}
              className="text-xs font-semibold px-4 py-2 text-(--encre) hover:bg-gray-100 rounded-xl transition-colors min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol)"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Statut : Erreur technique */}
      {status === 'error' && (
        <div aria-live="polite">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-(--rouge-erreur) flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-(--encre)">Activation impossible</h3>
              <p className="text-xs text-(--gris-texte) mt-1 leading-relaxed">
                Impossible d&apos;activer pour le moment.
              </p>
            </div>
          </div>
          <div className="flex justify-end mt-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs font-semibold px-4 py-2 text-(--encre) hover:bg-gray-100 rounded-xl transition-colors min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol)"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Statut par défaut / Chargement */}
      {(status === 'idle' || status === 'loading') && (
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-(--vert-baol)/10 flex items-center justify-center shrink-0 text-(--vert-baol)">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-(--encre)">Suivez vos commandes en direct</h3>
                <p className="text-xs text-(--gris-texte) mt-0.5 leading-relaxed">
                  Recevez une notification à chaque étape : paiement confirmé, préparation, livraison.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Fermer"
              className="text-(--gris-texte) hover:text-(--encre) p-1 rounded-lg transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={handleDismiss}
              disabled={status === 'loading'}
              className="text-xs font-semibold px-3 py-2 text-(--gris-texte) hover:text-(--encre) hover:bg-gray-100 rounded-xl transition-colors min-h-[44px] flex items-center justify-center disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol)"
            >
              Plus tard
            </button>
            <button
              type="button"
              onClick={handleEnable}
              disabled={status === 'loading'}
              className="text-xs font-bold px-4 py-2 bg-(--vert-baol) hover:bg-(--vert-baol-fonce) text-white rounded-xl shadow-xs transition-colors min-h-[44px] flex items-center justify-center gap-1.5 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) focus-visible:ring-offset-1"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Activation...</span>
                </>
              ) : (
                <span>Activer</span>
              )}
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
