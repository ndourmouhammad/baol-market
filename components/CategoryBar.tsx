import Link from 'next/link'
import { LayoutGrid } from 'lucide-react'

type Category = { id: string; name: string; slug: string; image_url?: string | null }

/**
 * Barre horizontale de catégories texte seule, compacte et sobre.
 * Visible uniquement à partir de l'écran ordinateur (md et plus).
 */
export function CategoryBar({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null

  return (
    <nav aria-label="Catégories" className="hidden md:block border-t border-gray-100/80 bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar py-3">
          <Link
            href="/produits"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-(--encre) hover:text-(--vert-baol) transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:border-(--vert-baol) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded-sm"
          >
            <LayoutGrid className="w-4 h-4 text-(--vert-baol) shrink-0" />
            <span>Tous les produits</span>
          </Link>

          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categorie/${category.slug}`}
              className="text-sm font-medium text-(--gris-texte) hover:text-(--vert-baol) transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:border-(--vert-baol) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded-sm"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
