'use client'

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import VerifiedBadge from './VerifiedBadge';
import { Button } from './Button';
import { ShoppingBag, Plus, Check } from 'lucide-react';
import { useCart } from '@/components/CartContext';
import { useState } from 'react';

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
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)

  function handleAddToCart() {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.image_url,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <article className="group bg-white rounded-2xl overflow-hidden border border-gray-100 flex flex-col hover:-translate-y-1 hover:shadow-lg transition-all duration-300 focus-within:ring-2 focus-within:ring-(--vert-baol) focus-within:ring-offset-2">
      <div className="aspect-[4/3] w-full overflow-hidden bg-gray-50 flex items-center justify-center relative">
        <div className="absolute top-2 left-2 z-10">
          <VerifiedBadge />
        </div>
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={`Image de ${product.name}`}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center gap-2 text-gray-400">
            <ShoppingBag className="w-8 h-8" />
            <span className="text-xs font-medium">Photo à venir</span>
          </div>
        )}
      </div>
      <div className="p-4 md:p-5 flex flex-col grow">
        <h3 className="text-base md:text-lg font-bold text-(--encre) mb-1 line-clamp-1" title={product.name}>
          {product.name}
        </h3>
        <p className="text-sm text-(--gris-texte) line-clamp-2 mb-4 grow" title={product.description || undefined}>
          {product.description}
        </p>
        <div className="mt-auto flex flex-col gap-2">
          <p className="text-xl font-bold text-(--encre)">
            {product.price.toLocaleString('fr-SN')} <span className="text-sm font-medium text-(--gris-texte)">FCFA</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddToCart}
              className="shadow-sm focus-visible:ring-2 focus-visible:ring-(--vert-baol) focus-visible:ring-offset-2"
            >
              {added ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {added ? 'Ajouté' : 'Ajouter'}
            </Button>
            <Link href={`/order/${product.id}`} className="block w-full outline-none" tabIndex={-1}>
              <Button fullWidth size="sm" className="shadow-sm focus-visible:ring-2 focus-visible:ring-(--vert-baol) focus-visible:ring-offset-2">
                Commander
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}