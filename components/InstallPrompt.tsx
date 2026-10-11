'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Download, Share, X } from 'lucide-react'

const DISMISS_KEY = 'baol-market-install-dismissed'
const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000 // 14 jours

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [platform, setPlatform] = useState<'prompt' | 'ios' | null>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // 1. Vérification des routes exclues
    if (
      pathname.startsWith('/admin') ||
      pathname === '/login' ||
      pathname === '/signup' ||
      pathname.startsWith('/paiement')
    ) {
      return
    }

    // 2. Vérifier si l'application est déjà installée
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true

    if (isStandalone) return

    // 3. Vérifier si l'utilisateur a cliqué sur « Plus tard » il y a moins de 14 jours
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY)
      if (dismissed) {
        const timestamp = parseInt(dismissed, 10)
        if (Date.now() - timestamp < DISMISS_DURATION_MS) {
          return
        }
      }
    } catch {
      // localStorage indisponible ou bloqué : on continue
    }

    // 4. Détecter iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIos = /iphone|ipad|ipod/.test(userAgent)
    // Ne pas afficher les instructions iOS si c'est Chrome/Firefox sur iOS ou un webview
    const isIosSafari = isIos && !/crios|fxios|optios/.test(userAgent)

    // Écouter l'événement beforeinstallprompt pour Chrome / Android / Edge / Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // 5. Afficher la bannière seulement après 8 secondes de navigation
    const timer = setTimeout(() => {
      if (isIosSafari) {
        setPlatform('ios')
        setVisible(true)
      } else {
        // Sur Android/Desktop, on affiche dès que le prompt est prêt ou a été capturé
        setPlatform('prompt')
        setVisible(true)
      }
    }, 8000)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      clearTimeout(timer)
    }
  }, [pathname])

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString())
    } catch {
      // Ignorer
    }
    setVisible(false)
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      handleDismiss()
      return
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setVisible(false)
      } else {
        handleDismiss()
      }
    } catch {
      handleDismiss()
    } finally {
      setDeferredPrompt(null)
    }
  }

  // Ne rien afficher si masqué ou si sur une page exclue
  if (
    !visible ||
    pathname.startsWith('/admin') ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/paiement')
  ) {
    return null
  }

  // Si on est sur Desktop/Android sans événement de prompt capturé, ne pas afficher une bannière inutile
  if (platform === 'prompt' && !deferredPrompt) {
    return null
  }

  return (
    <aside
      aria-label="Installation de l'application"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-40 bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xl shadow-black/10 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-(--vert-baol)/10 flex items-center justify-center shrink-0 text-(--vert-baol)">
            {platform === 'ios' ? <Share className="w-5 h-5" /> : <Download className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-(--encre)">Installer Baol Market</h3>
            {platform === 'ios' ? (
              <p className="text-xs text-(--gris-texte) mt-0.5 leading-relaxed">
                Touchez <span className="font-semibold text-(--encre)">Partager</span> dans Safari, puis <span className="font-semibold text-(--encre)">« Sur l&apos;écran d&apos;accueil »</span> pour ajouter l&apos;application.
              </p>
            ) : (
              <p className="text-xs text-(--gris-texte) mt-0.5 leading-relaxed">
                Ajoutez l&apos;application sur votre écran d&apos;accueil pour un accès instantané et vos notifications de commande.
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Fermer la suggestion d'installation"
          className="text-(--gris-texte) hover:text-(--encre) p-1 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
        <button
          onClick={handleDismiss}
          aria-label="Reporter l'installation à plus tard"
          className="text-xs font-semibold px-3 py-1.5 text-(--gris-texte) hover:text-(--encre) hover:bg-gray-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol)"
        >
          Plus tard
        </button>
        {platform === 'prompt' && (
          <button
            onClick={handleInstallClick}
            aria-label="Installer l'application Baol Market"
            className="text-xs font-bold px-3.5 py-1.5 bg-(--vert-baol) hover:bg-(--vert-baol-fonce) text-white rounded-lg shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) focus-visible:ring-offset-1"
          >
            Installer
          </button>
        )}
      </div>
    </aside>
  )
}
