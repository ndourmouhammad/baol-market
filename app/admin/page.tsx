'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  Loader2,
  AlertCircle,
  Wallet,
  BadgeCheck,
  Crown,
  FolderOpen,
} from 'lucide-react'
import { StatusBadge } from '@/components/StatusBadge'

type TopItem = { name: string; quantity: number; revenue: number }
type TopSales = {
  topProduct: TopItem | null
  topCategory: TopItem | null
  topProducts: TopItem[]
  topCategories: TopItem[]
} | null

type Period = '7' | '30' | 'all'
const PERIOD_LABELS: { value: Period; label: string }[] = [
  { value: '7', label: '7 jours' },
  { value: '30', label: '30 jours' },
  { value: 'all', label: 'Depuis le début' },
]

export default function AdminDashboard() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>(null)
  const [topSales, setTopSales] = useState<TopSales>(null)
  const [loading, setLoading] = useState(true)
  const [topLoading, setTopLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('all')
  const router = useRouter()

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }, [])

  // Chargement initial des stats de base + top ventes
  useEffect(() => {
    async function fetchStats() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }

        const { data: staffRow } = await supabase
          .from('staff')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle()
          
        if (staffRow?.role === 'moderator') {
          router.push('/admin/orders')
          return
        }

        const response = await fetch(`/api/admin/stats?period=${period}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
        
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des données')
        }

        const data = await response.json()
        setStats({ stats: data.stats, recentOrders: data.recentOrders })
        setTopSales(data.topSales ?? null)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // Rechargement des top ventes quand la période change (après le premier chargement)
  useEffect(() => {
    if (loading) return
    let cancelled = false
    async function refetch() {
      setTopLoading(true)
      try {
        const token = await getToken()
        if (!token) return
        const res = await fetch(`/api/admin/stats?period=${period}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setTopSales(data.topSales ?? null)
        }
      } finally {
        if (!cancelled) setTopLoading(false)
      }
    }
    refetch()
    return () => { cancelled = true }
  }, [period, loading, getToken])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-(--vert-baol)" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center text-red-600 gap-3">
        <AlertCircle className="h-5 w-5" />
        <p>Erreur: {error}</p>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const { stats: kpis, recentOrders } = stats

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const cards = [
    {
      title: 'Chiffre d\'Affaires',
      value: formatCurrency(kpis.totalRevenue),
      subValue: 'Total des commandes payées',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Encaissé',
      value: formatCurrency(kpis.collectedRevenue),
      subValue: 'Commandes livrées',
      icon: Wallet,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    },
    {
      title: 'Ventes',
      value: kpis.completedSales,
      subValue: 'Commandes livrées',
      icon: BadgeCheck,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100'
    },
    {
      title: 'Commandes',
      value: kpis.totalOrders,
      subValue: `${kpis.pendingOrders} en attente`,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Produits',
      value: kpis.productsCount,
      icon: Package,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'Partenaires',
      value: kpis.partnersCount,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-(--encre)">Tableau de Bord</h1>
        <p className="text-(--gris-texte) mt-2">Bienvenue sur votre espace d&apos;administration. Voici un résumé de votre activité.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-(--gris-texte)">{card.title}</p>
                <h3 className="text-2xl font-bold text-(--encre) mt-2">{card.value}</h3>
                {card.subValue && (
                  <p className="text-xs font-medium text-gray-500 mt-1">{card.subValue}</p>
                )}
              </div>
              <div className={`p-3 rounded-xl ${card.bgColor} ${card.color}`}>
                <card.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Top ventes ── */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <h2 className="text-xl font-bold text-(--encre)">Meilleures ventes</h2>
          <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
            {PERIOD_LABELS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  period === p.value
                    ? 'bg-white text-(--encre) shadow-sm'
                    : 'text-(--gris-texte) hover:text-(--encre)'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {topLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-(--vert-baol)" />
          </div>
        ) : (
          <>
            {/* Deux cartes top */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <TopCard
                title="Produit le plus acheté"
                icon={Crown}
                iconColor="text-amber-600"
                iconBg="bg-amber-100"
                item={topSales?.topProduct ?? null}
                formatCurrency={formatCurrency}
              />
              <TopCard
                title="Catégorie la plus achetée"
                icon={FolderOpen}
                iconColor="text-indigo-600"
                iconBg="bg-indigo-100"
                item={topSales?.topCategory ?? null}
                formatCurrency={formatCurrency}
              />
            </div>

            {/* Top 5 listes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TopList title="Top 5 produits" items={topSales?.topProducts ?? []} formatCurrency={formatCurrency} />
              <TopList title="Top 5 catégories" items={topSales?.topCategories ?? []} formatCurrency={formatCurrency} />
            </div>
          </>
        )}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-(--encre)">Dernières Commandes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-(--encre) font-bold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">ID Commande</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Montant</th>
                <th className="px-6 py-4">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-(--encre)">
              {recentOrders?.length > 0 ? (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                recentOrders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-(--encre)">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 text-(--gris-texte)">
                      {new Date(order.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 font-bold">
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.status} fulfillmentMethod={order.fulfillment_method} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-(--gris-texte)">
                    Aucune commande récente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Sous-composants ────────────────────────────────────────────────────

function TopCard({
  title,
  icon: Icon,
  iconColor,
  iconBg,
  item,
  formatCurrency,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  iconBg: string
  item: TopItem | null
  formatCurrency: (n: number) => string
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-(--gris-texte)">{title}</p>
          {item ? (
            <>
              <h3 className="text-lg font-bold text-(--encre) mt-2 truncate">{item.name}</h3>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-(--gris-texte)">
                <span>{item.quantity} vendu{item.quantity > 1 ? 's' : ''}</span>
                <span className="font-bold text-(--encre)">{formatCurrency(item.revenue)}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-(--gris-texte) mt-2">Pas encore de vente</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${iconBg} ${iconColor} shrink-0 ml-4`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}

function TopList({
  title,
  items,
  formatCurrency,
}: {
  title: string
  items: TopItem[]
  formatCurrency: (n: number) => string
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-(--encre)">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-6 text-sm text-(--gris-texte) text-center">Pas encore de vente</p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {items.map((item, i) => (
            <li key={item.name} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                i === 0
                  ? 'bg-(--vert-baol) text-white'
                  : 'bg-gray-100 text-(--gris-texte)'
              }`}>
                {i + 1}
              </span>
              <span className="text-sm font-medium text-(--encre) truncate flex-1">{item.name}</span>
              <span className="text-xs text-(--gris-texte) shrink-0">{item.quantity} vente{item.quantity > 1 ? 's' : ''}</span>
              <span className="text-xs font-bold text-(--encre) shrink-0">{formatCurrency(item.revenue)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
