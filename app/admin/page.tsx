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
        <Loader2 className="h-8 w-8 animate-spin text-terre" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center text-red-600 gap-3">
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

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'created':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">Créée</span>
      case 'confirmed':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Confirmée</span>
      case 'payment_pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Paiement en attente</span>
      case 'paid':
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">Payée</span>
      case 'preparing':
        return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">En préparation</span>
      case 'delivering':
        return <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">En livraison</span>
      case 'delivered':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Livrée</span>
      case 'cancelled':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Annulée</span>
      case 'refunded':
        return <span className="px-2 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-medium">Remboursée</span>
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">{status}</span>
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-serif font-bold text-baobab">Tableau de Bord</h1>
        <p className="text-baobab/70 mt-2">Bienvenue sur votre espace d'administration. Voici un résumé de votre activité.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-mil/30 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-baobab/70">{card.title}</p>
                <h3 className="text-2xl font-bold text-baobab mt-2">{card.value}</h3>
                {card.subValue && (
                  <p className="text-xs font-medium text-baobab/60 mt-1">{card.subValue}</p>
                )}
              </div>
              <div className={`p-3 rounded-lg ${card.bgColor} ${card.color}`}>
                <card.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-mil/30 overflow-hidden">
        <div className="p-6 border-b border-mil/30 flex justify-between items-center">
          <h2 className="text-xl font-serif font-semibold text-baobab">Dernières Commandes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-sable/50 text-baobab font-medium border-b border-mil/30">
              <tr>
                <th className="px-6 py-4">ID Commande</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Montant</th>
                <th className="px-6 py-4">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mil/30 text-baobab/80">
              {recentOrders?.length > 0 ? (
                recentOrders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-sable/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-baobab">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      {new Date(order.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(order.status)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-baobab/60">
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
