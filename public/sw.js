// Service Worker Baol Market (PWA & Push Notifications)
// IMPORTANT : AUCUN gestionnaire fetch, AUCUN cache (les prix et ventes flash doivent toujours être frais).

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {}
  if (event.data) {
    try {
      data = event.data.json()
    } catch {
      data = { body: event.data.text() }
    }
  }

  const title = data.title || 'Baol Market'
  const options = {
    body: data.body || '',
    icon: data.icon || '/logo/logo-192x192.png',
    badge: data.badge || '/logo/favicon-32x32.png',
    data: data.data || {},
    tag: data.tag || undefined,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const rawUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/'
  let targetUrl = '/'
  try {
    const parsed = new URL(rawUrl, self.location.origin)
    // Même origine uniquement, sinon retour à l'accueil
    if (parsed.origin === self.location.origin) {
      targetUrl = parsed.pathname + parsed.search + parsed.hash
    }
  } catch {
    targetUrl = '/'
  }

  const fullTargetUrl = new URL(targetUrl, self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Réutiliser une fenêtre déjà ouverte si possible
      for (const client of windowClients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(fullTargetUrl)
          }
          return client.focus()
        }
      }
      // Sinon, ouvrir une nouvelle fenêtre
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullTargetUrl)
      }
    })
  )
})
