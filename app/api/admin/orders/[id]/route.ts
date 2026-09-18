import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAdmin } from '@/lib/verifyAdmin'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await verifyAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status !== undefined) updateData.status = body.status
  if (body.rider_id !== undefined) updateData.rider_id = body.rider_id || null

  const { error } = await supabaseAdmin
    .from('orders')
    .update(updateData)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}