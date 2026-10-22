import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff, hasRole } from '@/lib/verifyStaff'
import { logActivity } from '@/lib/activityLog'
import { validateRegionDepartment } from '@/lib/senegalDepartments'

export async function GET(request: Request) {
  const staff = await verifyStaff(request)
  if (!staff) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('merchants')
    .select('id, name, phone, address, notes, category_id, categories(name), region, department, neighborhood, photo_path, id_document_path')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Ne jamais exposer les chemins de fichiers : renvoyer des booléens
  const merchants = (data ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    phone: m.phone,
    address: m.address,
    notes: m.notes,
    category_id: m.category_id,
    categories: m.categories,
    region: m.region,
    department: m.department,
    neighborhood: m.neighborhood,
    has_photo: !!m.photo_path,
    has_id_document: !!m.id_document_path,
  }))

  return NextResponse.json({ merchants })
}

export async function POST(request: Request) {
  const staff = await verifyStaff(request)
  if (!staff || !hasRole(staff.role, 'admin')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const body = await request.json()

  // Validation adresse (facultative mais cohérente si fournie)
  if (body.region || body.department) {
    const v = validateRegionDepartment(body.region, body.department)
    if (!v.valid) return NextResponse.json({ error: v.error }, { status: 400 })
  }

  if (body.neighborhood && (typeof body.neighborhood !== 'string' || body.neighborhood.length > 100)) {
    return NextResponse.json({ error: 'Le quartier ne doit pas dépasser 100 caractères.' }, { status: 400 })
  }

  const { data: created, error } = await supabaseAdmin
    .from('merchants')
    .insert({
      name: body.name,
      phone: body.phone,
      address: body.address,
      notes: body.notes || null,
      category_id: body.category_id || null,
      region: body.region || null,
      department: body.department || null,
      neighborhood: body.neighborhood || null,
    })
    .select('id')
    .single()

  if (error || !created) {
    return NextResponse.json({ error: error?.message || 'Impossible de créer le commerçant.' }, { status: 500 })
  }

  await logActivity(staff, {
    action: 'merchant_created',
    entityType: 'merchant',
    entityId: created.id,
    details: { name: body.name },
  })

  return NextResponse.json({ success: true, id: created.id })
}