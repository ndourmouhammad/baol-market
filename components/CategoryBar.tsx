import Link from 'next/link'
import Image from 'next/image'
import { ShoppingBag, LayoutGrid } from 'lucide-react'

type Category = { id: string; name: string; slug: string; image_url: string | null }

const itemClass =
  'group flex flex-col items-center gap-2 w-20 sm:w-24 shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol)'
const circleClass =
  'relative w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-full overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:border-(--vert-baol) group-hover:shadow-md transition-all'
const labelClass =
  'text-xs sm:text-sm font-medium text-(--encre) text-center leading-tight line-clamp-2 group-hover:text-(--vert-baol)'

/** Barre horizontale de catégories (défilable au doigt sur mobile), sous l'en-tête. */
export function CategoryBar({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null

  return (
    <nav aria-label="Catégories" className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-4">
          <Link href="/produits" className={itemClass}>
            <span className={`${circleClass} bg-(--vert-baol)/10 text-(--vert-baol)`}>
              <LayoutGrid className="w-6 h-6" />
            </span>
            <span className={labelClass}>Tous les produits</span>
          </Link>

          {categories.map((category) => (
            <Link key={category.id} href={`/categorie/${category.slug}`} className={itemClass}>
              <span className={circleClass}>
                {category.image_url ? (
                  <Image
                    src={category.image_url}
                    alt=""
                    fill
                    sizes="72px"
                    unoptimized={true}
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <ShoppingBag className="w-6 h-6" />
                )}
              </span>
              <span className={labelClass}>{category.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
