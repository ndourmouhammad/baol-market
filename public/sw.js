// Service Worker Baol Market (PWA & Push Notifications)
// IMPORTANT : AUCUN cache de pages ni de données (les prix et ventes flash doivent toujours être frais).
// Seule la page de secours /hors-ligne.html et son logo sont conservés pour le mode hors connexion.

const OFFLINE_CACHE = 'baol-offline-v2'
const OFFLINE_URLS = ['/hors-ligne.html', '/logo/logo-192x192.png']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.addAll(OFFLINE_URLS))
      .catch(() => {})
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key !== OFFLINE_CACHE)
              .map((key) => caches.delete(key))
          )
        ),
    ]).catch(() => {})
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return
  }

  let url
  try {
    url = new URL(event.request.url)
  } catch {
    return
  }

  // 1. Servir le logo hors ligne depuis le cache s'il est demandé
  if (url.origin === self.location.origin && url.pathname === '/logo/logo-192x192.png') {
    event.respondWith(
      caches.match('/logo/logo-192x192.png').then((response) => response || fetch(event.request))
    )
    return
  }

  // 2. Navigation de page uniquement
  if (event.request.mode !== 'navigate') {
    return
  }

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) {
    return
  }

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match('/hors-ligne.html').then((response) => response || Response.error())
    )
  )
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
