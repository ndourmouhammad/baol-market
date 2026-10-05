import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyStaff, hasRole } from '@/lib/verifyStaff'
import { ROLE_LABELS, actionLabel, entityLabel, detailsLabel } from '@/lib/activityLabels'

const PAGE_SIZE = 25
const EXPORT_LIMIT = 5000
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const COLUMNS = 'id, created_at, actor_id, actor_email, actor_role, action, entity_type, entity_id, details'

type Entry = {
  id: string
  created_at: string
  actor_id: string | null
  actor_email: string
  actor_role: string
  action: string
  entity_type: string | null
  entity_id: string | null
  details: Record<string, unknown> | null
}

// Cellule CSV : entre guillemets, et protégée contre les formules (=, +, -, @) qu'Excel exécuterait
function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

export async function GET(request: Request) {
  // Accès réservé au super admin, vérifié ici côté serveur
  const staff = await verifyStaff(request)
  if (!staff || !hasRole(staff.role, 'super_admin')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const actor = searchParams.get('actor') || ''
  const action = searchParams.get('action') || ''
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const format = searchParams.get('format')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)

  if (actor && !UUID_RE.test(actor)) {
    return NextResponse.json({ error: 'Filtre auteur invalide.' }, { status: 400 })
  }
  if ((from && !DATE_RE.test(from)) || (to && !DATE_RE.test(to))) {
    return NextResponse.json({ error: 'Date invalide.' }, { status: 400 })
  }

  function filteredQuery() {
    let query = supabaseAdmin
      .from('staff_activity_log')
      .select(COLUMNS, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (actor) query = query.eq('actor_id', actor)
    if (action) query = query.eq('action', action)
    // Le Sénégal est à UTC+0 : les bornes de jour en UTC correspondent à l'heure locale
    if (from) query = query.gte('created_at', `${from}T00:00:00.000Z`)
    if (to) query = query.lte('created_at', `${to}T23:59:59.999Z`)
    return query
  }

  // --- Export CSV ---
  if (format === 'csv') {
    const { data, error } = await filteredQuery().limit(EXPORT_LIMIT)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const header = ['Date', 'Auteur', 'Rôle', 'Action', 'Élément', 'Détail']
    const lines = [header.map(csvCell).join(';')]
    for (const entry of (data || []) as Entry[]) {
      lines.push(
        [
          new Date(entry.created_at).toLocaleString('fr-FR', {
            timeZone: 'Africa/Dakar',
            dateStyle: 'short',
            timeStyle: 'medium',
          }),
          entry.actor_email,
          ROLE_LABELS[entry.actor_role] ?? entry.actor_role,
          actionLabel(entry.action),
          entityLabel(entry.entity_type, entry.entity_id, entry.details),
          detailsLabel(entry.action, entry.details),
        ]
          .map(csvCell)
          .join(';')
      )
    }

    // BOM pour qu'Excel affiche correctement les accents
    const body = '\uFEFF' + lines.join('\r\n')
    const today = new Date().toISOString().slice(0, 10)
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="journal-${today}.csv"`,
      },
    })
  }

  // --- Liste paginée ---
  const offset = (page - 1) * PAGE_SIZE
  const { data, error, count } = await filteredQuery().range(offset, offset + PAGE_SIZE - 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Liste des auteurs pour le filtre (sans doublon), y compris les membres retirés depuis
  const { data: actorRows } = await supabaseAdmin
    .from('staff_activity_log')
    .select('actor_id, actor_email, actor_role')
    .order('created_at', { ascending: false })
    .limit(2000)

  const seen = new Set<string>()
  const actors: { id: string; email: string; role: string }[] = []
  for (const row of actorRows || []) {
    if (row.actor_id && !seen.has(row.actor_id)) {
      seen.add(row.actor_id)
      actors.push({ id: row.actor_id, email: row.actor_email, role: row.actor_role })
    }
  }

  return NextResponse.json({
    entries: (data || []) as Entry[],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    actors,
  })
}