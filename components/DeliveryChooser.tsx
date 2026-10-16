'use client'

import React, { useId, useMemo, useRef } from 'react'
import { Truck, MapPin, CheckCircle2 } from 'lucide-react'

export type DeliveryMode = 'delivery' | 'self_arranged'

export interface DeliveryChoice {
  mode: DeliveryMode | null
  zoneId: string
}

export interface DeliveryZone {
  id: string
  name: string
  fee: number
  is_variable: boolean
  display_group: string | null
  zone_kind: 'local' | 'region' | string
  sort_order?: number
}

export interface DeliveryChooserProps {
  zones: DeliveryZone[]
  value: DeliveryChoice
  onChange: (choice: DeliveryChoice) => void
}

/**
 * Valide si le choix de remise est complet et cohérent avec la liste des zones.
 */
export function isDeliveryChoiceValid(
  choice: DeliveryChoice | null | undefined,
  zones: { id: string; zone_kind?: string }[]
): boolean {
  if (!choice || !choice.mode) return false

  if (!choice.zoneId) return false
  const zone = zones.find((z) => z.id === choice.zoneId)
  if (!zone) return false

  if (choice.mode === 'delivery') {
    const kind = zone.zone_kind ?? 'local'
    return kind === 'local'
  }

  if (choice.mode === 'self_arranged') {
    return zone.zone_kind === 'region'
  }

  return false
}

/**
 * Calcule les frais de livraison selon le mode choisi.
 * Seul le mode 'delivery' applique les frais de la zone locale.
 */
export function getDeliveryFee(
  choice: DeliveryChoice | null | undefined,
  zones: { id: string; fee: number }[]
): number {
  if (!choice || choice.mode !== 'delivery' || !choice.zoneId) {
    return 0
  }
  const zone = zones.find((z) => z.id === choice.zoneId)
  return zone?.fee ?? 0
}

/**
 * Fournit une description textuelle concise du mode et de la zone sélectionnés.
 */
export function describeDelivery(
  choice: DeliveryChoice | null | undefined,
  zones: { id: string; name: string }[]
): string {
  if (!choice || !choice.mode) return 'Mode de remise non sélectionné'
  const zone = zones.find((z) => z.id === choice.zoneId)

  if (choice.mode === 'delivery') {
    return zone ? `Livraison à Diourbel (${zone.name})` : 'Livraison à Diourbel'
  }
  if (choice.mode === 'self_arranged') {
    return zone ? `Hors Diourbel (${zone.name})` : 'Hors Diourbel'
  }
  return ''
}

const MODES: {
  id: DeliveryMode
  title: string
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  {
    id: 'delivery',
    title: 'Livraison à Diourbel',
    subtitle: 'Un livreur vous apporte votre commande.',
    icon: Truck,
  },
  {
    id: 'self_arranged',
    title: 'Hors Diourbel',
    subtitle: 'Vous organisez votre livraison.',
    icon: MapPin,
  },
]

export function DeliveryChooser({ zones, value, onChange }: DeliveryChooserProps) {
  const localSelectId = useId()
  const regionSelectId = useId()
  const radioRefs = useRef<Array<HTMLDivElement | null>>([])

  // Zones locales pour Diourbel, groupées par display_group
  const localZonesByGroup = useMemo(() => {
    const local = zones.filter((z) => (z.zone_kind ?? 'local') === 'local')
    return local.reduce<Record<string, DeliveryZone[]>>((acc, zone) => {
      const group = zone.display_group ?? 'Autres zones'
      if (!acc[group]) acc[group] = []
      acc[group].push(zone)
      return acc
    }, {})
  }, [zones])

  // Régions hors Diourbel triées par ordre alphabétique du nom
  const regionZones = useMemo(() => {
    return zones
      .filter((z) => z.zone_kind === 'region')
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
  }, [zones])

  const selectedZone = useMemo(() => {
    if (!value.zoneId) return null
    return zones.find((z) => z.id === value.zoneId) ?? null
  }, [zones, value.zoneId])

  const handleSelectMode = (newMode: DeliveryMode) => {
    if (value.mode === newMode) return
    // Changer de mode réinitialise zoneId
    onChange({
      mode: newMode,
      zoneId: '',
    })
  }

  const handleKeyDownRadiogroup = (e: React.KeyboardEvent<HTMLDivElement>, currentIndex: number) => {
    let nextIndex: number | null = null

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      nextIndex = (currentIndex + 1) % MODES.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      nextIndex = (currentIndex - 1 + MODES.length) % MODES.length
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      handleSelectMode(MODES[currentIndex].id)
      return
    }

    if (nextIndex !== null) {
      const targetMode = MODES[nextIndex].id
      handleSelectMode(targetMode)
      radioRefs.current[nextIndex]?.focus()
    }
  }

  const effectiveMode = (value.mode === 'delivery' || value.mode === 'self_arranged') ? value.mode : null

  return (
    <div className="space-y-4">
      {/* Grille des 2 modes */}
      <div
        role="radiogroup"
        aria-label="Mode de remise de la commande"
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {MODES.map((option, index) => {
          const isSelected = effectiveMode === option.id
          const Icon = option.icon
          const tabIndex = effectiveMode === null ? (index === 0 ? 0 : -1) : isSelected ? 0 : -1

          return (
            <div
              key={option.id}
              ref={(el) => {
                radioRefs.current[index] = el
              }}
              role="radio"
              aria-checked={isSelected}
              tabIndex={tabIndex}
              onClick={() => handleSelectMode(option.id)}
              onKeyDown={(e) => handleKeyDownRadiogroup(e, index)}
              className={`relative flex flex-col justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all duration-150 select-none text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) focus-visible:ring-offset-2 ${
                isSelected
                  ? 'border-(--vert-baol) bg-(--vert-baol)/5 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-(--vert-baol) text-white'
                        : 'bg-gray-100 text-(--gris-texte)'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'border-(--vert-baol) bg-(--vert-baol)'
                        : 'border-gray-300 bg-white'
                    }`}
                    aria-hidden="true"
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>

                <h3 className="font-bold text-base text-(--encre) mb-1 leading-snug">
                  {option.title}
                </h3>
                <p className="text-xs text-(--gris-texte) leading-relaxed">
                  {option.subtitle}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Contenu conditionnel selon le mode choisi */}

      {/* 1. Livraison à Diourbel : Menu des quartiers & Frais */}
      {effectiveMode === 'delivery' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-3 animate-in fade-in duration-200">
          <label htmlFor={localSelectId} className="block text-sm font-bold text-(--encre)">
            Quartier de livraison à Diourbel
          </label>
          <select
            id={localSelectId}
            value={value.zoneId}
            onChange={(e) => onChange({ mode: 'delivery', zoneId: e.target.value })}
            onKeyDown={(e) => e.stopPropagation()}
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white text-(--encre) text-sm focus:outline-none focus:ring-2 focus:ring-(--vert-baol) focus:border-(--vert-baol)"
          >
            <option value="" disabled>
              Choisissez votre quartier
            </option>
            {Object.entries(localZonesByGroup).map(([group, groupZones]) => (
              <optgroup key={group} label={group} className="font-bold">
                {groupZones.map((z) => (
                  <option key={z.id} value={z.id} className="font-normal">
                    {z.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          {selectedZone && (
            <div className="flex items-center gap-2 pt-1 text-sm font-semibold text-(--vert-baol-fonce) bg-(--vert-baol)/10 border border-(--vert-baol)/20 rounded-xl p-3">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-(--vert-baol)" />
              <span>
                Frais de livraison : {selectedZone.fee.toLocaleString('fr-SN')} FCFA
              </span>
            </div>
          )}
        </div>
      )}

      {/* 2. Hors Diourbel : Menu des régions */}
      {effectiveMode === 'self_arranged' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-3 animate-in fade-in duration-200">
          <label htmlFor={regionSelectId} className="block text-sm font-bold text-(--encre)">
            Région de destination
          </label>
          <select
            id={regionSelectId}
            value={value.zoneId}
            onChange={(e) => onChange({ mode: 'self_arranged', zoneId: e.target.value })}
            onKeyDown={(e) => e.stopPropagation()}
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white text-(--encre) text-sm focus:outline-none focus:ring-2 focus:ring-(--vert-baol) focus:border-(--vert-baol)"
          >
            <option value="" disabled>
              Choisissez votre région
            </option>
            {regionZones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>

          <div className="flex items-start gap-2 pt-1 text-xs sm:text-sm text-(--vert-baol-fonce) bg-(--vert-baol)/10 border border-(--vert-baol)/20 rounded-xl p-3">
            <MapPin className="w-4 h-4 shrink-0 text-(--vert-baol) mt-0.5" />
            <p className="leading-relaxed">
              <strong className="font-semibold">Aucun frais.</strong> Vous gérez vous-même la livraison depuis Diourbel.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
