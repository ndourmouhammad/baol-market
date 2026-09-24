import type { Metadata } from 'next'
import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { ShieldCheck } from 'lucide-react'
import CatalogClient from '@/components/CatalogClient'
import { EmptyState } from '@/components/EmptyState'

export const metadata: Metadata = {
  title: 'Tous les produits — Baol Market',
  description: 'Parcourez l\'ensemble de notre catalogue de produits locaux vérifiés.',
}

export default async function AllProductsPage() {
  const [productsResponse, categoriesResponse] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, description, price, image_url, category_id')
      .eq('is_available', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('categories')
      .select('id, name, slug')
      .order('name')
  ])

  const products = productsResponse.data
  const categories = categoriesResponse.data
  const error = productsResponse.error || categoriesResponse.error

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
      <section className="bg-(--vert-baol-fonce) text-white border-b border-(--vert-baol)">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Tous les produits</h1>
          <p className="text-white/80 max-w-xl mx-auto md:mx-0 text-sm md:text-base">
            Parcourez l&apos;ensemble de notre catalogue. Tous nos articles sont vérifiés physiquement par nos équipes pour votre sérénité.
          </p>
        </div>
      </section>

      {(!products || products.length === 0) ? (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <EmptyState 
            title="Catalogue en préparation" 
            description="Notre équipe vérifie actuellement de nouveaux produits. Revenez très vite !" 
          />
        </section>
      ) : (
        <Suspense fallback={<div className="py-10 text-center"><div className="w-8 h-8 border-4 border-(--vert-baol)/30 border-t-(--vert-baol) rounded-full animate-spin mx-auto"></div></div>}>
          <CatalogClient products={products} categories={categories || []} />
        </Suspense>
      )}
    </main>
  )
}