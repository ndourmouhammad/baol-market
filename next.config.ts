import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bjjrjwokwqnqpbjeucrq.supabase.co',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      ...[
        '/admin/:path*',
        '/panier',
        '/commande',
        '/orders',
        '/order/:path*',
        '/login',
        '/signup',
        '/mot-de-passe-oublie',
        '/reinitialiser-mot-de-passe',
        '/paiement/:path*',
        '/auth/:path*',
        '/profil',
      ].map((source) => ({
        source,
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      })),
    ]
  },
};

export default nextConfig;
