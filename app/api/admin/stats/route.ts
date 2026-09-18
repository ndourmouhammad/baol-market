import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAdmin } from '@/lib/verifyAdmin'

export async function GET(request: Request) {
  const admin = await verifyAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  try {
    // 1. Fetch total orders and calculate revenue
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, total_amount, status, created_at, customer_id, payment_method')
      .order('created_at', { ascending: false })

    if (ordersError) throw ordersError

    const totalOrders = orders.length
    const pendingOrders = orders.filter(o => o.status === 'created' || o.status === 'confirmed' || o.status === 'payment_pending').length
    
    // Commandes livrées = ventes confirmées
    const deliveredOrders = orders.filter(o => o.status === 'delivered')
    const completedSales = deliveredOrders.length

    // Chiffre d'affaires global (toutes commandes sauf annulées/remboursées)
    const totalRevenue = orders
      .filter(o => o.status !== 'cancelled' && o.status !== 'refunded')
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
      recentOrders
    })
  } catch (error: any) {
    console.error('Erreur API Stats:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
