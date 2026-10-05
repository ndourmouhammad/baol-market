'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, Info, Trash2, X } from 'lucide-react'
import { Button } from '@/components/Button'

export type ConfirmModalVariant = 'danger' | 'warning' | 'info'

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  /** Main body text or JSX */
  children: React.ReactNode
  /** Text on the confirm button (default: "Confirmer") */
  confirmLabel?: string
  /** Text on the cancel button (default: "Annuler") */
  cancelLabel?: string
  /** Visual variant drives icon + confirm button color */
  variant?: ConfirmModalVariant
  /** Show a loading state on the confirm button */
  loading?: boolean
}

const variantConfig: Record<ConfirmModalVariant, {
  icon: React.ReactNode
  iconBg: string
  buttonVariant: 'danger' | 'primary' | 'secondary'
}> = {
  danger: {
    icon: <Trash2 className="w-6 h-6 text-red-600" />,
    iconBg: 'bg-red-100',
    buttonVariant: 'danger',
  },
  warning: {
    icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
    iconBg: 'bg-amber-100',
    buttonVariant: 'primary',
  },
  info: {
    icon: <Info className="w-6 h-6 text-(--vert-baol)" />,
    iconBg: 'bg-(--vert-baol)/10',
    buttonVariant: 'primary',
  },
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'info',
  loading = false,
}: ConfirmModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Trap focus & close on Escape
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    // Focus the panel
    panelRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose, loading])

  if (!open) return null

  const config = variantConfig[variant]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={loading ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-body"
        tabIndex={-1}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in focus:outline-none"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 pt-7">
          {/* Icon + Title */}
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-11 h-11 rounded-xl ${config.iconBg} flex items-center justify-center`}>
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 id="confirm-modal-title" className="text-lg font-bold text-(--encre) leading-snug">
                {title}
              </h3>
              <div id="confirm-modal-body" className="mt-2 text-sm text-(--gris-texte) leading-relaxed">
                {children}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50/80 border-t border-gray-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={config.buttonVariant}
            size="sm"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
