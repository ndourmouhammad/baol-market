'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2, ScrollText, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { ACTION_LABELS, ROLE_LABELS, actionLabel, entityLabel, detailsLabel } from '@/lib/activityLabels'

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

type Actor = { id: string; email: string; role: string }

async function authFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${session?.access_token}` },
  })
}

export default function AdminJournalPage() {
  const router = useRouter()
  const [allowed, setAllowed] = useState(false)

  const [entries, setEntries] = useState<Entry[]>([])
  const [actors, setActors] = useState<Actor[]>([])
  const [total, setTotal] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  const [page, setPage] = useState(1)
  const [actor, setActor] = useState('')
  const [action, setAction] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  // Réservé au super admin : les autres sont renvoyés vers leur espace
  // (le serveur refuse de toute façon les données aux autres rôles).
  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      const { data: staffRow } = await supabase.from('staff').select('role').eq('id', user.id).maybeSingle()
      if (staffRow?.role !== 'super_admin') {
        router.replace('/admin')
        return
      }
      setAllowed(true)
    }
    checkRole()
  }, [router])

  function buildParams(extra: Record<string, string> = {}) {
    const params = new URLSearchParams()
    if (actor) params.set('actor', actor)
    if (action) params.set('action', action)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    for (const [key, value] of Object.entries(extra)) params.set(key, value)
    return params
  }

  useEffect(() => {
    if (!allowed) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const res = await authFetch(`/api/admin/journal?${buildParams({ page: String(page) })}`)
      const json = await res.json().catch(() => ({}))
      if (cancelled) return

      if (!res.ok) {
        setError(json.error || 'Impossible de charger le journal.')
      } else {
        setError('')
        setEntries(json.entries)
        setTotal(json.total)
        setPageSize(json.pageSize)
        setActors(json.actors)
      }
      setLoading(false)
    }
    load()

    return () => { cancelled = true }
    // buildParams dépend des filtres déjà listés ci-dessous
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, page, actor, action, from, to])

  function changeFilter(setter: (value: string) => void, value: string) {
    setter(value)
    setPage(1)
  }

  function resetFilters() {
    setActor('')
    setAction('')
    setFrom('')
    setTo('')
    setPage(1)
  }

  async function exportCsv() {
    setExporting(true)
    const res = await authFetch(`/api/admin/journal?${buildParams({ format: 'csv' })}`)
    setExporting(false)

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      alert(json.error || "Impossible d'exporter le journal.")
      return
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `journal-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!allowed) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-(--vert-baol)" />
      </div>
    )
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasFilters = !!(actor || action || from || to)
  const inputClass =
    'w-full border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm text-(--encre) focus:ring-2 focus:ring-(--vert-baol) outline-none'

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-(--encre)">
          Journal d&apos;activité <span className="text-(--gris-texte) text-lg font-normal">({total})</span>
        </h2>
        <button
          onClick={exportCsv}
          disabled={exporting || total === 0}
          className="inline-flex items-center justify-center gap-2 text-sm font-bold text-(--vert-baol-fonce) bg-(--vert-baol)/10 border border-(--vert-baol)/20 rounded-xl px-4 py-2.5 hover:bg-(--vert-baol)/20 transition-colors disabled:opacity-50"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Exporter en CSV
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
        <div>
          <label className="block text-xs font-bold text-(--gris-texte) uppercase tracking-wider mb-1">Auteur</label>
          <select value={actor} onChange={(e) => changeFilter(setActor, e.target.value)} className={inputClass}>
            <option value="">Tous</option>
            {actors.map((a) => (
              <option key={a.id} value={a.id}>{a.email}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-(--gris-texte) uppercase tracking-wider mb-1">Action</label>
          <select value={action} onChange={(e) => changeFilter(setAction, e.target.value)} className={inputClass}>
            <option value="">Toutes</option>
            {Object.entries(ACTION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-(--gris-texte) uppercase tracking-wider mb-1">Du</label>
          <input type="date" value={from} onChange={(e) => changeFilter(setFrom, e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-bold text-(--gris-texte) uppercase tracking-wider mb-1">Au</label>
          <input type="date" value={to} onChange={(e) => changeFilter(setTo, e.target.value)} className={inputClass} />
        </div>
        <button
          onClick={resetFilters}
          disabled={!hasFilters}
          className="text-sm font-bold text-(--gris-texte) border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          Réinitialiser
        </button>
      </div>

      {error && <p className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl mb-6">{error}</p>}

      {loading && entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-(--gris-texte)">
          <Loader2 className="w-8 h-8 animate-spin text-(--vert-baol) mb-4" />
          <p>Chargement du journal...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 text-(--gris-texte)">
          <ScrollText className="w-12 h-12 mb-4 text-gray-300" />
          <p className="text-lg">{hasFilters ? 'Aucune activité pour ces filtres.' : "Aucune activité enregistrée pour le moment."}</p>
        </div>
      ) : (
        <div className={`bg-white border border-gray-100 rounded-2xl overflow-hidden transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-(--encre) font-bold border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 whitespace-nowrap">Date</th>
                  <th className="px-5 py-3">Auteur</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Élément</th>
                  <th className="px-5 py-3">Détail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-(--encre)">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap text-(--gris-texte)">
                      {new Date(entry.created_at).toLocaleString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium break-all">{entry.actor_email}</p>
                      <p className="text-xs text-(--gris-texte)">{ROLE_LABELS[entry.actor_role] ?? entry.actor_role}</p>
                    </td>
                    <td className="px-5 py-3 font-medium">{actionLabel(entry.action)}</td>
                    <td className="px-5 py-3 whitespace-nowrap">{entityLabel(entry.entity_type, entry.entity_id, entry.details)}</td>
                    <td className="px-5 py-3">{detailsLabel(entry.action, entry.details)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {total > pageSize && (
        <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-100 rounded-2xl mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-(--gris-texte) hover:text-(--encre) disabled:opacity-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Précédent
          </button>
          <span className="text-sm text-(--gris-texte) font-medium">
            Page {page} sur {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-(--gris-texte) hover:text-(--encre) disabled:opacity-50 transition-colors"
          >
            Suivant <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
