'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Bell } from 'lucide-react'

type Notification = {
  id: string
  order_id: string
  message: string
  is_read: boolean
  created_at: string
}

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  async function loadNotifications() {
    const { data } = await supabase
      .from('order_notifications')
      .select('id, order_id, message, is_read, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data || [])
  }

  useEffect(() => {
    loadNotifications()
  }, [userId])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  async function handleOpenNotification(notif: Notification) {
    if (!notif.is_read) {
      await supabase.from('order_notifications').update({ is_read: true }).eq('id', notif.id)
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)))
    }
    setOpen(false)
    router.push('/orders')
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (unreadIds.length === 0) return
    await supabase.from('order_notifications').update({ is_read: true }).in('id', unreadIds)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-(--encre) hover:text-(--vert-baol) transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-(--rouge-erreur) text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Overlay mobile : ferme le menu au clic en dehors, cohérent avec le drawer du Header */}
          <div
            className="fixed inset-0 z-40 sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <div
            className={`
              fixed left-4 right-4 top-16 z-50
              sm:absolute sm:left-auto sm:right-0 sm:top-full sm:inset-x-auto sm:mt-2 sm:w-80
              bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden
            `}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-bold text-sm text-(--encre)">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs text-(--vert-baol) font-medium hover:underline">
                  Tout marquer comme lu
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-(--gris-texte) text-center py-8">Aucune notification pour le moment.</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleOpenNotification(n)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-(--vert-baol)/5' : ''}`}
                  >
                    <p className={`text-sm ${!n.is_read ? 'font-bold text-(--encre)' : 'text-(--gris-texte)'}`}>{n.message}</p>
                    <p className="text-xs text-(--gris-texte) mt-1">
                      {new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}