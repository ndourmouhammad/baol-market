'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search, X } from 'lucide-react'

type Category = { id: string; name: string; slug: string }

interface CategoryFilterProps {
  categories: Category[];
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

export default function CategoryFilter({ categories, searchQuery = '', onSearchChange }: CategoryFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeSlug = searchParams.get('categorie') ?? ''

  function selectCategory(slug: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (slug) {
      params.set('categorie', slug)
    } else {
      params.delete('categorie')
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <div className="py-4 border-b border-gray-100 mb-8 bg-(--fond)/95 backdrop-blur-sm sticky top-[4rem] md:top-[5rem] z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

          {/* Scrollable Categories */}
          <div className="grow overflow-x-auto no-scrollbar">
            <div className="flex gap-2 min-w-max pb-2 md:pb-0 items-center">
              <button
                onClick={() => selectCategory('')}
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) ${
                  activeSlug === ''
                    ? 'bg-(--vert-baol) text-white shadow-sm'
                    : 'bg-white text-(--gris-texte) border border-gray-200 hover:border-gray-300 hover:text-(--encre)'
                }`}
                aria-pressed={activeSlug === ''}
              >
                Tout
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => selectCategory(cat.slug)}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-full whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) ${
                    activeSlug === cat.slug
                      ? 'bg-(--vert-baol) text-white shadow-sm'
                      : 'bg-white text-(--gris-texte) border border-gray-200 hover:border-gray-300 hover:text-(--encre)'
                  }`}
                  aria-pressed={activeSlug === cat.slug}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Search Field */}
          {onSearchChange && (
            <div className="relative w-full md:w-72 shrink-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Chercher un produit..."
                aria-label="Rechercher un produit par nom"
                className="block w-full pl-9 pr-10 py-2 border border-gray-200 bg-white rounded-xl text-sm text-(--encre) placeholder-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) focus-visible:border-transparent transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-(--encre) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded-xl"
                  aria-label="Effacer la recherche"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}