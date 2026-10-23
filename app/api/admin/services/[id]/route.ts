import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff, hasRole } from '@/lib/verifyStaff'
import { logActivity } from '@/lib/activityLog'
import {
  SERVICE_PROFESSIONS,
  type ServiceProfession,
  isValidDiourbelDepartment,
  formatProviderPublicName,
} from '@/lib/services'
import { normalizePhone } from '@/lib/phoneAuth'

const EDITABLE_FIELDS = [
  'first_name',
  'last_name',
  'profession',
  'years_experience',
  'department',
  'neighborhood',
  'address_details',
  'phone',
  'is_active',
  'license_expires_on',
  'insurance_expires_on',
] as const

const VALUE_FIELDS = ['first_name', 'last_name', 'is_active']

function normalize(value: unknown) {
  return value === '' || value === undefined ? null : value
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await verifyStaff(request)
  if (!staff || !hasRole(staff.role, 'admin')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()

  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('service_providers')
    .select(`
      id,
      first_name,
      last_name,
      profession,
      years_experience,
      department,
      neighborhood,
      address_details,
      phone,
      is_active,
      license_expires_on,
      insurance_expires_on,
      license_path,
      insurance_path
    `)
    .eq('id', id)
    .maybeSingle()

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Prestataire introuvable.' }, { status: 404 })
  }

  const updates: Record<string, unknown> = {}
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) updates[field] = body[field]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucune modification à appliquer.' }, { status: 400 })
  }

  // 1. Validation prénom & nom
  if ('first_name' in updates) {
    const fn = typeof updates.first_name === 'string' ? updates.first_name.trim() : ''
    if (!fn || fn.length > 60) {
      return NextResponse.json({ error: 'Le prénom doit comporter entre 1 et 60 caractères.' }, { status: 400 })
    }
    updates.first_name = fn
  }
  if ('last_name' in updates) {
    const ln = typeof updates.last_name === 'string' ? updates.last_name.trim() : ''
    if (!ln || ln.length > 60) {
      return NextResponse.json({ error: 'Le nom doit comporter entre 1 et 60 caractères.' }, { status: 400 })
    }
    updates.last_name = ln
  }

  // 2. Profession
  const effectiveProfession = (updates.profession ?? existing.profession) as ServiceProfession
  if ('profession' in updates) {
    if (!SERVICE_PROFESSIONS.includes(updates.profession as ServiceProfession)) {
      return NextResponse.json({ error: 'Métier invalide.' }, { status: 400 })
    }
  }

  // 3. Années d'expérience
  if ('years_experience' in updates) {
    const years = Number(updates.years_experience)
    if (!Number.isInteger(years) || years < 0 || years > 60) {
      return NextResponse.json({ error: 'Les années d’expérience doivent être comprises entre 0 et 60.' }, { status: 400 })
    }
    updates.years_experience = years
  }

  // 4. Département
  if ('department' in updates) {
    const dep = typeof updates.department === 'string' ? updates.department.trim() : ''
    if (!isValidDiourbelDepartment(dep)) {
      return NextResponse.json({ error: 'Le département doit être Bambey, Diourbel ou Mbacké.' }, { status: 400 })
    }
    updates.department = dep
  }

  // 5. Quartier & précisions
  if ('neighborhood' in updates) {
    const n = typeof updates.neighborhood === 'string' ? updates.neighborhood.trim() : null
    if (n && n.length > 100) {
      return NextResponse.json({ error: 'Le quartier ne doit pas dépasser 100 caractères.' }, { status: 400 })
    }
    updates.neighborhood = n || null
  }
  if ('address_details' in updates) {
    const a = typeof updates.address_details === 'string' ? updates.address_details.trim() : null
    if (a && a.length > 200) {
      return NextResponse.json({ error: 'Les précisions d’adresse ne doivent pas dépasser 200 caractères.' }, { status: 400 })
    }
    updates.address_details = a || null
  }

  // 6. Téléphone
  if ('phone' in updates) {
    const raw = typeof updates.phone === 'string' ? updates.phone : ''
    const norm = normalizePhone(raw)
    if (!norm) {
      return NextResponse.json({ error: 'Numéro de téléphone sénégalais invalide.' }, { status: 400 })
    }
    updates.phone = norm
  }

  // 7. Statut actif
  if ('is_active' in updates && typeof updates.is_active !== 'boolean') {
    return NextResponse.json({ error: 'Valeur invalide pour le statut actif.' }, { status: 400 })
  }

  // 8. Permis et assurance : acceptés uniquement pour 'taxi'
  const hasLicenseDates = 'license_expires_on' in updates && updates.license_expires_on
  const hasInsuranceDates = 'insurance_expires_on' in updates && updates.insurance_expires_on

  if (effectiveProfession !== 'taxi') {
    if (hasLicenseDates || hasInsuranceDates) {
      return NextResponse.json(
        { error: 'Le permis et l’assurance sont réservés aux taximen.' },
        { status: 400 }
      )
    }
    // Si le métier change et n'est plus taxi, vider les dates
    if ('profession' in updates && existing.profession === 'taxi') {
      updates.license_expires_on = null
      updates.insurance_expires_on = null
    }
  }

  const before = existing as Record<string, unknown>

  // Déterminer les changements réels pour le journal
  const changes: { field: string; from?: unknown; to?: unknown }[] = []
  for (const field of EDITABLE_FIELDS) {
    if (!(field in updates)) continue
    const oldValue = normalize(before[field])
    const newValue = normalize(updates[field])
    if (oldValue === newValue) continue
    changes.push(VALUE_FIELDS.includes(field) ? { field, from: oldValue, to: newValue } : { field })
  }

  if (changes.length === 0) {
    return NextResponse.json({ success: true })
  }

  updates.updated_at = new Date().toISOString()

  const { error: updateErr } = await supabaseAdmin
    .from('service_providers')
    .update(updates)
    .eq('id', id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  const currentFirstName = typeof updates.first_name === 'string' ? updates.first_name : existing.first_name
  const currentLastName = typeof updates.last_name === 'string' ? updates.last_name : existing.last_name
  const providerName = formatProviderPublicName(currentFirstName, currentLastName)

  const activityChange = changes.find((c) => c.field === 'is_active')
  const otherChanges = changes.filter((c) => c.field !== 'is_active')

  if (otherChanges.length > 0) {
    await logActivity(staff, {
      action: 'service_provider_updated',
      entityType: 'service_provider',
      entityId: id,
      details: { name: providerName, changes: otherChanges },
    })
  }

  if (activityChange) {
    await logActivity(staff, {
      action: 'service_provider_availability_changed',
      entityType: 'service_provider',
      entityId: id,
      details: { name: providerName, to: activityChange.to },
    })
  }

  return NextResponse.json({ success: true })
}

/**
 * Nettoie les fichiers des deux buckets pour un prestataire supprimé.
 */
async function cleanupServiceFiles(provider: {
  photo_path: string | null
  id_document_path: string | null
  license_path: string | null
  insurance_path: string | null
}) {
  try {
    if (provider.photo_path) {
      await supabaseAdmin.storage.from('service-photos').remove([provider.photo_path])
    }
  } catch (err) {
    console.error('Échec suppression photo service-photos:', err)
  }

  try {
    const docPaths = [
      provider.id_document_path,
      provider.license_path,
      provider.insurance_path,
    ].filter(Boolean) as string[]

    if (docPaths.length > 0) {
      await supabaseAdmin.storage.from('partner-documents').remove(docPaths)
    }
  } catch (err) {
    console.error('Échec suppression documents partner-documents:', err)
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await verifyStaff(request)
  if (!staff || !hasRole(staff.role, 'admin')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params

  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('service_providers')
    .select('first_name, last_name, photo_path, id_document_path, license_path, insurance_path')
    .eq('id', id)
    .maybeSingle()

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Prestataire introuvable.' }, { status: 404 })
  }

  // Nettoyage des deux buckets
  await cleanupServiceFiles(existing)

  const { error: delErr } = await supabaseAdmin.from('service_providers').delete().eq('id', id)
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  const providerName = formatProviderPublicName(existing.first_name, existing.last_name)
  await logActivity(staff, {
    action: 'service_provider_deleted',
    entityType: 'service_provider',
    entityId: id,
    details: { name: providerName },
  })

  return NextResponse.json({ success: true })
}
