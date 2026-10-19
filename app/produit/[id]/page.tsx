import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { flashDisplay, type FlashFields } from '@/lib/flashSale'
import { Breadcrumb } from '@/components/Breadcrumb'
import VerifiedBadge from '@/components/VerifiedBadge'
import { ProductPurchase } from '@/components/ProductPurchase'
import { CategoryProductRow } from '@/components/CategoryProductRow'
import { ShoppingBag, ShieldCheck, Wallet, Truck, RotateCcw } from 'lucide-react'
import { SITE_URL } from '@/lib/siteUrl'

export const revalidate = 60

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ProductRow = {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  category_id: string | null
  flash_price: number | null
  flash_starts_at: string | null
  flash_ends_at: string | null
  categories:
    | {
        name: string
        slug: string
      }
    | {
        name: string
        slug: string
      }[]
    | null
}

type Props = {
  params: Promise<{ id: string }>
}

const getProduct = cache(async (id: string): Promise<ProductRow | null> => {
  if (!UUID_REGEX.test(id)) {
    return null
  }

  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      price,
      image_url,
      category_id,
      flash_price,
      flash_starts_at,
      flash_ends_at,
      categories (
        name,
        slug
      )
    `)
    .eq('id', id)
    .eq('is_available', true)
    .single()

  if (error || !data) {
    return null
  }

  return data as unknown as ProductRow
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const product = await getProduct(id)

  if (!product) {
    return {
      title: 'Produit introuvable - Baol Market',
    }
  }

  const rawDescription = product.description
    ? product.description.replace(/\s+/g, ' ').trim()
    : ''
  const description =
    rawDescription.length > 0
      ? rawDescription.length > 155
        ? `${rawDescription.slice(0, 155).trim()}…`
        : rawDescription
      : `Achetez ${product.name} sur Baol Market : produit vérifié, paiement en ligne sécurisé, livraison à Diourbel.`

  const title = `${product.name} - Baol Market`
  const images = product.image_url ? [product.image_url] : []

  return {
    title,
    description,
    alternates: {
      canonical: `/produit/${id}`,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
    },
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params
  const product = await getProduct(id)

  if (!product) {
    notFound()
  }

  const now = new Date()
  const flash = flashDisplay(
    {
      price: product.price,
      flash_price: product.flash_price,
      flash_starts_at: product.flash_starts_at,
      flash_ends_at: product.flash_ends_at,
    },
    now
  )

  const currentPrice = flash ? flash.price : product.price

  const category = Array.isArray(product.categories)
    ? product.categories[0]
    : product.categories

  // Données structurées JSON-LD (schema.org Product & BreadcrumbList)
  const productUrl = `${SITE_URL}/produit/${product.id}`

  const productJsonLd = {
    '@type': 'Product',
    name: product.name,
    ...(product.description ? { description: product.description } : {}),
    ...(product.image_url ? { image: product.image_url } : {}),
    url: productUrl,
    offers: {
      '@type': 'Offer',
      price: currentPrice,
      priceCurrency: 'XOF',
      availability: 'https://schema.org/InStock',
      url: productUrl,
      seller: {
        '@type': 'Organization',
        name: 'Baol Market',
      },
      ...(flash && product.flash_ends_at ? { priceValidUntil: product.flash_ends_at } : {}),
    },
  }

  const breadcrumbJsonLd = {
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
      ...(category?.name && category?.slug
        ? [
            {
              '@type': 'ListItem',
              position: 3,
              name: category.name,
              item: `${SITE_URL}/categorie/${category.slug}`,
            },
            {
              '@type': 'ListItem',
              position: 4,
              name: product.name,
              item: productUrl,
            },
          ]
        : [
            {
              '@type': 'ListItem',
              position: 3,
              name: product.name,
              item: productUrl,
            },
          ]),
    ],
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [productJsonLd, breadcrumbJsonLd],
  }

  // Produits de la même catégorie
  let relatedProducts: Array<{
    id: string
    name: string
    description: string | null
    price: number
    image_url: string | null
    flash: ReturnType<typeof flashDisplay>
  }> = []

  if (product.category_id && category?.slug) {
    try {
      const { data: relatedData, error: relatedError } = await supabase
        .from('products')
        .select('id, name, description, price, image_url, flash_price, flash_starts_at, flash_ends_at')
        .eq('category_id', product.category_id)
        .eq('is_available', true)
        .neq('id', product.id)
        .order('created_at', { ascending: false })
        .limit(8)

      if (!relatedError && relatedData) {
        relatedProducts = relatedData.map((item) => {
          const { flash_price, flash_starts_at, flash_ends_at, ...baseProduct } = item as FlashFields & {
            id: string
            name: string
            description: string | null
            price: number
            image_url: string | null
          }
          return {
            ...baseProduct,
            flash: flashDisplay(
              {
                price: baseProduct.price,
                flash_price,
                flash_starts_at,
                flash_ends_at,
              },
              now
            ),
          }
        })
      }
    } catch {
      // Un échec de cette requête ne doit jamais empêcher la page de s'afficher
      relatedProducts = []
    }
  }

  const breadcrumbItems = [
    { label: 'Catalogue', href: '/produits' },
    ...(category?.name && category?.slug
      ? [{ label: category.name, href: `/categorie/${category.slug}` }]
      : []),
    { label: product.name },
  ]

  return (
    <main className="bg-(--fond) min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {/* Fil d'Ariane */}
        <div className="mb-6 md:mb-8">
          <Breadcrumb items={breadcrumbItems} />
        </div>

        {/* Fiche produit : 2 colonnes desktop, 1 colonne mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Colonne gauche : Photo carrée */}
          <div className="w-full">
            <div className="aspect-square w-full rounded-2xl border border-gray-100 overflow-hidden relative bg-gray-50 flex items-center justify-center shadow-xs">
              <div className="absolute top-3 left-3 z-10">
                <VerifiedBadge />
              </div>

              {flash && (
                <span className="absolute top-3 right-3 z-10 bg-(--rouge-baol) text-white text-xs sm:text-sm font-bold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-sm">
                  -{flash.percent} %
                </span>
              )}

              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-gray-400">
                  <ShoppingBag className="w-12 h-12 text-gray-300" />
                  <span className="text-sm font-medium">Photo à venir</span>
                </div>
              )}
            </div>
          </div>

          {/* Colonne droite : Informations */}
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-bold text-(--encre) mb-4 leading-tight">
              {product.name}
            </h1>

            {/* Prix */}
            <div className="mb-2">
              {flash ? (
                <div className="space-y-1">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="text-3xl md:text-4xl font-bold text-(--rouge-baol)">
                      {flash.price.toLocaleString('fr-SN')}{' '}
                      <span className="text-xl md:text-2xl font-semibold">FCFA</span>
                    </span>
                    <span className="text-base md:text-lg text-gray-400 line-through">
                      {product.price.toLocaleString('fr-SN')} FCFA
                    </span>
                    <span className="bg-(--rouge-baol)/10 text-(--rouge-baol) text-xs font-bold px-2 py-0.5 rounded-full">
                      -{flash.percent} %
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-(--rouge-baol) font-medium">
                    Vente flash jusqu&apos;au{' '}
                    {new Date(flash.endsAt).toLocaleString('fr-FR', {
                      timeZone: 'Africa/Dakar',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ) : (
                <div className="text-3xl md:text-4xl font-bold text-(--encre)">
                  {product.price.toLocaleString('fr-SN')}{' '}
                  <span className="text-xl md:text-2xl font-semibold text-(--gris-texte)">
                    FCFA
                  </span>
                </div>
              )}
            </div>

            {/* Achat / Panier */}
            <ProductPurchase
              productId={product.id}
              name={product.name}
              imageUrl={product.image_url}
              currentPrice={currentPrice}
            />

            {/* Bloc « Pourquoi commander ici ? » */}
            <div className="mt-8 bg-gray-50/80 rounded-2xl border border-gray-100 p-5 space-y-3.5">
              <h2 className="text-sm font-bold text-(--encre) uppercase tracking-wider mb-1">
                Pourquoi commander ici ?
              </h2>

              <div className="space-y-3 text-sm text-(--gris-texte)">
                <div className="flex items-start gap-3">
                  <div className="bg-(--vert-baol)/10 p-1.5 rounded-lg text-(--vert-baol) shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <p className="leading-snug font-medium text-(--encre)">
                    Produit vérifié physiquement par notre équipe
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-blue-50 p-1.5 rounded-lg text-blue-600 shrink-0 mt-0.5">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <p className="leading-snug">Paiement en ligne sécurisé</p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-amber-50 p-1.5 rounded-lg text-amber-600 shrink-0 mt-0.5">
                    <Truck className="w-4 h-4" />
                  </div>
                  <p className="leading-snug">
                    Livraison à Diourbel : généralement sous 24 à 72 heures après
                    confirmation de la commande. Frais affichés avant le paiement.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-purple-50 p-1.5 rounded-lg text-purple-600 shrink-0 mt-0.5">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <p className="leading-snug">
                    Annulation possible jusqu&apos;à la confirmation, avec remboursement sous 3 jours ouvrables
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-500 pt-2 border-t border-gray-200/60 leading-relaxed">
                Hors Diourbel, aucun frais de livraison n&apos;est appliqué, mais vous organisez la livraison.
              </p>
            </div>

            {/* Section Description */}
            {product.description && product.description.trim().length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <h2 className="text-xl font-bold text-(--encre) mb-3">Description</h2>
                <div className="text-sm md:text-base text-(--gris-texte) leading-relaxed whitespace-pre-line break-words">
                  {product.description}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Produits de la même catégorie */}
        {relatedProducts.length > 0 && category?.slug && (
          <div className="mt-14 md:mt-20 pt-8 border-t border-gray-100">
            <CategoryProductRow
              title="Dans la même catégorie"
              href={`/categorie/${category.slug}`}
              products={relatedProducts}
            />
          </div>
        )}
      </div>
    </main>
  )
}
