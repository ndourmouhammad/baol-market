'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Loader2,
  Bike,
  Phone,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  AlertTriangle,
  Power,
  PowerOff,
  ChevronLeft,
  ChevronRight,
  Lock,
  MapPin,
  FileText,
  X,
} from 'lucide-react'
import { Button } from '@/components/Button'
import { FormField } from '@/components/FormField'
import { ALL_REGIONS_WITH_DEPARTMENTS } from '@/lib/senegalDepartments'

const ITEMS_PER_PAGE = 8
const REGION_OPTIONS = Object.keys(ALL_REGIONS_WITH_DEPARTMENTS)

type StaffRole = 'super_admin' | 'admin' | 'moderator'
type Rider = {
  id: string
  name: string
  phone: string
  is_active: boolean
  region: string | null
  department: string | null
  neighborhood: string | null
  has_photo: boolean
  has_id_document: boolean
}

async function authFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${session?.access_token}` },
  })
}

async function uploadPartnerFile(id: string, file: File) {
  const { data: { session } } = await supabase.auth.getSession()
  const formData = new FormData()
  formData.append('entity', 'rider')
  formData.append('id', id)
  formData.append('kind', 'id_document')
  formData.append('file', file)

  const res = await fetch('/api/admin/partner-files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session?.access_token}` },
    body: formData,
  })

  if (!res.ok) {
    const json = await res.json()
    throw new Error(json.error || 'Échec du téléversement du document')
  }
}

function RiderAvatar() {
  return (
    <div className="w-12 h-12 rounded-xl bg-(--vert-baol)/10 flex items-center justify-center text-(--vert-baol) shrink-0">
      <Bike className="w-6 h-6" />
    </div>
  )
}

function DossierBadge({
  region,
  department,
  hasIdDocument,
}: {
  region: string | null
  department: string | null
  hasIdDocument: boolean
}) {
  const missing: string[] = []
  if (!region || !department) missing.push('adresse')
  if (!hasIdDocument) missing.push('CNI')

  if (missing.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        Dossier complet · Éligible aux courses
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"
      title={`Éléments requis : ${missing.join(', ')}`}
    >
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      Dossier incomplet · Non éligible aux courses ({missing.join(', ')})
    </span>
  )
}

export default function AdminRidersPage() {
  const [riders, setRiders] = useState<Rider[]>([])
  const [role, setRole] = useState<StaffRole | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [region, setRegion] = useState('')
  const [department, setDepartment] = useState('')
  const [neighborhood, setNeighborhood] = useState('')

  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null)

  const [viewingCniId, setViewingCniId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [riderToDelete, setRiderToDelete] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  async function loadRiders() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: staffRow } = await supabase.from('staff').select('role').eq('id', user.id).maybeSingle()
      setRole((staffRow?.role as StaffRole) ?? null)
    }
    const res = await authFetch('/api/admin/riders')
    const json = await res.json()
    if (res.ok) setRiders(json.riders)
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRiders()
  }, [])

  const canWrite = role === 'admin' || role === 'super_admin'

  async function handleViewCni(riderId: string) {
    setViewingCniId(riderId)
    try {
      const res = await authFetch(`/api/admin/partner-files?entity=rider&id=${riderId}&kind=id_document`)
      const data = await res.json()
      if (!res.ok || !data.url) {
        alert(data.error || 'Impossible d’ouvrir la pièce d’identité.')
      } else {
        window.open(data.url, '_blank', 'noopener,noreferrer')
      }
    } catch {
      alert('Erreur lors de la récupération de la pièce d’identité.')
    } finally {
      setViewingCniId(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const url = editingId ? `/api/admin/riders/${editingId}` : '/api/admin/riders'
    const method = editingId ? 'PATCH' : 'POST'

    try {
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          region: region || null,
          department: department || null,
          neighborhood: neighborhood.trim() || null,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        setSaving(false)
        setError(json.error)
        return
      }

      const targetId = editingId || json.id

      if (idDocumentFile && targetId) {
        await uploadPartnerFile(targetId, idDocumentFile)
      }

      setSaving(false)
      cancelEdit()
      loadRiders()
    } catch (err: unknown) {
      setSaving(false)
      const message = err instanceof Error ? err.message : 'Une erreur est survenue'
      setError(message)
    }
  }

  function startEdit(rider: Rider) {
    setEditingId(rider.id)
    setName(rider.name)
    setPhone(rider.phone)
    setRegion(rider.region || '')
    setDepartment(rider.department || '')
    setNeighborhood(rider.neighborhood || '')
    setIdDocumentFile(null)
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setName('')
    setPhone('')
    setRegion('')
    setDepartment('')
    setNeighborhood('')
    setIdDocumentFile(null)
    setError('')
  }

  async function deleteRider(id: string) {
    await authFetch(`/api/admin/riders/${id}`, { method: 'DELETE' })
    setRiderToDelete(null)
    loadRiders()
  }

  async function toggleActive(rider: Rider) {
    await authFetch(`/api/admin/riders/${rider.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !rider.is_active }),
    })
    loadRiders()
  }

  if (loading && riders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-(--gris-texte)">
        <Loader2 className="w-8 h-8 animate-spin text-(--vert-baol) mb-4" />
        <p>Chargement des livreurs...</p>
      </div>
    )
  }

  const totalPages = Math.ceil(riders.length / ITEMS_PER_PAGE)
  const paginatedRiders = riders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  const availableDepartments = region ? ALL_REGIONS_WITH_DEPARTMENTS[region] ?? [] : []

  return (
    <div className="max-w-6xl mx-auto">
      <div className={`grid gap-8 items-start ${canWrite ? 'lg:grid-cols-[380px_1fr]' : ''}`}>
        {canWrite ? (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:sticky lg:top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
            <h2 className="text-xl font-bold text-(--encre) mb-6">
              {editingId ? 'Modifier le livreur' : 'Ajouter un livreur'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <FormField
                label="Nom du livreur"
                type="text"
                placeholder="Ex: Modou Fall"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <FormField
                label="Téléphone"
                type="tel"
                placeholder="Ex: 77 123 45 67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />

              <div className="space-y-1">
                <label className="text-sm font-medium text-(--encre) block">Région</label>
                <select
                  value={region}
                  onChange={(e) => {
                    setRegion(e.target.value)
                    setDepartment('')
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-(--encre) focus:ring-2 focus:ring-(--vert-baol) outline-none transition-all"
                >
                  <option value="">Sélectionner une région</option>
                  {REGION_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-(--encre) block">Département</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  disabled={!region}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-(--encre) focus:ring-2 focus:ring-(--vert-baol) outline-none transition-all disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">
                    {region ? 'Sélectionner un département' : 'Choisissez d’abord une région'}
                  </option>
                  {availableDepartments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <FormField
                label="Quartier (optionnel)"
                type="text"
                placeholder="Ex: Médina, Touba Mosquée..."
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                maxLength={100}
                helperText="Max 100 caractères"
              />



              {/* Pièce d'identité (CNI) */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-(--encre) block">
                  Pièce d&apos;identité (CNI PDF)
                </label>
                <div className="border border-dashed border-gray-300 rounded-xl p-3 text-center bg-gray-50/50 hover:bg-gray-50 transition-colors">
                  {idDocumentFile ? (
                    <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-lg border border-gray-200">
                      <FileText className="w-6 h-6 text-(--vert-baol) shrink-0" />
                      <div className="min-w-0 text-left flex-1">
                        <p className="text-xs font-semibold text-(--encre) truncate">{idDocumentFile.name}</p>
                        <p className="text-[11px] text-(--gris-texte)">{(idDocumentFile.size / 1024 / 1024).toFixed(2)} Mo</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIdDocumentFile(null)}
                        className="text-gray-400 hover:text-red-600 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          if (file.size > 5 * 1024 * 1024) {
                            setError('Le fichier CNI ne doit pas dépasser 5 Mo.')
                            return
                          }
                          const isPdfFile =
                            file.name.toLowerCase().endsWith('.pdf') ||
                            file.type === 'application/pdf' ||
                            file.type === 'application/octet-stream' ||
                            file.type === 'application/x-pdf'
                          if (!isPdfFile) {
                            setError('La CNI doit être un fichier PDF.')
                            return
                          }
                          setError('')
                          setIdDocumentFile(file)
                        }}
                      />
                      <div className="flex flex-col items-center gap-1 py-1 text-xs text-(--gris-texte)">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <span className="font-semibold text-(--vert-baol)">
                          {editingId ? 'Remplacer la CNI (PDF)' : 'Sélectionner la CNI (PDF)'}
                        </span>
                        <span className="text-[11px] text-gray-400">PDF uniquement (max 5 Mo) · Confidentiel</span>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded-lg font-medium">{error}</p>}
              <div className="flex gap-2 mt-4">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? 'En cours...' : editingId ? 'Enregistrer' : 'Ajouter'}
                </Button>
                {editingId && (
                  <Button type="button" variant="secondary" onClick={cancelEdit} className="flex-1">
                    Annuler
                  </Button>
                )}
              </div>
            </form>
          </div>
        ) : (
          <div className="hidden lg:flex flex-col items-center justify-center bg-white p-8 rounded-2xl border border-gray-100 text-(--gris-texte) text-center">
            <Lock className="w-10 h-10 mb-4 text-gray-300" />
            <p className="font-medium">Accès en lecture seule.<br />Contacte un admin pour modifier cette liste.</p>
          </div>
        )}

        <div>
          <h2 className="text-2xl font-bold text-(--encre) mb-6 flex items-center gap-3">
            Livreurs <span className="text-(--gris-texte) text-lg font-normal">({riders.length})</span>
          </h2>

          {riders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 text-(--gris-texte)">
              <Bike className="w-12 h-12 mb-4 text-gray-300" />
              <p className="text-lg">Aucun livreur pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {paginatedRiders.map((r) => (
                  <div key={r.id} className="bg-white p-5 rounded-2xl border border-gray-100 hover:shadow-sm transition-shadow flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <RiderAvatar />
                          <div className="min-w-0">
                            <h3 className="font-bold text-(--encre) text-lg truncate">{r.name}</h3>
                          </div>
                        </div>

                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shrink-0 ${r.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {r.is_active ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          {r.is_active ? 'Actif' : 'Inactif'}
                        </div>
                      </div>

                      <div className="mb-4">
                        <DossierBadge
                          region={r.region}
                          department={r.department}
                          hasIdDocument={r.has_id_document}
                        />
                      </div>

                      <div className="space-y-2 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
                        <div className="flex items-center gap-2.5 text-(--encre)">
                          <Phone className="w-4 h-4 text-(--gris-texte) shrink-0" />
                          <span className="font-bold">{r.phone}</span>
                        </div>
                        <div className="flex items-start gap-2.5 text-(--encre)">
                          <MapPin className="w-4 h-4 text-(--gris-texte) shrink-0 mt-0.5" />
                          <span className="text-xs leading-relaxed">
                            {r.region && r.department
                              ? `${r.region} · ${r.department}${r.neighborhood ? ` (${r.neighborhood})` : ''}`
                              : <span className="text-(--gris-texte) italic">Adresse non renseignée</span>}
                          </span>
                        </div>
                      </div>

                      {/* Consultation CNI (Admin et Super admin uniquement) */}
                      {canWrite && r.has_id_document && (
                        <div className="mb-4">
                          <button
                            type="button"
                            onClick={() => handleViewCni(r.id)}
                            disabled={viewingCniId === r.id}
                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-(--vert-baol-fonce) bg-(--vert-baol)/10 hover:bg-(--vert-baol)/20 rounded-xl transition-colors disabled:opacity-50"
                          >
                            {viewingCniId === r.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <FileText className="w-3.5 h-3.5" />
                            )}
                            Voir la pièce d&apos;identité (CNI)
                          </button>
                        </div>
                      )}
                    </div>

                    {canWrite && (
                      <div className="grid grid-cols-[1fr_auto_auto] gap-2 mt-auto pt-2 border-t border-gray-100">
                        <button
                          onClick={() => toggleActive(r)}
                          className={`flex items-center justify-center gap-2 text-sm font-bold rounded-xl px-3 py-2.5 transition-colors border ${r.is_active
                              ? 'border-gray-200 text-(--gris-texte) hover:bg-gray-50 hover:text-(--encre)'
                              : 'border-(--vert-baol)/30 text-(--vert-baol) hover:bg-(--vert-baol)/10'
                            }`}
                          title={r.is_active ? 'Désactiver' : 'Activer'}
                        >
                          {r.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                          <span className="hidden sm:inline">{r.is_active ? 'Désactiver' : 'Activer'}</span>
                        </button>
                        <button
                          onClick={() => startEdit(r)}
                          className="border border-gray-200 text-(--gris-texte) hover:bg-gray-50 hover:text-(--encre) rounded-xl px-4 py-2.5 transition-colors flex items-center justify-center"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setRiderToDelete(r.id)}
                          className="text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl px-4 py-2.5 transition-colors flex items-center justify-center"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-100 rounded-2xl mt-6">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-(--gris-texte) hover:text-(--encre) disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Précédent
                  </button>
                  <span className="text-sm text-(--gris-texte) font-medium">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-(--gris-texte) hover:text-(--encre) disabled:opacity-50 transition-colors"
                  >
                    Suivant <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {riderToDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-4 text-red-600">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-(--encre)">Supprimer le livreur ?</h3>
            </div>
            <p className="text-(--gris-texte) mb-6 font-medium">
              Êtes-vous sûr de vouloir supprimer ce livreur ? Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRiderToDelete(null)}
                className="px-4 py-2.5 text-(--gris-texte) hover:bg-gray-100 rounded-xl font-bold transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteRider(riderToDelete)}
                className="px-4 py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-xl font-bold transition-colors"
              >
                Oui, supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}