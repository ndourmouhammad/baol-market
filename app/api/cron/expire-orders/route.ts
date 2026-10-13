import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { expireStaleOrders } from '@/lib/expireStaleOrders'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  if (!cronSecret || !authHeader) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const expected = `Bearer ${cronSecret}`
  const authBuffer = Buffer.from(authHeader)
  const expectedBuffer = Buffer.from(expected)

  if (
    authBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(authBuffer, expectedBuffer)
  ) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const cancelled = await expireStaleOrders()
    return NextResponse.json({ success: true, cancelled })
  } catch (err) {
    console.error('Erreur lors de l\'expiration des commandes périmées:', err)
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 })
  }
}
