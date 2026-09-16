import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-baobab text-sable py-12 mt-auto border-t border-baobab">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Marque */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h2 className="font-serif text-2xl font-bold mb-2">Baol Market</h2>
            <p className="text-sm opacity-70 max-w-xs">
              La marketplace de proximité au Sénégal. Confiance et vérification physique de tous les produits.
            </p>
          </div>

          {/* Liens Rapides */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h3 className="font-serif text-lg font-semibold mb-4 text-mil">Liens utiles</h3>
            <ul className="space-y-2 text-sm opacity-80">
              <li>
                <Link href="/" className="hover:text-mil hover:underline transition-colors">
                  Catalogue
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-mil hover:underline transition-colors">
                  Mes commandes
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h3 className="font-serif text-lg font-semibold mb-4 text-mil">Contact</h3>
            <ul className="space-y-2 text-sm opacity-80">
              <li>
                <a href="#" className="hover:text-mil hover:underline transition-colors">
                  Service Client (WhatsApp)
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-mil hover:underline transition-colors">
                  Devenir Vendeur
                </a>
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-sable/10 mt-12 pt-6 text-center text-xs opacity-50">
          <p>&copy; {new Date().getFullYear()} Baol Market. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  )
}
