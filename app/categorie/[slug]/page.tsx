import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ProductCard } from '@/components/ProductCard'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/Button'

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const { data: category } = await supabase
    .from('categories')
    .select('id, name, slug, description, image_url')
    .eq('slug', slug)
    .single()

  if (!category) {
    notFound()
  }

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, description, price, image_url')
    .eq('category_id', category.id)
    .eq('is_available', true)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 py-32 text-center">
        <h1 className="text-3xl font-bold text-(--encre) mb-4">Oups, un souci technique</h1>
        <Link href="/">
          <Button>Retour à l'accueil</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-(--fond) pb-20 min-h-screen">
      {/* En-tête catégorie */}
      <section className="bg-(--vert-baol-fonce) text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Toutes les catégories
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{category.name}</h1>
          {category.description && (
            <p className="text-white/70 max-w-xl">{category.description}</p>
          )}
        </div>
      </section>

      {/* Produits */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        {!products || products.length === 0 ? (
          <EmptyState 
            title="Aucun produit dans cette catégorie"
            description="Revenez bientôt, ou explorez une autre catégorie."
            actionText="Voir toutes les catégories"
            onAction={() => {}} 
          />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}