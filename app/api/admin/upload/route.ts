import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyAdmin } from '@/lib/verifyAdmin'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 Mo

export async function POST(request: Request) {
  const admin = await verifyAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Format non accepté. Utilisez une image JPEG, PNG, WEBP ou GIF.' },
      { status: 400 }
    )
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'Image trop lourde (5 Mo maximum). Compressez-la avant de réessayer.' },
      { status: 400 }
    )
  }

  const arrayBuffer = await file.arrayBuffer()
  const extension = file.name.split('.').pop() || 'jpg'
  const fileName = `${crypto.randomUUID()}.${extension}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('products')
    .upload(fileName, arrayBuffer, { contentType: file.type })

  if (uploadError) {
    // Le bucket Supabase applique aussi ses propres règles (taille/type) :
    // si jamais un fichier passe nos contrôles mais est bloqué côté Supabase,
    // on traduit le message brut en quelque chose de compréhensible.
    const message = uploadError.message.toLowerCase()
    if (message.includes('mime') || message.includes('type')) {
      return NextResponse.json(
        { error: 'Format non accepté par le serveur de stockage.' },
        { status: 400 }
      )
    }
    if (message.includes('size') || message.includes('exceeded')) {
      return NextResponse.json(
        { error: 'Image trop lourde pour le serveur de stockage.' },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from('products').getPublicUrl(fileName)

  return NextResponse.json({ url: publicUrlData.publicUrl })
}