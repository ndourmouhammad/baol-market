'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { ShieldCheck, ShoppingBag, Bell } from 'lucide-react'

const ONBOARDING_KEY = 'baol-market-onboarding-done'
const SPLASH_SESSION_KEY = 'baol-splash-seen'

interface SlideData {
  title: string
  text: string
  Icon: typeof ShieldCheck
}

const SLIDES: SlideData[] = [
  {
    title: 'Des produits vérifiés',
    text: 'Notre équipe contrôle chaque produit avant sa mise en ligne. Vous recevez exactement ce que vous voyez.',
    Icon: ShieldCheck,
  },
  {
    title: 'Commandez et payez en ligne',
    text: 'Choisissez vos produits, indiquez votre zone de livraison, puis payez en toute sécurité.',
    Icon: ShoppingBag,
  },
  {
    title: 'Suivez votre commande',
    text: 'Une notification à chaque étape, de la préparation jusqu\'à la livraison.',
    Icon: Bell,
  },
]

function shouldShowOnboarding(pathname: string): boolean {
  if (pathname !== '/') return false
  if (typeof window === 'undefined') return false

  try {
    const standalone =
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    const forced = new URLSearchParams(window.location.search).get('lancement') === '1'

    if (!standalone && !forced) return false
    if (forced) return true

    const done = localStorage.getItem(ONBOARDING_KEY)
    return !done
  } catch {
    return false
  }
}

export default function AppLaunch() {
  const pathname = usePathname()
  const [splashMounted, setSplashMounted] = useState(true)
  const [splashFading, setSplashFading] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingFading, setOnboardingFading] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const sliderRef = useRef<HTMLDivElement>(null)
  const primaryBtnRef = useRef<HTMLButtonElement>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_KEY, '1')
    } catch {
      // stockage indisponible ignoré
    }
    setOnboardingFading(true)
    setTimeout(() => {
      setShowOnboarding(false)
      setOnboardingFading(false)
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus?.()
      } else {
        const mainEl = document.querySelector('main')
        if (mainEl instanceof HTMLElement) {
          mainEl.focus?.()
        }
      }
    }, 300)
  }, [])

  const handleNext = useCallback(() => {
    setCurrentStep((prevStep) => {
      if (prevStep < SLIDES.length - 1) {
        const nextIndex = prevStep + 1
        if (sliderRef.current) {
          sliderRef.current.scrollTo({
            left: nextIndex * sliderRef.current.offsetWidth,
            behavior: 'smooth',
          })
        }
        return nextIndex
      } else {
        handleDismiss()
        return prevStep
      }
    })
  }, [handleDismiss])

  const handlePrev = useCallback(() => {
    setCurrentStep((prevStep) => {
      if (prevStep > 0) {
        const prevIndex = prevStep - 1
        if (sliderRef.current) {
          sliderRef.current.scrollTo({
            left: prevIndex * sliderRef.current.offsetWidth,
            behavior: 'smooth',
          })
        }
        return prevIndex
      }
      return prevStep
    })
  }, [])

  // Gestion du splash et de l'enchaînement avec la présentation
  useEffect(() => {
    // Si lancement forcé (?lancement=1), réinitialiser les clés pour faciliter les tests
    try {
      if (new URLSearchParams(window.location.search).get('lancement') === '1') {
        localStorage.removeItem(ONBOARDING_KEY)
        sessionStorage.removeItem(SPLASH_SESSION_KEY)
      }
    } catch {
      // ignoré
    }

    const isSplash =
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('show-splash')

    let splashTimer: ReturnType<typeof setTimeout> | null = null
    let removeTimer: ReturnType<typeof setTimeout> | null = null

    if (isSplash) {
      splashTimer = setTimeout(() => {
        setSplashFading(true)
        removeTimer = setTimeout(() => {
          document.documentElement.classList.remove('show-splash')
          setSplashMounted(false)
          if (shouldShowOnboarding(pathname)) {
            setShowOnboarding(true)
          }
        }, 300)
      }, 1500)
    } else {
      // Si le splash n'a pas été déclenché, vérifier la présentation en différé
      splashTimer = setTimeout(() => {
        if (shouldShowOnboarding(pathname)) {
          setShowOnboarding(true)
        }
      }, 0)
    }

    return () => {
      if (splashTimer) clearTimeout(splashTimer)
      if (removeTimer) clearTimeout(removeTimer)
    }
  }, [pathname])

  // Bloquer le défilement de la page pendant l'affichage de l'onboarding
  useEffect(() => {
    if (showOnboarding) {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'

      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [showOnboarding])

  // Positionner le focus sur le bouton principal de la présentation
  useEffect(() => {
    if (showOnboarding && primaryBtnRef.current) {
      primaryBtnRef.current.focus()
    }
  }, [showOnboarding, currentStep])

  // Raccourcis clavier (Échap, Flèches Gauche/Droite)
  useEffect(() => {
    if (!showOnboarding) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleDismiss()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrev()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [showOnboarding, handleDismiss, handleNext, handlePrev])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    if (!target.offsetWidth) return
    const index = Math.round(target.scrollLeft / target.offsetWidth)
    if (index !== currentStep && index >= 0 && index < SLIDES.length) {
      setCurrentStep(index)
    }
  }

  const goToSlide = (index: number) => {
    setCurrentStep(index)
    if (sliderRef.current) {
      sliderRef.current.scrollTo({
        left: index * sliderRef.current.offsetWidth,
        behavior: 'smooth',
      })
    }
  }

  return (
    <>
      {/* Script inline d'activation immédiate sans clignotement */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var s=(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||(navigator.standalone===true);var f=new URLSearchParams(window.location.search).get('lancement')==='1';if(f){document.documentElement.classList.add('show-splash');}else if(s&&!sessionStorage.getItem('baol-splash-seen')){document.documentElement.classList.add('show-splash');sessionStorage.setItem('baol-splash-seen','1');}}catch(e){}})();`,
        }}
      />

      {/* Styles autonomes du splash screen et de son filet de sécurité 100% CSS */}
      <style>{`
        #app-splash {
          display: none;
          position: fixed;
          inset: 0;
          z-index: 120;
          background-color: var(--vert-baol-fonce, #005A22);
          align-items: center;
          justify-content: center;
          flex-direction: column;
          color: #ffffff;
          user-select: none;
          -webkit-user-select: none;
          padding-top: max(16px, env(safe-area-inset-top, 16px));
          padding-bottom: max(16px, env(safe-area-inset-bottom, 16px));
          padding-left: max(16px, env(safe-area-inset-left, 16px));
          padding-right: max(16px, env(safe-area-inset-right, 16px));
          transition: opacity 300ms ease-out;
        }

        html.show-splash #app-splash {
          display: flex;
          animation: splashAutoDismiss 0.3s ease-out 1.9s forwards;
        }

        #app-splash.splash-fading {
          opacity: 0 !important;
          pointer-events: none !important;
        }

        @keyframes splashAutoDismiss {
          to {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
          }
        }

        .splash-content-anim {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 340px;
          animation: splashEnter 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes splashEnter {
          from {
            opacity: 0;
            transform: scale(0.92);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .splash-loader-dots {
          display: flex;
          gap: 8px;
          margin-top: 2.25rem;
        }

        .splash-loader-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: rgba(255, 255, 255, 0.7);
          animation: splashPulse 1.2s infinite ease-in-out;
        }

        .splash-loader-dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .splash-loader-dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes splashPulse {
          0%, 80%, 100% {
            transform: scale(0.7);
            opacity: 0.4;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          html.show-splash #app-splash {
            animation: splashAutoDismiss 0.01s linear 2.2s forwards;
          }
          .splash-content-anim,
          .splash-loader-dot {
            animation: none !important;
            transform: none !important;
          }
        }

        /* Masquage de la barre de défilement pour la présentation */
        .onboarding-slider {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .onboarding-slider::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Écran de démarrage (Splash Screen vert de marque) */}
      {splashMounted && (
        <div
          id="app-splash"
          className={splashFading ? 'splash-fading' : ''}
          aria-hidden="true"
        >
          <div className="splash-content-anim">
            <div className="mb-6 flex justify-center">
              <Image
                src="/logo-bm.png"
                alt="Baol Market"
                width={180}
                height={60}
                className="brightness-0 invert opacity-95 object-contain"
                priority
              />
            </div>
            <p className="text-base text-white/85 text-center leading-relaxed">
              Des produits vérifiés, livrés en confiance.
            </p>
            <div className="splash-loader-dots" aria-hidden="true">
              <div className="splash-loader-dot" />
              <div className="splash-loader-dot" />
              <div className="splash-loader-dot" />
            </div>
          </div>
        </div>
      )}

      {/* Présentation en 3 écrans (Onboarding) */}
      {showOnboarding && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Présentation de Baol Market"
          className={`fixed inset-0 z-110 flex flex-col bg-(--vert-baol-fonce) text-white transition-opacity duration-300 ${
            onboardingFading ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ backgroundColor: 'var(--vert-baol-fonce, #005A22)' }}
        >
          {/* Annonce d'accessibilité */}
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            Écran {currentStep + 1} sur {SLIDES.length} : {SLIDES[currentStep].title}
          </div>

          {/* En-tête avec bouton Passer */}
          <div
            className="w-full flex justify-end px-4 py-3 shrink-0"
            style={{
              paddingTop: 'max(12px, env(safe-area-inset-top, 12px))',
              paddingRight: 'max(16px, env(safe-area-inset-right, 16px))',
            }}
          >
            <button
              type="button"
              onClick={handleDismiss}
              className="min-h-12 px-4 py-2 text-sm font-medium text-white/90 hover:text-white rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
            >
              Passer
            </button>
          </div>

          {/* Carrousel 3 écrans (défilement horizontal avec accroche) */}
          <div
            ref={sliderRef}
            onScroll={handleScroll}
            className="onboarding-slider grow flex overflow-x-auto snap-x snap-mandatory items-center"
          >
            {SLIDES.map((slide, index) => {
              const Icon = slide.Icon
              return (
                <div
                  key={index}
                  className="w-full min-w-full h-full flex flex-col items-center justify-center px-6 text-center snap-start shrink-0"
                  style={{
                    paddingLeft: 'max(24px, env(safe-area-inset-left, 24px))',
                    paddingRight: 'max(24px, env(safe-area-inset-right, 24px))',
                  }}
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/15 flex items-center justify-center mb-6 shrink-0 shadow-xs">
                    <Icon className="w-12 h-12 sm:w-14 sm:h-14 text-white stroke-[1.75]" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 max-w-md">
                    {slide.title}
                  </h2>
                  <p className="text-base sm:text-lg text-white/85 max-w-sm sm:max-w-md leading-relaxed">
                    {slide.text}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Pied de présentation : pastilles + bouton d'action */}
          <div
            className="w-full shrink-0 flex flex-col items-center gap-6 px-6 pt-2 pb-6"
            style={{
              paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
              paddingLeft: 'max(20px, env(safe-area-inset-left, 20px))',
              paddingRight: 'max(20px, env(safe-area-inset-right, 20px))',
            }}
          >
            {/* Pastilles de position */}
            <div className="flex items-center gap-2" role="tablist" aria-label="Progression de la présentation">
              {SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={idx === currentStep}
                  aria-label={`Aller à l'écran ${idx + 1}`}
                  onClick={() => goToSlide(idx)}
                  className="min-h-8 min-w-8 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full cursor-pointer"
                >
                  <span
                    className={`block h-2 rounded-full transition-all duration-300 ${
                      idx === currentStep
                        ? 'w-7 bg-white'
                        : 'w-2 bg-white/40 hover:bg-white/60'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Bouton d'action principal */}
            <div className="w-full max-w-xs">
              <button
                ref={primaryBtnRef}
                type="button"
                onClick={handleNext}
                className="w-full h-12 min-h-12 bg-white text-[#005A22] font-semibold text-base rounded-xl shadow-md hover:bg-white/95 active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#005A22]"
              >
                {currentStep === SLIDES.length - 1 ? 'Commencer' : 'Suivant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
