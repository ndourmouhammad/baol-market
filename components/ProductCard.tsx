import React from 'react';
import Link from 'next/link';
import VerifiedBadge from './VerifiedBadge';
import { Button } from './Button';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="group bg-white rounded-2xl overflow-hidden border border-gray-100 flex flex-col hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
      <div className="aspect-square w-full overflow-hidden bg-gray-50 flex items-center justify-center relative">
        <VerifiedBadge />
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-2">
            <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs text-gray-400 font-medium">Photo à venir</span>
          </div>
        )}
      </div>
      <div className="p-4 md:p-5 flex flex-col grow">
        <h3 className="text-lg font-bold text-(--encre) mb-1 line-clamp-1">{product.name}</h3>
        <p className="text-sm text-(--gris-texte) line-clamp-2 mb-4 grow">{product.description}</p>
        <div className="mt-auto">
          <p className="text-xl font-bold text-(--encre) mb-4">
            {product.price.toLocaleString('fr-SN')} <span className="text-sm font-medium text-(--gris-texte)">FCFA</span>
          </p>
          <Link href={`/order/${product.id}`} className="block w-full">
            <Button fullWidth>Commander</Button>
          </Link>
        </div>
      </div>
    </article>
  );
}
