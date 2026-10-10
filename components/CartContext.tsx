'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { fetchLivePrices, type LivePrice } from '@/lib/livePrices'

export type CartItem = {
  productId: string
  name: string
  price: number
  imageUrl: string | null
  quantity: number
}

// Une ligne du panier avec les prix ACTUELS (ceux que le serveur facturera maintenant)
export type CartLine = CartItem & {
  unitPrice: number
  regularPrice: number
  onSale: boolean
  available: boolean
}

type CartContextType = {
  items: CartItem[]
  lines: CartLine[]
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void
  updateQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  clearCart: () => void
  totalItems: number
  /** Total des produits disponibles, aux prix actuels */
  subtotal: number
  /** Au moins un produit du panier n'est plus disponible */
  hasUnavailable: boolean
  /** Redemande les prix au serveur ; retourne null si la vérification a échoué */
  refreshPrices: () => Promise<Record<string, LivePrice> | null>
}

const CartContext = createContext<CartContextType | null>(null)

const STORAGE_KEY = 'baol-market-cart'
const PRICE_REFRESH_MS = 60_000

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [livePrices, setLivePrices] = useState<Record<string, LivePrice>>({})
  const itemsRef = useRef<CartItem[]>([])

  // Charger le panier depuis localStorage au montage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setItems(JSON.parse(stored))
    } catch (e) {
      console.error('Erreur lecture panier:', e)
    }
    setHydrated(true)
  }, [])

  // Sauvegarder à chaque changement (après hydratation, pour ne pas écraser au premier rendu)
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch (e) {
      console.error('Erreur sauvegarde panier:', e)
    }
  }, [items, hydrated])

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const refreshPrices = useCallback(async () => {
    const ids = itemsRef.current.map((i) => i.productId)
    if (ids.length === 0) return {}
    const prices = await fetchLivePrices(ids)
    if (prices) setLivePrices((previous) => ({ ...previous, ...prices }))
    return prices
  }, [])

  // Prix actuels : à l'arrivée, quand les produits du panier changent,
  // toutes les minutes, et quand le client revient sur l'onglet.
  const idsKey = items.map((i) => i.productId).sort().join(',')
  useEffect(() => {
    if (!hydrated || idsKey === '') return

    refreshPrices()
    const timer = setInterval(refreshPrices, PRICE_REFRESH_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshPrices()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [hydrated, idsKey, refreshPrices])

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId)
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId ? { ...i, quantity: i.quantity + quantity } : i
        )
      }
      return [...prev, { ...item, quantity }]
    })
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((i) => i.productId !== productId)
      return prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    })
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  // Tant que le serveur n'a pas répondu (ou s'il est injoignable), on garde le prix enregistré
  const lines: CartLine[] = items.map((item) => {
    const live = livePrices[item.productId]
    const unitPrice = live ? live.unitPrice : item.price
    const regularPrice = live ? live.regularPrice : item.price
    return {
      ...item,
      unitPrice,
      regularPrice,
      onSale: unitPrice < regularPrice,
      available: live ? live.available : true,
    }
  })

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const subtotal = lines.reduce((sum, line) => sum + (line.available ? line.unitPrice * line.quantity : 0), 0)
  const hasUnavailable = lines.some((line) => !line.available)

  return (
    <CartContext.Provider
      value={{ items, lines, addItem, updateQuantity, removeItem, clearCart, totalItems, subtotal, hasUnavailable, refreshPrices }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart doit être utilisé à l\'intérieur d\'un CartProvider')
  return context
}
