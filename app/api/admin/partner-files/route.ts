import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff, hasRole } from '@/lib/verifyStaff'
import { logActivity } from '@/lib/activityLog'
import { formatProviderPublicName } from '@/lib/services'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 Mo
const PRIVATE_BUCKET = 'partner-documents'
const PUBLIC_SERVICE_PHOTO_BUCKET = 'service-photos'

const VALID_ENTITIES = ['rider', 'merchant', 'service_provider'] as const
type EntityType = (typeof VALID_ENTITIES)[number]

const VALID_KINDS = ['photo', 'id_document', 'license', 'insurance'] as const
type KindType = (typeof VALID_KINDS)[number]

function isPdf(buffer: Buffer): boolean {
  if (buffer.length < 4) return false
  return buffer.subarray(0, 4).toString('ascii') === '%PDF'
}

function isAcceptedPdf(file: File, buffer: Buffer): boolean {
  const mimeIsPdf = file.type === 'application/pdf' || file.type === 'application/octet-stream'
  const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf')
  return isPdf(buffer) && (mimeIsPdf || hasPdfExtension)
}

function getImageExtension(buffer: Buffer, mime: string): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return '.jpg'
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return '.png'
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return '.webp'
  }

  if (mime === 'image/jpeg') return '.jpg'
  if (mime === 'image/png') return '.png'
  if (mime === 'image/webp') return '.webp'

  return null
}

function getColumnForKind(kind: KindType): string {
  switch (kind) {
    case 'photo':
      return 'photo_path'
    case 'id_document':
      return 'id_document_path'
    case 'license':
      return 'license_path'
    case 'insurance':
      return 'insurance_path'
  }
}

function getBucketFor(entity: EntityType, kind: KindType): string {
  if (entity === 'service_provider' && kind === 'photo') {
    return PUBLIC_SERVICE_PHOTO_BUCKET
  }
  return PRIVATE_BUCKET
}

export async function POST(request: Request) {
  const staff = await verifyStaff(request)
  if (!staff || !hasRole(staff.role, 'admin')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const entity = formData.get('entity') as EntityType | null
    const id = formData.get('id') as string | null
    const kind = formData.get('kind') as KindType | null
    const file = formData.get('file')

    if (!entity || !VALID_ENTITIES.includes(entity)) {
      return NextResponse.json({ error: 'Type de partenaire invalide.' }, { status: 400 })
    }
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Identifiant manquant.' }, { status: 400 })
    }
    if (!kind || !VALID_KINDS.includes(kind)) {
      return NextResponse.json({ error: 'Type de document invalide.' }, { status: 400 })
    }
    if (entity !== 'service_provider' && (kind === 'license' || kind === 'insurance')) {
      return NextResponse.json({ error: 'Type de document non autorisé pour ce profil.' }, { status: 400 })
    }
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Fichier manquant.' }, { status: 400 })
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: 'Le fichier est vide.' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Le fichier ne doit pas dépasser 5 Mo.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let ext = ''
    let contentType = file.type

    if (kind === 'id_document' || kind === 'license' || kind === 'insurance') {
      if (!isAcceptedPdf(file, buffer)) {
        const docLabel =
          kind === 'id_document'
            ? "La pièce d'identité"
            : kind === 'license'
            ? 'Le permis de conduire'
            : "L'attestation d'assurance"
        return NextResponse.json(
          { error: `${docLabel} doit être un fichier PDF valide.` },
          { status: 400 }
        )
      }
      ext = '.pdf'
      contentType = 'application/pdf'
    } else {
      const detectedExt = getImageExtension(buffer, file.type)
      if (!detectedExt) {
        return NextResponse.json(
          { error: 'La photo doit être au format JPEG, PNG ou WebP.' },
          { status: 400 }
        )
      }
      ext = detectedExt
      contentType = ext === '.jpg' ? 'image/jpeg' : ext === '.png' ? 'image/png' : 'image/webp'
    }

    const tableName =
      entity === 'rider' ? 'riders' : entity === 'merchant' ? 'merchants' : 'service_providers'
    const column = getColumnForKind(kind)

    let partnerName = ''
    let oldPath: string | null = null

    if (entity === 'service_provider') {
      const { data: provider, error: pErr } = await supabaseAdmin
        .from('service_providers')
        .select('id, first_name, last_name, profession, photo_path, id_document_path, license_path, insurance_path')
        .eq('id', id)
        .maybeSingle()

      if (pErr || !provider) {
        return NextResponse.json({ error: 'Prestataire introuvable.' }, { status: 404 })
      }

      if ((kind === 'license' || kind === 'insurance') && provider.profession !== 'taxi') {
        return NextResponse.json(
          { error: 'Le permis et l’assurance ne concernent que les taximen.' },
          { status: 400 }
        )
      }

      partnerName = formatProviderPublicName(provider.first_name, provider.last_name)
      oldPath = (provider as Record<string, string | null>)[column] ?? null
    } else {
      const { data: partner, error: pErr } = await supabaseAdmin
        .from(tableName)
        .select('id, name, photo_path, id_document_path')
        .eq('id', id)
        .maybeSingle()

      if (pErr || !partner) {
        return NextResponse.json(
          { error: `${entity === 'rider' ? 'Livreur' : 'Commerçant'} introuvable.` },
          { status: 404 }
        )
      }

      partnerName = partner.name
      oldPath = (partner as Record<string, string | null>)[column] ?? null
    }

    const bucketName = getBucketFor(entity, kind)
    const folder = entity === 'service_provider' ? 'service-providers' : `${entity}s`
    const filename = `${kind}-${crypto.randomUUID()}${ext}`
    const storagePath = `${folder}/${id}/${filename}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(storagePath, buffer, {
        contentType,
        upsert: false,
      })

    if (uploadError) {
      console.error('Erreur upload bucket:', uploadError)
      return NextResponse.json({ error: 'Échec du téléversement du fichier.' }, { status: 500 })
    }

    // Supprimer l'ancien fichier s'il existait
    if (oldPath) {
      try {
        await supabaseAdmin.storage.from(bucketName).remove([oldPath])
      } catch (err) {
        console.error('Échec suppression ancien fichier:', err)
      }
    }

    // Mettre à jour le chemin dans la table correspondante
    const { error: updateError } = await supabaseAdmin
      .from(tableName)
      .update({ [column]: storagePath, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      console.error('Erreur mise à jour chemin document:', updateError)
      return NextResponse.json({ error: 'Impossible d’enregistrer le document.' }, { status: 500 })
    }

    await logActivity(staff, {
      action: 'partner_document_uploaded',
      entityType: entity,
      entityId: id,
      details: { name: partnerName, kind },
    })

    return NextResponse.json({ success: true, path: storagePath })
  } catch (err) {
    console.error('Erreur partner-files POST:', err)
    return NextResponse.json({ error: 'Erreur lors du traitement du fichier.' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const staff = await verifyStaff(request)
  if (!staff) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const entity = searchParams.get('entity') as EntityType | null
  const id = searchParams.get('id')
  const kind = searchParams.get('kind') as KindType | null

  if (!entity || !VALID_ENTITIES.includes(entity)) {
    return NextResponse.json({ error: 'Type de partenaire invalide.' }, { status: 400 })
  }
  if (!id) {
    return NextResponse.json({ error: 'Identifiant manquant.' }, { status: 400 })
  }
  if (!kind || !VALID_KINDS.includes(kind)) {
    return NextResponse.json({ error: 'Type de document invalide.' }, { status: 400 })
  }

  // Les pièces justificatives sont strictement réservées aux admins et super admins
  if (kind !== 'photo' && !hasRole(staff.role, 'admin')) {
    return NextResponse.json({ error: 'Accès refusé à ce document.' }, { status: 403 })
  }

  const tableName =
    entity === 'rider' ? 'riders' : entity === 'merchant' ? 'merchants' : 'service_providers'
  const column = getColumnForKind(kind)

  let partnerName = ''
  let filePath: string | null = null

  if (entity === 'service_provider') {
    const { data: provider, error: pErr } = await supabaseAdmin
      .from('service_providers')
      .select('id, first_name, last_name, photo_path, id_document_path, license_path, insurance_path')
      .eq('id', id)
      .maybeSingle()

    if (pErr || !provider) {
      return NextResponse.json({ error: 'Prestataire introuvable.' }, { status: 404 })
    }
    partnerName = formatProviderPublicName(provider.first_name, provider.last_name)
    filePath = (provider as Record<string, string | null>)[column] ?? null
  } else {
    const { data: partner, error: pErr } = await supabaseAdmin
      .from(tableName)
      .select('id, name, photo_path, id_document_path')
      .eq('id', id)
      .maybeSingle()

    if (pErr || !partner) {
      return NextResponse.json({ error: 'Partenaire introuvable.' }, { status: 404 })
    }
    partnerName = partner.name
    filePath = (partner as Record<string, string | null>)[column] ?? null
  }

  if (!filePath) {
    return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 })
  }

  const bucketName = getBucketFor(entity, kind)
  const { data: signedData, error: signErr } = await supabaseAdmin.storage
    .from(bucketName)
    .createSignedUrl(filePath, 60)

  if (signErr || !signedData?.signedUrl) {
    console.error('Erreur signedUrl:', signErr)
    return NextResponse.json({ error: 'Impossible de générer le lien sécurisé.' }, { status: 500 })
  }

  // Journaliser la consultation des pièces justificatives
  if (kind !== 'photo') {
    await logActivity(staff, {
      action: 'partner_document_viewed',
      entityType: entity,
      entityId: id,
      details: { name: partnerName, kind },
    })
  }

  return NextResponse.json({ success: true, url: signedData.signedUrl })
}
