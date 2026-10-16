'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { ShieldCheck, ShoppingBag, Bell } from 'lucide-react'

const ONBOARDING_KEY = 'baol-market-onboarding-done'

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
    text: 'Choisissez vos produits, indiquez si vous voulez la livraison ou le retrait, puis payez en toute sécurité.',
    Icon: ShoppingBag,
  },
  {
    title: 'Suivez votre commande',
    text: 'Une notification à chaque étape, de la préparation jusqu\'à la livraison ou au retrait.',
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

  // Détection et affichage direct du nouvel onboarding au premier lancement
  useEffect(() => {
    const timer = setTimeout(() => {
      if (shouldShowOnboarding(pathname)) {
        setShowOnboarding(true)
      }
    }, 0)

    return () => {
      clearTimeout(timer)
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
      {/* Styles autonomes pour la présentation */}
      <style>{`
        .onboarding-slider {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .onboarding-slider::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Présentation en 3 écrans (Onboarding direct au premier lancement) */}
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
