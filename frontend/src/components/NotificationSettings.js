import React, { useState, useEffect } from 'react';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : 'https://football-betting-backend.onrender.com/api';

function NotificationSettings({ user }) {
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [hoursBeforeLock, setHoursBeforeLock] = useState(2);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user?.pushSettings) {
      setSubscribed(user.pushSettings.enabled || false);
      setHoursBeforeLock(user.pushSettings.hoursBeforeLock || 2);
      setSoundEnabled(user.pushSettings.soundEnabled !== false);
    }
  }, [user]);

  const getUserId = () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      return parsedUser._id;
    }
    return null;
  };

  const subscribeToPush = async () => {
    setLoading(true);
    setMessage('');

    try {
      console.log('🔔 [CLIENT] Starting subscription process...');

      // בדיקת תמיכה בהתראות
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('הדפדפן שלך לא תומך בהתראות Push');
      }

      console.log('🔔 [CLIENT] Browser supports push notifications');

      // המתנה ל-service worker
      const registration = await navigator.serviceWorker.ready;
      console.log('🔔 [CLIENT] Service Worker is ready');

      // קבל את ה-VAPID public key
      console.log('🔔 [CLIENT] Fetching VAPID public key...');
      const keyResponse = await fetch(`${API_URL}/notifications/vapid-public-key`);
      const { publicKey } = await keyResponse.json();
      console.log('🔔 [CLIENT] VAPID key received:', publicKey.substring(0, 30) + '...');

      // המר את המפתח הציבורי
      function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      }

      const convertedKey = urlBase64ToUint8Array(publicKey);

      // 🔧 FIX: בדוק אם כבר יש subscription למכשיר הזה
      let subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        console.log('🔔 [CLIENT] Existing subscription found, updating it');
      } else {
        console.log('🔔 [CLIENT] Creating new subscription...');
      }

      // צור subscription (או השתמש בקיים)
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });

      console.log('🔔 [CLIENT] Subscription created/updated successfully');
      console.log('🔔 [CLIENT] Endpoint:', subscription.endpoint.substring(0, 50) + '...');

      const userId = getUserId();
      if (!userId) {
        throw new Error('משתמש לא מחובר');
      }

      // שלח ל-backend - 🔧 FIX: Backend יוסיף למערך במקום לדרוס!
      console.log('🔔 [CLIENT] Sending subscription to backend...');
      const response = await fetch(`${API_URL}/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          subscription: subscription.toJSON(),
          hoursBeforeLock: hoursBeforeLock
        })
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ [CLIENT] Subscription saved successfully');
        console.log('✅ [CLIENT] Total devices:', data.devicesCount);
        setSubscribed(true);
        setMessage(`✅ התראות הופעלו! (${data.devicesCount || 1} מכשירים)`);
      } else {
        throw new Error(data.message || 'שגיאה בשמירת ההגדרות');
      }
    } catch (error) {
      console.error('❌ [CLIENT] Error in subscribeToPush:', error);
      setMessage(`❌ שגיאה: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 🔧 FIX: שלח את ה-endpoint כדי להסיר רק את המכשיר הזה!
  const unsubscribeFromPush = async () => {
    setLoading(true);
    setMessage('');

    try {
      console.log('🔕 [CLIENT] Starting unsubscribe process...');

      const userId = getUserId();
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      let endpoint = null;
      if (subscription) {
        endpoint = subscription.endpoint; // 🔧 FIX: שמור את ה-endpoint
        console.log('🔕 [CLIENT] Unsubscribing from endpoint:', endpoint.substring(0, 50) + '...');
        await subscription.unsubscribe();
        console.log('🔕 [CLIENT] Browser subscription removed');
      }

      // 🔧 FIX: שלח את ה-endpoint לbackend כדי להסיר רק מכשיר זה
      const response = await fetch(`${API_URL}/notifications/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          endpoint: endpoint  // 🔧 FIX: הוסף את ה-endpoint
        })
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ [CLIENT] Unsubscribed successfully');
        console.log('✅ [CLIENT] Devices remaining:', data.devicesRemaining);
        setSubscribed(false);
        setMessage(data.devicesRemaining > 0 
          ? `✅ המכשיר הזה הוסר (${data.devicesRemaining} מכשירים נותרו)`
          : '✅ התראות בוטלו בהצלחה'
        );
      } else {
        throw new Error(data.message || 'שגיאה בביטול ההתראות');
      }
    } catch (error) {
      console.error('❌ [CLIENT] Error in unsubscribeFromPush:', error);
      setMessage(`❌ שגיאה: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async () => {
    setLoading(true);
    setMessage('');

    try {
      const userId = getUserId();

      const response = await fetch(`${API_URL}/notifications/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          hoursBeforeLock: hoursBeforeLock,
          soundEnabled: soundEnabled
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('✅ הגדרות עודכנו בהצלחה');
      } else {
        throw new Error(data.message || 'שגיאה בעדכון הגדרות');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      setMessage(`❌ שגיאה: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>⚙️ הגדרות התראות</h2>

      {message && (
        <div style={{
          padding: '1rem',
          margin: '1rem 0',
          backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
          color: message.includes('✅') ? '#155724' : '#721c24',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          {message}
        </div>
      )}

      {!subscribed ? (
        <div style={{
          padding: '1.5rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          <h3>🔔 הפעל התראות</h3>
          <p>קבל התראות לפני נעילת השבוע</p>

          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              ⏰ זמן התזכורת לפני נעילה:
            </label>
            <select
              value={hoursBeforeLock}
              onChange={(e) => setHoursBeforeLock(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '16px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            >
              <option value={1}>שעה לפני</option>
              <option value={2}>שעתיים לפני</option>
              <option value={3}>3 שעות לפני</option>
              <option value={6}>6 שעות לפני</option>
              <option value={12}>12 שעות לפני</option>
              <option value={24}>יום לפני</option>
            </select>
          </div>

          <button
            onClick={subscribeToPush}
            className="btn"
            style={{
              marginTop: '1rem',
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              backgroundColor: '#28a745',
              color: 'white'
            }}
            disabled={loading}
          >
            {loading ? '⏳ מפעיל...' : '🔔 הפעל התראות'}
          </button>
        </div>
      ) : (
        <div style={{
          padding: '1.5rem',
          backgroundColor: '#d4edda',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          <h3>✅ התראות פעילות</h3>

          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              ⏰ זמן התזכורת:
            </label>
            <select
              value={hoursBeforeLock}
              onChange={(e) => setHoursBeforeLock(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '16px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                marginBottom: '0.5rem'
              }}
            >
              <option value={1}>שעה לפני</option>
              <option value={2}>שעתיים לפני</option>
              <option value={3}>3 שעות לפני</option>
              <option value={6}>6 שעות לפני</option>
              <option value={12}>12 שעות לפני</option>
              <option value={24}>יום לפני</option>
            </select>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              marginTop: '0.5rem',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                style={{ marginLeft: '0.5rem' }}
              />
              <span>🔊 צליל התראה</span>
            </label>

            <button
              onClick={updateSettings}
              className="btn"
              style={{
                marginTop: '1rem',
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                backgroundColor: '#007bff',
                color: 'white'
              }}
              disabled={loading}
            >
              {loading ? '⏳ שומר...' : '💾 שמור שינויים'}
            </button>
          </div>

          <div style={{
            marginTop: '1rem',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
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
              {loading ? '⏳ מבטל...' : '🔕 בטל מכשיר זה'}
            </button>
          </div>
        </div>
      )}

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
          💻 על מחשב: התראות יופיעו ישירות בדפדפן<br />
          📱 תמיכה במספר מכשירים: אפשר להפעיל התראות על המחשב, הפלאפון והטאבלט - כולם יקבלו!
        </p>
      </div>
    </div>
  );
}

export default NotificationSettings;