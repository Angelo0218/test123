self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {}
  if (event.data) {
    try {
      data = event.data.json()
    } catch (error) {
      data = { title: 'Web Push Demo', body: event.data.text() }
    }
  }

  const title = data.title || 'Web Push Demo'
  const options = {
    body: data.body || 'You have a new message.',
    icon: '/vite.svg',
    badge: '/vite.svg',
    data: {
      url: data.url || '/',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  const targetUrl = event.notification?.data?.url || '/'
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((client) => client.url === targetUrl)
      if (existing) {
        return existing.focus()
      }
      return self.clients.openWindow(targetUrl)
    })
  )
})
