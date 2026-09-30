import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { resend } from '@/lib/resend'
import { orderConfirmationEmail } from '@/lib/emailTemplates'
import { generateTrackingCode } from '@/lib/trackingCode'

type CartItemInput = { productId: string; quantity: number }

export async function POST(request: Request) {
  const body = await request.json()
  

    const { items, paymentMethod, deliveryZoneId, phone, email, customerId } = body as {
    items: CartItemInput[]
    paymentMethod: string
    deliveryZoneId: string
    phone?: string
    email?: string
    customerId?: string
  }

  if (!items || items.length === 0 || !paymentMethod || !deliveryZoneId) {
    return NextResponse.json({ error: 'Informations de commande incomplètes.' }, { status: 400 })
  }

  if (!customerId && (!phone || phone.trim().length < 8)) {
    return NextResponse.json({ error: 'Un numéro de téléphone valide est requis.' }, { status: 400 })
  }

  const productIds = items.map((i) => i.productId)
  const { data: products, error: productsError } = await supabaseAdmin
    .from('products')
    .select('id, name, price')
    .in('id', productIds)

  if (productsError || !products || products.length !== productIds.length) {
    return NextResponse.json({ error: "Un ou plusieurs produits sont introuvables." }, { status: 404 })
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

  let trackingCode: string | null = null
  if (!customerId) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateTrackingCode()
      const { data: existing } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('tracking_code', candidate)
        .maybeSingle()
      if (!existing) {
        trackingCode = candidate
        break
      }
    }
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      customer_id: customerId || null,
      guest_phone: customerId ? null : phone?.trim(),
      guest_email: customerId ? null : email?.trim() || null,
      status: 'created',
      payment_method: paymentMethod,
      subtotal_amount: subtotalAmount,
      delivery_fee: zone.fee,
      delivery_fee_confirmed: !zone.is_variable,
      total_amount: totalAmount,
      delivery_zone_id: zone.id,
      tracking_code: trackingCode,
    })
    .select()
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: "Une erreur est survenue lors de la création de votre commande." }, { status: 500 })
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
    return NextResponse.json(
      { error: "Votre commande a été créée, mais un souci est survenu avec les articles. Contactez le support." },
      { status: 500 }
    )
  }

  const recipientEmail = customerId ? null : email
  if (recipientEmail || customerId) {
    try {
      let toEmail = recipientEmail
      if (customerId && !toEmail) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(customerId)
        toEmail = userData?.user?.email ?? null
      }
      if (toEmail) {
        await resend.emails.send({
          from: 'Baol Market <onboarding@resend.dev>',
          to: toEmail,
          subject: `Commande reçue #${order.id.slice(0, 8).toUpperCase()}`,
          html: orderConfirmationEmail({
            ...order,
            order_items: orderItemsPayload.map((item) => ({
              quantity: item.quantity,
              unit_price: item.unit_price,
              products: { name: products.find((p) => p.id === item.product_id)?.name ?? 'Produit' },
            })),
          }),
        })
      }
    } catch (e) {
      console.error('Erreur envoi email confirmation:', e)
    }
  }

  return NextResponse.json({ orderId: order.id, trackingCode: order.tracking_code })
}