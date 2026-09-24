'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Footer() {
  const pathname = usePathname()

  if (pathname === '/login' || pathname === '/signup') {
    return null
  }

  return (
    <footer className="bg-(--encre) text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo-bm.png" alt="Baol Market" className="h-10 w-auto" />
            </Link>
            <p className="text-sm text-white/80 max-w-xs">
              La marketplace de proximité au Sénégal. Confiance et vérification physique de tous les produits.
            </p>
          </div>

          <div className="flex gap-16">
            <div>
              <h3 className="font-semibold text-sm mb-4">Liens Utiles</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/" className="text-sm text-white/70 hover:text-white transition-colors">
                    Catalogue
                  </Link>
                </li>
                <li>
                  <Link href="/orders" className="text-sm text-white/70 hover:text-white transition-colors">
                    Mes commandes
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-4">Support</h3>
              <ul className="space-y-3">
                <li>
                  <a href="https://wa.me/221770000000" target="_blank" rel="noopener noreferrer" className="text-sm text-white/70 hover:text-white transition-colors">
                    WhatsApp
                  </a>
                </li>
                <li>
                  <span className="text-sm text-white/70">
                    Mentions légales
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-xs text-white/50">
            &copy; {new Date().getFullYear()} Baol Market. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  )
}
