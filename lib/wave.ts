import crypto from 'crypto'
import { SITE_URL } from './siteUrl'

const WAVE_BASE_URL = 'https://api.wave.com'

// ---------------------------------------------------------------------------
// Checkout session creation
// ---------------------------------------------------------------------------

type CreateCheckoutParams = {
  orderId: string
  amount: number
}

export const WAVE_PAYMENT_UNAVAILABLE_MESSAGE =
  "Le paiement n'est pas disponible pour le moment. Veuillez réessayer dans quelques instants ou nous contacter sur WhatsApp au +221 78 150 75 05."

type CreateCheckoutResult =
  | { id: string; wave_launch_url: string; error?: undefined; status?: undefined; code?: undefined }
  | { error: string; status?: number; code?: string; id?: undefined; wave_launch_url?: undefined }

export async function createWaveCheckout(
  params: CreateCheckoutParams,
): Promise<CreateCheckoutResult> {
  const apiKey = (process.env.WAVE_API_KEY || '').trim()
  if (!apiKey) {
    console.error('[Wave] Configuration de paiement manquante (clé API absente).')
    return { error: WAVE_PAYMENT_UNAVAILABLE_MESSAGE, code: 'config-missing' }
  }

  const bodyObj = {
    amount: String(params.amount),
    currency: 'XOF',
    client_reference: params.orderId,
    success_url: `${SITE_URL}/paiement/succes?ref=${params.orderId}`,
    error_url: `${SITE_URL}/paiement/annule?ref=${params.orderId}`,
  }
  const rawBody = JSON.stringify(bodyObj)

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  // Optional request signing
  const signingSecret = (process.env.WAVE_API_SIGNING_SECRET || '').trim()
  if (signingSecret) {
    const timestamp = Math.floor(Date.now() / 1000)
    const payload = `${timestamp}${rawBody}`
    const signature = crypto
      .createHmac('sha256', signingSecret)
      .update(payload)
      .digest('hex')
    headers['Wave-Signature'] = `t=${timestamp},v1=${signature}`
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    const res = await fetch(`${WAVE_BASE_URL}/v1/checkout/sessions`, {
      method: 'POST',
      headers,
      body: rawBody,
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      const code = (json?.code ?? json?.error?.code ?? 'unknown') as string
      console.error('[Wave] Erreur création checkout:', { status: res.status, code })
      return {
        error: WAVE_PAYMENT_UNAVAILABLE_MESSAGE,
        status: res.status,
        code,
      }
    }

    if (!json.id || !json.wave_launch_url) {
      console.error('[Wave] Réponse inattendue lors de la création du checkout:', { status: res.status })
      return {
        error: WAVE_PAYMENT_UNAVAILABLE_MESSAGE,
        status: res.status,
        code: 'invalid-response',
      }
    }

    return { id: json.id, wave_launch_url: json.wave_launch_url }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      console.error('[Wave] Timeout lors de la création du checkout.')
      return { error: WAVE_PAYMENT_UNAVAILABLE_MESSAGE, code: 'timeout' }
    } else {
      console.error('[Wave] Erreur réseau lors de la création du checkout.')
      return { error: WAVE_PAYMENT_UNAVAILABLE_MESSAGE, code: 'network-error' }
    }
  }
}

// ---------------------------------------------------------------------------
// Expire a checkout session (best effort)
// ---------------------------------------------------------------------------

export async function expireWaveCheckout(checkoutId: string): Promise<void> {
  const apiKey = process.env.WAVE_API_KEY
  if (!apiKey) return

  try {
    await fetch(`${WAVE_BASE_URL}/v1/checkout/sessions/${checkoutId}/expire`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
    })
  } catch {
    // Best effort – errors are silently ignored
  }
}

// ---------------------------------------------------------------------------
// Refund a checkout session (idempotent on Wave side)
// ---------------------------------------------------------------------------

type RefundResult =
  | { ok: true }
  | { ok: false; code: string; status?: number; message: string }

export async function refundWaveCheckout(checkoutId: string): Promise<RefundResult> {
  const apiKey = (process.env.WAVE_API_KEY || '').trim()
  if (!apiKey) {
    console.error('[Wave Refund] Configuration de paiement manquante (clé API absente).')
    return { ok: false, code: 'config-missing', message: 'Configuration de paiement manquante.' }
  }

  try {
    const res = await fetch(
      `${WAVE_BASE_URL}/v1/checkout/sessions/${checkoutId}/refund`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
      },
    )

    if (res.ok) {
      return { ok: true }
    }

    const json = await res.json().catch(() => ({}))
    const code = (json?.code ?? json?.error?.code ?? 'unknown') as string
    console.error('[Wave Refund] Erreur lors du remboursement Wave:', { status: res.status, code })
    return {
      ok: false,
      code,
      status: res.status,
      message: 'Erreur lors du remboursement Wave.',
    }
  } catch {
    console.error('[Wave Refund] Erreur réseau lors du remboursement Wave.')
    return { ok: false, code: 'network-error', message: 'Impossible de contacter le prestataire de paiement.' }
  }
}

// ---------------------------------------------------------------------------
// Webhook signature verification (pure function, testable)
// ---------------------------------------------------------------------------

export function verifyWaveWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  now: number = Date.now(),
): boolean {
  if (!signatureHeader || !secret) return false

  const cleanSecret = secret.trim()
  const parts = signatureHeader.split(',').map((p) => p.trim())
  const tPart = parts.find((p) => p.startsWith('t='))
  if (!tPart) return false
  const timestamp = tPart.slice(2).trim()
  const t = Number(timestamp)
  if (!Number.isFinite(t)) return false

  // Reject timestamps older or newer than 300 seconds
  const nowSeconds = Math.floor(now / 1000)
  if (Math.abs(nowSeconds - t) > 300) return false

  // Collect all v1 signatures
  const v1Parts = parts.filter((p) => p.startsWith('v1='))
  if (v1Parts.length === 0) return false

  // Compute expected HMAC
  const payload = `${timestamp}${rawBody}`
  const expectedHmac = crypto
    .createHmac('sha256', cleanSecret)
    .update(payload)
    .digest('hex')
  const expectedBuffer = Buffer.from(expectedHmac, 'hex')

  // Constant-time comparison against each v1 value
  for (const v1Part of v1Parts) {
    const sig = v1Part.slice(3).trim()
    if (sig.length !== expectedHmac.length) continue
    try {
      const sigBuffer = Buffer.from(sig, 'hex')
      if (sigBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        return true
      }
    } catch {
      continue
    }
  }

  return false
}
