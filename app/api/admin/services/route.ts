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

export async function GET(request: Request) {
  const staff = await verifyStaff(request)
  if (!staff) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('service_providers')
    .select(`
      id,
      first_name,
      last_name,
      profession,
      years_experience,
      region,
      department,
      neighborhood,
      address_details,
      phone,
      is_active,
      photo_path,
      id_document_path,
      license_path,
      insurance_path,
      license_expires_on,
      insurance_expires_on,
      created_at,
      updated_at
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Renvoyer les champs texte et des booléens pour les pièces : JAMAIS les chemins de fichiers
  const services = (data ?? []).map((p) => ({
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    profession: p.profession,
    years_experience: p.years_experience,
    region: p.region,
    department: p.department,
    neighborhood: p.neighborhood,
    address_details: p.address_details,
    phone: p.phone,
    is_active: p.is_active,
    has_photo: !!p.photo_path,
    has_id_document: !!p.id_document_path,
    has_license: !!p.license_path,
    has_insurance: !!p.insurance_path,
    license_expires_on: p.license_expires_on,
    insurance_expires_on: p.insurance_expires_on,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }))

  return NextResponse.json({ services })
}

export async function POST(request: Request) {
  const staff = await verifyStaff(request)
  if (!staff || !hasRole(staff.role, 'admin')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const body = await request.json()

  // 1. Validation prénom et nom (1 à 60 caractères)
  const firstName = typeof body.first_name === 'string' ? body.first_name.trim() : ''
  const lastName = typeof body.last_name === 'string' ? body.last_name.trim() : ''
  if (!firstName || firstName.length > 60) {
    return NextResponse.json({ error: 'Le prénom doit comporter entre 1 et 60 caractères.' }, { status: 400 })
  }
  if (!lastName || lastName.length > 60) {
    return NextResponse.json({ error: 'Le nom doit comporter entre 1 et 60 caractères.' }, { status: 400 })
  }

  // 2. Profession
  const profession = body.profession as ServiceProfession
  if (!profession || !SERVICE_PROFESSIONS.includes(profession)) {
    return NextResponse.json({ error: 'Métier invalide.' }, { status: 400 })
  }

  // 3. Années d'expérience (0 à 60)
  const years = Number(body.years_experience)
  if (!Number.isInteger(years) || years < 0 || years > 60) {
    return NextResponse.json({ error: 'Les années d’expérience doivent être comprises entre 0 et 60.' }, { status: 400 })
  }

  // 4. Département (Diourbel uniquement)
  const department = typeof body.department === 'string' ? body.department.trim() : ''
  if (!isValidDiourbelDepartment(department)) {
    return NextResponse.json(
      { error: 'Le département doit être Bambey, Diourbel ou Mbacké.' },
      { status: 400 }
    )
  }

  // 5. Quartier (max 100 caractères)
  const neighborhood = typeof body.neighborhood === 'string' ? body.neighborhood.trim() : null
  if (neighborhood && neighborhood.length > 100) {
    return NextResponse.json({ error: 'Le quartier ne doit pas dépasser 100 caractères.' }, { status: 400 })
  }

  // 6. Précisions (max 200 caractères)
  const addressDetails = typeof body.address_details === 'string' ? body.address_details.trim() : null
  if (addressDetails && addressDetails.length > 200) {
    return NextResponse.json({ error: 'Les précisions d’adresse ne doivent pas dépasser 200 caractères.' }, { status: 400 })
  }

  // 7. Téléphone normalisé
  const rawPhone = typeof body.phone === 'string' ? body.phone : ''
  const normalizedPhone = normalizePhone(rawPhone)
  if (!normalizedPhone) {
    return NextResponse.json({ error: 'Numéro de téléphone sénégalais invalide.' }, { status: 400 })
  }

  // 8. Permis et assurance : autorisés uniquement pour les taximen
  const licenseExpiresOn = body.license_expires_on ? String(body.license_expires_on) : null
  const insuranceExpiresOn = body.insurance_expires_on ? String(body.insurance_expires_on) : null

  if (profession !== 'taxi') {
    if (licenseExpiresOn || insuranceExpiresOn) {
      return NextResponse.json(
        { error: 'Le permis et l’assurance sont réservés aux taximen.' },
        { status: 400 }
      )
    }
  }

  const { data: created, error } = await supabaseAdmin
    .from('service_providers')
    .insert({
      first_name: firstName,
      last_name: lastName,
      profession,
      years_experience: years,
      region: 'Diourbel',
      department,
      neighborhood: neighborhood || null,
      address_details: addressDetails || null,
      phone: normalizedPhone,
      is_active: body.is_active !== false,
      license_expires_on: profession === 'taxi' ? licenseExpiresOn : null,
      insurance_expires_on: profession === 'taxi' ? insuranceExpiresOn : null,
    })
    .select('id')
    .single()

  if (error || !created) {
    console.error('Erreur création prestataire:', error)
    return NextResponse.json({ error: error?.message || 'Impossible de créer le prestataire.' }, { status: 500 })
  }

  await logActivity(staff, {
    action: 'service_provider_created',
    entityType: 'service_provider',
    entityId: created.id,
    details: { name: formatProviderPublicName(firstName, lastName) },
  })

  return NextResponse.json({ success: true, id: created.id })
}
