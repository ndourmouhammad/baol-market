import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requestPaytechPayment } from '@/lib/paytech'

type CartItemInput = { productId: string; quantity: number }

export async function POST(request: Request) {
  const body = await request.json()
  const { items, deliveryZoneId, customerId } = body as {
    items: CartItemInput[]
    deliveryZoneId: string
    customerId?: string
  }

  if (!customerId) {
    return NextResponse.json({ error: 'Vous devez être connecté pour passer commande.' }, { status: 401 })
  }
  if (!items || items.length === 0 || !deliveryZoneId) {
    return NextResponse.json({ error: 'Informations de commande incomplètes.' }, { status: 400 })
  }

  const productIds = items.map((i) => i.productId)
  const { data: products, error: productsError } = await supabaseAdmin
    .from('products')
    .select('id, name, price')
    .in('id', productIds)

  if (productsError || !products || products.length !== productIds.length) {
    return NextResponse.json({ error: 'Un ou plusieurs produits sont introuvables.' }, { status: 404 })
  }

  const { data: zone, error: zoneError } = await supabaseAdmin
    .from('delivery_zones')
    .select('id, fee, is_variable')
    .eq('id', deliveryZoneId)
    .single()

  if (zoneError || !zone) {
    return NextResponse.json({ error: 'Zone de livraison invalide.' }, { status: 400 })
  }

  const subtotalAmount = items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId)
    return sum + (product?.price ?? 0) * item.quantity
  }, 0)
  const totalAmount = subtotalAmount + zone.fee

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      customer_id: customerId,
      status: 'created',
      payment_method: 'en_ligne',
      subtotal_amount: subtotalAmount,
      delivery_fee: zone.fee,
      delivery_fee_confirmed: !zone.is_variable,
      total_amount: totalAmount,
      delivery_zone_id: zone.id,
    })
    .select()
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Une erreur est survenue lors de la création de votre commande.' }, { status: 500 })
  }

  const orderItemsPayload = items.map((item) => {
    const product = products.find((p) => p.id === item.productId)!
    return {
      order_id: order.id,
      product_id: product.id,
      quantity: item.quantity,
      unit_price: product.price,
    }
  })

  const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItemsPayload)

  if (itemsError) {
    await supabaseAdmin.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
    return NextResponse.json({ error: 'Une erreur est survenue avec les articles de votre commande.' }, { status: 500 })
  }

  const itemsSummary = orderItemsPayload
    .map((item) => `${item.quantity}x ${products.find((p) => p.id === item.product_id)?.name}`)
    .join(', ')
    .slice(0, 100)

  const paymentResult = await requestPaytechPayment({
    itemName: itemsSummary,
    itemPrice: totalAmount,
    refCommand: order.id,
    commandName: `Commande Baol Market #${order.id.slice(0, 8).toUpperCase()}`,
    customField: { orderId: order.id, customerId },
  })

  if (!paymentResult.success) {
    await supabaseAdmin.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
    return NextResponse.json({ error: paymentResult.message || "Impossible d'initier le paiement." }, { status: 500 })
  }

  return NextResponse.json({ orderId: order.id, redirectUrl: paymentResult.redirectUrl })
}