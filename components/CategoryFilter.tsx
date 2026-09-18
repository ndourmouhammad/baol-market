'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

type Category = { id: string; name: string; slug: string }

export default function CategoryFilter({ categories }: { categories: Category[] }) {
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
    <div className="py-5 border-b border-terre/10 mb-8 bg-sable/95 backdrop-blur-sm sticky top-[64px] z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

          {/* Scrollable Categories */}
          <div className="flex-grow overflow-x-auto no-scrollbar">
            <div className="flex gap-2 min-w-max pb-2 md:pb-0">
              <button
                onClick={() => selectCategory('')}
                className={`px-5 py-2 text-sm font-medium transition-all duration-200 rounded-full ${
                  activeSlug === ''
                    ? 'bg-terre text-sable shadow-sm'
                    : 'bg-white text-baobab/80 border border-terre/15 hover:border-terre/40 hover:text-baobab'
                }`}
              >
                Tout
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => selectCategory(cat.slug)}
                  className={`px-5 py-2 text-sm font-medium transition-all duration-200 rounded-full whitespace-nowrap ${
                    activeSlug === cat.slug
                      ? 'bg-terre text-sable shadow-sm'
                      : 'bg-white text-baobab/80 border border-terre/15 hover:border-terre/40 hover:text-baobab'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Search Field */}
          <div className="relative w-full md:w-64 flex-shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-terre/50">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Chercher un produit..."
              className="block w-full pl-9 pr-3 py-2.5 border border-terre/15 bg-white rounded-xl text-sm text-baobab placeholder-baobab/40 focus:outline-none focus:ring-2 focus:ring-terre/20 focus:border-terre transition-all"
            />
          </div>

        </div>
      </div>
    </div>
  )
}