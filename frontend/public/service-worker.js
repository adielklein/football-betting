// Service Worker לטיפול בהתראות Push
// מיקום: public/service-worker.js

const CACHE_NAME = 'football-betting-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/css/main.css',
  '/static/js/main.js',
  '/logo192.png',
  '/logo512.png'
];

// התקנה - Caching של קבצים בסיסיים
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
      .catch(error => {
        console.error('[ServiceWorker] Cache failed:', error);
      })
  );
});

// הפעלה - ניקוי cache ישן
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[ServiceWorker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch - שרת מה-cache או מהרשת
self.addEventListener('fetch', event => {
  // דלג על בקשות שאינן GET
  if (event.request.method !== 'GET') {
    return;
  }

  // דלג על בקשות API
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(error => {
        console.error('[ServiceWorker] Fetch failed:', error);
      })
  );
});

// קליטת Push Notifications
self.addEventListener('push', event => {
  console.log('[ServiceWorker] Push Received:', event);

  let data = {
    title: '🏆 הימורי כדורגל',
    body: 'יש לך התראה חדשה',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'default',
    requireInteraction: false
  };

  if (event.data) {
    try {
      const pushData = event.data.json();
      data = { ...data, ...pushData };
      console.log('[ServiceWorker] Push data:', data);
    } catch (error) {
      console.error('[ServiceWorker] Error parsing push data:', error);
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: data.vibrate || [200, 100, 200],
    tag: data.tag,
    requireInteraction: data.requireInteraction,
    renotify: true,
    dir: 'rtl',
    lang: 'he',
    data: data.data || {},
    actions: [
      {
        action: 'open',
        title: '📱 פתח',
        icon: '/logo192.png'
      },
      {
        action: 'close',
        title: '❌ סגור',
        icon: '/logo192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// טיפול בלחיצה על התראה
self.addEventListener('notificationclick', event => {
  console.log('[ServiceWorker] Notification clicked:', event);

  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  notification.close();

  if (action === 'close') {
    return;
  }

  let url = '/';
  
  if (data.url) {
    url = data.url;
  } else if (data.type === 'week_activated' || data.type === 'reminder') {
    url = '/';
  }

  event.waitUntil(
    clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    }).then(windowClients => {
      for (let client of windowClients) {
        if ('focus' in client) {
          return client.focus().then(client => {
            if ('navigate' in client) {
              return client.navigate(url);
            }
          });
        }
      }
      
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// הודעות מהאפליקציה - ⭐ החלק המתוקן
self.addEventListener('message', event => {
  console.log('[ServiceWorker] Message received:', event.data);

  if (!event.data) {
    return;
  }

  // טיפול ב-SKIP_WAITING
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // טיפול ב-CLIENTS_CLAIM
  if (event.data.type === 'CLIENTS_CLAIM') {
    event.waitUntil(self.clients.claim());
    return;
  }
});

console.log('[ServiceWorker] Loaded successfully ✅');