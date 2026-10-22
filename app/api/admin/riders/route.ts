import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff, hasRole } from '@/lib/verifyStaff'
import { logActivity } from '@/lib/activityLog'
import { validateRegionDepartment } from '@/lib/senegalDepartments'

export async function GET(request: Request) {
  const staff = await verifyStaff(request)
  if (!staff) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('riders')
    .select('id, name, phone, is_active, region, department, neighborhood, photo_path, id_document_path')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Ne jamais exposer les chemins de fichiers : renvoyer des booléens
  const riders = (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    is_active: r.is_active,
    region: r.region,
    department: r.department,
    neighborhood: r.neighborhood,
    has_photo: !!r.photo_path,
    has_id_document: !!r.id_document_path,
  }))

  return NextResponse.json({ riders })
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
    .from('riders')
    .insert({
      name: body.name,
      phone: body.phone,
      is_active: true,
      region: body.region || null,
      department: body.department || null,
      neighborhood: body.neighborhood || null,
    })
    .select('id')
    .single()

  if (error || !created) {
    return NextResponse.json({ error: error?.message || 'Impossible de créer le livreur.' }, { status: 500 })
  }

  await logActivity(staff, {
    action: 'rider_created',
    entityType: 'rider',
    entityId: created.id,
    details: { name: body.name },
  })

  return NextResponse.json({ success: true, id: created.id })
}