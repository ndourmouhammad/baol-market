import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff, hasRole } from '@/lib/verifyStaff'
import { logActivity } from '@/lib/activityLog'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 Mo
const BUCKET_NAME = 'partner-documents'

function isPdf(buffer: Buffer): boolean {
  if (buffer.length < 4) return false
  return buffer.subarray(0, 4).toString('ascii') === '%PDF'
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

  // Si magic bytes correspondants aux formats autorisés avec le bon MIME
  if (mime === 'image/jpeg') return '.jpg'
  if (mime === 'image/png') return '.png'
  if (mime === 'image/webp') return '.webp'

  return null
}

export async function POST(request: Request) {
  const staff = await verifyStaff(request)
  if (!staff || !hasRole(staff.role, 'admin')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const entity = formData.get('entity')
    const id = formData.get('id')
    const kind = formData.get('kind')
    const file = formData.get('file')

    if (!entity || (entity !== 'rider' && entity !== 'merchant')) {
      return NextResponse.json({ error: 'Type de partenaire invalide.' }, { status: 400 })
    }
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Identifiant manquant.' }, { status: 400 })
    }
    if (!kind || (kind !== 'photo' && kind !== 'id_document')) {
      return NextResponse.json({ error: 'Type de document invalide.' }, { status: 400 })
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

    if (kind === 'id_document') {
      if (!isPdf(buffer) || file.type !== 'application/pdf') {
        return NextResponse.json(
          { error: "La pièce d'identité doit être un fichier PDF valide." },
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

    const tableName = entity === 'rider' ? 'riders' : 'merchants'
    const column = kind === 'photo' ? 'photo_path' : 'id_document_path'

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

    const filename = `${kind}-${crypto.randomUUID()}${ext}`
    const storagePath = `${entity}s/${id}/${filename}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType,
        upsert: false,
      })

    if (uploadError) {
      console.error('Erreur upload bucket:', uploadError)
      return NextResponse.json({ error: 'Échec du téléversement du fichier.' }, { status: 500 })
    }

    // Supprimer l'ancien fichier s'il existait
    const partnerRecord = partner as { id: string; name: string; photo_path: string | null; id_document_path: string | null }
    const oldPath = kind === 'photo' ? partnerRecord.photo_path : partnerRecord.id_document_path
    if (oldPath) {
      try {
        await supabaseAdmin.storage.from(BUCKET_NAME).remove([oldPath])
      } catch (err) {
        console.error('Échec suppression ancien fichier:', err)
      }
    }

    // Mettre à jour le chemin dans la table
    const { error: updateError } = await supabaseAdmin
      .from(tableName)
      .update({ [column]: storagePath })
      .eq('id', id)

    if (updateError) {
      console.error('Erreur mise à jour chemin document:', updateError)
      return NextResponse.json({ error: 'Impossible d’enregistrer le document.' }, { status: 500 })
    }

    await logActivity(staff, {
      action: 'partner_document_uploaded',
      entityType: entity,
      entityId: id,
      details: { name: partner.name, kind },
    })

    return NextResponse.json({ success: true })
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
  const entity = searchParams.get('entity')
  const id = searchParams.get('id')
  const kind = searchParams.get('kind')

  if (!entity || (entity !== 'rider' && entity !== 'merchant')) {
    return NextResponse.json({ error: 'Type de partenaire invalide.' }, { status: 400 })
  }
  if (!id) {
    return NextResponse.json({ error: 'Identifiant manquant.' }, { status: 400 })
  }
  if (!kind || (kind !== 'photo' && kind !== 'id_document')) {
    return NextResponse.json({ error: 'Type de document invalide.' }, { status: 400 })
  }

  // La CNI est strictement réservée aux admins et super admin
  if (kind === 'id_document' && !hasRole(staff.role, 'admin')) {
    return NextResponse.json({ error: 'Accès refusé à la pièce d’identité.' }, { status: 403 })
  }

  const tableName = entity === 'rider' ? 'riders' : 'merchants'

  const { data: partner, error: pErr } = await supabaseAdmin
    .from(tableName)
    .select('id, name, photo_path, id_document_path')
    .eq('id', id)
    .maybeSingle()

  const partnerRecord = partner as { id: string; name: string; photo_path: string | null; id_document_path: string | null } | null
  const filePath = kind === 'photo' ? partnerRecord?.photo_path : partnerRecord?.id_document_path

  if (pErr || !partnerRecord || !filePath) {
    return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 })
  }
  const { data: signedData, error: signErr } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, 60)

  if (signErr || !signedData?.signedUrl) {
    console.error('Erreur signedUrl:', signErr)
    return NextResponse.json({ error: 'Impossible de générer le lien sécurisé.' }, { status: 500 })
  }

  // Journaliser la consultation de la CNI
  if (kind === 'id_document') {
    await logActivity(staff, {
      action: 'partner_document_viewed',
      entityType: entity,
      entityId: id,
      details: { name: partnerRecord.name, kind: 'id_document' },
    })
  }

  return NextResponse.json({ success: true, url: signedData.signedUrl })
}
