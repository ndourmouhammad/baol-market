'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Loader2,
  Store,
  MapPin,
  Phone,
  Edit,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Lock,
  Tag,
  CheckCircle2,
  FileText,
  ImageIcon,
  X,
} from 'lucide-react'
import { ALL_REGIONS_WITH_DEPARTMENTS } from '@/lib/senegalDepartments'

const ITEMS_PER_PAGE = 8
const REGION_OPTIONS = Object.keys(ALL_REGIONS_WITH_DEPARTMENTS)

type StaffRole = 'super_admin' | 'admin' | 'moderator'
type Category = { id: string; name: string }
type Merchant = {
  id: string
  name: string
  phone: string
  address: string
  notes: string | null
  category_id: string | null
  categories: { name: string } | null
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

async function uploadPartnerFile(entity: 'rider' | 'merchant', id: string, kind: 'photo' | 'id_document', file: File) {
  const { data: { session } } = await supabase.auth.getSession()
  const formData = new FormData()
  formData.append('entity', entity)
  formData.append('id', id)
  formData.append('kind', kind)
  formData.append('file', file)

  const res = await fetch('/api/admin/partner-files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session?.access_token}` },
    body: formData,
  })

  if (!res.ok) {
    const json = await res.json()
    throw new Error(json.error || `Échec du téléversement (${kind})`)
  }
}

function PartnerPhoto({ id, hasPhoto, name }: { id: string; hasPhoto?: boolean; name: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!hasPhoto) return
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setLoading(true)
    })
    authFetch(`/api/admin/partner-files?entity=merchant&id=${id}&kind=photo`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.url) setUrl(data.url)
      })
      .catch(() => { })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, hasPhoto])

  if (!hasPhoto) {
    return (
      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
        <Store className="w-6 h-6" />
      </div>
    )
  }

  if (loading || !url) {
    return (
      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 shrink-0 animate-pulse">
        <Loader2 className="w-4 h-4 animate-spin text-(--vert-baol)" />
      </div>
    )
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={url}
      alt={name}
      className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0"
    />
  )
}

function DossierBadge({
  region,
  department,
  hasPhoto,
  hasIdDocument,
}: {
  region: string | null
  department: string | null
  hasPhoto: boolean
  hasIdDocument: boolean
}) {
  const missing: string[] = []
  if (!region || !department) missing.push('adresse')
  if (!hasPhoto) missing.push('photo')
  if (!hasIdDocument) missing.push('CNI')

  if (missing.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex-wrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span className="break-words">Dossier complet · Éligible aux produits</span>
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex-wrap"
      title={`Éléments requis : ${missing.join(', ')}`}
    >
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      <span className="break-words">Dossier incomplet ({missing.join(', ')})</span>
    </span>
  )
}

export default function AdminMerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [role, setRole] = useState<StaffRole | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [categoryId, setCategoryId] = useState('')

  const [region, setRegion] = useState('')
  const [department, setDepartment] = useState('')
  const [neighborhood, setNeighborhood] = useState('')

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null)

  const [viewingCniId, setViewingCniId] = useState<string | null>(null)
  const [filterCategoryId, setFilterCategoryId] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [merchantToDelete, setMerchantToDelete] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  async function loadMerchants() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: staffRow } = await supabase.from('staff').select('role').eq('id', user.id).maybeSingle()
      setRole((staffRow?.role as StaffRole) ?? null)
    }

    const { data: cats } = await supabase.from('categories').select('id, name').order('name')
    setCategories(cats || [])

    const res = await authFetch('/api/admin/merchants')
    const json = await res.json()
    if (res.ok) setMerchants(json.merchants)
    setLoading(false)
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadMerchants()
    })
  }, [])

  const canWrite = role === 'admin' || role === 'super_admin'

  async function handleViewCni(merchantId: string) {
    setViewingCniId(merchantId)
    try {
      const res = await authFetch(`/api/admin/partner-files?entity=merchant&id=${merchantId}&kind=id_document`)
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

    const url = editingId ? `/api/admin/merchants/${editingId}` : '/api/admin/merchants'
    const method = editingId ? 'PATCH' : 'POST'

    try {
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          address,
          notes,
          category_id: categoryId || null,
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

      if (photoFile && targetId) {
        await uploadPartnerFile('merchant', targetId, 'photo', photoFile)
      }
      if (idDocumentFile && targetId) {
        await uploadPartnerFile('merchant', targetId, 'id_document', idDocumentFile)
      }

      setSaving(false)
      cancelEdit()
      loadMerchants()
    } catch (err: unknown) {
      setSaving(false)
      const message = err instanceof Error ? err.message : 'Une erreur est survenue'
      setError(message)
    }
  }

  function startEdit(merchant: Merchant) {
    setEditingId(merchant.id)
    setName(merchant.name)
    setPhone(merchant.phone)
    setAddress(merchant.address)
    setNotes(merchant.notes || '')
    setCategoryId(merchant.category_id || '')
    setRegion(merchant.region || '')
    setDepartment(merchant.department || '')
    setNeighborhood(merchant.neighborhood || '')
    setPhotoFile(null)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
    setIdDocumentFile(null)
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setName('')
    setPhone('')
    setAddress('')
    setNotes('')
    setCategoryId('')
    setRegion('')
    setDepartment('')
    setNeighborhood('')
    setPhotoFile(null)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
    setIdDocumentFile(null)
    setError('')
  }

  async function deleteMerchant(id: string) {
    await authFetch(`/api/admin/merchants/${id}`, { method: 'DELETE' })
    setMerchantToDelete(null)
    loadMerchants()
  }

  if (loading && merchants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-(--gris-texte)">
        <Loader2 className="w-8 h-8 animate-spin text-(--vert-baol) mb-4" />
        <p>Chargement des commerçants...</p>
      </div>
    )
  }

  const filteredMerchants = filterCategoryId
    ? merchants.filter((m) => m.category_id === filterCategoryId)
    : merchants

  const totalPages = Math.ceil(filteredMerchants.length / ITEMS_PER_PAGE)
  const paginatedMerchants = filteredMerchants.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
  const availableDepartments = region ? ALL_REGIONS_WITH_DEPARTMENTS[region] ?? [] : []

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className={`grid gap-6 lg:gap-8 items-start ${canWrite ? 'lg:grid-cols-[minmax(280px,380px)_1fr]' : ''}`}>
        {canWrite ? (
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-mil/30 shadow-sm lg:sticky lg:top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
            <h2 className="text-lg font-bold text-(--encre) mb-4">
              {editingId ? 'Modifier le commerçant' : 'Ajouter un commerçant'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
              <div className="space-y-1">
                <label className="font-bold text-(--encre) block">Nom de la boutique</label>
                <input
                  type="text"
                  placeholder="Ex: Boutique Diallo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-(--encre) focus:ring-2 focus:ring-(--vert-baol) outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-(--encre) block">Téléphone</label>
                <input
                  type="tel"
                  placeholder="Ex: 77 123 45 67"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-(--encre) focus:ring-2 focus:ring-(--vert-baol) outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-(--encre) block">Région</label>
                <select
                  value={region}
                  onChange={(e) => {
                    setRegion(e.target.value)
                    setDepartment('')
                  }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-(--encre) focus:ring-2 focus:ring-(--vert-baol) outline-none transition-all bg-white"
                >
                  <option value="">Sélectionner une région</option>
                  {REGION_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-(--encre) block">Département</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  disabled={!region}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-(--encre) focus:ring-2 focus:ring-(--vert-baol) outline-none transition-all bg-white disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">
                    {region ? 'Sélectionner un département' : 'Choisissez d’abord une région'}
                  </option>
                  {availableDepartments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-(--encre) block">
                  Quartier <span className="text-(--gris-texte) font-medium text-xs">(Optionnel, max 100 car.)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Médina, Marché Ocass..."
                  value={neighborhood}
                  maxLength={100}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-(--encre) focus:ring-2 focus:ring-(--vert-baol) outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-(--encre) block">
                  Précisions (rue, repère) <span className="text-(--gris-texte) font-medium text-xs">(Optionnel)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Face grande mosquée, rue 12..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-(--encre) focus:ring-2 focus:ring-(--vert-baol) outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-(--encre) block">Catégorie</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-(--encre) focus:ring-2 focus:ring-(--vert-baol) outline-none transition-all bg-white"
                >
                  <option value="">Aucune catégorie</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-(--encre) block">
                  Notes internes <span className="text-(--gris-texte) font-medium">(Optionnel)</span>
                </label>
                <textarea
                  placeholder="Informations utiles sur ce commerçant..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-(--encre) focus:ring-2 focus:ring-(--vert-baol) outline-none transition-all resize-none"
                />
              </div>

              {/* Photo du commerce / commerçant */}
              <div className="space-y-1 pt-2 border-t border-gray-100">
                <label className="font-bold text-(--encre) block">Photo du commerçant</label>
                <div className="border border-dashed border-gray-300 rounded-xl p-3 text-center bg-gray-50/50 hover:bg-gray-50 transition-colors">
                  {photoPreview ? (
                    <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-lg border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoPreview} alt="Aperçu" className="w-10 h-10 rounded-lg object-cover" />
                      <span className="text-xs text-(--encre) truncate flex-1 text-left font-medium">
                        {photoFile?.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (photoPreview) URL.revokeObjectURL(photoPreview)
                          setPhotoFile(null)
                          setPhotoPreview(null)
                        }}
                        className="text-gray-400 hover:text-red-600 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          if (file.size > 5 * 1024 * 1024) {
                            setError('La photo ne doit pas dépasser 5 Mo.')
                            return
                          }
                          setPhotoFile(file)
                          setPhotoPreview(URL.createObjectURL(file))
                        }}
                      />
                      <div className="flex flex-col items-center gap-1 py-1 text-xs text-(--gris-texte)">
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                        <span className="font-semibold text-(--vert-baol)">
                          {editingId ? 'Remplacer la photo' : 'Choisir une photo'}
                        </span>
                        <span className="text-[11px] text-gray-400">JPEG, PNG ou WebP (max 5 Mo)</span>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Pièce d'identité (CNI) */}
              <div className="space-y-1">
                <label className="font-bold text-(--encre) block">
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
                            (file.type === 'application/pdf' || file.type === 'application/octet-stream') &&
                            file.name.toLowerCase().endsWith('.pdf')
                          if (!isPdfFile && !file.name.toLowerCase().endsWith('.pdf')) {
                            setError('La CNI doit être un fichier PDF.')
                            return
                          }
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
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-(--vert-baol) text-white rounded-xl px-4 py-2.5 font-bold hover:bg-(--vert-baol-fonce) transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {saving ? 'En cours...' : editingId ? 'Enregistrer' : 'Ajouter'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 bg-white text-(--gris-texte) border border-gray-200 rounded-xl px-4 py-2.5 font-bold hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : (
          <div className="hidden lg:flex flex-col items-center justify-center bg-white p-6 rounded-2xl border border-gray-100 text-(--gris-texte) text-center">
            <Lock className="w-8 h-8 mb-3 text-gray-300" />
            <p className="text-sm font-medium">Accès en lecture seule.<br />Contacte un admin pour modifier cette liste.</p>
          </div>
        )}

        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <h2 className="text-2xl font-bold text-(--encre) flex items-center gap-3">
              Commerçants <span className="text-(--gris-texte) text-lg font-normal">({filteredMerchants.length})</span>
            </h2>
            <div className="relative">
              <select
                value={filterCategoryId}
                onChange={(e) => { setFilterCategoryId(e.target.value); setCurrentPage(1) }}
                className="appearance-none text-sm font-bold pl-8 pr-8 py-2 rounded-xl border border-gray-200 bg-gray-50 text-(--encre) outline-none cursor-pointer focus:ring-2 focus:ring-(--vert-baol) transition-colors"
              >
                <option value="">Toutes les catégories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <Tag className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-(--gris-texte) pointer-events-none" />
            </div>
          </div>

          {filteredMerchants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 text-(--gris-texte)">
              <Store className="w-12 h-12 mb-4 text-gray-300" />
              <p className="text-lg">
                {filterCategoryId ? 'Aucun commerçant dans cette catégorie.' : 'Aucun commerçant pour le moment.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {paginatedMerchants.map((m) => (
                  <div key={m.id} className="bg-white p-5 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <PartnerPhoto id={m.id} hasPhoto={m.has_photo} name={m.name} />
                          <div className="min-w-0">
                            <h3 className="font-bold text-(--encre) text-lg truncate">{m.name}</h3>
                          </div>
                        </div>

                        {m.categories?.name && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-(--vert-baol)/10 text-(--vert-baol-fonce) shrink-0">
                            {m.categories.name}
                          </span>
                        )}
                      </div>

                      <div className="mb-4">
                        <DossierBadge
                          region={m.region}
                          department={m.department}
                          hasPhoto={m.has_photo}
                          hasIdDocument={m.has_id_document}
                        />
                      </div>

                      <div className="space-y-2 text-sm text-(--encre) mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <p className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-(--gris-texte) shrink-0" />
                          <span className="font-medium">{m.phone}</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-(--gris-texte) shrink-0 mt-0.5" />
                          <span className="text-xs leading-relaxed">
                            {m.region && m.department ? (
                              <>
                                <span>{`${m.region} · ${m.department}${m.neighborhood ? ` (${m.neighborhood})` : ''}`}</span>
                                {m.address && (
                                  <span className="block text-(--gris-texte) mt-0.5">
                                    Repère : {m.address}
                                  </span>
                                )}
                              </>
                            ) : m.address ? (
                              <span>{m.address}</span>
                            ) : (
                              <span className="text-(--gris-texte) italic">Adresse non renseignée</span>
                            )}
                          </span>
                        </p>
                      </div>

                      {m.notes && (
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-4">
                          <p className="text-xs font-bold text-(--gris-texte) mb-1 uppercase tracking-wider">Notes</p>
                          <p className="text-sm text-(--encre) italic">{m.notes}</p>
                        </div>
                      )}

                      {/* Consultation CNI (Admin et Super admin uniquement) */}
                      {canWrite && m.has_id_document && (
                        <div className="mb-4">
                          <button
                            type="button"
                            onClick={() => handleViewCni(m.id)}
                            disabled={viewingCniId === m.id}
                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-(--vert-baol-fonce) bg-(--vert-baol)/10 hover:bg-(--vert-baol)/20 rounded-xl transition-colors disabled:opacity-50"
                          >
                            {viewingCniId === m.id ? (
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
                      <div className="grid grid-cols-2 gap-2 mt-auto pt-2 border-t border-gray-100">
                        <button
                          onClick={() => startEdit(m)}
                          className="border border-gray-200 text-(--gris-texte) hover:bg-gray-50 hover:text-(--encre) rounded-xl px-3 py-2.5 transition-colors flex items-center justify-center gap-2 text-sm font-bold"
                        >
                          <Edit className="w-4 h-4" /> Modifier
                        </button>
                        <button
                          onClick={() => setMerchantToDelete(m.id)}
                          className="text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl px-3 py-2.5 transition-colors flex items-center justify-center gap-2 text-sm font-bold"
                        >
                          <Trash2 className="w-4 h-4" /> Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-3 sm:px-4 py-3 border border-gray-100 rounded-2xl mt-6">
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

      {merchantToDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-4 text-red-600">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-(--encre)">Supprimer le commerçant ?</h3>
            </div>
            <p className="text-(--gris-texte) mb-6 font-medium">
              Êtes-vous sûr de vouloir supprimer ce commerçant ? Cette action est irréversible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setMerchantToDelete(null)}
                className="px-4 py-2.5 text-(--gris-texte) hover:bg-gray-100 rounded-xl font-bold transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteMerchant(merchantToDelete)}
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