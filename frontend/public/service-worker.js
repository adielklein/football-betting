// public/service-worker.js

console.log('🔧 Service Worker loading...');

// גרסה - שנה את זה כדי לאלץ עדכון
const CACHE_VERSION = 'v1.2.0'; // כפתורי פעולה בהתראות
const CACHE_NAME = `football-betting-${CACHE_VERSION}`;

// התקנת Service Worker
self.addEventListener('install', (event) => {
  console.log('✅ Service Worker installed - v1.2.0 with notification actions');
  self.skipWaiting(); // מיד להפעיל את ה-SW החדש
});

// הפעלת Service Worker
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated - v1.2.0');
  event.waitUntil(
    // נקה cache ישנים
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // תפוס שליטה על כל הלקוחות
      return self.clients.claim();
    })
  );
});

// ========================================
// 🔔 טיפול בהתראות Push - החלק החשוב!
// ========================================

self.addEventListener('push', (event) => {
  console.log('🔔 [SW] ========================================');
  console.log('🔔 [SW] Push event received!');
  console.log('🔔 [SW] Event:', event);
  
  let data = {
    title: 'התראה חדשה',
    body: 'יש לך הודעה חדשה',
    icon: '/logo192.png',
    badge: '/logo192.png',
    data: {}
  };

  // נסה לקרוא את הנתונים
  if (event.data) {
    try {
      const parsedData = event.data.json();
      console.log('🔔 [SW] Parsed data:', parsedData);
      data = { ...data, ...parsedData };
    } catch (error) {
      console.error('🔔 [SW] Error parsing push data:', error);
      console.log('🔔 [SW] Raw data:', event.data.text());
    }
  } else {
    console.log('🔔 [SW] No data in push event');
  }

  console.log('🔔 [SW] Notification data:', data);

  // הצג התראה
  const notificationOptions = {
    body: data.body,
    icon: data.icon || '/logo192.png',
    badge: data.badge || '/logo192.png',
    vibrate: data.vibrate || [200, 100, 200],
    tag: data.tag || 'default',
    data: data.data || {},
    requireInteraction: false, // ההתראה תיסגר אוטומטית
    actions: data.actions || [],
    silent: false // עם צליל
  };

  // ✅ ✅ ✅ הוספת תמיכה בתמונות! ✅ ✅ ✅
  if (data.data && data.data.imageUrl) {
    notificationOptions.image = data.data.imageUrl;
    console.log('🖼️ [SW] Adding image to notification:', data.data.imageUrl);
  } else if (data.image) {
    // Fallback למקרה שהתמונה מגיעה ישירות
    notificationOptions.image = data.image;
    console.log('🖼️ [SW] Adding image to notification (fallback):', data.image);
  } else {
    console.log('ℹ️ [SW] No image provided');
  }

  console.log('🔔 [SW] Showing notification:', data.title);
  console.log('🔔 [SW] Options:', notificationOptions);

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
      .then(() => {
        console.log('✅ [SW] Notification shown successfully');
      })
      .catch(error => {
        console.error('❌ [SW] Error showing notification:', error);
      })
  );
  
  console.log('🔔 [SW] ========================================');
});

// טיפול בלחיצה על התראה
self.addEventListener('notificationclick', (event) => {
  console.log('👆 [SW] Notification clicked:', event.notification);
  
  event.notification.close();

  // לחיצה על כפתור בהתראה מובילה ליעד של אותו כפתור. ה-service worker לא
  // מכיר את סוגי ההתראות - השרת שולח מפה מ-action ליעד, וכאן רק קוראים בה
  const data = event.notification.data || {};
  const actionUrl = event.action ? data.actionUrls?.[event.action] : null;

  // פתח את האפליקציה או עבור לעמוד מסוים
  const urlToOpen = actionUrl || data.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // בדוק אם יש כבר חלון פתוח
        for (let client of windowClients) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            console.log('🔄 [SW] Focusing existing window');
            return client.focus().then(client => {
              if (urlToOpen !== '/') {
                client.navigate(urlToOpen);
              }
              return client;
            });
          }
        }
        
        // פתח חלון חדש
        if (clients.openWindow) {
          console.log('🆕 [SW] Opening new window:', urlToOpen);
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// טיפול בסגירת התראה
self.addEventListener('notificationclose', (event) => {
  console.log('❌ [SW] Notification closed:', event.notification.tag);
});

console.log('✅ Service Worker v1.2.0 loaded successfully with notification actions!');