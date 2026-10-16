import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/siteUrl'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/api/',
        '/panier',
        '/commande',
        '/orders',
        '/order/',
        '/login',
        '/signup',
        '/mot-de-passe-oublie',
        '/reinitialiser-mot-de-passe',
        '/paiement',
        '/auth',
        '/profil',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
