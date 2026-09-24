import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/Button'
import { CheckCircle, ShieldCheck, Truck, ShoppingBag, ArrowRight, MapPin, Wallet } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'

export const metadata: Metadata = {
  title: 'Baol Market — Achetez des produits vérifiés au Sénégal',
  description: 'Découvrez des produits locaux vérifiés, commandez simplement et suivez votre livraison avec paiement à la réception sur Baol Market.',
}

export default async function Home() {
  const { data: categories, error } = await supabase
    .from('categories')
    .select('id, name, slug, description, image_url')
    .order('name')

  if (error) {
    return (
      <main className="flex flex-col items-center justify-center p-6 py-32 text-center bg-gray-50 min-h-[60vh]">
        <EmptyState
          title="Oups, un souci technique"
          description="Nous n'avons pas pu charger le catalogue pour le moment. Veuillez réessayer dans quelques instants."
          actionText="Recharger la page"
          href="/"
          icon={<ShieldCheck className="w-12 h-12" />}
        />
      </main>
    )
  }

  return (
    <main className="bg-(--fond) pb-20">
      {/* Hero Section */}
      <section className="bg-(--fond) text-(--encre) overflow-hidden border-b border-gray-100 relative hero-pattern">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
            <div className="max-w-2xl flex-1 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 bg-(--vert-baol)/10 rounded-full px-4 py-1.5 text-xs font-bold text-(--vert-baol-fonce) mb-6 shadow-sm border border-(--vert-baol)/20">
                <ShieldCheck className="w-4 h-4" />
                Marketplace vérifiée au Sénégal
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-[1.15] text-(--encre)">
                Des produits vérifiés,
                <br />
                <span className="text-(--vert-baol) inline-block mt-2">livrés en confiance.</span>
              </h1>

              <p className="text-base md:text-lg text-(--gris-texte) max-w-xl mb-10 leading-relaxed">
                Chaque article est inspecté physiquement par notre équipe avant mise en vente. 
                Achetez local, commandez simplement et payez à la livraison en toute sérénité.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <Link href="/produits" className="w-full sm:w-auto">
                  <Button variant="primary" className="w-full sm:w-auto text-base shadow-md hover:shadow-lg transition-shadow">
                    Découvrir les produits
                  </Button>
                </Link>
                <Link href="/suivi" className="w-full sm:w-auto">
                  <Button variant="ghost" className="w-full sm:w-auto text-base border border-gray-200 hover:border-gray-300">
                    <Truck className="w-4 h-4 mr-2" />
                    Suivre ma commande
                  </Button>
                </Link>
              </div>
            </div>

            {/* Zone visuelle décorative */}
            <div className="hidden lg:flex flex-1 justify-end animate-slide-in-right">
              <div className="relative w-full max-w-md aspect-square rounded-[2rem] bg-gradient-to-br from-(--vert-baol)/10 to-(--or-senegal)/10 border border-(--vert-baol)/20 flex items-center justify-center shadow-xl p-8">
                <div className="absolute top-10 right-10 bg-white p-4 rounded-2xl shadow-lg border border-gray-100 flex items-center gap-3 animate-fade-in-up stagger-1">
                  <div className="bg-green-100 p-2 rounded-full text-green-600">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-(--encre)">Produit vérifié</p>
                    <p className="text-xs text-(--gris-texte)">Qualité garantie</p>
                  </div>
                </div>
                <div className="absolute bottom-20 left-4 bg-white p-4 rounded-2xl shadow-lg border border-gray-100 flex items-center gap-3 animate-fade-in-up stagger-2">
                  <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-(--encre)">Paiement à la livraison</p>
                    <p className="text-xs text-(--gris-texte)">100% sécurisé</p>
                  </div>
                </div>
                {/* Centre logo mark */}
                <Image 
                  src="/logo-bm.png" 
                  alt="Sceau Baol Market" 
                  width={200} 
                  height={200} 
                  className="w-32 h-32 object-contain opacity-80 drop-shadow-xl"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Réassurance */}
      <section className="bg-white border-b border-gray-100 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <article className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
              <div className="bg-(--vert-baol)/10 p-3 rounded-xl text-(--vert-baol) shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-(--encre) text-base mb-1">Produits vérifiés</h3>
                <p className="text-sm text-(--gris-texte) leading-relaxed">
                  Chaque produit est contrôlé physiquement par notre équipe avant expédition.
                </p>
              </div>
            </article>
            <article className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
              <div className="bg-(--or-senegal)/10 p-3 rounded-xl text-yellow-600 shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-(--encre) text-base mb-1">Paiement à la livraison</h3>
                <p className="text-sm text-(--gris-texte) leading-relaxed">
                  Pas de carte requise, réglez vos achats en espèces lors de la réception.
                </p>
              </div>
            </article>
            <article className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
              <div className="bg-blue-50 p-3 rounded-xl text-blue-600 shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-(--encre) text-base mb-1">Suivi de commande</h3>
                <p className="text-sm text-(--gris-texte) leading-relaxed">
                  Un code unique pour suivre l&apos;évolution de votre livraison en temps réel.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Catégories */}
      <section id="catalogue" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-(--encre) mb-2">Nos catégories</h2>
            <p className="text-base text-(--gris-texte)">Explorez nos produits locaux et vérifiés</p>
          </div>
          <Link 
            href="/produits" 
            className="text-sm font-bold text-(--vert-baol) hover:text-(--vert-baol-fonce) transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded-md px-2 py-1"
          >
            Tous les produits
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {!categories || categories.length === 0 ? (
          <EmptyState
            title="Catalogue en préparation"
            description="Notre équipe vérifie actuellement de nouveaux produits. Revenez très vite !"
            icon={<ShoppingBag className="w-12 h-12" />}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/categorie/${category.slug}`}
                className="group bg-white rounded-2xl overflow-hidden border border-gray-100 flex flex-col hover:-translate-y-1 hover:shadow-lg transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol)"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-gray-50 flex items-center justify-center relative">
                  {category.image_url ? (
                    <Image
                      src={category.image_url}
                      alt={`Catégorie ${category.name}`}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center">
                      <ShoppingBag className="w-7 h-7" />
                    </div>
                  )}
                </div>
                <div className="p-4 md:p-5 flex flex-col grow">
                  <h3 className="text-base md:text-lg font-bold text-(--encre) mb-1">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-(--gris-texte) line-clamp-2">{category.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Comment ça marche */}
      <section className="bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-(--encre) mb-3">Comment ça marche ?</h2>
            <p className="text-base text-(--gris-texte) max-w-2xl mx-auto">
              Une expérience d&apos;achat simple, transparente et sécurisée en 4 étapes.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
            {[
              {
                step: '1',
                title: 'Choisissez',
                desc: 'Parcourez nos catégories et trouvez le produit qu&apos;il vous faut.',
                icon: <ShoppingBag className="w-7 h-7" />,
              },
              {
                step: '2',
                title: 'Commandez',
                desc: 'Passez commande avec ou sans compte en quelques secondes.',
                icon: <CheckCircle className="w-7 h-7" />,
              },
              {
                step: '3',
                title: 'Suivez',
                desc: 'Utilisez votre code pour suivre l&apos;évolution de la livraison.',
                icon: <MapPin className="w-7 h-7" />,
              },
              {
                step: '4',
                title: 'Payez',
                desc: 'Réglez votre achat en espèces une fois le produit livré chez vous.',
                icon: <Wallet className="w-7 h-7" />,
              },
            ].map((item, index) => (
              <div key={item.step} className="relative flex flex-col items-center text-center group">
                <div className="w-20 h-20 rounded-2xl bg-white border border-gray-100 shadow-sm text-(--vert-baol) flex items-center justify-center mb-6 group-hover:-translate-y-2 group-hover:shadow-md transition-all duration-300 relative z-10">
                  {item.icon}
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-(--encre) text-white text-sm font-bold flex items-center justify-center shadow-sm">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-(--encre) mb-2">{item.title}</h3>
                <p className="text-sm text-(--gris-texte) leading-relaxed px-4">{item.desc}</p>
                
                {/* Connecteur visuel desktop uniquement */}
                {index < 3 && (
                  <div className="hidden lg:block absolute top-10 left-[65%] w-[70%] h-[2px] bg-gray-200 border-t-2 border-dashed border-gray-300 -z-0"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}