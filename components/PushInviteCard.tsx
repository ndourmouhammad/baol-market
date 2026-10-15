'use client'

import { Bell, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { usePushInvite } from '@/lib/pushInvite'

export default function PushInviteCard() {
  const { eligible, status, enable } = usePushInvite({ respectCooldown: false })

  // Rien n'est affiché si le client n'est pas éligible (sauf après une activation dans cette session)
  if (!eligible && status === 'idle') {
    return null
  }

  const handleEnable = async () => {
    await enable()
  }

  return (
    <div
      role="region"
      aria-label="Notifications de commande"
      className="w-full max-w-sm mx-auto text-left rounded-2xl p-4 border border-(--vert-baol)/20 bg-(--vert-baol)/8 shadow-xs select-none"
    >
      {/* Statut : Activé */}
      {status === 'enabled' && (
        <div className="flex items-center gap-3.5 py-1" aria-live="polite">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-(--encre)">Notifications activées</h3>
            <p className="text-xs text-(--gris-texte) mt-0.5">
              Vous serez notifié à chaque étape de votre commande.
            </p>
          </div>
        </div>
      )}

      {/* Statut : Bloqué dans le navigateur */}
      {status === 'denied' && (
        <div aria-live="polite" className="flex items-start gap-3.5 py-1">
          <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-(--encre)">Notifications bloquées</h3>
            <p className="text-xs text-(--gris-texte) mt-1 leading-relaxed">
              Vous pourrez les réactiver dans les réglages de votre navigateur.
            </p>
          </div>
        </div>
      )}

      {/* Statut : Erreur technique */}
      {status === 'error' && (
        <div aria-live="polite" className="flex items-start gap-3.5 py-1">
          <div className="w-12 h-12 rounded-full bg-red-100 text-(--rouge-erreur) flex items-center justify-center shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-(--encre)">Activation impossible</h3>
            <p className="text-xs text-(--gris-texte) mt-1 leading-relaxed">
              Impossible d&apos;activer pour le moment.
            </p>
          </div>
        </div>
      )}

      {/* Statut par défaut / Chargement */}
      {(status === 'idle' || status === 'loading') && (
        <div>
          <div className="flex items-center gap-3.5">
            {/* Rond vert 56px */}
            <div className="w-14 h-14 rounded-full bg-(--vert-baol) text-white flex items-center justify-center shrink-0 shadow-md">
              <Bell className="w-6 h-6" />
            </div>

            {/* Textes descriptifs */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-(--encre) leading-tight">
                Suivez votre commande en direct
              </h3>
              <p className="text-xs text-(--gris-texte) mt-1 leading-snug">
                Activez les notifications pour savoir quand elle est préparée, confirmée et prête.
              </p>
            </div>
          </div>

          {/* Grand bouton d'action */}
          <button
            type="button"
            onClick={handleEnable}
            disabled={status === 'loading'}
            className="w-full mt-3.5 bg-(--vert-baol) hover:bg-(--vert-baol-fonce) text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-colors min-h-[44px] flex items-center justify-center gap-1.5 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) focus-visible:ring-offset-1"
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Activation...</span>
              </>
            ) : (
              <span>Activer les notifications</span>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
