import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  HardHat,
  ShieldCheck,
  MapPin,
  Clock,
  Sparkles,
  MessageCircle,
} from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { SITE_URL } from '@/lib/siteUrl'
import {
  PROFESSIONS,
  PROFESSIONS_LIST,
  SERVICE_PROFESSIONS,
  type ServiceProfession,
  isPubliclyVisible,
  formatProviderPublicName,
  formatYearsExperience,
} from '@/lib/services'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Services à Diourbel : maçon, plombier, électricien, taxi - Baol Market',
  description:
    'Des professionnels vérifiés par notre équipe à Diourbel (maçon, plombier, menuisier, électricien, peintre, taximan). Baol Market vous met en relation, puis vous recontacte pour convenir des conditions.',
  alternates: {
    canonical: `${SITE_URL}/services`,
  },
  openGraph: {
    title: 'Services à Diourbel - Baol Market',
    description:
      'Des professionnels vérifiés par notre équipe. Baol Market vous met en relation rapide avec les meilleurs artisans et taximen de Diourbel.',
    url: `${SITE_URL}/services`,
    siteName: 'Baol Market',
    locale: 'fr_FR',
    type: 'website',
  },
}

type PageProps = {
  searchParams?: Promise<{ metier?: string }>
}

type PublicProvider = {
  id: string
  first_name: string
  last_name: string
  profession: ServiceProfession
  years_experience: number
  department: string
  neighborhood: string | null
  photo_path: string | null
  photo_url: string | null
}

export default async function ServicesPage({ searchParams }: PageProps) {
  const resolvedParams = searchParams ? await searchParams : {}
  const rawMetier = resolvedParams?.metier

  const activeMetier: ServiceProfession | 'all' =
    rawMetier && SERVICE_PROFESSIONS.includes(rawMetier as ServiceProfession)
      ? (rawMetier as ServiceProfession)
      : 'all'

  // Récupérer les prestataires actifs côté serveur via supabaseAdmin
  const { data: rawRows, error } = await supabaseAdmin
    .from('service_providers')
    .select(`
      id,
      first_name,
      last_name,
      profession,
      years_experience,
      department,
      neighborhood,
      photo_path,
      id_document_path,
      license_path,
      insurance_path,
      license_expires_on,
      insurance_expires_on,
      is_active
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erreur chargement services publics:', error)
  }

  // Filtrer STRICTEMENT les fiches visibles selon toutes les règles métiers
  const allVisibleProviders: PublicProvider[] = (rawRows ?? [])
    .filter((row) => isPubliclyVisible(row))
    .map((row) => {
      let photoUrl: string | null = null
      if (row.photo_path) {
        photoUrl = supabaseAdmin.storage
          .from('service-photos')
          .getPublicUrl(row.photo_path).data.publicUrl
      }

      return {
        id: row.id,
        first_name: row.first_name,
        last_name: row.last_name,
        profession: row.profession as ServiceProfession,
        years_experience: row.years_experience,
        department: row.department,
        neighborhood: row.neighborhood,
        photo_path: row.photo_path,
        photo_url: photoUrl,
      }
    })

  // Comptages par métier
  const countsByProfession: Record<string, number> = {
    all: allVisibleProviders.length,
  }
  for (const p of PROFESSIONS_LIST) {
    countsByProfession[p.key] = allVisibleProviders.filter((s) => s.profession === p.key).length
  }

  // Filtrage selon le métier actif
  const displayedProviders =
    activeMetier === 'all'
      ? allVisibleProviders
      : allVisibleProviders.filter((s) => s.profession === activeMetier)

  return (
    <div className="min-h-screen bg-(--fond) py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête de la rubrique */}
        <div className="max-w-3xl mb-8 md:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-(--vert-baol)/10 text-(--vert-baol-fonce) mb-3 border border-(--vert-baol)/20">
            <Sparkles className="w-3.5 h-3.5 text-(--vert-baol)" />
            Diourbel uniquement
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-(--encre) tracking-tight mb-3">
            Services à Diourbel
          </h1>
          <p className="text-base sm:text-lg text-(--gris-texte) leading-relaxed">
            Des professionnels vérifiés par notre équipe. Baol Market vous met en relation, puis vous
            recontacte pour convenir des conditions. Service disponible à Diourbel uniquement.
          </p>
        </div>

        {/* Pastilles de filtre par métier */}
        <div className="mb-8 overflow-x-auto pb-2 scrollbar-none">
          <div className="flex items-center gap-2 min-w-max">
            <Link
              href="/services"
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 border ${
                activeMetier === 'all'
                  ? 'bg-(--vert-baol) text-white border-(--vert-baol) shadow-sm'
                  : 'bg-white text-(--encre) border-gray-200 hover:border-(--vert-baol)/40 hover:bg-gray-50'
              }`}
            >
              <span>Tous</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  activeMetier === 'all'
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 text-(--gris-texte)'
                }`}
              >
                {countsByProfession.all ?? 0}
              </span>
            </Link>

            {PROFESSIONS_LIST.map((prof) => {
              const isActive = activeMetier === prof.key
              const count = countsByProfession[prof.key] ?? 0

              return (
                <Link
                  key={prof.key}
                  href={`/services?metier=${prof.key}`}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 border ${
                    isActive
                      ? 'bg-(--vert-baol) text-white border-(--vert-baol) shadow-sm'
                      : 'bg-white text-(--encre) border-gray-200 hover:border-(--vert-baol)/40 hover:bg-gray-50'
                  }`}
                >
                  <span>{prof.labelPlural}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-(--gris-texte)'
                    }`}
                  >
                    {count}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Liste des prestataires */}
        {displayedProviders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center max-w-lg mx-auto shadow-sm my-8">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <HardHat className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-(--encre) mb-2">
              Aucun professionnel disponible pour le moment.
            </h2>
            <p className="text-sm text-(--gris-texte) mb-6">
              Notre équipe est en train de vérifier et recruter de nouveaux professionnels à Diourbel.
              Revenez très bientôt !
            </p>
            {activeMetier !== 'all' && (
              <Link
                href="/services"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-(--vert-baol) text-white hover:bg-(--vert-baol-fonce) transition-colors"
              >
                Voir tous les métiers
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedProviders.map((provider) => {
              const professionMeta = PROFESSIONS[provider.profession]
              const displayName = formatProviderPublicName(provider.first_name, provider.last_name)
              const refId = provider.id.slice(0, 8).toUpperCase()
              const professionLower = professionMeta ? professionMeta.label.toLowerCase() : provider.profession

              // Message WhatsApp formaté selon les consignes
              const waText = `Bonjour, je souhaite faire appel à un ${professionLower} (réf. ${refId}) : ${displayName} ${SITE_URL}/services?metier=${provider.profession}`
              const waUrl = `https://wa.me/221781507505?text=${encodeURIComponent(waText)}`

              const locationText = provider.neighborhood
                ? `${provider.neighborhood}, ${provider.department}`
                : provider.department

              return (
                <div
                  key={provider.id}
                  className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header de la carte */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                        {provider.photo_url ? (
                          <Image
                            src={provider.photo_url}
                            alt={displayName}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <HardHat className="w-8 h-8" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 truncate">
                            {professionMeta?.label ?? provider.profession}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Vérifié
                          </span>
                        </div>

                        <h2 className="text-lg font-bold text-(--encre) truncate" title={displayName}>
                          {displayName}
                        </h2>

                        <div className="flex items-center gap-1.5 text-xs text-(--gris-texte) mt-1">
                          <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{formatYearsExperience(provider.years_experience)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Localisation */}
                    <div className="flex items-start gap-2 text-xs text-(--encre) bg-gray-50/80 px-3 py-2.5 rounded-xl border border-gray-100 mb-5">
                      <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">{locationText}</span>
                    </div>
                  </div>

                  {/* Bouton de mise en relation via WhatsApp */}
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-(--vert-baol) hover:bg-(--vert-baol-fonce) text-white font-bold text-sm shadow-sm hover:shadow transition-all group"
                  >
                    <MessageCircle className="w-4 h-4 transition-transform group-hover:scale-110" />
                    <span>Demander ce professionnel</span>
                  </a>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
