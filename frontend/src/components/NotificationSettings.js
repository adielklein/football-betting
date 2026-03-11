import React, { useState, useEffect } from 'react';

function NotificationSettings({ user }) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [hoursBeforeLock, setHoursBeforeLock] = useState(2);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const API_URL = 'https://football-betting-backend.onrender.com/api';

  const getUserId = () => {
    if (!user) return null;
    const userId = user._id || user.id;
    if (!userId) return null;
    return userId;
  };

  useEffect(() => {
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

      if (subscription && user) {
        const response = await fetch(`${API_URL}/auth/users`);
        const users = await response.json();
        const userId = getUserId();
        const currentUser = users.find(u => u._id === userId || u.id === userId);
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
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  };

  const subscribeToPush = async () => {
    setLoading(true);
    try {
      const userId = getUserId();
      if (!userId) { alert('שגיאה: לא ניתן לזהות את המשתמש'); setLoading(false); return; }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { alert('יש לאשר התראות בדפדפן'); setLoading(false); return; }

      const registration = await navigator.serviceWorker.register('/service-worker.js');
      await navigator.serviceWorker.ready;

      const response = await fetch(`${API_URL}/notifications/vapid-public-key`);
      const data = await response.json();
      if (!data.publicKey) { alert('שגיאה: חסר VAPID key'); setLoading(false); return; }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey)
      });

      const saveResponse = await fetch(`${API_URL}/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscription, hoursBeforeLock })
      });

      if (saveResponse.ok) {
        setIsSubscribed(true);
        alert('התראות הופעלו בהצלחה!');
      } else {
        throw new Error('Failed to save subscription');
      }
    } catch (error) {
      alert('שגיאה בהפעלת התראות: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setLoading(true);
    try {
      const userId = getUserId();
      if (!userId) { alert('שגיאה: לא ניתן לזהות את המשתמש'); setLoading(false); return; }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      let endpoint = null;
      if (subscription) {
        endpoint = subscription.endpoint;
        await subscription.unsubscribe();
      }

      const response = await fetch(`${API_URL}/notifications/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, endpoint })
      });

      if (response.ok) {
        const result = await response.json();
        setIsSubscribed(false);
        if (result.devicesRemaining > 0) {
          alert(`המכשיר הוסר! עוד ${result.devicesRemaining} מכשירים רשומים.`);
        } else {
          alert('התראות בוטלו בהצלחה!');
        }
      } else {
        throw new Error('Failed to unsubscribe');
      }
    } catch (error) {
      alert('שגיאה בביטול התראות: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async () => {
    try {
      const userId = getUserId();
      if (!userId) { alert('שגיאה: לא ניתן לזהות את המשתמש'); return; }

      const response = await fetch(`${API_URL}/notifications/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, hoursBeforeLock, soundEnabled: true })
      });

      if (response.ok) alert('הגדרות עודכנו בהצלחה!');
      else throw new Error('Failed to update');
    } catch (error) {
      alert('שגיאה בעדכון הגדרות: ' + error.message);
    }
  };

  const sendTestNotification = async () => {
    try {
      const userId = getUserId();
      if (!userId) { alert('שגיאה: לא ניתן לזהות את המשתמש'); return; }

      const response = await fetch(`${API_URL}/notifications/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.sent > 1 ? `התראת בדיקה נשלחה ל-${result.sent} מכשירים!` : 'התראת בדיקה נשלחה!');
      } else {
        alert('שגיאה בשליחת בדיקה');
      }
    } catch (error) {
      alert('שגיאה: ' + error.message);
    }
  };

  if (!isSupported) return null;

  return (
    <div style={{
      marginBottom: '0.6rem',
      borderRadius: '14px',
      overflow: 'hidden',
      border: '1px solid rgba(0,0,0,0.05)',
      background: 'var(--theme-background)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)'
    }}>
      {/* Header - always visible */}
      <div
        onClick={() => setShowSettings(!showSettings)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.6rem 0.85rem',
          cursor: 'pointer',
          transition: 'background-color 0.2s ease',
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '16px' }}>🔔</span>
          <span style={{ fontWeight: '600', fontSize: '13px', color: '#333' }}>התראות תזכורת</span>
          {isSubscribed && (
            <span style={{
              padding: '1px 8px', borderRadius: '20px',
              fontSize: '10px', fontWeight: '700',
              background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
              color: '#16a34a', border: '1px solid #86efac'
            }}>
              פעיל
            </span>
          )}
        </div>
        <span style={{
          fontSize: '12px', color: '#aaa',
          transition: 'transform 0.3s ease',
          transform: showSettings ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'inline-block'
        }}>
          ▼
        </span>
      </div>

      {/* Expandable settings */}
      {showSettings && (
        <div style={{
          padding: '0 0.85rem 0.75rem',
          animation: 'slideUp 0.25s ease'
        }}>
          <div style={{
            padding: '0.6rem',
            backgroundColor: '#f8f9fc',
            borderRadius: '10px',
            marginBottom: '0.5rem'
          }}>
            <p style={{ fontSize: '12px', color: '#888', marginBottom: '0.5rem' }}>
              קבל התראה לנייד לפני שההימורים נסגרים
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', flexShrink: 0 }}>
                התראה לפני:
              </label>
              <select
                value={hoursBeforeLock}
                onChange={(e) => setHoursBeforeLock(Number(e.target.value))}
                className="input"
                style={{
                  flex: 1, fontSize: '13px', padding: '0.35rem 0.5rem',
                  borderRadius: '8px', maxWidth: '140px'
                }}
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
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button onClick={updateSettings} disabled={loading} style={{
                  flex: 1, padding: '0.35rem',
                  background: 'linear-gradient(135deg, #28a745, #20c997)',
                  color: 'white', border: 'none', borderRadius: '8px',
                  fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                }}>
                  💾 שמור
                </button>
                <button onClick={sendTestNotification} disabled={loading} style={{
                  flex: 1, padding: '0.35rem',
                  background: 'linear-gradient(135deg, #17a2b8, #138496)',
                  color: 'white', border: 'none', borderRadius: '8px',
                  fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                }}>
                  📢 בדיקה
                </button>
              </div>
            )}
          </div>

          {/* Subscribe/Unsubscribe */}
          <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center', alignItems: 'center' }}>
            {!isSubscribed ? (
              <button onClick={subscribeToPush} disabled={loading} style={{
                flex: 1, padding: '0.5rem',
                background: loading ? '#ccc' : 'linear-gradient(135deg, var(--theme-primary, #007bff), var(--theme-secondary, #6c757d))',
                color: 'white', border: 'none', borderRadius: '10px',
                fontSize: '14px', fontWeight: '700', cursor: loading ? 'wait' : 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                {loading ? '⏳ מפעיל...' : '🔔 הפעל התראות'}
              </button>
            ) : (
              <>
                <span style={{
                  flex: 1, textAlign: 'center',
                  padding: '0.4rem',
                  background: 'linear-gradient(135deg, #dcfce7, #d1fae5)',
                  color: '#166534', borderRadius: '10px',
                  fontSize: '12px', fontWeight: '700',
                  border: '1px solid #86efac'
                }}>
                  ✅ פעיל
                </span>
                <button onClick={unsubscribeFromPush} disabled={loading} style={{
                  padding: '0.4rem 0.7rem',
                  background: 'linear-gradient(135deg, #dc3545, #c62828)',
                  color: 'white', border: 'none', borderRadius: '10px',
                  fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                }}>
                  {loading ? '⏳' : '📕 בטל'}
                </button>
              </>
            )}
          </div>

          {/* Tips */}
          <div style={{
            marginTop: '0.5rem', padding: '0.5rem',
            background: 'linear-gradient(135deg, #dbeafe, #e0e7ff)',
            borderRadius: '8px', fontSize: '11px', color: '#3730a3',
            lineHeight: 1.5
          }}>
            <strong>💡 התקנה:</strong> פתח ב-Chrome/Safari → תפריט → "הוסף למסך הבית"
            <br />
            <span style={{ fontSize: '10px', color: '#6366a1' }}>
              📱 תמיכה במספר מכשירים - כולם יקבלו התראות!
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationSettings;
