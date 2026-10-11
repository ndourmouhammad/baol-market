import Link from 'next/link'
import Image from 'next/image'
import { LayoutGrid, type LucideIcon, Shirt, Smartphone, Sofa, Utensils, Gem, Baby, Dumbbell, Laptop, Car, BookOpen, Palette, Leaf, PawPrint, Music, Wrench, Sparkles } from 'lucide-react'

type Category = { id: string; name: string; slug: string; image_url: string | null }

/**
 * Petite table de correspondance : si le nom de la catégorie contient l'un de ces mots clés,
 * on utilise l'icône correspondante. Sinon, on tombe sur LayoutGrid.
 */
const ICON_HINTS: [RegExp, LucideIcon][] = [
  [/mode|vêtement|habit|textile/i, Shirt],
  [/phone|téléphone|mobile|smartphone/i, Smartphone],
  [/maison|meuble|décor|intérieur/i, Sofa],
  [/cuisine|aliment|nourriture|épicerie/i, Utensils],
  [/bijou|accessoire|montre/i, Gem],
  [/bébé|enfant|jouet/i, Baby],
  [/sport|fitness/i, Dumbbell],
  [/informatique|ordinateur|pc/i, Laptop],
  [/auto|moto|véhicule/i, Car],
  [/livre|papeterie|bureau/i, BookOpen],
  [/art|peinture|loisir/i, Palette],
  [/bio|nature|jardin/i, Leaf],
  [/animal|animalerie/i, PawPrint],
  [/musique|son|audio/i, Music],
  [/outil|bricolage/i, Wrench],
  [/beauté|cosmétique|soin/i, Sparkles],
]

function iconForCategory(name: string): LucideIcon {
  for (const [pattern, icon] of ICON_HINTS) {
    if (pattern.test(name)) return icon
  }
  return LayoutGrid
}

// Palette de couleurs de fond pastels pour les pastilles (tournante)
const BG_COLORS = [
  'bg-emerald-50 text-emerald-600',
  'bg-orange-50 text-orange-500',
  'bg-sky-50 text-sky-600',
  'bg-violet-50 text-violet-500',
  'bg-rose-50 text-rose-500',
  'bg-amber-50 text-amber-600',
  'bg-teal-50 text-teal-600',
  'bg-indigo-50 text-indigo-500',
]

/**
 * Grille de pastilles rondes avec icône ou image + nom de catégorie.
 * Mobile : 4 colonnes — Desktop : 4 à 6 colonnes selon le nombre de catégories.
 */
export function CategoryGrid({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-8" aria-label="Catégories">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-(--encre)">Catégories</h2>
        <Link
          href="/produits"
          className="text-xs sm:text-sm font-semibold text-(--vert-baol) hover:text-(--vert-baol-fonce) transition-colors"
        >
          Tout voir
        </Link>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4">
        {categories.map((cat, i) => {
          const Icon = iconForCategory(cat.name)
          const colorClass = BG_COLORS[i % BG_COLORS.length]

          return (
            <Link
              key={cat.id}
              href={`/categorie/${cat.slug}`}
              className="flex flex-col items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded-xl p-1"
            >
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 rounded-full flex items-center justify-center overflow-hidden shadow-sm border border-gray-100 group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-200 ${cat.image_url ? '' : colorClass}`}
              >
                {cat.image_url ? (
                  <Image
                    src={cat.image_url}
                    alt={cat.name}
                    width={72}
                    height={72}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                )}
              </div>
              <span className="text-[11px] sm:text-xs font-medium text-(--encre) text-center leading-tight line-clamp-2 max-w-[72px] sm:max-w-[80px] group-hover:text-(--vert-baol) transition-colors">
                {cat.name}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
