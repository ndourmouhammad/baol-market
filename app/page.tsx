import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import CategoryFilter from '@/components/CategoryFilter'
import VerifiedBadge from '@/components/VerifiedBadge'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string }>
}) {
  const { categorie } = await searchParams

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')

  const activeCategory = categories?.find((c) => c.slug === categorie)

  let query = supabase
    .from('products')
    .select('id, name, description, price, image_url')
    .eq('is_available', true)
    .order('created_at', { ascending: false })

  if (activeCategory) {
    query = query.eq('category_id', activeCategory.id)
  }

  const { data: products, error } = await query

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 py-32 text-center">
        <h1 className="font-serif text-3xl font-bold text-baobab mb-4">Oups, un souci technique</h1>
        <p className="text-baobab/80 mb-6 max-w-md">Nous n&#39;avons pas pu charger le catalogue pour le moment. Veuillez réessayer dans quelques instants.</p>
        <Link href="/" className="bg-terre text-sable px-6 py-3 font-medium rounded-lg hover:bg-terre/90 transition-colors">
          Recharger la page
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-sable pb-20">
      {/* Hero Section */}
      <section className="bg-nuit-diourbel text-sable hero-pattern relative overflow-hidden">
        {/* Cercle décoratif */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-terre/10 rounded-full blur-3xl" />
        <div className="absolute -left-10 -bottom-10 w-60 h-60 bg-mil/10 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 relative z-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-sable/10 backdrop-blur-sm border border-sable/10 rounded-full px-4 py-1.5 text-xs font-medium text-mil mb-6">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Marketplace vérifiée au Sénégal
            </div>

            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold mb-5 leading-[1.1]">
              Des produits vérifiés,
              <br />
              <span className="text-mil">livrés en confiance.</span>
            </h1>

            <p className="text-base md:text-lg font-light text-sable/80 max-w-xl mb-8 leading-relaxed">
              Chaque article est inspecté physiquement par notre équipe avant mise en vente.
              Achetez local, en toute sérénité.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <a
                href="#catalogue"
                className="inline-flex items-center justify-center gap-2 bg-terre text-sable px-7 py-3.5 rounded-lg font-medium hover:bg-terre/90 transition-colors shadow-lg shadow-terre/20 text-sm"
              >
                Explorer le catalogue
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </a>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 bg-sable/10 text-sable border border-sable/20 px-7 py-3.5 rounded-lg font-medium hover:bg-sable/20 transition-colors text-sm"
              >
                Créer un compte
              </Link>
            </div>

            {/* Stats rapides */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-sable/60">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-vert-feuille rounded-full" />
                50+ commerçants vérifiés
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-mil rounded-full" />
                Dakar · Rufisque · Diourbel · Touba
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="text-center mb-10">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-baobab mb-2">Comment ça marche ?</h2>
          <p className="text-sm text-baobab/60">En 3 étapes simples</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
          {[
            {
              step: '01',
              title: 'Choisissez',
              desc: 'Parcourez notre catalogue de produits locaux vérifiés par notre équipe.',
              icon: (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              ),
            },
            {
              step: '02',
              title: 'Commandez',
              desc: 'Passez commande en quelques clics. Paiement à la livraison disponible.',
              icon: (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
              ),
            },
            {
              step: '03',
              title: 'Recevez',
              desc: 'Nos livreurs de confiance vous apportent votre commande chez vous.',
              icon: (
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H18.75m-7.5-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m0-3.75h5.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125h-5.625m0-3.75v3.75" />
                </svg>
              ),
            },
          ].map((item) => (
            <div key={item.step} className="text-center group">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-terre/10 text-terre flex items-center justify-center group-hover:bg-terre group-hover:text-sable transition-all duration-300">
                {item.icon}
              </div>
              <span className="text-xs font-bold text-terre/40 uppercase tracking-widest">Étape {item.step}</span>
              <h3 className="font-serif text-xl font-bold text-baobab mt-1 mb-2">{item.title}</h3>
              <p className="text-sm text-baobab/60 leading-relaxed max-w-xs mx-auto">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Filtres catégories + recherche */}
      <div id="catalogue">
        <CategoryFilter categories={categories ?? []} />
      </div>

      {/* Catalogue */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {!products || products.length === 0 ? (
          <div className="text-center py-20 border border-terre/10 bg-white/50 rounded-2xl">
            <svg className="mx-auto h-12 w-12 text-terre/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h2 className="font-serif text-2xl text-baobab mb-2">
              {activeCategory ? 'Aucun produit dans cette catégorie' : 'Catalogue en préparation'}
            </h2>
            <p className="text-baobab/60 text-sm">
              {activeCategory
                ? 'Revenez bientôt, ou explorez une autre catégorie.'
                : 'Notre équipe vérifie actuellement de nouveaux produits. Revenez très vite !'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <article
                key={product.id}
                className="group bg-white rounded-2xl overflow-hidden border border-terre/8 flex flex-col hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
              >
                {/* Image */}
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

                {/* Contenu */}
                <div className="p-4 md:p-5 flex flex-col flex-grow">
                  <h3 className="font-serif text-base md:text-lg font-bold text-baobab mb-1 line-clamp-1">{product.name}</h3>
                  <p className="text-xs md:text-sm text-baobab/60 line-clamp-2 mb-3 flex-grow">{product.description}</p>
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