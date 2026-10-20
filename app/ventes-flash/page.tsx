import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { ProductCard } from '@/components/ProductCard'
import { Breadcrumb } from '@/components/Breadcrumb'
import { EmptyState } from '@/components/EmptyState'
import { Zap, ShieldCheck } from 'lucide-react'
import { flashDisplay } from '@/lib/flashSale'

export const metadata: Metadata = {
  title: 'Ventes flash - Baol Market',
  description:
    'Profitez de nos ventes flash : des produits vérifiés à prix réduit, pour une durée limitée.',
  alternates: {
    canonical: '/ventes-flash',
  },
}

// Mise à jour automatique au plus toutes les 60 secondes
export const revalidate = 60

type ProductRow = {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  flash_price: number | null
  flash_starts_at: string | null
  flash_ends_at: string | null
  categories?: { fulfillment_type?: string | null } | { fulfillment_type?: string | null }[] | null
}

export default async function VentesFlashPage() {
  const now = new Date()
  const nowIso = now.toISOString()

  const { data, error } = await supabase
    .from('products')
    .select('id, name, description, price, image_url, flash_price, flash_starts_at, flash_ends_at, categories ( fulfillment_type )')
    .eq('is_available', true)
    .not('flash_price', 'is', null)
    .gt('flash_ends_at', nowIso)
    .or(`flash_starts_at.is.null,flash_starts_at.lte.${nowIso}`)
    .order('flash_ends_at', { ascending: true })

  if (error) {
    return (
      <main className="flex flex-col items-center justify-center p-6 py-32 text-center bg-gray-50 min-h-[60vh]">
        <EmptyState
          title="Oups, un souci technique"
          description="Nous n'avons pas pu charger les ventes flash pour le moment. Veuillez réessayer dans quelques instants."
          actionText="Retour à l'accueil"
          href="/"
          icon={<ShieldCheck className="w-12 h-12" />}
        />
      </main>
    )
  }

  const products = ((data ?? []) as ProductRow[])
    .map((row) => {
      const { flash_price, flash_starts_at, flash_ends_at, ...product } = row
      const isVisit = Array.isArray(product.categories)
        ? product.categories[0]?.fulfillment_type === 'visit'
        : product.categories?.fulfillment_type === 'visit'
      return {
        ...product,
        flash: isVisit ? null : flashDisplay({ price: product.price, flash_price, flash_starts_at, flash_ends_at }, now),
      }
    })
    .filter((p): p is typeof p & { flash: NonNullable<typeof p.flash> } => p.flash !== null)

  return (
    <main className="bg-(--fond) min-h-[60vh] pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <Breadcrumb items={[{ label: 'Ventes flash' }]} />
      </div>

      {/* En-tête */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="bg-(--rouge-baol) rounded-2xl px-5 sm:px-8 py-5 sm:py-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl">
              <Zap className="w-6 h-6 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Ventes flash</h1>
              <p className="text-sm text-white/70">
                {products.length > 0
                  ? `${products.length} produit${products.length > 1 ? 's' : ''} à prix réduit`
                  : 'Aucune vente flash en cours'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grille de produits */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {products.length === 0 ? (
          <EmptyState
            title="Pas de ventes flash en ce moment"
            description="Revenez bientôt, de nouvelles offres arrivent régulièrement !"
            actionText="Voir tous les produits"
            href="/produits"
            icon={<Zap className="w-12 h-12" />}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
