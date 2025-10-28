import React, { useState, useEffect } from 'react';

function NotificationSettings({ user }) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [hoursBeforeLock, setHoursBeforeLock] = useState(2);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // כתובת ה-API של Render
  const API_URL = 'https://football-betting-backend.onrender.com/api';

  // 🔧 FIX: פונקציה לקבלת user ID עם fallback
  const getUserId = () => {
    if (!user) {
      console.error('❌ [NS] No user object provided!');
      return null;
    }
    // נסה _id קודם (MongoDB), ואז id (fallback)
    const userId = user._id || user.id;
    if (!userId) {
      console.error('❌ [NS] User object has no _id or id field!', user);
      return null;
    }
    return userId;
  };

  useEffect(() => {
    console.log('📢 [NS] Component mounted');
    console.log('📢 [NS] User:', user);
    console.log('📢 [NS] User ID:', getUserId());
    
    // בדוק אם הדפדפן תומך בהתראות
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      console.log('✅ [NS] Browser supports notifications');
      setIsSupported(true);
      checkSubscription();
    } else {
      console.log('❌ [NS] Browser does not support notifications');
    }
  }, []);

  const checkSubscription = async () => {
    try {
      console.log('🔍 [NS] Checking subscription status...');
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      console.log('🔍 [NS] Current subscription:', subscription);
      setIsSubscribed(!!subscription);
      
      // טען הגדרות מהשרת אם יש
      if (subscription && user) {
        console.log('🔍 [NS] Loading settings from server...');
        const response = await fetch(`${API_URL}/auth/users`);
        const users = await response.json();
        const userId = getUserId();
        const currentUser = users.find(u => u._id === userId || u.id === userId);
        
        console.log('🔍 [NS] Current user from server:', currentUser);
        
        if (currentUser?.pushSettings?.hoursBeforeLock) {
          console.log('🔍 [NS] Setting hoursBeforeLock:', currentUser.pushSettings.hoursBeforeLock);
          setHoursBeforeLock(currentUser.pushSettings.hoursBeforeLock);
        }
      }
    } catch (error) {
      console.error('❌ [NS] Error checking subscription:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    setLoading(true);
    
    try {
      console.log('📢 [NS] ========================================');
      console.log('📢 [NS] Starting subscription process...');
      
      // 🔧 FIX: קבל user ID עם fallback
      const userId = getUserId();
      if (!userId) {
        alert('שגיאה: לא ניתן לזהות את המשתמש. נסה להתחבר מחדש.');
        setLoading(false);
        return;
      }
      
      console.log('📢 [NS] User ID:', userId);
      console.log('📢 [NS] User name:', user.name);
      console.log('📢 [NS] ========================================');
      
      // בקש הרשאות
      console.log('📢 [NS] Requesting permission...');
      const permission = await Notification.requestPermission();
      console.log('📢 [NS] Permission result:', permission);
      
      if (permission !== 'granted') {
        console.log('❌ [NS] Permission denied');
        alert('יש לאשר התראות בדפדפן כדי להפעיל את התכונה');
        setLoading(false);
        return;
      }

      // רשום service worker
      console.log('📢 [NS] Registering service worker...');
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('✅ [NS] Service Worker registered:', registration);
      
      // המתן ש-SW יהיה מוכן
      console.log('📢 [NS] Waiting for service worker to be ready...');
      await navigator.serviceWorker.ready;
      console.log('✅ [NS] Service Worker ready');
      
      // קבל public key מהשרת
      console.log('📢 [NS] Fetching VAPID public key from server...');
      const response = await fetch(`${API_URL}/notifications/vapid-public-key`);
      console.log('📢 [NS] VAPID response status:', response.status);
      
      const data = await response.json();
      console.log('📢 [NS] VAPID response data:', data);
      
      const publicKey = data.publicKey;
      
      if (!publicKey) {
        console.error('❌ [NS] No public key received');
        alert('שגיאה: חסר VAPID public key בשרת');
        setLoading(false);
        return;
      }
      
      console.log('✅ [NS] Public key received:', publicKey.substring(0, 30) + '...');
      
      // צור subscription
      console.log('📢 [NS] Creating push subscription...');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      
      console.log('✅ [NS] Push subscription created successfully');
      console.log('📱 [NS] Subscription details:', {
        endpoint: subscription.endpoint.substring(0, 50) + '...',
        keys: Object.keys(subscription.toJSON().keys)
      });
      
      // שלח לשרת
      console.log('📢 [NS] Saving subscription to server...');
      console.log('📢 [NS] Sending to:', `${API_URL}/notifications/subscribe`);
      console.log('📢 [NS] With data:', {
        userId: userId, // 🔧 FIX: משתמש ב-userId עם fallback
        hoursBeforeLock: hoursBeforeLock,
        subscriptionEndpoint: subscription.endpoint.substring(0, 50) + '...'
      });
      
      const saveResponse = await fetch(`${API_URL}/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId, // 🔧 FIX: משתמש ב-userId עם fallback
          subscription: subscription,
          hoursBeforeLock: hoursBeforeLock
        })
      });
      
      console.log('📢 [NS] Save response status:', saveResponse.status);
      
      if (saveResponse.ok) {
        const result = await saveResponse.json();
        console.log('✅ [NS] Subscription saved successfully:', result);
        setIsSubscribed(true);
        alert('✅ התראות הופעלו בהצלחה!\nכעת תקבל התראות לפני נעילת הימורים.');
      } else {
        const errorText = await saveResponse.text();
        console.error('❌ [NS] Save failed:', errorText);
        throw new Error('Failed to save subscription: ' + errorText);
      }
      
      console.log('📢 [NS] ========================================');
      console.log('📢 [NS] Subscription process completed successfully');
      console.log('📢 [NS] ========================================');
      
    } catch (error) {
      console.error('❌ [NS] ========================================');
      console.error('❌ [NS] Error in subscription process:', error);
      console.error('❌ [NS] Error message:', error.message);
      console.error('❌ [NS] Error stack:', error.stack);
      console.error('❌ [NS] ========================================');
      alert('שגיאה בהפעלת התראות: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setLoading(true);
    
    try {
      console.log('📕 [NS] Starting unsubscribe process...');
      
      // 🔧 FIX: קבל user ID עם fallback
      const userId = getUserId();
      if (!userId) {
        alert('שגיאה: לא ניתן לזהות את המשתמש');
        setLoading(false);
        return;
      }
      
      console.log('📕 [NS] User ID:', userId);
      
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        console.log('📕 [NS] Unsubscribing from push...');
        await subscription.unsubscribe();
        console.log('✅ [NS] Unsubscribed from push');
      }
      
      // עדכן בשרת
      console.log('📕 [NS] Updating server...');
      const response = await fetch(`${API_URL}/notifications/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId }) // 🔧 FIX
      });
      
      console.log('📕 [NS] Server response status:', response.status);
      
      if (response.ok) {
        console.log('✅ [NS] Server updated successfully');
        setIsSubscribed(false);
        alert('התראות בוטלו בהצלחה');
      } else {
        throw new Error('Failed to update server');
      }
    } catch (error) {
      console.error('❌ [NS] Error unsubscribing:', error);
      alert('שגיאה בביטול התראות: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async () => {
    try {
      console.log('⚙️ [NS] Updating settings...');
      
      // 🔧 FIX: קבל user ID עם fallback
      const userId = getUserId();
      if (!userId) {
        alert('שגיאה: לא ניתן לזהות את המשתמש');
        return;
      }
      
      console.log('⚙️ [NS] User ID:', userId);
      console.log('⚙️ [NS] Hours before lock:', hoursBeforeLock);
      
      const response = await fetch(`${API_URL}/notifications/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId, // 🔧 FIX
          hoursBeforeLock: hoursBeforeLock
        })
      });
      
      console.log('⚙️ [NS] Update response status:', response.status);
      
      if (response.ok) {
        console.log('✅ [NS] Settings updated successfully');
        alert('הגדרות עודכנו בהצלחה!');
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      console.error('❌ [NS] Error updating settings:', error);
      alert('שגיאה בעדכון הגדרות: ' + error.message);
    }
  };

  const sendTestNotification = async () => {
    try {
      console.log('🧪 [NS] ========================================');
      console.log('🧪 [NS] Sending test notification...');
      
      // 🔧 FIX: קבל user ID עם fallback
      const userId = getUserId();
      if (!userId) {
        alert('שגיאה: לא ניתן לזהות את המשתמש');
        return;
      }
      
      console.log('🧪 [NS] User ID:', userId);
      console.log('🧪 [NS] User name:', user.name);
      console.log('🧪 [NS] ========================================');
      
      const response = await fetch(`${API_URL}/notifications/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId }) // 🔧 FIX
      });
      
      console.log('🧪 [NS] Test response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ [NS] Test notification result:', result);
        console.log('🧪 [NS] ========================================');
        console.log('🧪 [NS] Test notification sent successfully');
        console.log('🧪 [NS] Check your device for the notification!');
        console.log('🧪 [NS] ========================================');
        alert('✅ התראת בדיקה נשלחה!\nבדוק את המכשיר שלך.');
      } else {
        const errorText = await response.text();
        console.error('❌ [NS] Test failed:', errorText);
        alert('שגיאה בשליחת התראת בדיקה: ' + errorText);
      }
    } catch (error) {
      console.error('❌ [NS] Error sending test:', error);
      alert('שגיאה בשליחת התראת בדיקה: ' + error.message);
    }
  };

  if (!isSupported) {
    console.log('⚠️ [NS] Notifications not supported, hiding component');
    return null; // לא מציג כלום אם הדפדפן לא תומך
  }

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: showSettings ? '1rem' : 0
      }}>
        <h3 style={{ fontSize: '18px', margin: 0 }}>
          📢 התראות תזכורת
        </h3>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="btn"
          style={{ 
            fontSize: '12px',
            padding: '4px 12px',
            backgroundColor: showSettings ? '#6c757d' : '#007bff',
            color: 'white'
          }}
        >
          {showSettings ? 'סגור' : 'הגדרות'}
        </button>
      </div>

      {showSettings && (
        <div style={{ 
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem' }}>
              קבל התראה לנייד לפני שההימורים נסגרים
            </p>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <label style={{ fontSize: '14px' }}>
                התראה לפני נעילה:
              </label>
              <select
                value={hoursBeforeLock}
                onChange={(e) => setHoursBeforeLock(Number(e.target.value))}
                className="input"
                style={{ width: '150px' }}
                disabled={loading}
              >
                <option value={0.5}>30 דקות</option>
                <option value={1}>שעה</option>
                <option value={2}>2 שעות</option>
                <option value={3}>3 שעות</option>
                <option value={6}>6 שעות</option>
                <option value={12}>12 שעות</option>
                <option value={24}>יום לפני</option>
              </select>
            </div>

            {isSubscribed && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={updateSettings}
                  className="btn"
                  style={{ 
                    fontSize: '14px',
                    backgroundColor: '#28a745',
                    color: 'white'
                  }}
                  disabled={loading}
                >
                  💾 שמור הגדרות
                </button>
                <button
                  onClick={sendTestNotification}
                  className="btn"
                  style={{ 
                    fontSize: '14px',
                    backgroundColor: '#17a2b8',
                    color: 'white'
                  }}
                  disabled={loading}
                >
                  📢 שלח בדיקה
                </button>
              </div>
            )}
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '1rem',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            {!isSubscribed ? (
              <button
                onClick={subscribeToPush}
                className="btn btn-primary"
                style={{ 
                  fontSize: '16px',
                  padding: '10px 24px',
                  fontWeight: 'bold'
                }}
                disabled={loading}
              >
                {loading ? '⏳ מפעיל...' : '📢 הפעל התראות'}
              </button>
            ) : (
              <>
                <span style={{ 
                  padding: '10px 20px',
                  backgroundColor: '#d4edda',
                  color: '#155724',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  ✅ התראות פעילות
                </span>
                <button
                  onClick={unsubscribeFromPush}
                  className="btn"
                  style={{ 
                    fontSize: '14px',
                    padding: '8px 16px',
                    backgroundColor: '#dc3545',
                    color: 'white'
                  }}
                  disabled={loading}
                >
                  {loading ? '⏳ מבטל...' : '📕 בטל'}
                </button>
              </>
            )}
          </div>

          {/* הוראות למשתמש */}
          <div style={{ 
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: '#e3f2fd',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            <strong>💡 איך להתקין את האפליקציה:</strong>
            <ol style={{ margin: '0.5rem 0', paddingRight: '20px' }}>
              <li>פתח את האתר ב-Chrome/Safari במובייל</li>
              <li>לחץ על התפריט (3 נקודות/שיתוף)</li>
              <li>בחר "הוסף למסך הבית"</li>
              <li>אשר את ההתקנה</li>
            </ol>
            <p style={{ marginTop: '0.5rem', fontSize: '11px', color: '#666' }}>
              💻 על מחשב: התראות יופיעו ישירות בדפדפן
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationSettings;