'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Loader2,
  HardHat,
  Phone,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Power,
  PowerOff,
  ChevronLeft,
  ChevronRight,
  Lock,
  MapPin,
  FileText,
  ImageIcon,
  X,
  Clock,
  Car,
} from 'lucide-react'
import { Button } from '@/components/Button'
import { FormField } from '@/components/FormField'
import { DIOURBEL_DEPARTMENTS } from '@/lib/senegalDepartments'
import {
  PROFESSIONS,
  PROFESSIONS_LIST,
  type ServiceProfession,
  type ServiceProviderLike,
  isDossierComplete,
  isPubliclyVisible,
  dossierIssues,
  getExpiryStatus,
  formatYearsExperience,
} from '@/lib/services'
import { formatPhoneDisplay } from '@/lib/phoneAuth'

const ITEMS_PER_PAGE = 8

type StaffRole = 'super_admin' | 'admin' | 'moderator'

type ServiceProvider = ServiceProviderLike & {
  id: string
  first_name: string
  last_name: string
  profession: ServiceProfession
  years_experience: number
  region: string
  department: string
  neighborhood: string | null
  address_details: string | null
  phone: string
  is_active: boolean
  has_photo: boolean
  has_id_document: boolean
  has_license: boolean
  has_insurance: boolean
  license_expires_on: string | null
  insurance_expires_on: string | null
  created_at: string
  updated_at: string
}

async function authFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${session?.access_token}` },
  })
}

async function uploadPartnerFile(
  id: string,
  kind: 'photo' | 'id_document' | 'license' | 'insurance',
  file: File
) {
  const { data: { session } } = await supabase.auth.getSession()
  const formData = new FormData()
  formData.append('entity', 'service_provider')
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
    throw new Error(json.error || `Échec du téléversement du fichier (${kind})`)
  }
}

function ProviderPhoto({ id, hasPhoto, name }: { id: string; hasPhoto?: boolean; name: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!hasPhoto) return
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setLoading(true)
    })
    authFetch(`/api/admin/partner-files?entity=service_provider&id=${id}&kind=photo`)
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
      <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
        <HardHat className="w-6 h-6" />
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

function DossierStatusBadge({ provider }: { provider: ServiceProvider }) {
  const complete = isDossierComplete(provider)
  const issues = dossierIssues(provider)

  if (complete) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        Dossier complet
      </span>
    )
  }

  return (
    <div className="space-y-1">
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"
        title={issues.join(' · ')}
      >
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        Dossier incomplet ({issues.length})
      </span>
      {issues.length > 0 && (
        <p className="text-[11px] text-amber-700/90 leading-tight">
          Manque : {issues.join(', ')}
        </p>
      )}
    </div>
  )
}

function TaxiValidityBadges({ provider }: { provider: ServiceProvider }) {
  if (provider.profession !== 'taxi') return null

  const licenseStatus = getExpiryStatus(provider.license_expires_on)
  const insuranceStatus = getExpiryStatus(provider.insurance_expires_on)

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {licenseStatus === 'expired' && (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
          <XCircle className="w-3 h-3" />
          Permis expiré ({provider.license_expires_on})
        </span>
      )}
      {licenseStatus === 'expiring_soon' && (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
          <Clock className="w-3 h-3" />
          Permis expire bientôt ({provider.license_expires_on})
        </span>
      )}

      {insuranceStatus === 'expired' && (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
          <XCircle className="w-3 h-3" />
          Assurance expirée ({provider.insurance_expires_on})
        </span>
      )}
      {insuranceStatus === 'expiring_soon' && (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
          <Clock className="w-3 h-3" />
          Assurance expire bientôt ({provider.insurance_expires_on})
        </span>
      )}
    </div>
  )
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<ServiceProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<StaffRole | null>(null)
  const [selectedFilter, setSelectedFilter] = useState<'all' | ServiceProfession>('all')

  // Formulaire
  const [editingId, setEditingId] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [profession, setProfession] = useState<ServiceProfession>('mason')
  const [yearsExperience, setYearsExperience] = useState<number | string>(3)
  const [department, setDepartment] = useState('Diourbel')
  const [neighborhood, setNeighborhood] = useState('')
  const [addressDetails, setAddressDetails] = useState('')
  const [phone, setPhone] = useState('')
  const [licenseExpiresOn, setLicenseExpiresOn] = useState('')
  const [insuranceExpiresOn, setInsuranceExpiresOn] = useState('')

  // Fichiers
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null)
  const [licenseFile, setLicenseFile] = useState<File | null>(null)
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null)

  // États d'action
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [providerToDelete, setProviderToDelete] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [viewingDocKey, setViewingDocKey] = useState<string | null>(null)

  const canWrite = role === 'admin' || role === 'super_admin'

  async function loadServices() {
    setLoading(true)
    try {
      const res = await authFetch('/api/admin/services')
      if (res.ok) {
        const data = await res.json()
        setServices(data.services ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: staffRow } = await supabase
          .from('staff')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()
        if (staffRow) setRole(staffRow.role as StaffRole)
      }
      await loadServices()
    }
    init()
  }, [])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('La photo doit être au format JPEG, PNG ou WebP.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La photo ne doit pas dépasser 5 Mo.')
      return
    }
    setPhotoFile(file)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(URL.createObjectURL(file))
    setError('')
  }

  function isPdfFile(file: File) {
    const isMimePdf = file.type === 'application/pdf' || file.type === 'application/octet-stream'
    const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf')
    return isMimePdf || hasPdfExtension
  }

  function handlePdfChange(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (file: File | null) => void,
    label: string
  ) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!isPdfFile(file)) {
      setError(`${label} doit être un fichier PDF.`)
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(`${label} ne doit pas dépasser 5 Mo.`)
      return
    }
    setter(file)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const payload: Record<string, unknown> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        profession,
        years_experience: Number(yearsExperience),
        department,
        neighborhood: neighborhood.trim() || null,
        address_details: addressDetails.trim() || null,
        phone: phone.trim(),
      }

      if (profession === 'taxi') {
        payload.license_expires_on = licenseExpiresOn || null
        payload.insurance_expires_on = insuranceExpiresOn || null
      } else {
        payload.license_expires_on = null
        payload.insurance_expires_on = null
      }

      let targetId = editingId

      if (editingId) {
        const res = await authFetch(`/api/admin/services/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erreur lors de la modification')
      } else {
        const res = await authFetch('/api/admin/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erreur lors de la création')
        targetId = data.id
      }

      // Téléversement des fichiers
      if (targetId) {
        if (photoFile) {
          await uploadPartnerFile(targetId, 'photo', photoFile)
        }
        if (idDocumentFile) {
          await uploadPartnerFile(targetId, 'id_document', idDocumentFile)
        }
        if (profession === 'taxi') {
          if (licenseFile) {
            await uploadPartnerFile(targetId, 'license', licenseFile)
          }
          if (insuranceFile) {
            await uploadPartnerFile(targetId, 'insurance', insuranceFile)
          }
        }
      }

      setSaving(false)
      cancelEdit()
      loadServices()
    } catch (err: unknown) {
      setSaving(false)
      const message = err instanceof Error ? err.message : 'Une erreur est survenue'
      setError(message)
    }
  }

  function startEdit(provider: ServiceProvider) {
    setEditingId(provider.id)
    setFirstName(provider.first_name)
    setLastName(provider.last_name)
    setProfession(provider.profession)
    setYearsExperience(provider.years_experience)
    setDepartment(provider.department)
    setNeighborhood(provider.neighborhood || '')
    setAddressDetails(provider.address_details || '')
    setPhone(provider.phone)
    setLicenseExpiresOn(provider.license_expires_on || '')
    setInsuranceExpiresOn(provider.insurance_expires_on || '')

    setPhotoFile(null)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
    setIdDocumentFile(null)
    setLicenseFile(null)
    setInsuranceFile(null)
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setFirstName('')
    setLastName('')
    setProfession('mason')
    setYearsExperience(3)
    setDepartment('Diourbel')
    setNeighborhood('')
    setAddressDetails('')
    setPhone('')
    setLicenseExpiresOn('')
    setInsuranceExpiresOn('')

    setPhotoFile(null)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
    setIdDocumentFile(null)
    setLicenseFile(null)
    setInsuranceFile(null)
    setError('')
  }

  async function deleteProvider(id: string) {
    await authFetch(`/api/admin/services/${id}`, { method: 'DELETE' })
    setProviderToDelete(null)
    loadServices()
  }

  async function toggleActive(provider: ServiceProvider) {
    await authFetch(`/api/admin/services/${provider.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !provider.is_active }),
    })
    loadServices()
  }

  async function handleViewDocument(id: string, kind: 'id_document' | 'license' | 'insurance') {
    const key = `${id}-${kind}`
    setViewingDocKey(key)
    try {
      const res = await authFetch(`/api/admin/partner-files?entity=service_provider&id=${id}&kind=${kind}`)
      const data = await res.json()
      if (res.ok && data.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer')
      } else {
        alert(data.error || 'Impossible d’ouvrir le document.')
      }
    } catch {
      alert('Erreur lors de la récupération du document.')
    } finally {
      setViewingDocKey(null)
    }
  }

  const filteredServices = useMemo(() => {
    if (selectedFilter === 'all') return services
    return services.filter((s) => s.profession === selectedFilter)
  }, [services, selectedFilter])

  const totalPages = Math.ceil(filteredServices.length / ITEMS_PER_PAGE)
  const paginatedServices = filteredServices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  if (loading && services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-(--gris-texte)">
        <Loader2 className="w-8 h-8 animate-spin text-(--vert-baol) mb-4" />
        <p>Chargement des professionnels...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className={`grid gap-8 items-start ${canWrite ? 'lg:grid-cols-[400px_1fr]' : ''}`}>
        {/* Formulaire à gauche (Admin & Super admin) */}
        {canWrite ? (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:sticky lg:top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
            <h2 className="text-xl font-bold text-(--encre) mb-6">
              {editingId ? 'Modifier le professionnel' : 'Ajouter un professionnel'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Prénom"
                  type="text"
                  placeholder="Ex: Moussa"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
                <FormField
                  label="Nom"
                  type="text"
                  placeholder="Ex: Diop"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-(--encre) block">Métier</label>
                <select
                  value={profession}
                  onChange={(e) => setProfession(e.target.value as ServiceProfession)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-(--encre) focus:ring-2 focus:ring-(--vert-baol) outline-none transition-all"
                >
                  {PROFESSIONS_LIST.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Années d'expérience"
                  type="number"
                  min="0"
                  max="60"
                  value={String(yearsExperience)}
                  onChange={(e) => setYearsExperience(e.target.value)}
                  required
                />
                <div className="space-y-1">
                  <label className="text-sm font-medium text-(--encre) block">Département</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-(--encre) focus:ring-2 focus:ring-(--vert-baol) outline-none transition-all"
                  >
                    {DIOURBEL_DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <FormField
                label="Quartier (optionnel)"
                type="text"
                placeholder="Ex: Médina Gounass, Touba..."
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                maxLength={100}
                helperText="Max 100 caractères"
              />

              <FormField
                label="Précisions d'adresse (optionnel)"
                type="text"
                placeholder="Ex: Près de la grande mosquée"
                value={addressDetails}
                onChange={(e) => setAddressDetails(e.target.value)}
                maxLength={200}
                helperText="Max 200 caractères"
              />

              <FormField
                label="Téléphone (interne, invisible aux clients)"
                type="tel"
                placeholder="Ex: 77 123 45 67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />

              {/* Photo */}
              <div className="space-y-1.5 pt-2 border-t border-gray-100">
                <label className="text-sm font-medium text-(--encre) block">Photo de profil</label>
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
                          setPhotoFile(null)
                          if (photoPreview) URL.revokeObjectURL(photoPreview)
                          setPhotoPreview(null)
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <ImageIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                      <span className="text-xs text-(--vert-baol) font-bold hover:underline">
                        Téléverser une photo
                      </span>
                      <span className="block text-[11px] text-(--gris-texte) mt-0.5">JPEG, PNG ou WebP · Max 5 Mo</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Pièce d'identité (CNI) */}
              <div className="space-y-1.5 pt-2 border-t border-gray-100">
                <label className="text-sm font-medium text-(--encre) block">Pièce d&apos;identité (CNI - PDF)</label>
                <div className="border border-dashed border-gray-300 rounded-xl p-3 text-center bg-gray-50/50 hover:bg-gray-50 transition-colors">
                  {idDocumentFile ? (
                    <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-lg border border-gray-200">
                      <FileText className="w-6 h-6 text-(--vert-baol) shrink-0" />
                      <span className="text-xs text-(--encre) truncate flex-1 text-left font-medium">
                        {idDocumentFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIdDocumentFile(null)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <FileText className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                      <span className="text-xs text-(--vert-baol) font-bold hover:underline">
                        Téléverser la CNI (PDF)
                      </span>
                      <span className="block text-[11px] text-(--gris-texte) mt-0.5">Fichier PDF uniquement · Max 5 Mo</span>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => handlePdfChange(e, setIdDocumentFile, 'La CNI')}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Spécifique TAXI : Permis + Assurance */}
              {profession === 'taxi' && (
                <div className="space-y-3 pt-3 border-t-2 border-amber-200 bg-amber-50/50 p-3 rounded-xl">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                    <Car className="w-4 h-4" />
                    Documents obligatoires Taximan
                  </div>

                  {/* Permis */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-(--encre) block">Permis de conduire (PDF)</label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => handlePdfChange(e, setLicenseFile, 'Le permis')}
                      className="text-xs text-(--encre) file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-900 hover:file:bg-amber-200"
                    />
                    {licenseFile && <p className="text-[11px] text-green-700 font-medium">Fichier : {licenseFile.name}</p>}
                  </div>

                  <FormField
                    label="Date de fin de validité du permis"
                    type="date"
                    value={licenseExpiresOn}
                    onChange={(e) => setLicenseExpiresOn(e.target.value)}
                    required={profession === 'taxi'}
                  />

                  {/* Assurance */}
                  <div className="space-y-1 pt-2 border-t border-amber-200">
                    <label className="text-xs font-semibold text-(--encre) block">Attestation d&apos;assurance (PDF)</label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => handlePdfChange(e, setInsuranceFile, "L'assurance")}
                      className="text-xs text-(--encre) file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-900 hover:file:bg-amber-200"
                    />
                    {insuranceFile && <p className="text-[11px] text-green-700 font-medium">Fichier : {insuranceFile.name}</p>}
                  </div>

                  <FormField
                    label="Date de fin de validité de l'assurance"
                    type="date"
                    value={insuranceExpiresOn}
                    onChange={(e) => setInsuranceExpiresOn(e.target.value)}
                    required={profession === 'taxi'}
                  />
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-200">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : editingId ? (
                    'Enregistrer'
                  ) : (
                    'Ajouter'
                  )}
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
            <p className="font-medium">
              Accès en lecture seule.
              <br />
              Contactez un admin pour modifier cette liste.
            </p>
          </div>
        )}

        {/* Liste à droite */}
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold text-(--encre) flex items-center gap-3">
              Services Diourbel{' '}
              <span className="text-(--gris-texte) text-lg font-normal">({filteredServices.length})</span>
            </h2>

            {/* Filtre par métier */}
            <div className="flex flex-wrap gap-1.5 bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setSelectedFilter('all')
                  setCurrentPage(1)
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedFilter === 'all'
                    ? 'bg-white text-(--encre) shadow-sm'
                    : 'text-(--gris-texte) hover:text-(--encre)'
                }`}
              >
                Tous
              </button>
              {PROFESSIONS_LIST.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    setSelectedFilter(p.key)
                    setCurrentPage(1)
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    selectedFilter === p.key
                      ? 'bg-white text-(--encre) shadow-sm'
                      : 'text-(--gris-texte) hover:text-(--encre)'
                  }`}
                >
                  {p.labelPlural}
                </button>
              ))}
            </div>
          </div>

          {filteredServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 text-(--gris-texte)">
              <HardHat className="w-12 h-12 mb-4 text-gray-300" />
              <p className="text-lg">Aucun professionnel pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {paginatedServices.map((p) => {
                  const visible = isPubliclyVisible(p)
                  const professionMeta = PROFESSIONS[p.profession]

                  return (
                    <div
                      key={p.id}
                      className="bg-white p-5 rounded-2xl border border-gray-100 hover:shadow-sm transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        {/* En-tête carte */}
                        <div className="flex justify-between items-start gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <ProviderPhoto id={p.id} hasPhoto={p.has_photo} name={`${p.first_name} ${p.last_name}`} />
                            <div className="min-w-0">
                              <h3 className="font-bold text-(--encre) text-lg truncate">
                                {p.first_name} {p.last_name}
                              </h3>
                              <p className="text-xs font-semibold text-(--vert-baol-fonce)">
                                {professionMeta?.label ?? p.profession} · {formatYearsExperience(p.years_experience)}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <div
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                p.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {p.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                              {p.is_active ? 'Actif' : 'Inactif'}
                            </div>

                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                visible
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                              {visible ? 'Visible sur le site' : 'Masqué'}
                            </span>
                          </div>
                        </div>

                        {/* Dossier status */}
                        <div className="mb-3">
                          <DossierStatusBadge provider={p} />
                          <TaxiValidityBadges provider={p} />
                        </div>

                        {/* Infos contact & adresse */}
                        <div className="space-y-1.5 text-sm bg-gray-50 p-3.5 rounded-xl border border-gray-100 mb-4">
                          <div className="flex items-center gap-2 text-(--encre)">
                            <Phone className="w-4 h-4 text-(--gris-texte) shrink-0" />
                            <span className="font-bold text-xs">{formatPhoneDisplay(p.phone)}</span>
                            <span className="text-[10px] text-(--gris-texte) italic">(interne)</span>
                          </div>
                          <div className="flex items-start gap-2 text-(--encre)">
                            <MapPin className="w-4 h-4 text-(--gris-texte) shrink-0 mt-0.5" />
                            <span className="text-xs leading-relaxed">
                              {p.department}
                              {p.neighborhood ? ` · ${p.neighborhood}` : ''}
                              {p.address_details ? ` (${p.address_details})` : ''}
                            </span>
                          </div>
                        </div>

                        {/* Documents (Admin et Super admin uniquement) */}
                        {canWrite && (
                          <div className="space-y-1.5 mb-4">
                            {p.has_id_document && (
                              <button
                                type="button"
                                onClick={() => handleViewDocument(p.id, 'id_document')}
                                disabled={viewingDocKey === `${p.id}-id_document`}
                                className="w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-bold text-(--vert-baol-fonce) bg-(--vert-baol)/10 hover:bg-(--vert-baol)/20 rounded-xl transition-colors disabled:opacity-50"
                              >
                                {viewingDocKey === `${p.id}-id_document` ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <FileText className="w-3.5 h-3.5" />
                                )}
                                Voir la pièce d&apos;identité (CNI)
                              </button>
                            )}

                            {p.profession === 'taxi' && p.has_license && (
                              <button
                                type="button"
                                onClick={() => handleViewDocument(p.id, 'license')}
                                disabled={viewingDocKey === `${p.id}-license`}
                                className="w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors disabled:opacity-50"
                              >
                                {viewingDocKey === `${p.id}-license` ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Car className="w-3.5 h-3.5" />
                                )}
                                Voir le permis de conduire
                              </button>
                            )}

                            {p.profession === 'taxi' && p.has_insurance && (
                              <button
                                type="button"
                                onClick={() => handleViewDocument(p.id, 'insurance')}
                                disabled={viewingDocKey === `${p.id}-insurance`}
                                className="w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors disabled:opacity-50"
                              >
                                {viewingDocKey === `${p.id}-insurance` ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <FileText className="w-3.5 h-3.5" />
                                )}
                                Voir l&apos;attestation d&apos;assurance
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Boutons d'action */}
                      {canWrite && (
                        <div className="grid grid-cols-[1fr_auto_auto] gap-2 mt-auto pt-2 border-t border-gray-100">
                          <button
                            onClick={() => toggleActive(p)}
                            className={`flex items-center justify-center gap-2 text-sm font-bold rounded-xl px-3 py-2.5 transition-colors border ${
                              p.is_active
                                ? 'border-gray-200 text-(--gris-texte) hover:bg-gray-50 hover:text-(--encre)'
                                : 'border-(--vert-baol)/30 text-(--vert-baol) hover:bg-(--vert-baol)/10'
                            }`}
                            title={p.is_active ? 'Désactiver' : 'Activer'}
                          >
                            {p.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                            <span className="hidden sm:inline">{p.is_active ? 'Désactiver' : 'Activer'}</span>
                          </button>
                          <button
                            onClick={() => startEdit(p)}
                            className="border border-gray-200 text-(--gris-texte) hover:bg-gray-50 hover:text-(--encre) rounded-xl px-4 py-2.5 transition-colors flex items-center justify-center"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setProviderToDelete(p.id)}
                            className="text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-xl px-4 py-2.5 transition-colors flex items-center justify-center"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-100 rounded-2xl mt-6">
                  <button
                    onClick={() => setCurrentPage((cp) => Math.max(1, cp - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-(--gris-texte) hover:text-(--encre) disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Précédent
                  </button>
                  <span className="text-sm text-(--gris-texte) font-medium">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((cp) => Math.min(totalPages, cp + 1))}
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

      {/* Modal confirmation suppression */}
      {providerToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-(--encre)">Supprimer ce professionnel ?</h3>
            </div>
            <p className="text-sm text-(--gris-texte) mb-6">
              Cette action est irréversible. Le profil ainsi que tous les documents associés (photo, pièce
              d&apos;identité, permis, assurance) seront définitivement supprimés.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setProviderToDelete(null)}>
                Annuler
              </Button>
              <Button
                variant="danger"
                onClick={() => providerToDelete && deleteProvider(providerToDelete)}
              >
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
