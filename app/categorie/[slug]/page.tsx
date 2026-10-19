import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ProductCard } from '@/components/ProductCard'
import { EmptyState } from '@/components/EmptyState'
import { Breadcrumb } from '@/components/Breadcrumb'
import { ShieldCheck } from 'lucide-react'
import { flashDisplay } from '@/lib/flashSale'
import { SITE_URL } from '@/lib/siteUrl'

// Mise à jour automatique au plus toutes les 60 secondes (ventes flash comprises)
export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const { data: category } = await supabase
    .from('categories')
    .select('name, description, image_url')
    .eq('slug', slug)
    .single()

  if (!category) return { title: 'Catégorie introuvable - Baol Market' }

  const title = `${category.name} au Sénégal - Baol Market`
  const description =
    category.description && category.description.trim().length > 0
      ? category.description
      : `Découvrez notre sélection de produits vérifiés dans la catégorie ${category.name} au Sénégal sur Baol Market.`

  const metadata: Metadata = {
    title,
    description,
    alternates: {
      canonical: `/categorie/${slug}`,
    },
  }

  if (category.image_url) {
    metadata.openGraph = {
      images: [{ url: category.image_url }],
    }
    metadata.twitter = {
      images: [category.image_url],
    }
  }

  return metadata
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
    .select('id, name, description, price, image_url, flash_price, flash_starts_at, flash_ends_at')
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

  // La vente flash est évaluée ici, côté serveur, une seule fois pour tous les produits
  const now = new Date()
  const productsWithFlash = (products ?? []).map(
    ({ flash_price, flash_starts_at, flash_ends_at, ...product }) => ({
      ...product,
      flash: flashDisplay({ price: product.price, flash_price, flash_starts_at, flash_ends_at }, now),
    })
  )

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Accueil',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Catalogue',
        item: `${SITE_URL}/produits`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: category.name,
        item: `${SITE_URL}/categorie/${category.slug}`,
      },
    ],
  }

  return (
    <main className="bg-(--fond) pb-20 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      {/* En-tête catégorie / Bannière */}
      <section className="relative w-full h-44 sm:h-56 md:h-72 bg-(--vert-baol-fonce) overflow-hidden border-b border-(--vert-baol)">
        {category.image_url && (
          <>
            <Image
              src={category.image_url}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10 pointer-events-none" />
          </>
        )}
        <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-6 sm:pb-8 md:pb-10">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white drop-shadow mb-2 sm:mb-3">
            {category.name}
          </h1>
          {category.description && (
            <p className="text-white/90 text-sm md:text-base max-w-2xl line-clamp-2 md:line-clamp-3">
              {category.description}
            </p>
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
            {productsWithFlash.length} produit{productsWithFlash.length > 1 ? 's' : ''} trouvé{productsWithFlash.length > 1 ? 's' : ''}
          </span>
        </div>

        {productsWithFlash.length === 0 ? (
          <div className="py-10">
            <EmptyState 
              title="Aucun produit dans cette catégorie"
              description="Nous n'avons pas encore d'articles disponibles ici, revenez bientôt."
              actionText="Voir tous les produits"
              href="/produits"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {productsWithFlash.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
