import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import CategoryFilter from '@/components/CategoryFilter'
import VerifiedBadge from '@/components/VerifiedBadge'

export default async function Home() {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, description, price, image_url')
    .eq('is_available', true)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 py-32 text-center">
        <h1 className="font-serif text-3xl font-bold text-baobab mb-4">Oups, un souci technique</h1>
        <p className="text-baobab/80 mb-6 max-w-md">Nous n&#39;avons pas pu charger le catalogue pour le moment. Veuillez réessayer dans quelques instants.</p>
        <Link href="/" className="bg-terre text-sable px-6 py-3 font-medium hover:bg-terre/90 transition-colors">
          Recharger la page
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-sable pb-20">
      {/* Hero Section */}
      <section className="bg-nuit-diourbel text-sable hero-pattern">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-3 max-w-lg">
            Des produits vérifiés, livrés en confiance.
          </h1>
          <p className="text-lg font-light opacity-80 max-w-xl mb-6">
            Chaque article est inspecté physiquement par notre équipe avant mise en vente.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm opacity-70">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-mil" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              50+ commerçants vérifiés
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-mil" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Dakar · Rufisque · Diourbel · Touba
            </span>
          </div>
        </div>
      </section>

      {/* Filtres catégories + recherche */}
      <CategoryFilter />

      {/* Catalogue */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {!products || products.length === 0 ? (
          <div className="text-center py-20 border border-terre/20 bg-white/30">
            <svg className="mx-auto h-12 w-12 text-terre/50 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h2 className="font-serif text-2xl text-baobab mb-2">Catalogue en préparation</h2>
            <p className="text-baobab/70">Notre équipe vérifie actuellement de nouveaux produits. Revenez très vite !</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {products.map((product) => (
              <article
                key={product.id}
                className="group bg-white border border-terre/10 flex flex-col hover:-translate-y-1 hover:shadow-md transition-all duration-300"
              >
                {/* Image */}
                <div className="aspect-[4/3] w-full overflow-hidden bg-sable flex items-center justify-center relative border-b border-terre/10">
                  <VerifiedBadge />
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-sable/80 flex flex-col items-center justify-center gap-2">
                      <svg className="w-10 h-10 text-terre/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs text-terre/30 font-medium">Photo à venir</span>
                    </div>
                  )}
                </div>

                {/* Contenu */}
                <div className="p-5 flex flex-col flex-grow">
                  <span className="text-xs text-terre font-semibold uppercase tracking-wider mb-1">Produit local</span>
                  <h3 className="font-serif text-lg font-bold text-baobab mb-1">{product.name}</h3>
                  <p className="text-sm text-baobab/70 line-clamp-2 mb-4 flex-grow">{product.description}</p>
                  <div className="mt-auto">
                    <p className="text-xl font-bold text-terre mb-4">{product.price.toLocaleString('fr-SN')} FCFA</p>
                    <Link
                      href={`/order/${product.id}`}
                      className="block w-full text-center bg-terre text-sable py-3 font-medium hover:bg-terre/90 transition-colors focus:outline-none focus:ring-2 focus:ring-terre focus:ring-offset-2 focus:ring-offset-white"
                    >
                      Commander
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}