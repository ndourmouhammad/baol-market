import Image from 'next/image'

type PromoBannerProps = {
  imageUrl: string
  title?: string | null
  description?: string | null
  badge?: string | null
  /** carousel : format large 3:1 — promo : carte carrée */
  variant: 'carousel' | 'promo'
  priority?: boolean
}

/**
 * Une bannière : l'image, avec par-dessus un titre, une description et une étiquette
 * de promo, uniquement s'ils sont renseignés. Utilisée par l'aperçu de l'admin
 * et par la page d'accueil.
 */
export function PromoBanner({ imageUrl, title, description, badge, variant, priority = false }: PromoBannerProps) {
  const hasText = !!(title || description || badge)
  const isCarousel = variant === 'carousel'

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl bg-gray-100 ${
        isCarousel ? 'aspect-[3/1]' : 'aspect-square'
      }`}
    >
      <Image
        src={imageUrl}
        alt={title || (isCarousel ? 'Bannière promotionnelle' : 'Offre promotionnelle')}
        fill
        sizes={isCarousel ? '100vw' : '(max-width: 768px) 50vw, 25vw'}
        className="object-cover"
        priority={priority}
        // Les aperçus d'images choisies sur l'ordinateur (blob:) ne passent pas par l'optimiseur
        unoptimized={imageUrl.startsWith('blob:')}
      />

      {hasText && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
          <div className={`absolute inset-0 flex flex-col justify-end ${isCarousel ? 'p-4 sm:p-8' : 'p-3 sm:p-4'}`}>
            {badge && (
              <span
                className={`self-start mb-2 bg-(--or-senegal) text-(--encre) font-bold rounded-full shadow-sm ${
                  isCarousel ? 'text-xs sm:text-sm px-3 py-1' : 'text-[10px] sm:text-xs px-2.5 py-0.5'
                }`}
              >
                {badge}
              </span>
            )}
            {title && (
              <p
                className={`text-white font-bold leading-tight drop-shadow ${
                  isCarousel ? 'text-lg sm:text-3xl max-w-2xl' : 'text-sm sm:text-base line-clamp-2'
                }`}
              >
                {title}
              </p>
            )}
            {description && (
              <p
                className={`text-white/90 mt-1 ${
                  isCarousel ? 'text-xs sm:text-base max-w-xl line-clamp-2' : 'text-xs line-clamp-2 hidden sm:block'
                }`}
              >
                {description}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
