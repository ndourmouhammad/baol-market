'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

export default function Footer() {
  const pathname = usePathname()

  // Masquer sur les pages d'auth
  if (pathname === '/login' || pathname === '/signup') {
    return null
  }

  return (
    <footer className="bg-(--encre) text-white mt-auto border-t border-(--vert-baol)/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          
          {/* Logo et description */}
          <div className="flex flex-col gap-5 lg:col-span-2 pr-0 lg:pr-12">
            <Link 
              href="/" 
              className="inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded-md w-max"
              aria-label="Baol Market - Accueil"
            >
              <Image 
                src="/logo-bm.png" 
                alt="Baol Market Logo" 
                width={160} 
                height={46} 
                className="h-10 md:h-12 w-auto object-contain"
              />
            </Link>
            <p className="text-sm md:text-base text-gray-300 leading-relaxed max-w-sm">
              La marketplace de proximité au Sénégal. Confiance et vérification physique de tous les produits avant livraison.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-bold text-lg text-white mb-5">Explorer</h3>
            <ul className="space-y-4">
              <li>
                <Link 
                  href="/produits" 
                  className="text-sm text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded-sm px-1 -ml-1"
                >
                  Catalogue
                </Link>
              </li>
              <li>
                <Link 
                  href="/suivi" 
                  className="text-sm text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded-sm px-1 -ml-1"
                >
                  Suivre ma commande
                </Link>
              </li>
              <li>
                <Link 
                  href="/orders" 
                  className="text-sm text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded-sm px-1 -ml-1"
                >
                  Mes commandes
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-lg text-white mb-5">Support</h3>
            <ul className="space-y-4">
              <li>
                <a 
                  href="https://wa.me/221781507505" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded-sm px-1 -ml-1"
                  aria-label="Nous contacter sur WhatsApp"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </a>
              </li>
              <li>
                <span className="text-sm text-gray-400">
                  Dakar, Sénégal
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Barre de copyright */}
      <div className="border-t border-white/10 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500 font-medium">
            &copy; {new Date().getFullYear()} Baol Market. Tous droits réservés.
          </p>
          <div className="flex gap-4">
            <span className="text-xs text-gray-500 font-medium cursor-default">Mentions légales</span>
            <span className="text-xs text-gray-500 font-medium cursor-default">CGV</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
