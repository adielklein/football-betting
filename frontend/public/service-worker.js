// public/service-worker.js

console.log('🔧 Service Worker loading...');

// גרסה - שנה את זה כדי לאלץ עדכון
const CACHE_VERSION = 'v1.3.0'; // עבודה בלי קליטה
const CACHE_NAME = `football-betting-${CACHE_VERSION}`;

// ========================================
// 📴 בלי קליטה
// ========================================
// האפליקציה נפתחת גם בלי רשת (למשל באצטדיון) ומציגה את הנתונים האחרונים
// שנטענו. שני קאשים:
//   SHELL - הדף והקבצים של האפליקציה. הדף: רשת קודם (כך שגרסה חדשה תמיד
//           מגיעה כשיש רשת), ומהקאש רק כשאין. קבצי JS/CSS עם hash בשם לא
//           משתנים לעולם, ולכן מהקאש קודם.
//   API   - תשובות GET מהשרת: רשת קודם, ומהקאש רק כשאין רשת. נמחק ביציאה
//           מהחשבון (App.js), כדי שמשתמש אחר באותו מכשיר לא יראה אותן.
const SHELL_CACHE = 'gamball-shell-v1';
const API_CACHE = 'gamball-api-v1';
const KEEP = [CACHE_NAME, SHELL_CACHE, API_CACHE];
const SHELL_FILES = ['/', '/manifest.json', '/logo192.png', '/gamball-logo.jpeg', '/favicon-32x32.png'];

// התקנת Service Worker
self.addEventListener('install', (event) => {
  console.log('✅ Service Worker installed - v1.3.0 (offline)');
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => Promise.all(SHELL_FILES.map((u) => cache.add(u).catch(() => {}))))
      .catch(() => {})
  );
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
          if (!KEEP.includes(cacheName)) {
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

// כותרות שאסור להחזיר מתשובה שמורה: טוקן שהתחדש לפני שעות היה מחליף את
// הטוקן הנוכחי, וסטטוס הזדהות ישן היה מוציא את המשתמש מהחשבון
const STRIP_FROM_CACHED = ['x-auth-token', 'x-auth-status'];
const fromCache = (res) => {
  const headers = new Headers(res.headers);
  STRIP_FROM_CACHED.forEach((h) => headers.delete(h));
  headers.set('X-From-Cache', '1');
  return res.blob().then((body) => new Response(body, { status: res.status, statusText: res.statusText, headers }));
};

const networkFirst = async (request, cacheName, cacheKey) => {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(cacheKey || request, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const hit = await cache.match(cacheKey || request);
    if (hit) return cacheName === API_CACHE ? fromCache(hit) : hit;
    throw err;
  }
};

const cacheFirst = async (request) => {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
  return res;
};

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // פתיחת האפליקציה: הדף מהרשת, ומהקאש רק כשאין רשת
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, SHELL_CACHE, '/'));
    return;
  }

  if (url.origin === self.location.origin) {
    // בדיקת גרסה חדשה (appVersion.js) - תמיד ישר לרשת, בלי קאש
    if (url.pathname === '/' || url.pathname === '/index.html') return;
    if (url.pathname.startsWith('/assets/')) { event.respondWith(cacheFirst(req)); return; }
    if (/\.(png|jpe?g|ico|svg|json|webp)$/.test(url.pathname)) {
      event.respondWith(networkFirst(req, SHELL_CACHE));
    }
    return;
  }

  // נתונים מהשרת
  if (url.pathname.includes('/api/') && !url.pathname.includes('/api/auth/login')) {
    // המפתח הוא הכתובת בלבד, בלי הכותרות
    event.respondWith(networkFirst(req, API_CACHE, req.url));
  }
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