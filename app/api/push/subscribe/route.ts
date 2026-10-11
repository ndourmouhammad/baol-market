import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/** Domaines autorisés pour les endpoints push */
const ALLOWED_HOSTS = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
]
const ALLOWED_SUFFIXES = [
  '.push.apple.com',
  '.notify.windows.com',
  '.push.services.mozilla.com',
]

function isEndpointAllowed(endpoint: string): boolean {
  try {
    const url = new URL(endpoint)
    if (url.protocol !== 'https:') return false
    const host = url.hostname.toLowerCase()
    if (ALLOWED_HOSTS.includes(host)) return true
    return ALLOWED_SUFFIXES.some((suffix) => host.endsWith(suffix))
  } catch {
    return false
  }
}

const MAX_ENDPOINT = 500
const MAX_KEY = 200

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
    }

    const body = await request.json()
    const { subscription, userAgent } = body

    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json({ error: 'Souscription invalide' }, { status: 400 })
    }

    // Validation de l'endpoint
    if (
      typeof subscription.endpoint !== 'string' ||
      subscription.endpoint.length > MAX_ENDPOINT ||
      !isEndpointAllowed(subscription.endpoint)
    ) {
      return NextResponse.json({ error: 'Souscription invalide' }, { status: 400 })
    }

    // Validation des clés
    if (
      typeof subscription.keys.p256dh !== 'string' ||
      subscription.keys.p256dh.length > MAX_KEY ||
      typeof subscription.keys.auth !== 'string' ||
      subscription.keys.auth.length > MAX_KEY
    ) {
      return NextResponse.json({ error: 'Souscription invalide' }, { status: 400 })
    }

    const { error: upsertError } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_agent: userAgent || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      )

    if (upsertError) {
      console.error('Erreur enregistrement souscription push:', upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Erreur API push/subscribe:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
    }

    const body = await request.json()
    const { endpoint } = body

    if (endpoint) {
      await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint)
        .eq('user_id', user.id)
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('Erreur suppression push/subscribe:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
