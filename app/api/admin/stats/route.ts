import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff, hasRole } from '@/lib/verifyStaff'

/** Statuts de commande dont les lignes comptent comme des ventes. */
const SALE_STATUSES = ['paid', 'preparing', 'confirmed', 'delivering', 'delivered']

const VALID_PERIODS = ['7', '30', 'all'] as const
type Period = (typeof VALID_PERIODS)[number]

export async function GET(request: NextRequest) {
  const staff = await verifyStaff(request)
  if (!staff || !hasRole(staff.role, 'admin')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  try {
    // ── Paramètre de période ──
    const periodParam = request.nextUrl.searchParams.get('period') ?? 'all'
    const period: Period = VALID_PERIODS.includes(periodParam as Period)
      ? (periodParam as Period)
      : 'all'

    // 1. Fetch total orders and calculate revenue
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, total_amount, status, created_at, customer_id, payment_method, fulfillment_method')
      .order('created_at', { ascending: false })

    if (ordersError) throw ordersError

    const totalOrders = orders.length
    // Commandes en attente : payées mais pas encore livrées
    const pendingOrders = orders.filter(o => ['paid', 'preparing', 'confirmed', 'delivering'].includes(o.status)).length
    
    // Commandes livrées = ventes confirmées
    const deliveredOrders = orders.filter(o => o.status === 'delivered')
    const completedSales = deliveredOrders.length

    // Chiffre d'affaires : somme des commandes payées (paid, preparing, confirmed, delivering, delivered)
    const paidStatuses = ['paid', 'preparing', 'confirmed', 'delivering', 'delivered']
    const totalRevenue = orders
      .filter(o => paidStatuses.includes(o.status))
      .reduce((sum, order) => sum + (order.total_amount || 0), 0)

    // Montant réellement encaissé (commandes livrées uniquement)
    const collectedRevenue = deliveredOrders
      .reduce((sum, order) => sum + (order.total_amount || 0), 0)

    const recentOrders = orders.slice(0, 5) // 5 most recent

    // 2. Count active products
    const { count: productsCount, error: productsError } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })

    if (productsError) throw productsError

    // 3. Count merchants
    const { count: merchantsCount, error: merchantsError } = await supabaseAdmin
      .from('merchants')
      .select('*', { count: 'exact', head: true })

    if (merchantsError) throw merchantsError

    // 4. Count riders
    const { count: ridersCount, error: ridersError } = await supabaseAdmin
      .from('riders')
      .select('*', { count: 'exact', head: true })

    if (ridersError) throw ridersError

    // ── 5. Top produits & catégories (ventes uniquement) ──
    const topSales = await computeTopSales(orders, period)

    return NextResponse.json({
      stats: {
        totalOrders,
        pendingOrders,
        completedSales,
        totalRevenue,
        collectedRevenue,
        productsCount: productsCount || 0,
        partnersCount: (merchantsCount || 0) + (ridersCount || 0)
      },
      recentOrders,
      topSales,
    })
  } catch (error) {
    console.error('Erreur API Stats:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

// ─── Calcul du top produits & catégories ────────────────────────────────

type OrderRow = { id: string; status: string; created_at: string }

async function computeTopSales(allOrders: OrderRow[], period: Period) {
  // Filtrer les commandes éligibles (statut de vente + période)
  let cutoff: Date | null = null
  if (period !== 'all') {
    cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - Number(period))
  }

  const saleOrders = allOrders.filter((o) => {
    if (!SALE_STATUSES.includes(o.status)) return false
    if (cutoff && new Date(o.created_at) < cutoff) return false
    return true
  })

  if (saleOrders.length === 0) {
    return { topProduct: null, topCategory: null, topProducts: [], topCategories: [] }
  }

  const saleOrderIds = saleOrders.map((o) => o.id)

  // Récupérer les order_items par pages de 1000 (limite Supabase)
  const PAGE_SIZE = 1000
  type ItemRow = { product_id: string; quantity: number; unit_price: number; order_id: string }
  const allItems: ItemRow[] = []

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from('order_items')
      .select('product_id, quantity, unit_price, order_id')
      .in('order_id', saleOrderIds)
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) throw error
    if (!data || data.length === 0) break
    allItems.push(...(data as ItemRow[]))
    if (data.length < PAGE_SIZE) break
  }

  if (allItems.length === 0) {
    return { topProduct: null, topCategory: null, topProducts: [], topCategories: [] }
  }

  // Construire un index order_id → created_at pour le tie-break
  const orderDateMap = new Map<string, string>()
  for (const o of saleOrders) orderDateMap.set(o.id, o.created_at)

  // Agréger par produit
  type Agg = { quantity: number; revenue: number; lastSaleAt: string }
  const productAgg = new Map<string, Agg>()

  for (const item of allItems) {
    const existing = productAgg.get(item.product_id)
    const revenue = item.quantity * item.unit_price
    const saleAt = orderDateMap.get(item.order_id) ?? ''
    if (existing) {
      existing.quantity += item.quantity
      existing.revenue += revenue
      if (saleAt > existing.lastSaleAt) existing.lastSaleAt = saleAt
    } else {
      productAgg.set(item.product_id, { quantity: item.quantity, revenue, lastSaleAt: saleAt })
    }
  }

  // Récupérer les noms et category_id des produits concernés
  const productIds = [...productAgg.keys()]
  const productInfoMap = new Map<string, { name: string; category_id: string | null }>()

  for (let offset = 0; offset < productIds.length; offset += PAGE_SIZE) {
    const batch = productIds.slice(offset, offset + PAGE_SIZE)
    const { data } = await supabaseAdmin
      .from('products')
      .select('id, name, category_id')
      .in('id', batch)
    if (data) {
      for (const p of data) {
        productInfoMap.set(p.id, { name: p.name as string, category_id: p.category_id as string | null })
      }
    }
  }

  // Classement des produits
  const sortedProducts = [...productAgg.entries()]
    .map(([id, agg]) => ({
      id,
      name: productInfoMap.get(id)?.name ?? 'Produit supprimé',
      quantity: agg.quantity,
      revenue: agg.revenue,
      lastSaleAt: agg.lastSaleAt,
    }))
    .sort((a, b) => b.quantity - a.quantity || new Date(b.lastSaleAt).getTime() - new Date(a.lastSaleAt).getTime())

  // Agréger par catégorie
  const categoryAgg = new Map<string, Agg>()
  for (const [productId, agg] of productAgg) {
    const catId = productInfoMap.get(productId)?.category_id
    if (!catId) continue
    const existing = categoryAgg.get(catId)
    if (existing) {
      existing.quantity += agg.quantity
      existing.revenue += agg.revenue
      if (agg.lastSaleAt > existing.lastSaleAt) existing.lastSaleAt = agg.lastSaleAt
    } else {
      categoryAgg.set(catId, { quantity: agg.quantity, revenue: agg.revenue, lastSaleAt: agg.lastSaleAt })
    }
  }

  // Récupérer les noms de catégories
  const categoryIds = [...categoryAgg.keys()]
  const categoryNameMap = new Map<string, string>()
  if (categoryIds.length > 0) {
    for (let offset = 0; offset < categoryIds.length; offset += PAGE_SIZE) {
      const batch = categoryIds.slice(offset, offset + PAGE_SIZE)
      const { data } = await supabaseAdmin.from('categories').select('id, name').in('id', batch)
      if (data) {
        for (const c of data) categoryNameMap.set(String(c.id), c.name as string)
      }
    }
  }

  const sortedCategories = [...categoryAgg.entries()]
    .map(([id, agg]) => ({
      id,
      name: categoryNameMap.get(id) ?? 'Catégorie supprimée',
      quantity: agg.quantity,
      revenue: agg.revenue,
      lastSaleAt: agg.lastSaleAt,
    }))
    .sort((a, b) => b.quantity - a.quantity || new Date(b.lastSaleAt).getTime() - new Date(a.lastSaleAt).getTime())

  const top5Products = sortedProducts.slice(0, 5).map((p) => ({
    id: p.id,
    name: p.name,
    quantity: p.quantity,
    revenue: p.revenue,
  }))
  const top5Categories = sortedCategories.slice(0, 5).map((c) => ({
    id: c.id,
    name: c.name,
    quantity: c.quantity,
    revenue: c.revenue,
  }))

  return {
    topProduct: top5Products[0] ?? null,
    topCategory: top5Categories[0] ?? null,
    topProducts: top5Products,
    topCategories: top5Categories,
  }
}
