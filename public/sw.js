// public/sw.js - Service Worker para PWA

const CACHE_NAME = 'tareas-app-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.js',
  '/pwa-192x192.png',
  '/pwa-512x512.png'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker instalado');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activar Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activado');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptar fetch requests
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Devuelve cache si existe, sino hace fetch
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Manejar notificaciones push
self.addEventListener('push', (event) => {
  console.log('📨 Notificación push recibida');
  
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'Nueva notificación',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Sistema de Tareas', options)
  );
});

// Manejar clic en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notificación clickeada');
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});

// Manejar mensajes del cliente
self.addEventListener('message', (event) => {
  console.log('📩 Mensaje recibido en Service Worker:', event.data);
  
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data.payload;
    self.registration.showNotification(title, options)
      .then(() => console.log('🔔 Notificación mostrada desde SW'))
      .catch(error => console.error('❌ Error mostrando notificación:', error));
  }
});