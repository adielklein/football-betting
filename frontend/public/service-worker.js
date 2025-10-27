// Service Worker פשוט להתראות Push בלבד
// מיקום: public/service-worker.js

console.log('[ServiceWorker] 🚀 Loading...');

// התקנה - פשוט ודא שה-SW מותקן
self.addEventListener('install', event => {
  console.log('[ServiceWorker] ✅ Installing...');
  // דלג על המתנה והפעל מיד
  self.skipWaiting();
});

// הפעלה - תפוס שליטה על כל הדפים
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] ✅ Activating...');
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('[ServiceWorker] ✅ Claimed all clients');
    })
  );
});

// קליטת Push Notifications
self.addEventListener('push', event => {
  console.log('[ServiceWorker] 🔔 Push Received:', event);

  let data = {
    title: '🏆 הימורי כדורגל',
    body: 'יש לך התראה חדשה',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'default',
    requireInteraction: false
  };

  // נסה לקרוא נתונים מההתראה
  if (event.data) {
    try {
      const pushData = event.data.json();
      data = { ...data, ...pushData };
      console.log('[ServiceWorker] 📩 Push data:', data);
    } catch (error) {
      console.error('[ServiceWorker] ❌ Error parsing push data:', error);
    }
  }

  // הגדרות ההתראה
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

  // הצג את ההתראה
  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => {
        console.log('[ServiceWorker] ✅ Notification shown');
      })
      .catch(error => {
        console.error('[ServiceWorker] ❌ Failed to show notification:', error);
      })
  );
});

// טיפול בלחיצה על התראה
self.addEventListener('notificationclick', event => {
  console.log('[ServiceWorker] 👆 Notification clicked');

  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  // סגור את ההתראה
  notification.close();

  // אם לחץ על "סגור" - לא עושים כלום
  if (action === 'close') {
    console.log('[ServiceWorker] 🚫 Close action - doing nothing');
    return;
  }

  // קבע לאן לנווט
  let url = '/';
  
  if (data.url) {
    url = data.url;
  } else if (data.type === 'week_activated' || data.type === 'reminder') {
    url = '/';
  }

  console.log('[ServiceWorker] 🔗 Opening URL:', url);

  // פתח/התמקד בחלון האפליקציה
  event.waitUntil(
    clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    }).then(windowClients => {
      // אם יש חלון פתוח - התמקד בו
      for (let client of windowClients) {
        if ('focus' in client) {
          console.log('[ServiceWorker] ✅ Focusing existing window');
          return client.focus().then(focusedClient => {
            if ('navigate' in focusedClient && url !== '/') {
              return focusedClient.navigate(url);
            }
            return focusedClient;
          });
        }
      }
      
      // אין חלון פתוח - פתח חדש
      if (clients.openWindow) {
        console.log('[ServiceWorker] ✅ Opening new window');
        return clients.openWindow(url);
      }
    })
    .catch(error => {
      console.error('[ServiceWorker] ❌ Error handling click:', error);
    })
  );
});

// הודעות מהאפליקציה
self.addEventListener('message', event => {
  console.log('[ServiceWorker] 💬 Message received:', event.data);

  if (!event.data) {
    return;
  }

  if (event.data.type === 'SKIP_WAITING') {
    console.log('[ServiceWorker] ⏩ Skip waiting');
    self.skipWaiting();
  }

  if (event.data.type === 'CLIENTS_CLAIM') {
    console.log('[ServiceWorker] 👋 Claiming clients');
    event.waitUntil(self.clients.claim());
  }
});

console.log('[ServiceWorker] ✅ Loaded successfully');