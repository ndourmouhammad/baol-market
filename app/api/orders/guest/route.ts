import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { resend } from '@/lib/resend'
import { orderConfirmationEmail } from '@/lib/emailTemplates'
import { generateTrackingCode } from '@/lib/trackingCode'

export async function POST(request: Request) {
  const body = await request.json()
  const { productId, quantity, address, paymentMethod, phone, email, deliveryZoneId } = body

  if (!productId || !quantity || !address || !paymentMethod || !deliveryZoneId) {
    return NextResponse.json({ error: 'Informations de commande incomplètes.' }, { status: 400 })
  }
  if (!phone || phone.trim().length < 8) {
    return NextResponse.json({ error: 'Un numéro de téléphone valide est requis.' }, { status: 400 })
  }

  const { data: product, error: productError } = await supabaseAdmin
    .from('products')
    .select('id, name, price')
    .eq('id', productId)
    .single()

  if (productError || !product) {
    return NextResponse.json({ error: 'Produit introuvable.' }, { status: 404 })
  }

  const { data: zone, error: zoneError } = await supabaseAdmin
    .from('delivery_zones')
    .select('id, fee, is_variable')
    .eq('id', deliveryZoneId)
    .single()

  if (zoneError || !zone) {
    return NextResponse.json({ error: 'Zone de livraison invalide.' }, { status: 400 })
  }

  const subtotalAmount = product.price * quantity
  const totalAmount = subtotalAmount + zone.fee

  let trackingCode = ''
  for (let attempt = 0; attempt < 5; attempt++) {
    trackingCode = generateTrackingCode()
    const { data: existing } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('tracking_code', trackingCode)
      .maybeSingle()
    if (!existing) break
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      customer_id: null,
      guest_phone: phone.trim(),
      guest_email: email?.trim() || null,
      status: 'created',
      payment_method: paymentMethod,
      subtotal_amount: subtotalAmount,
      delivery_fee: zone.fee,
      delivery_fee_confirmed: !zone.is_variable,
      total_amount: totalAmount,
      delivery_address: address,
      delivery_zone_id: zone.id,
      tracking_code: trackingCode,
    })
    .select()
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: "Une erreur est survenue lors de la création de votre commande." }, { status: 500 })
  }

  const { error: itemError } = await supabaseAdmin.from('order_items').insert({
    order_id: order.id,
    product_id: product.id,
    quantity,
    unit_price: product.price,
  })

  if (itemError) {
    return NextResponse.json(
      { error: "Votre commande a été créée, mais un souci est survenu avec les articles. Contactez le support." },
      { status: 500 }
    )
  }

  if (email) {
    try {
      await resend.emails.send({
        from: 'Baol Market <onboarding@resend.dev>',
        to: email,
        subject: `Commande reçue #${order.id.slice(0, 8).toUpperCase()}`,
        html: orderConfirmationEmail({
          ...order,
          order_items: [{ quantity, unit_price: product.price, products: { name: product.name } }],
        }),
      })
    } catch (e) {
      console.error('Erreur envoi email confirmation invité:', e)
    }
  }

  return NextResponse.json({ orderId: order.id, trackingCode: order.tracking_code })
}