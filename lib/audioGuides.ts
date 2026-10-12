export type GuideId = 1 | 2 | 3

export interface AudioGuideConfig {
  id: GuideId
  src: string
  step: GuideId
  title: string
}

export const TOTAL_STEPS = 3
export const LABEL_DEFAULT = 'Écouter en wolof'

export const AUDIO_GUIDES: Record<GuideId, AudioGuideConfig> = {
  1: {
    id: 1,
    src: '/audio/guide-1-accueil.mp3',
    step: 1,
    title: 'Créer mon compte',
  },
  2: {
    id: 2,
    src: '/audio/guide-2-connecte.mp3',
    step: 2,
    title: 'Commander et payer',
  },
  3: {
    id: 3,
    src: '/audio/guide-3-apres-commande.mp3',
    step: 3,
    title: 'Suivre ma commande',
  },
}
