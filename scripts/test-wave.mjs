import assert from 'node:assert/strict'
import crypto from 'node:crypto'

// Test the exact signature verification algorithm implemented in lib/wave.ts
function verifyWaveWebhookSignature(
  rawBody,
  signatureHeader,
  secret,
  now = Date.now(),
) {
  if (!signatureHeader || !secret) return false

  const parts = signatureHeader.split(',')
  const tPart = parts.find((p) => p.startsWith('t='))
  if (!tPart) return false
  const timestamp = tPart.slice(2)
  const t = Number(timestamp)
  if (!Number.isFinite(t)) return false

  const nowSeconds = Math.floor(now / 1000)
  if (Math.abs(nowSeconds - t) > 300) return false

  const v1Parts = parts.filter((p) => p.startsWith('v1='))
  if (v1Parts.length === 0) return false

  const payload = `${timestamp}${rawBody}`
  const expectedHmac = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  const expectedBuffer = Buffer.from(expectedHmac, 'hex')

  for (const v1Part of v1Parts) {
    const sig = v1Part.slice(3)
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

console.log('🧪 Démarrage des tests de validation Wave...\n')

// 1. Test avec vecteur de test officiel Wave (Documentation Wave Webhook)
{
  const secret = 'wave_sn_WHS_xz4m6g8rjs9bshxy05xj4khcvjv7j3hcp4fbpvv6met0zdrjvezg'
  const timestamp = 1667920421
  const signature = '53c971695230e9c51b1030d673eee76e70bbcdf8a7c5b8c1d44e0b8b1329647b'
  const header = `t=${timestamp},v1=${signature}`
  const body = '{"id": "AE_ijzo7oGgrlM7", "type": "checkout.session.completed", "data": {"id": "cos-1b01sghpg100j", "amount": "100", "checkout_status": "complete", "client_reference": null, "currency": "XOF", "error_url": "https://example.com/error", "last_payment_error": null, "business_name": "Annas Apiaries", "payment_status": "succeeded", "success_url": "https://example.com/success", "wave_launch_url": "https://pay.wave.com/c/cos-1b01sghpg100j?a=100&c=XOF&m=Annas%20Apiaries", "when_completed": "2022-11-08T15:05:45Z", "when_created": "2022-11-08T15:05:32Z", "when_expires": "2022-11-09T15:05:32Z", "transaction_id": "TCN4Y4ZC3FM"}}'

  const isValid = verifyWaveWebhookSignature(body, header, secret, timestamp * 1000)
  assert.equal(isValid, true, 'Le vecteur officiel de la documentation Wave doit être validé avec succès')
  console.log('  ✅ 1. Vecteur officiel Wave validé avec succès (100% HMAC-SHA256 exact)')
}

// 2. Test avec timestamp dynamique actuel
{
  const secret = 'test_webhook_secret_key_12345'
  const now = Date.now()
  const timestamp = Math.floor(now / 1000)
  const body = JSON.stringify({
    id: 'EV_123',
    type: 'checkout.session.completed',
    data: { id: 'cos_456', amount: '5000', currency: 'XOF' },
  })

  const payload = `${timestamp}${body}`
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  const header = `t=${timestamp},v1=${sig}`

  const isValid = verifyWaveWebhookSignature(body, header, secret, now)
  assert.equal(isValid, true, 'La signature générée en temps réel doit être valide')
  console.log('  ✅ 2. Signature temps réel validée')
}

// 3. Test rejet si altération du corps (tampering)
{
  const secret = 'test_secret'
  const now = Date.now()
  const timestamp = Math.floor(now / 1000)
  const body = '{"amount":"1000"}'
  const tamperedBody = '{"amount":"9999"}'
  const sig = crypto.createHmac('sha256', secret).update(`${timestamp}${body}`).digest('hex')
  const header = `t=${timestamp},v1=${sig}`

  const isValid = verifyWaveWebhookSignature(tamperedBody, header, secret, now)
  assert.equal(isValid, false, 'Un corps modifié doit être rejeté')
  console.log('  ✅ 3. Rejet en cas d\'altération du corps (tampering)')
}

// 4. Test rejet si timestamp expiré (> 300s)
{
  const secret = 'test_secret'
  const now = Date.now()
  const oldTimestamp = Math.floor(now / 1000) - 301 // 301 secondes dans le passé
  const body = '{"test":true}'
  const sig = crypto.createHmac('sha256', secret).update(`${oldTimestamp}${body}`).digest('hex')
  const header = `t=${oldTimestamp},v1=${sig}`

  const isValid = verifyWaveWebhookSignature(body, header, secret, now)
  assert.equal(isValid, false, 'Un timestamp de plus de 300s doit être rejeté')
  console.log('  ✅ 4. Rejet en cas de timestamp périmé (> 300s anti-rejeu)')
}

// 5. Test rejet si timestamp dans le futur (> 300s)
{
  const secret = 'test_secret'
  const now = Date.now()
  const futureTimestamp = Math.floor(now / 1000) + 305
  const body = '{"test":true}'
  const sig = crypto.createHmac('sha256', secret).update(`${futureTimestamp}${body}`).digest('hex')
  const header = `t=${futureTimestamp},v1=${sig}`

  const isValid = verifyWaveWebhookSignature(body, header, secret, now)
  assert.equal(isValid, false, 'Un timestamp futur doit être rejeté')
  console.log('  ✅ 5. Rejet en cas de timestamp dans le futur')
}

// 6. Test avec plusieurs signatures v1 (rotation de secret)
{
  const secretValid = 'secret_current'
  const secretOld = 'secret_old'
  const now = Date.now()
  const timestamp = Math.floor(now / 1000)
  const body = '{"event":"checkout"}'

  const sigOld = crypto.createHmac('sha256', secretOld).update(`${timestamp}${body}`).digest('hex')
  const sigValid = crypto.createHmac('sha256', secretValid).update(`${timestamp}${body}`).digest('hex')

  const header = `t=${timestamp},v1=${sigOld},v1=${sigValid}`

  const isValid = verifyWaveWebhookSignature(body, header, secretValid, now)
  assert.equal(isValid, true, 'Doit valider si l\'une des signatures v1 correspond (rotation de clés)')
  console.log('  ✅ 6. Support multi-signatures v1 (rotation de secret)')
}

// 7. Test avec secret ou header invalide / manquant
{
  assert.equal(verifyWaveWebhookSignature('{}', '', 'secret'), false, 'Header vide rejeté')
  assert.equal(verifyWaveWebhookSignature('{}', 't=123', 'secret'), false, 'v1 manquant rejeté')
  assert.equal(verifyWaveWebhookSignature('{}', 'v1=abc', 'secret'), false, 't manquant rejeté')
  assert.equal(verifyWaveWebhookSignature('{}', 't=abc,v1=def', 'secret'), false, 't non numérique rejeté')
  assert.equal(verifyWaveWebhookSignature('{}', 't=123,v1=def', ''), false, 'secret vide rejeté')
  console.log('  ✅ 7. Cas limites et en-têtes malformés rejetés')
}

console.log('\n🎉 Tous les 7 tests Wave ont réussi avec succès !')
