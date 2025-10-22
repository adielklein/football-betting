import React, { useState, useEffect } from 'react';

function NotificationSettings({ user }) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [hoursBeforeLock, setHoursBeforeLock] = useState(2);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // כתובת ה-API של Render
  const API_URL = 'https://football-betting-backend.onrender.com/api';

  useEffect(() => {
    // בדוק אם הדפדפן תומך בהתראות
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
      
      // טען הגדרות מהשרת אם יש
      if (subscription && user) {
        const response = await fetch(`${API_URL}/auth/users`);
        const users = await response.json();
        const currentUser = users.find(u => u._id === user.id);
        if (currentUser?.pushSettings?.hoursBeforeLock) {
          setHoursBeforeLock(currentUser.pushSettings.hoursBeforeLock);
        }
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
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
      // בקש הרשאות
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('יש לאשר התראות בדפדפן כדי להפעיל את התכונה');
        setLoading(false);
        return;
      }

      // רשום service worker
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered');
      
      // קבל public key מהשרת
      const response = await fetch(`${API_URL}/notifications/vapid-public-key`);
      const { publicKey } = await response.json();
      
      if (!publicKey) {
        alert('שגיאה: חסר VAPID public key בשרת');
        setLoading(false);
        return;
      }
      
      // צור subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      
      // שלח לשרת
      const saveResponse = await fetch(`${API_URL}/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          subscription: subscription,
          hoursBeforeLock: hoursBeforeLock
        })
      });
      
      if (saveResponse.ok) {
        setIsSubscribed(true);
        alert('✅ התראות הופעלו בהצלחה!');
      } else {
        throw new Error('Failed to save subscription');
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      alert('שגיאה בהפעלת התראות: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setLoading(true);
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }
      
      // עדכן בשרת
      await fetch(`${API_URL}/notifications/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      
      setIsSubscribed(false);
      alert('התראות בוטלו');
    } catch (error) {
      console.error('Error unsubscribing:', error);
      alert('שגיאה בביטול התראות');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async () => {
    try {
      await fetch(`${API_URL}/notifications/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          hoursBeforeLock: hoursBeforeLock
        })
      });
      
      alert('הגדרות עודכנו בהצלחה!');
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('שגיאה בעדכון הגדרות');
    }
  };

  const sendTestNotification = async () => {
    try {
      const response = await fetch(`${API_URL}/notifications/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      
      if (response.ok) {
        alert('התראת בדיקה נשלחה!');
      } else {
        alert('שגיאה בשליחת התראת בדיקה');
      }
    } catch (error) {
      console.error('Error sending test:', error);
      alert('שגיאה בשליחת התראת בדיקה');
    }
  };

  if (!isSupported) {
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
          🔔 התראות תזכורת
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
              <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                  🔔 שלח בדיקה
                </button>
              </div>
            )}
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '1rem',
            justifyContent: 'center'
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
                {loading ? '⏳ מפעיל...' : '🔔 הפעל התראות'}
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
                  {loading ? '⏳' : '🔕 בטל'}
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
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationSettings;