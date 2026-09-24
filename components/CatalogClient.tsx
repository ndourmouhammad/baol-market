'use client'

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { ProductCard } from './ProductCard'
import { EmptyState } from './EmptyState'
import CategoryFilter from './CategoryFilter'
import { Breadcrumb } from './Breadcrumb'

type Category = { id: string; name: string; slug: string }
type Product = { id: string; name: string; description: string | null; price: number; image_url: string | null; category_id?: string }

export default function CatalogClient({ products, categories }: { products: Product[], categories: Category[] }) {
  const [search, setSearch] = useState('')
  const searchParams = useSearchParams()
  const activeCategorySlug = searchParams.get('categorie')

  const filteredProducts = useMemo(() => {
    let result = products;

    if (activeCategorySlug) {
      const category = categories.find(c => c.slug === activeCategorySlug)
      if (category) {
        result = result.filter(p => p.category_id === category.id)
      }
    }

    if (search) {
      const lowerSearch = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      result = result.filter(p => {
        const name = p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return name.includes(lowerSearch);
      })
    }

    return result;
  }, [products, categories, search, activeCategorySlug])

  return (
    <>
      <CategoryFilter 
        categories={categories} 
        searchQuery={search} 
        onSearchChange={setSearch} 
      />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Breadcrumb items={[{ label: 'Catalogue', href: '/produits' }]} />
          <span className="text-sm font-medium text-(--gris-texte)">
            {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} affiché{filteredProducts.length > 1 ? 's' : ''}
          </span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="py-10">
            <EmptyState 
              title="Aucun produit trouvé" 
              description={search ? `Aucun résultat pour "${search}". Essayez avec d'autres mots-clés.` : "Aucun produit disponible dans cette catégorie."}
              actionText={search ? "Réinitialiser la recherche" : undefined}
              onAction={search ? () => setSearch('') : undefined}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}
