import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import VerifiedBadge from '@/components/VerifiedBadge'

export default async function AllProductsPage() {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, description, price, image_url')
    .eq('is_available', true)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 py-32 text-center">
        <h1 className="font-serif text-3xl font-bold text-baobab mb-4">Oups, un souci technique</h1>
        <Link href="/" className="bg-terre text-sable px-6 py-3 font-medium rounded-lg hover:bg-terre/90 transition-colors">
          Retour à l&#39;accueil
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-sable pb-20 min-h-screen">
      <section className="bg-nuit-diourbel text-sable">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-sable/70 hover:text-sable transition-colors mb-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Toutes les catégories
          </Link>
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">Tous les produits</h1>
          <p className="text-sable/70 max-w-xl">L&#39;ensemble de notre catalogue vérifié.</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        {!products || products.length === 0 ? (
          <div className="text-center py-20 border border-terre/10 bg-white/50 rounded-2xl">
            <h2 className="font-serif text-2xl text-baobab mb-2">Catalogue en préparation</h2>
            <p className="text-baobab/60 text-sm">Notre équipe vérifie actuellement de nouveaux produits. Revenez très vite !</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <article
                key={product.id}
                className="group bg-white rounded-2xl overflow-hidden border border-terre/8 flex flex-col hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
              >
                <div className="aspect-square w-full overflow-hidden bg-sable/50 flex items-center justify-center relative">
                  <VerifiedBadge />
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-sable/80 flex flex-col items-center justify-center gap-2">
                      <svg className="w-10 h-10 text-terre/15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs text-terre/25 font-medium">Photo à venir</span>
                    </div>
                  )}
                </div>
                <div className="p-4 md:p-5 flex flex-col grow">
                  <h3 className="font-serif text-base md:text-lg font-bold text-baobab mb-1 line-clamp-1">{product.name}</h3>
                  <p className="text-xs md:text-sm text-baobab/60 line-clamp-2 mb-3 grow">{product.description}</p>
                  <div className="mt-auto">
                    <p className="text-lg md:text-xl font-bold text-terre mb-3">{product.price.toLocaleString('fr-SN')} <span className="text-sm font-medium">FCFA</span></p>
                    <Link
                      href={`/order/${product.id}`}
                      className="block w-full text-center bg-terre text-sable py-2.5 md:py-3 text-sm font-medium rounded-xl hover:bg-terre/90 transition-colors focus:outline-none focus:ring-2 focus:ring-terre focus:ring-offset-2 focus:ring-offset-white"
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