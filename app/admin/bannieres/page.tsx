'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Loader2, Images, Trash2, Edit, AlertTriangle, ImagePlus, X, ArrowUp, ArrowDown, Power, PowerOff,
} from 'lucide-react'
import { Button } from '@/components/Button'
import { FormField } from '@/components/FormField'
import { PromoBanner } from '@/components/PromoBanner'

type StaffRole = 'super_admin' | 'admin' | 'moderator'
type Placement = 'carousel' | 'promo'
type LinkType = 'none' | 'category' | 'product'

type Banner = {
  id: string
  placement: Placement
  image_url: string
  title: string | null
  description: string | null
  badge: string | null
  link_type: LinkType
  link_id: string | null
  sort_order: number
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
}

type Option = { id: string; name: string }

const TABS: { key: Placement; label: string; format: string; ratio: number }[] = [
  { key: 'carousel', label: 'Carrousel', format: '1200 × 400 px (format large 3:1)', ratio: 3 },
  { key: 'promo', label: 'Cartes promo', format: '600 × 600 px (carré)', ratio: 1 },
]

async function authFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${session?.access_token}` },
  })
}

// Valeur d'un champ <input type="datetime-local"> à partir d'une date enregistrée
function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function bannerStatus(banner: Banner): { label: string; className: string } {
  if (!banner.is_active) return { label: 'Désactivée', className: 'bg-gray-100 text-(--gris-texte)' }
  const now = new Date()
  if (banner.starts_at && new Date(banner.starts_at) > now) {
    return { label: 'Programmée', className: 'bg-blue-100 text-blue-800' }
  }
  if (banner.ends_at && new Date(banner.ends_at) <= now) {
    return { label: 'Expirée', className: 'bg-orange-100 text-orange-800' }
  }
  return { label: 'Visible', className: 'bg-green-100 text-green-800' }
}

export default function AdminBannersPage() {
  const [tab, setTab] = useState<Placement>('carousel')
  const [banners, setBanners] = useState<Banner[]>([])
  const [categories, setCategories] = useState<Option[]>([])
  const [products, setProducts] = useState<Option[]>([])
  const [role, setRole] = useState<StaffRole | null>(null)
  const [loading, setLoading] = useState(true)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [badge, setBadge] = useState('')
  const [linkType, setLinkType] = useState<LinkType>('none')
  const [linkId, setLinkId] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const [imageWarning, setImageWarning] = useState('')

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [bannerToDelete, setBannerToDelete] = useState<string | null>(null)

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: staffRow } = await supabase.from('staff').select('role').eq('id', user.id).maybeSingle()
      setRole((staffRow?.role as StaffRole) ?? null)
    }

    const [bannersRes, categoriesRes, productsRes] = await Promise.all([
      authFetch('/api/admin/banners'),
      authFetch('/api/admin/categories'),
      authFetch('/api/admin/products'),
    ])

    const bannersJson = await bannersRes.json().catch(() => ({}))
    if (bannersRes.ok) setBanners(bannersJson.banners)

    const categoriesJson = await categoriesRes.json().catch(() => ({}))
    if (categoriesRes.ok) setCategories(categoriesJson.categories)

    const productsJson = await productsRes.json().catch(() => ({}))
    if (productsRes.ok) setProducts(productsJson.products)

    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData() }, [])

  const activeTab = TABS.find((t) => t.key === tab)!
  const tabBanners = banners.filter((b) => b.placement === tab).sort((a, b) => a.sort_order - b.sort_order)
  const canDelete = role === 'admin' || role === 'super_admin'

  function resetForm() {
    setEditingId(null)
    setTitle('')
    setDescription('')
    setBadge('')
    setLinkType('none')
    setLinkId('')
    setStartsAt('')
    setEndsAt('')
    setImageFile(null)
    setImagePreview(null)
    setExistingImageUrl(null)
    setImageWarning('')
    setError('')
  }

  function changeTab(next: Placement) {
    setTab(next)
    resetForm()
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    setImageFile(file)
    setImagePreview(previewUrl)
    setError('')

    // Avertissement doux si les proportions sont très éloignées du format conseillé
    const probe = new window.Image()
    probe.onload = () => {
      const ratio = probe.naturalWidth / probe.naturalHeight
      const deviation = Math.abs(ratio - activeTab.ratio) / activeTab.ratio
      setImageWarning(
        deviation > 0.25
          ? `Cette image fait ${probe.naturalWidth} × ${probe.naturalHeight} px : ses proportions s'éloignent du format conseillé, elle sera recadrée sur l'accueil.`
          : ''
      )
    }
    probe.src = previewUrl
  }

  function removeImage() {
    setImageFile(null)
    setImagePreview(null)
    setExistingImageUrl(null)
    setImageWarning('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!imageFile && !existingImageUrl) {
      setError('Ajoutez une image.')
      return
    }
    if (linkType !== 'none' && !linkId) {
      setError('Choisissez la catégorie ou le produit du lien.')
      return
    }

    setSaving(true)
    let imageUrl = existingImageUrl

    if (imageFile) {
      setUploading(true)
      const { data: { session } } = await supabase.auth.getSession()
      const formData = new FormData()
      formData.append('file', imageFile)
      formData.append('bucket', 'banners')

      const uploadRes = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      })
      const uploadJson = await uploadRes.json()
      setUploading(false)

      if (!uploadRes.ok) {
        setError(uploadJson.error)
        setSaving(false)
        return
      }
      imageUrl = uploadJson.url
    }

    const payload: Record<string, unknown> = {
      image_url: imageUrl,
      title,
      description,
      badge,
      link_type: linkType,
      link_id: linkType === 'none' ? null : linkId,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    }
    if (!editingId) payload.placement = tab

    const res = await authFetch(editingId ? `/api/admin/banners/${editingId}` : '/api/admin/banners', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(json.error)
    } else {
      resetForm()
      loadData()
    }
  }

  function startEdit(banner: Banner) {
    setEditingId(banner.id)
    setTitle(banner.title ?? '')
    setDescription(banner.description ?? '')
    setBadge(banner.badge ?? '')
    setLinkType(banner.link_type)
    setLinkId(banner.link_id ?? '')
    setStartsAt(toLocalInput(banner.starts_at))
    setEndsAt(toLocalInput(banner.ends_at))
    setExistingImageUrl(banner.image_url)
    setImagePreview(banner.image_url)
    setImageFile(null)
    setImageWarning('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function patchBanner(id: string, body: Record<string, unknown>) {
    return authFetch(`/api/admin/banners/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  async function toggleActive(banner: Banner) {
    const res = await patchBanner(banner.id, { is_active: !banner.is_active })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      alert(json.error || 'Impossible de modifier la bannière.')
    }
    loadData()
  }

  // Monter / descendre : on échange l'ordre d'affichage avec la voisine
  async function moveBanner(index: number, direction: -1 | 1) {
    const current = tabBanners[index]
    const other = tabBanners[index + direction]
    if (!current || !other) return
    await Promise.all([
      patchBanner(current.id, { sort_order: other.sort_order }),
      patchBanner(other.id, { sort_order: current.sort_order }),
    ])
    loadData()
  }

  async function deleteBanner(id: string) {
    const res = await authFetch(`/api/admin/banners/${id}`, { method: 'DELETE' })
    setBannerToDelete(null)
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      alert(json.error || 'Impossible de supprimer cette bannière.')
    }
    loadData()
  }

  function linkText(banner: Banner) {
    if (banner.link_type === 'category') {
      return `Catégorie : ${categories.find((c) => c.id === banner.link_id)?.name ?? 'introuvable'}`
    }
    if (banner.link_type === 'product') {
      return `Produit : ${products.find((p) => p.id === banner.link_id)?.name ?? 'introuvable'}`
    }
    return 'Aucun lien'
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-(--gris-texte)">
        <Loader2 className="w-8 h-8 animate-spin text-(--vert-baol) mb-4" />
        <p>Chargement des bannières...</p>
      </div>
    )
  }

  const selectClass =
    'w-full border border-gray-200 bg-white rounded-xl px-4 py-3 text-(--encre) focus:ring-2 focus:ring-(--vert-baol) focus:border-(--vert-baol) outline-none transition-all'
  const inputClass = selectClass

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-(--encre) mb-2">Bannières</h2>
      <p className="text-(--gris-texte) text-sm mb-6">
        Les images affichées en haut de la page d&apos;accueil. Une bannière n&apos;apparaît que si elle est activée et
        dans ses dates.
      </p>

      <div className="flex flex-wrap gap-2 mb-8">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => changeTab(t.key)}
            className={`px-5 py-2.5 text-sm font-bold rounded-full transition-colors ${
              tab === t.key
                ? 'bg-(--vert-baol) text-white shadow-sm'
                : 'bg-white text-(--gris-texte) border border-gray-200 hover:border-gray-300'
            }`}
          >
            {t.label} ({banners.filter((b) => b.placement === t.key).length})
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[380px_1fr] items-start">
        {/* Formulaire */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:sticky lg:top-24">
          <h3 className="text-xl font-bold text-(--encre) mb-6">
            {editingId ? 'Modifier la bannière' : 'Ajouter une bannière'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <div className="space-y-1.5">
              <label className="font-bold text-(--encre) block">Image</label>
              {imagePreview ? (
                <div className="relative">
                  <PromoBanner
                    variant={tab}
                    imageUrl={imagePreview}
                    title={title}
                    description={description}
                    badge={badge}
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 hover:bg-white shadow-sm"
                    title="Retirer l'image"
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-200 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <ImagePlus className="w-7 h-7 text-gray-400 mb-1" />
                  <span className="text-(--gris-texte) text-sm font-medium">Choisir une image</span>
                  <span className="text-gray-400 text-xs mt-1 px-2 text-center">
                    Format conseillé : {activeTab.format}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
              {imagePreview && (
                <p className="text-xs text-(--gris-texte)">
                  Aperçu tel qu&apos;il apparaîtra sur l&apos;accueil. Format conseillé : {activeTab.format}.
                </p>
              )}
              {imageWarning && (
                <p className="text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                  {imageWarning}
                </p>
              )}
            </div>

            <FormField
              label="Titre (facultatif)"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
              placeholder="Ex : Black Friday"
            />

            <div className="space-y-1.5">
              <label className="font-bold text-(--encre) block">Description (facultative)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={140}
                rows={2}
                placeholder="Ex : Jusqu'à -50 % sur une sélection de produits"
                className={`${inputClass} resize-none`}
              />
            </div>

            <FormField
              label="Étiquette de promo (facultative)"
              type="text"
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              maxLength={24}
              placeholder="Ex : -30 %"
            />

            <div className="space-y-1.5">
              <label className="font-bold text-(--encre) block">Lien au clic</label>
              <select
                value={linkType}
                onChange={(e) => {
                  setLinkType(e.target.value as LinkType)
                  setLinkId('')
                }}
                className={selectClass}
              >
                <option value="none">Aucun lien</option>
                <option value="category">Une catégorie</option>
                <option value="product">Un produit</option>
              </select>
              {linkType === 'category' && (
                <select value={linkId} onChange={(e) => setLinkId(e.target.value)} className={selectClass}>
                  <option value="" disabled>Choisir une catégorie</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              {linkType === 'product' && (
                <select value={linkId} onChange={(e) => setLinkId(e.target.value)} className={selectClass}>
                  <option value="" disabled>Choisir un produit</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-bold text-(--encre) block">Début (facultatif)</label>
                <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-(--encre) block">Fin (facultative)</label>
                <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputClass} />
              </div>
            </div>
            <p className="text-xs text-(--gris-texte)">
              Sans dates, la bannière est visible dès qu&apos;elle est activée. Avec des dates, elle apparaît et disparaît
              toute seule.
            </p>

            {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded-lg font-medium">{error}</p>}

            <div className="flex gap-2 mt-4">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? (uploading ? 'Envoi...' : 'En cours...') : editingId ? 'Enregistrer' : 'Ajouter'}
              </Button>
              {editingId && (
                <Button type="button" variant="secondary" onClick={resetForm} className="flex-1">
                  Annuler
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Liste */}
        <div>
          <h3 className="text-xl font-bold text-(--encre) mb-4">
            {activeTab.label} <span className="text-(--gris-texte) text-base font-normal">({tabBanners.length})</span>
          </h3>
          <p className="text-xs text-(--gris-texte) mb-4">
            {tab === 'carousel'
              ? "Le carrousel affiche les bannières visibles dans cet ordre."
              : "L'accueil affiche les 4 premières cartes visibles, dans cet ordre."}
          </p>

          {tabBanners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 text-(--gris-texte)">
              <Images className="w-12 h-12 mb-4 text-gray-300" />
              <p className="text-lg">Aucune bannière pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tabBanners.map((b, index) => {
                const status = bannerStatus(b)
                return (
                  <div key={b.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={b.image_url}
                      alt={b.title || 'Bannière'}
                      className={`rounded-xl object-cover border border-gray-100 shrink-0 ${
                        tab === 'carousel' ? 'w-full sm:w-36 aspect-[3/1]' : 'w-24 sm:w-20 aspect-square'
                      }`}
                    />
                    <div className="min-w-0 flex-1 w-full">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-bold text-(--encre) truncate">{b.title || 'Sans titre'}</p>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${status.className}`}>
                          {status.label}
                        </span>
                        {b.badge && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-(--or-senegal) text-(--encre)">
                            {b.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-(--gris-texte)">{linkText(b)}</p>
                      {(b.starts_at || b.ends_at) && (
                        <p className="text-xs text-(--gris-texte) mt-0.5">
                          {b.starts_at ? `Du ${new Date(b.starts_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}` : ''}
                          {b.starts_at && b.ends_at ? ' ' : ''}
                          {b.ends_at ? `au ${new Date(b.ends_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-row items-center justify-between sm:justify-start gap-1.5 shrink-0 w-full sm:w-auto pt-3 sm:pt-0 mt-1 sm:mt-0 border-t sm:border-t-0 border-gray-100">
                      <div className="flex gap-1">
                        <button
                          onClick={() => moveBanner(index, -1)}
                          disabled={index === 0}
                          className="p-2 rounded-lg border border-gray-200 text-(--gris-texte) hover:bg-gray-50 disabled:opacity-30 transition-colors"
                          title="Monter"
                          aria-label="Monter"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveBanner(index, 1)}
                          disabled={index === tabBanners.length - 1}
                          className="p-2 rounded-lg border border-gray-200 text-(--gris-texte) hover:bg-gray-50 disabled:opacity-30 transition-colors"
                          title="Descendre"
                          aria-label="Descendre"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => toggleActive(b)}
                          className={`p-2 rounded-lg border transition-colors ${
                            b.is_active
                              ? 'border-gray-200 text-(--gris-texte) hover:bg-gray-50'
                              : 'border-(--vert-baol)/30 text-(--vert-baol) hover:bg-(--vert-baol)/10'
                          }`}
                          title={b.is_active ? 'Désactiver' : 'Activer'}
                          aria-label={b.is_active ? 'Désactiver' : 'Activer'}
                        >
                          {b.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => startEdit(b)}
                          className="p-2 rounded-lg border border-gray-200 text-(--gris-texte) hover:bg-gray-50 hover:text-(--encre) transition-colors"
                          title="Modifier"
                          aria-label="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => setBannerToDelete(b.id)}
                            className="p-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition-colors"
                            title="Supprimer"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de suppression */}
      {canDelete && bannerToDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-4 text-red-600">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-(--encre)">Supprimer la bannière ?</h3>
            </div>
            <p className="text-(--gris-texte) mb-6 font-medium">
              Cette action est irréversible : la bannière et son image seront supprimées. Pour la masquer
              temporairement, désactivez-la plutôt.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setBannerToDelete(null)}
                className="px-4 py-2.5 text-(--gris-texte) hover:bg-gray-100 rounded-xl font-bold transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteBanner(bannerToDelete)}
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
