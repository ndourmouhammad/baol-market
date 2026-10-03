import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requestPaytechPayment } from '@/lib/paytech'

// Quantité maximale commandable par produit en une seule commande
const MAX_QUANTITY_PER_PRODUCT = 20

type CartItemInput = { productId: string; quantity: number }

export async function POST(request: Request) {
  // 1. Identité du client : vérifiée côté serveur à partir de la session,
  //    jamais lue depuis le corps de la requête.
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Vous devez être connecté pour passer commande.' }, { status: 401 })
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Vous devez être connecté pour passer commande.' }, { status: 401 })
  }
  const customerId = user.id

  let body: { items?: CartItemInput[]; deliveryZoneId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  const { items, deliveryZoneId } = body
  if (!Array.isArray(items) || items.length === 0 || typeof deliveryZoneId !== 'string' || !deliveryZoneId) {
    return NextResponse.json({ error: 'Informations de commande incomplètes.' }, { status: 400 })
  }

  // 2. Quantités : entiers entre 1 et le maximum. Un même produit présent
  //    plusieurs fois est fusionné en une seule ligne.
  const quantities = new Map<string, number>()
  for (const item of items) {
    if (
      typeof item?.productId !== 'string' ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > MAX_QUANTITY_PER_PRODUCT
    ) {
      return NextResponse.json({ error: 'Quantité invalide.' }, { status: 400 })
    }
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity)
  }
  for (const quantity of quantities.values()) {
    if (quantity > MAX_QUANTITY_PER_PRODUCT) {
      return NextResponse.json(
        { error: `Quantité maximale par produit : ${MAX_QUANTITY_PER_PRODUCT}.` },
        { status: 400 }
      )
    }
  }

  // 3. Produits : seuls les produits disponibles peuvent être commandés.
  const productIds = Array.from(quantities.keys())
  const { data: products, error: productsError } = await supabaseAdmin
    .from('products')
    .select('id, name, price')
    .eq('is_available', true)
    .in('id', productIds)

  if (productsError || !products || products.length !== productIds.length) {
    return NextResponse.json(
      { error: 'Un ou plusieurs produits sont introuvables ou indisponibles.' },
      { status: 404 }
    )
  }

  const { data: zone, error: zoneError } = await supabaseAdmin
    .from('delivery_zones')
    .select('id, fee')
    .eq('id', deliveryZoneId)
    .single()

  if (zoneError || !zone) {
    return NextResponse.json({ error: 'Zone de livraison invalide.' }, { status: 400 })
  }

  // Prix toujours relus depuis la base, jamais depuis le navigateur
  const orderItemsLines = products.map((product) => ({
    product_id: product.id,
    name: product.name,
    unit_price: product.price,
    quantity: quantities.get(product.id)!,
  }))

  const subtotalAmount = orderItemsLines.reduce((sum, line) => sum + line.unit_price * line.quantity, 0)
  const totalAmount = subtotalAmount + zone.fee

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      customer_id: customerId,
      status: 'created',
      payment_method: 'en_ligne',
      subtotal_amount: subtotalAmount,
      delivery_fee: zone.fee,
      delivery_fee_confirmed: true,
      total_amount: totalAmount,
      delivery_zone_id: zone.id,
    })
    .select()
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Une erreur est survenue lors de la création de votre commande.' }, { status: 500 })
  }

  const orderItemsPayload = orderItemsLines.map((line) => ({
    order_id: order.id,
    product_id: line.product_id,
    quantity: line.quantity,
    unit_price: line.unit_price,
  }))

  const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItemsPayload)

  if (itemsError) {
    await supabaseAdmin.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
    return NextResponse.json({ error: 'Une erreur est survenue avec les articles de votre commande.' }, { status: 500 })
  }

  const itemsSummary = orderItemsLines
    .map((line) => `${line.quantity}x ${line.name}`)
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
