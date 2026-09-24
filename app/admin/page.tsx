'use client'

import { useEffect, useState } from 'react'
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
  BadgeCheck
} from 'lucide-react'
import { StatusBadge } from '@/components/StatusBadge'

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

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

        const response = await fetch('/api/admin/stats', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
        
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des données')
        }

        const data = await response.json()
        setStats(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

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
      subValue: 'Total des commandes',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Encaissé',
      value: formatCurrency(kpis.collectedRevenue),
      subValue: 'Paiements reçus',
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
        <p className="text-(--gris-texte) mt-2">Bienvenue sur votre espace d'administration. Voici un résumé de votre activité.</p>
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
                      <StatusBadge status={order.status} />
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
