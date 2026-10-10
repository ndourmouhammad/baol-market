import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { effectivePrice, flashState } from '@/lib/flashSale'
import type { LivePrice } from '@/lib/livePrices'

const MAX_IDS = 50
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Renvoie, pour des produits donnés, le prix qui serait facturé À CET INSTANT (heure du serveur,
// jamais celle du téléphone du client). N'expose que des informations déjà publiques sur le catalogue.
export async function POST(request: Request) {
  let body: { ids?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  if (!Array.isArray(body.ids)) {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }
  const ids = Array.from(new Set(body.ids.filter((id): id is string => typeof id === 'string')))
  if (ids.length > MAX_IDS) {
    return NextResponse.json({ error: 'Trop de produits.' }, { status: 400 })
  }

  // Un identifiant mal formé correspond forcément à un produit inexistant
  const validIds = ids.filter((id) => UUID_RE.test(id))

  const prices: Record<string, LivePrice> = {}
  for (const id of ids) {
    prices[id] = { available: false, unitPrice: 0, regularPrice: 0, flashEndsAt: null }
  }

  if (validIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('id, price, flash_price, flash_starts_at, flash_ends_at, is_available')
      .in('id', validIds)

    if (error) {
      return NextResponse.json({ error: 'Impossible de vérifier les prix.' }, { status: 500 })
    }

    const now = new Date()
    for (const row of data ?? []) {
      prices[row.id] = {
        available: row.is_available === true,
        unitPrice: effectivePrice(row, now),
        regularPrice: Number(row.price),
        flashEndsAt: flashState(row, now) === 'active' ? row.flash_ends_at : null,
      }
    }
  }

  return NextResponse.json({ prices }, { headers: { 'Cache-Control': 'no-store' } })
}
