import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requestPaytechPayment } from '@/lib/paytech'
import { createWaveCheckout } from '@/lib/wave'
import { effectivePrice } from '@/lib/flashSale'
import { isValidDepartmentForRegion } from '@/lib/senegalDepartments'

// Quantité maximale commandable par produit en une seule commande
const MAX_QUANTITY_PER_PRODUCT = 20

type CartItemInput = { productId: string; quantity: number; size?: string | null }

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

  // 2. Quantités : entiers entre 1 et le maximum. Un même produit avec la même taille
  //    est fusionné en une seule ligne (productId + taille).
  type MergedLine = {
    productId: string
    size: string | null
    quantity: number
  }
  const mergedLines = new Map<string, MergedLine>()

  for (const item of items) {
    if (
      typeof item?.productId !== 'string' ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > MAX_QUANTITY_PER_PRODUCT
    ) {
      return NextResponse.json({ error: 'Quantité invalide.' }, { status: 400 })
    }

    let size: string | null = null
    if (item.size !== undefined && item.size !== null) {
      if (typeof item.size !== 'string') {
        return NextResponse.json({ error: 'Format de taille invalide.' }, { status: 400 })
      }
      const trimmed = item.size.trim()
      size = trimmed.length > 0 ? trimmed : null
    }

    const key = `${item.productId}|${size ?? ''}`
    const existing = mergedLines.get(key)
    if (existing) {
      existing.quantity += item.quantity
    } else {
      mergedLines.set(key, { productId: item.productId, size, quantity: item.quantity })
    }
  }

  for (const line of mergedLines.values()) {
    if (line.quantity > MAX_QUANTITY_PER_PRODUCT) {
      return NextResponse.json(
        { error: `Quantité maximale par article : ${MAX_QUANTITY_PER_PRODUCT}.` },
        { status: 400 }
      )
    }
  }

  // 3. Produits : seuls les produits disponibles peuvent être commandés.
  //    La vérification se fait sur les identifiants de produits uniques.
  const uniqueProductIds = Array.from(new Set(Array.from(mergedLines.values()).map((l) => l.productId)))
  const { data: products, error: productsError } = await supabaseAdmin
    .from('products')
    .select('id, name, price, flash_price, flash_starts_at, flash_ends_at, size_options, categories ( fulfillment_type )')
    .eq('is_available', true)
    .in('id', uniqueProductIds)

  if (productsError || !products || products.length !== uniqueProductIds.length) {
    return NextResponse.json(
      { error: 'Un ou plusieurs produits sont introuvables ou indisponibles.' },
      { status: 404 }
    )
  }

  const productMap = new Map(products.map((p) => [p.id, p]))

  // Vérification des tailles pour chaque ligne commandée
  for (const line of mergedLines.values()) {
    const p = productMap.get(line.productId)!
    const productSizes = Array.isArray(p.size_options) && p.size_options.length > 0
      ? p.size_options
      : null

    if (productSizes) {
      if (!line.size) {
        return NextResponse.json(
          { error: `Veuillez choisir une taille pour le produit « ${p.name} ».` },
          { status: 400 }
        )
      }
      if (!productSizes.includes(line.size)) {
        return NextResponse.json(
          { error: `La taille « ${line.size} » n'est pas disponible pour le produit « ${p.name} ».` },
          { status: 400 }
        )
      }
    } else {
      if (line.size) {
        return NextResponse.json(
          { error: `Le produit « ${p.name} » ne propose pas de choix de taille.` },
          { status: 400 }
        )
      }
    }
  }

  // Refuser toute commande contenant un produit de type 'visit' (immobilier, véhicules, etc.)
  for (const p of products) {
    const fType = Array.isArray(p.categories)
      ? p.categories[0]?.fulfillment_type
      : (p.categories as { fulfillment_type?: string | null } | null)?.fulfillment_type
    if (fType === 'visit') {
      return NextResponse.json(
        {
          error: `Le produit « ${p.name} » ne peut pas être commandé en ligne. Veuillez demander une visite via WhatsApp.`,
        },
        { status: 400 }
      )
    }
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
  const orderItemsLines = Array.from(mergedLines.values()).map((line) => {
    const product = productMap.get(line.productId)!
    return {
      product_id: product.id,
      name: product.name,
      size: line.size,
      unit_price: effectivePrice(product, now),
      quantity: line.quantity,
    }
  })

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
    size: line.size,
  }))

  const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItemsPayload)

  if (itemsError) {
    await supabaseAdmin.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
    return NextResponse.json({ error: 'Une erreur est survenue avec les articles de votre commande.' }, { status: 500 })
  }

  const paymentProvider = (process.env.PAYMENT_PROVIDER || 'paytech').trim().toLowerCase()

  if (paymentProvider === 'wave') {
    const waveResult = await createWaveCheckout({
      orderId: order.id,
      amount: totalAmount,
    })

    if (waveResult.error || !waveResult.wave_launch_url) {
      await supabaseAdmin.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
      return NextResponse.json({ error: waveResult.error || "Impossible d'initier le paiement." }, { status: 500 })
    }

    await supabaseAdmin
      .from('orders')
      .update({ wave_checkout_id: waveResult.id })
      .eq('id', order.id)

    return NextResponse.json({ orderId: order.id, redirectUrl: waveResult.wave_launch_url })
  }

  const itemsSummary = orderItemsLines
    .map((line) => `${line.quantity}x ${line.name}${line.size ? ` (${line.size})` : ''}`)
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
