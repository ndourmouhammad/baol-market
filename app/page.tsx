import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/Button'

export default async function Home() {
  const { data: categories, error } = await supabase
    .from('categories')
    .select('id, name, slug, description, image_url')
    .order('name')

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 py-32 text-center">
        <h1 className="text-3xl font-bold text-(--encre) mb-4">Oups, un souci technique</h1>
        <p className="text-(--gris-texte) mb-6 max-w-md">Nous n'avons pas pu charger le catalogue pour le moment. Veuillez réessayer dans quelques instants.</p>
        <Link href="/">
          <Button>Recharger la page</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-(--fond) pb-20">
      {/* Hero Section */}
      <section className="bg-gray-50 text-(--encre) overflow-hidden border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-(--vert-baol)/10 rounded-full px-4 py-1.5 text-xs font-bold text-(--vert-baol-fonce) mb-6">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Marketplace vérifiée au Sénégal
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 leading-[1.1]">
              Des produits vérifiés,
              <br />
              <span className="text-(--vert-baol)">livrés en confiance.</span>
            </h1>

            <p className="text-base md:text-lg font-medium text-(--gris-texte) max-w-xl mb-8 leading-relaxed">
              Chaque article est inspecté physiquement par notre équipe avant mise en vente.
              Achetez local, en toute sérénité.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <a href="#catalogue">
                <Button variant="primary" className="w-full sm:w-auto">
                  Explorer le catalogue
                </Button>
              </a>
              <Link href="/signup">
                <Button variant="secondary" className="w-full sm:w-auto">
                  Créer un compte
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-(--encre) mb-2">Comment ça marche ?</h2>
          <p className="text-sm text-(--gris-texte)">En 3 étapes simples</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
          {[
            {
              step: '01',
              title: 'Choisissez',
              desc: 'Parcourez nos catégories de produits locaux vérifiés par notre équipe.',
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
            <div key={item.step} className="text-center bg-gray-50 p-8 rounded-2xl border border-gray-100">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-(--vert-baol)/10 text-(--vert-baol) flex items-center justify-center">
                {item.icon}
              </div>
              <h3 className="text-xl font-bold text-(--encre) mt-1 mb-2">{item.title}</h3>
              <p className="text-sm text-(--gris-texte) leading-relaxed max-w-xs mx-auto">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Catégories */}
      <section id="catalogue" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-(--encre) mb-2">Parcourir par catégorie</h2>
          <p className="text-sm text-(--gris-texte)">Choisissez une catégorie pour découvrir les produits</p>
        </div>

        {!categories || categories.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-100">
            <h3 className="text-2xl font-bold text-(--encre) mb-2">Catalogue en préparation</h3>
            <p className="text-(--gris-texte) text-sm">Notre équipe vérifie actuellement de nouveaux produits. Revenez très vite !</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/categorie/${category.slug}`}
                className="group bg-white rounded-2xl overflow-hidden border border-gray-100 flex flex-col hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
              >
                <div className="aspect-square w-full overflow-hidden bg-gray-50 flex items-center justify-center relative">
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt={category.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center">
                      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375C2.754 3.75 2.25 4.254 2.25 4.875v1.5c0 .621.504 1.125 1.125 1.125z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-4 md:p-5 flex flex-col grow text-center">
                  <h3 className="text-lg font-bold text-(--encre) mb-1">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-(--gris-texte) line-clamp-2">{category.description}</p>
                  )}
                </div>
              </Link>
            ))}

            {/* Card "Tous les produits" */}
            <Link
              href="/produits"
              className="group bg-white rounded-2xl overflow-hidden border border-gray-100 flex flex-col hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
            >
              <div className="aspect-square w-full flex items-center justify-center bg-(--vert-baol)/5">
                <div className="w-16 h-16 rounded-2xl bg-(--vert-baol)/10 text-(--vert-baol) flex items-center justify-center group-hover:bg-(--vert-baol)/20 transition-all duration-300">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                </div>
              </div>
              <div className="p-4 md:p-5 flex flex-col grow text-center">
                <h3 className="text-lg font-bold text-(--encre) mb-1">Tous les produits</h3>
                <p className="text-sm text-(--gris-texte)">Voir l'ensemble du catalogue</p>
              </div>
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}