import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyPaytechIpn } from '@/lib/paytech'

export async function POST(request: Request) {
  const formData = await request.formData()
  const fields: Record<string, string> = {}
  formData.forEach((value, key) => {
    fields[key] = value.toString()
  })

  const isValid = verifyPaytechIpn({
    item_price: fields.item_price,
    final_item_price: fields.final_item_price,
    ref_command: fields.ref_command,
    hmac_compute: fields.hmac_compute,
    api_key_sha256: fields.api_key_sha256,
    api_secret_sha256: fields.api_secret_sha256,
  })

  if (!isValid) {
    console.error('IPN PayTech rejetée : signature invalide.', fields.ref_command)
    return new NextResponse('Forbidden', { status: 403 })
  }

  const orderId = fields.ref_command
  const typeEvent = fields.type_event

  if (!orderId) {
    return new NextResponse('OK', { status: 200 }) // rien à faire, mais on ne fait pas échouer PayTech
  }

  if (typeEvent === 'sale_complete') {
    // On ne fait passer en "paid" que si la commande est encore en "created",
    // pour ne jamais écraser un statut déjà avancé (double IPN, etc.)
    await supabaseAdmin
      .from('orders')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('status', 'created')
  } else if (typeEvent === 'sale_canceled') {
    await supabaseAdmin
      .from('orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('status', 'created')
  }

  return new NextResponse('OK', { status: 200 })
}