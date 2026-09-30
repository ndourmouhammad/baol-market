import crypto from 'crypto'

const PAYTECH_BASE_URL = 'https://paytech.sn/api'

type RequestPaymentParams = {
  itemName: string
  itemPrice: number
  refCommand: string
  commandName: string
  customField?: Record<string, unknown>
}

type RequestPaymentResult =
  | { success: true; token: string; redirectUrl: string }
  | { success: false; message: string }

export async function requestPaytechPayment(params: RequestPaymentParams): Promise<RequestPaymentResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) {
    return { success: false, message: 'NEXT_PUBLIC_SITE_URL manquant dans la configuration.' }
  }

  const body = {
    item_name: params.itemName,
    item_price: params.itemPrice,
    currency: 'XOF',
    ref_command: params.refCommand,
    command_name: params.commandName,
    env: process.env.PAYTECH_ENV || 'test',
    ipn_url: `${siteUrl}/api/payments/paytech-ipn`,
    success_url: `${siteUrl}/paiement/succes?ref=${params.refCommand}`,
    cancel_url: `${siteUrl}/paiement/annule?ref=${params.refCommand}`,
    custom_field: JSON.stringify(params.customField ?? {}),
  }

  try {
    const res = await fetch(`${PAYTECH_BASE_URL}/payment/request-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        API_KEY: process.env.PAYTECH_API_KEY!,
        API_SECRET: process.env.PAYTECH_API_SECRET!,
      },
      body: JSON.stringify(body),
    })
    const json = await res.json()

    if (json.success === 1 && json.redirect_url) {
      return { success: true, token: json.token, redirectUrl: json.redirect_url }
    }
    return { success: false, message: json.message || 'Erreur PayTech inconnue.' }
  } catch (e) {
    console.error('Erreur requête PayTech:', e)
    return { success: false, message: 'Impossible de contacter PayTech.' }
  }
}

/**
 * Vérifie l'authenticité d'une notification IPN PayTech.
 * Méthode HMAC (prioritaire) : message = prix|ref_command|api_key, signé avec api_secret.
 * Méthode SHA256 (repli) : compare le hachage des clés API.
 */
export function verifyPaytechIpn(fields: {
  item_price?: string
  final_item_price?: string
  ref_command?: string
  hmac_compute?: string
  api_key_sha256?: string
  api_secret_sha256?: string
}): boolean {
  const apiKey = process.env.PAYTECH_API_KEY!
  const apiSecret = process.env.PAYTECH_API_SECRET!

  if (fields.hmac_compute) {
    const priceUsed = fields.final_item_price || fields.item_price
    const message = `${priceUsed}|${fields.ref_command}|${apiKey}`
    const expectedHmac = crypto.createHmac('sha256', apiSecret).update(message).digest('hex')
    return expectedHmac === fields.hmac_compute
  }

  if (fields.api_key_sha256 && fields.api_secret_sha256) {
    const expectedKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
    const expectedSecretHash = crypto.createHash('sha256').update(apiSecret).digest('hex')
    return expectedKeyHash === fields.api_key_sha256 && expectedSecretHash === fields.api_secret_sha256
  }

  return false
}