import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAdmin } from '@/lib/verifyAdmin'

export async function GET(request: Request) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('merchants')
    .select('id, name')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ merchants: data })
}