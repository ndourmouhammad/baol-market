import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requestPaytechPayment } from '@/lib/paytech'
import { effectivePrice } from '@/lib/flashSale'
import { isValidDepartmentForRegion } from '@/lib/senegalDepartments'

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

  type DeliveryMode = 'delivery' | 'self_arranged'
  const VALID_MODES: DeliveryMode[] = ['delivery', 'self_arranged']

  let body: {
    items?: CartItemInput[]
    deliveryMode?: string
    deliveryZoneId?: string
    deliveryDepartment?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  const { items, deliveryMode, deliveryZoneId, deliveryDepartment } = body
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Informations de commande incomplètes.' }, { status: 400 })
  }

  if (deliveryMode === 'pickup') {
    return NextResponse.json({ error: "Ce mode de réception n'est plus disponible." }, { status: 400 })
  }

  if (deliveryMode !== undefined && !VALID_MODES.includes(deliveryMode as DeliveryMode)) {
    return NextResponse.json({ error: 'Mode de livraison invalide.' }, { status: 400 })
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
    .select('id, name, price, flash_price, flash_starts_at, flash_ends_at')
    .eq('is_available', true)
    .in('id', productIds)

  if (productsError || !products || products.length !== productIds.length) {
    return NextResponse.json(
      { error: 'Un ou plusieurs produits sont introuvables ou indisponibles.' },
      { status: 404 }
    )
  }

  // 4. Mode de remise et zone de livraison
  let resolvedMode: DeliveryMode
  let deliveryFee = 0
  let effectiveZoneId: string | null = null
  let resolvedDepartment: string | null = null

  if (typeof deliveryZoneId !== 'string' || !deliveryZoneId) {
    return NextResponse.json({ error: 'Zone de livraison invalide.' }, { status: 400 })
  }

  const { data: zone, error: zoneError } = await supabaseAdmin
    .from('delivery_zones')
    .select('id, name, fee, zone_kind')
    .eq('id', deliveryZoneId)
    .single()

  if (zoneError || !zone) {
    return NextResponse.json({ error: 'Zone de livraison invalide.' }, { status: 400 })
  }

  const zoneKind = zone.zone_kind ?? 'local'

  if (deliveryMode === 'delivery') {
    if (zoneKind !== 'local') {
      return NextResponse.json({ error: 'Zone de livraison invalide.' }, { status: 400 })
    }
    resolvedMode = 'delivery'
    deliveryFee = zone.fee
    effectiveZoneId = zone.id
    resolvedDepartment = null
  } else if (deliveryMode === 'self_arranged') {
    if (zoneKind !== 'region') {
      return NextResponse.json({ error: 'Zone de livraison invalide.' }, { status: 400 })
    }
    if (
      typeof deliveryDepartment !== 'string' ||
      !deliveryDepartment.trim() ||
      !isValidDepartmentForRegion(zone.name, deliveryDepartment.trim())
    ) {
      return NextResponse.json(
        { error: 'Veuillez sélectionner un département valide pour cette région.' },
        { status: 400 }
      )
    }
    resolvedMode = 'self_arranged'
    deliveryFee = 0
    effectiveZoneId = zone.id
    resolvedDepartment = deliveryDepartment.trim()
  } else {
    // deliveryMode est absent (ancien client) : déduire de zone_kind
    if (zoneKind === 'region') {
      if (
        typeof deliveryDepartment !== 'string' ||
        !deliveryDepartment.trim() ||
        !isValidDepartmentForRegion(zone.name, deliveryDepartment.trim())
      ) {
        return NextResponse.json(
          { error: 'Veuillez sélectionner un département valide pour cette région.' },
          { status: 400 }
        )
      }
      resolvedMode = 'self_arranged'
      deliveryFee = 0
      effectiveZoneId = zone.id
      resolvedDepartment = deliveryDepartment.trim()
    } else {
      resolvedMode = 'delivery'
      deliveryFee = zone.fee
      effectiveZoneId = zone.id
      resolvedDepartment = null
    }
  }

  // Prix toujours relus depuis la base, jamais depuis le navigateur.
  // Si une vente flash est en cours à cet instant, c'est le prix flash qui est facturé.
  const now = new Date()
  const orderItemsLines = products.map((product) => ({
    product_id: product.id,
    name: product.name,
    unit_price: effectivePrice(product, now),
    quantity: quantities.get(product.id)!,
  }))

  const subtotalAmount = orderItemsLines.reduce((sum, line) => sum + line.unit_price * line.quantity, 0)
  const totalAmount = subtotalAmount + deliveryFee

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      customer_id: customerId,
      status: 'created',
      payment_method: 'en_ligne',
      fulfillment_method: resolvedMode,
      subtotal_amount: subtotalAmount,
      delivery_fee: deliveryFee,
      delivery_fee_confirmed: true,
      total_amount: totalAmount,
      delivery_zone_id: effectiveZoneId,
      delivery_department: resolvedDepartment,
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
