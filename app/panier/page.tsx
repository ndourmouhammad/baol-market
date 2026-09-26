'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/components/CartContext'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react'

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCart()

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <EmptyState
          title="Votre panier est vide"
          description="Parcourez le catalogue pour ajouter des produits."
          actionText="Voir le catalogue"
          onAction={() => { window.location.href = '/produits' }}
        />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl md:text-3xl font-bold text-(--encre) mb-8">Votre panier</h1>

      <div className="space-y-4 mb-8">
        {items.map((item) => (
          <div key={item.productId} className="bg-white border border-gray-100 rounded-2xl p-4 flex gap-4 items-center">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-50 shrink-0 relative">
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt={item.name} fill sizes="80px" className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <ShoppingBag className="w-6 h-6" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-(--encre) truncate">{item.name}</h3>
              <p className="text-sm text-(--gris-texte)">{item.price.toLocaleString('fr-SN')} FCFA</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50"
                aria-label="Diminuer la quantité"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center font-medium">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50"
                aria-label="Augmenter la quantité"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => removeItem(item.productId)}
              className="text-(--rouge-erreur) hover:bg-red-50 p-2 rounded-lg shrink-0"
              aria-label="Retirer du panier"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg text-(--gris-texte)">Sous-total</span>
          <span className="text-2xl font-bold text-(--encre)">{subtotal.toLocaleString('fr-SN')} FCFA</span>
        </div>
        <p className="text-xs text-(--gris-texte) mb-4">Les frais de livraison seront ajoutés à l&#39;étape suivante.</p>
        <Link href="/commande" className="block w-full">
          <Button fullWidth size="lg">Passer la commande</Button>
        </Link>
      </div>
    </div>
  )
}