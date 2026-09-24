import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ProductCard } from '@/components/ProductCard'
import { EmptyState } from '@/components/EmptyState'
import { Breadcrumb } from '@/components/Breadcrumb'
import { ShieldCheck } from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const { data: category } = await supabase
    .from('categories')
    .select('name, description')
    .eq('slug', slug)
    .single()

  if (!category) return { title: 'Catégorie introuvable — Baol Market' }
  return {
    title: `${category.name} — Baol Market`,
    description: category.description || `Découvrez nos produits locaux vérifiés dans la catégorie ${category.name}.`,
  }
}

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
      <main className="flex flex-col items-center justify-center p-6 py-32 text-center bg-gray-50 min-h-[60vh]">
        <EmptyState
          title="Oups, un souci technique"
          description="Nous n'avons pas pu charger le catalogue pour le moment. Veuillez réessayer dans quelques instants."
          actionText="Retour à l'accueil"
          href="/"
          icon={<ShieldCheck className="w-12 h-12" />}
        />
      </main>
    )
  }

  return (
    <main className="bg-(--fond) pb-20 min-h-screen">
      {/* En-tête catégorie */}
      <section className="bg-(--vert-baol-fonce) text-white border-b border-(--vert-baol)">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{category.name}</h1>
          {category.description && (
            <p className="text-white/80 max-w-xl mx-auto md:mx-0 text-sm md:text-base">{category.description}</p>
          )}
        </div>
      </section>

      {/* Produits */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Breadcrumb items={[
            { label: 'Catalogue', href: '/produits' },
            { label: category.name, href: `/categorie/${category.slug}` }
          ]} />
          <span className="text-sm font-medium text-(--gris-texte)">
            {products?.length || 0} produit{(products?.length || 0) > 1 ? 's' : ''} trouvé{(products?.length || 0) > 1 ? 's' : ''}
          </span>
        </div>

        {!products || products.length === 0 ? (
          <div className="py-10">
            <EmptyState 
              title="Aucun produit dans cette catégorie"
              description="Nous n'avons pas encore d'articles disponibles ici, revenez bientôt."
              actionText="Voir tous les produits"
              href="/produits"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}