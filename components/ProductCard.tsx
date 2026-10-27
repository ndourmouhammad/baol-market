'use client'

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import VerifiedBadge from './VerifiedBadge';
import { Button } from './Button';
import { ShoppingBag, Plus, Check, MessageSquare } from 'lucide-react';
import { useCart } from '@/components/CartContext';
import type { FlashDisplay } from '@/lib/flashSale';
import { isVisitProduct, getVisitWhatsAppUrl } from '@/lib/visitFulfillment';
import { useState } from 'react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  // Vente flash en cours (calculée côté serveur), sinon absente
  flash?: FlashDisplay | null;
  fulfillment_type?: string | null;
  categories?: { fulfillment_type?: string | null } | { fulfillment_type?: string | null }[] | null;
  size_options?: string[] | null;
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)

  const isVisit = isVisitProduct(product)
  const flash = isVisit ? null : (product.flash ?? null)
  const currentPrice = flash ? flash.price : product.price
  const shortDescription = product.description
    ? product.description.length > 80
      ? product.description.slice(0, 80).trim() + '…'
      : product.description
    : null

  function handleAddToCart() {
    if (isVisit) return
    addItem({
      productId: product.id,
      name: product.name,
      price: currentPrice,
      imageUrl: product.image_url,
      fulfillmentType: product.fulfillment_type ?? (Array.isArray(product.categories) ? product.categories[0]?.fulfillment_type : product.categories?.fulfillment_type),
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <article className="group bg-white rounded-2xl overflow-hidden border border-gray-100 flex flex-col hover:-translate-y-1 hover:shadow-lg transition-all duration-300 focus-within:ring-2 focus-within:ring-(--vert-baol) focus-within:ring-offset-2 h-full">
      <Link
        href={`/produit/${product.id}`}
        aria-label={`Voir la fiche de ${product.name}`}
        className="relative block aspect-square w-full overflow-hidden bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) focus-visible:ring-inset"
      >
        <div className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 z-10 origin-top-left scale-[0.75] sm:scale-100 [&>div]:!top-0 [&>div]:!left-0">
          <VerifiedBadge />
        </div>
        {flash && (
          <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10 bg-(--rouge-baol) text-white text-[10px] sm:text-xs font-bold px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full shadow-sm">
            -{flash.percent} %
          </span>
        )}
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={`Image de ${product.name}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400 bg-gray-50">
            <ShoppingBag className="w-8 h-8" />
            <span className="text-xs font-medium">Photo à venir</span>
          </div>
        )}
      </Link>
      <div className="p-3 md:p-5 flex flex-col grow justify-between">
        <div>
          <h3
            className="text-sm sm:text-base md:text-lg font-bold text-(--encre) mb-1 line-clamp-2 min-h-[2.5rem] sm:min-h-0 sm:line-clamp-1"
            title={product.name}
          >
            <Link
              href={`/produit/${product.id}`}
              className="hover:text-(--vert-baol) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vert-baol) rounded"
            >
              {product.name}
            </Link>
          </h3>
          {shortDescription && (
            <p
              className="hidden sm:block text-sm text-(--gris-texte) sm:h-10 overflow-hidden mb-4"
              title={product.description || undefined}
            >
              {shortDescription}
            </p>
          )}
        </div>
        <div className="mt-auto flex flex-col gap-2 pt-1 sm:pt-0">
          {isVisit ? (
            <div>
              <p className="text-base md:text-xl font-bold text-(--encre)">
                {product.price.toLocaleString('fr-SN')}{' '}
                <span className="text-xs md:text-sm font-medium text-(--gris-texte)">FCFA</span>
              </p>
              <p className="text-xs text-(--gris-texte) font-medium mt-0.5">
                Prix indicatif
              </p>
            </div>
          ) : flash ? (
            <div>
              <p className="flex items-baseline gap-1.5 md:gap-2 flex-wrap">
                <span className="text-base md:text-xl font-bold text-(--rouge-baol)">
                  {flash.price.toLocaleString('fr-SN')} <span className="text-xs md:text-sm font-medium">FCFA</span>
                </span>
                <span className="text-xs md:text-sm text-gray-400 line-through">
                  {product.price.toLocaleString('fr-SN')} FCFA
                </span>
              </p>
              <p className="text-[11px] md:text-xs text-(--rouge-baol) font-medium mt-0.5">
                Vente flash jusqu&apos;au{' '}
                {new Date(flash.endsAt).toLocaleString('fr-FR', {
                  timeZone: 'Africa/Dakar',
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          ) : (
            <p className="text-base md:text-xl font-bold text-(--encre)">
              {product.price.toLocaleString('fr-SN')} <span className="text-xs md:text-sm font-medium text-(--gris-texte)">FCFA</span>
            </p>
          )}
          {isVisit ? (
            <a
              href={getVisitWhatsAppUrl({ id: product.id, name: product.name })}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 min-h-[40px] px-3 py-2 rounded-xl text-sm font-bold text-white bg-[#25D366] hover:bg-[#1EBE5D] shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]"
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>Demander une visite</span>
            </a>
          ) : Array.isArray(product.size_options) && product.size_options.length > 0 ? (
            <Link href={`/produit/${product.id}`} className="block w-full outline-none">
              <Button
                variant="primary"
                fullWidth
                size="sm"
                className="min-h-[40px] text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-(--vert-baol) focus-visible:ring-offset-2"
              >
                Choisir la taille
              </Button>
            </Link>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={handleAddToCart}
                className="min-h-[40px] text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-(--vert-baol) focus-visible:ring-offset-2 gap-1.5"
              >
                {added ? <Check className="w-4 h-4 shrink-0" /> : <Plus className="w-4 h-4 shrink-0" />}
                <span>{added ? 'Ajouté' : 'Ajouter'}</span>
              </Button>
              <Link href={`/order/${product.id}`} className="block w-full outline-none" tabIndex={-1}>
                <Button
                  variant="primary"
                  fullWidth
                  size="sm"
                  className="min-h-[40px] text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-(--vert-baol) focus-visible:ring-offset-2"
                >
                  Commander
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}