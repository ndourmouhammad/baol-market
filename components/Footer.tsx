import Link from 'next/link'
import { ShieldCheck, Truck, MessageCircle } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-baobab text-sable mt-auto">
      {/* Bandeau de confiance */}
      <div className="border-b border-sable/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            <div className="flex items-center gap-4 justify-center sm:justify-start">
              <div className="w-12 h-12 rounded-xl bg-vert-feuille/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-vert-feuille" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Produits Vérifiés</h4>
                <p className="text-xs text-sable/60 mt-0.5">Inspectés physiquement par notre équipe</p>
              </div>
            </div>
            <div className="flex items-center gap-4 justify-center sm:justify-start">
              <div className="w-12 h-12 rounded-xl bg-mil/20 flex items-center justify-center shrink-0">
                <Truck className="w-6 h-6 text-mil" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Livraison Rapide</h4>
                <p className="text-xs text-sable/60 mt-0.5">Dakar, Rufisque, Diourbel, Touba</p>
              </div>
            </div>
            <div className="flex items-center gap-4 justify-center sm:justify-start">
              <div className="w-12 h-12 rounded-xl bg-terre/20 flex items-center justify-center shrink-0">
                <MessageCircle className="w-6 h-6 text-terre" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Support WhatsApp</h4>
                <p className="text-xs text-sable/60 mt-0.5">Assistance disponible 7j/7</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">

          {/* Marque */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-terre rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-sable" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="font-serif font-bold text-xl">Baol Market</span>
            </div>
            <p className="text-sm text-sable/60 leading-relaxed max-w-xs">
              La marketplace de proximité au Sénégal. Confiance et vérification physique de tous les produits.
            </p>
          </div>

          {/* Naviguer */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-mil mb-4">Naviguer</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-sm text-sable/70 hover:text-sable transition-colors">
                  Catalogue
                </Link>
              </li>
              <li>
                <Link href="/orders" className="text-sm text-sable/70 hover:text-sable transition-colors">
                  Mes commandes
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-sm text-sable/70 hover:text-sable transition-colors">
                  Mon compte
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-mil mb-4">Support</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://wa.me/221770000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-sable/70 hover:text-sable transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </a>
              </li>
              <li>
                <a href="mailto:contact@baolmarket.sn" className="text-sm text-sable/70 hover:text-sable transition-colors">
                  contact@baolmarket.sn
                </a>
              </li>
              <li>
                <span className="text-sm text-sable/70">
                  Devenir vendeur
                </span>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-mil mb-4">À propos</h3>
            <ul className="space-y-3">
              <li>
                <span className="text-sm text-sable/70">Comment ça marche</span>
              </li>
              <li>
                <span className="text-sm text-sable/70">Conditions d&#39;utilisation</span>
              </li>
              <li>
                <span className="text-sm text-sable/70">Politique de confidentialité</span>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-sable/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-sable/40">
            &copy; {new Date().getFullYear()} Baol Market. Tous droits réservés.
          </p>
          <p className="text-xs text-sable/40">
            Fait avec ❤️ au Sénégal
          </p>
        </div>
      </div>
    </footer>
  )
}
