import React, { useState, useEffect } from 'react';
import { toast } from '../services/toast';

// שם המכשיר נשמר בדפדפן ולא רק בשרת: כל מכשיר זוכר את שמו ושולח אותו
// מחדש בכל סנכרון, ולכן אין צורך בנתיב נפרד לעדכון. מזהה מכשיר אמיתי אין
// בדפדפן - באייפון אפל לא מדווחת אפילו את הדגם - ולכן זו הדרך היחידה
// שמסך הניהול יוכל לומר "האייפון של אדיאל" ולא רק "אייפון".
const DEVICE_NAME_KEY = 'football_betting_device_name';

const readDeviceName = () => {
  try { return localStorage.getItem(DEVICE_NAME_KEY) || ''; } catch (e) { return ''; }
};

const writeDeviceName = (name) => {
  try {
    if (name) localStorage.setItem(DEVICE_NAME_KEY, name);
    else localStorage.removeItem(DEVICE_NAME_KEY);
  } catch (e) { /* מצב פרטי - השם פשוט לא יישמר */ }
};

// גיאומטריית המסך. בשרת אין אליה גישה, והיא הקירוב היחיד לדגם אייפון
const screenInfo = () => {
  try {
    return {
      width: window.screen?.width || null,
      height: window.screen?.height || null,
      dpr: window.devicePixelRatio || 1
    };
  } catch (e) {
    return null;
  }
};

// שורת מתג אחת. הופקה מהמתג שהיה כאן inline, כדי שכל ההתראות ייראו אותו
// דבר במקום שכל אחת תצייר מתג משלה
function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '0.5rem', padding: '0.4rem 0', cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent'
      }}
    >
      <div style={{ minWidth: 0 }}>
        <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-2, #555)', cursor: 'pointer' }}>
          {label}
        </label>
        {hint && (
          <div style={{ fontSize: '10px', color: 'var(--text-4, #aaa)', marginTop: '1px' }}>{hint}</div>
        )}
      </div>
      <div style={{
        width: '40px', height: '22px', borderRadius: '11px',
        background: checked ? 'linear-gradient(135deg, #28a745, #20c997)' : '#ccc',
        position: 'relative', transition: 'background 0.3s ease',
        flexShrink: 0
      }}>
        <div style={{
          width: '18px', height: '18px', borderRadius: '50%',
          background: 'var(--surface, #fff)', position: 'absolute', top: '2px',
          left: checked ? '20px' : '2px',
          transition: 'left 0.3s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }} />
      </div>
    </div>
  );
}

// התראות אירועים במשחק חי. כולן כבויות כברירת מחדל - נדלקות רק בבחירה
const MATCH_EVENT_ALERTS = [
  { key: 'goalAlerts', label: '⚽ שערים', hint: 'התראה על כל שער במשחקי השבוע' },
  { key: 'redCardAlerts', label: '🟥 כרטיסים אדומים', hint: 'התראה על הרחקה' },
  { key: 'matchStartAlerts', label: '🏁 תחילת משחק', hint: 'שריקת פתיחה' },
  { key: 'matchEndAlerts', label: '🔚 סיום משחק', hint: 'שריקת סיום והתוצאה' }
];

function NotificationSettings({ user, embedded = false }) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [hoursBeforeLock, setHoursBeforeLock] = useState(2);
  const [exactScoreAlerts, setExactScoreAlerts] = useState(true);
  // ברירת המחדל כאן זהה לזו שבמסד: כבוי. כך משתמש שטרם בחר לא רואה מתג
  // דלוק שמבטיח התראות שלא יגיעו
  const [eventAlerts, setEventAlerts] = useState({
    goalAlerts: false, redCardAlerts: false, matchStartAlerts: false, matchEndAlerts: false
  });
  const [deviceName, setDeviceName] = useState(readDeviceName);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(embedded);

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
      let subscription = await registration.pushManager.getSubscription();

      // הדפדפן יכול לבטל מנוי בלי להודיע. אם ההרשאה כבר ניתנה, נרשמים מחדש
      // בשקט במקום להשאיר את המשתמש בלי התראות בלי שידע.
      if (!subscription && Notification.permission === 'granted') {
        try {
          const keyRes = await fetch(`${API_URL}/notifications/vapid-public-key`);
          const keyData = await keyRes.json();
          if (keyData.publicKey) {
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(keyData.publicKey)
            });
          }
        } catch (resubError) {
          console.warn('Silent re-subscribe failed:', resubError);
        }
      }

      setIsSubscribed(!!subscription);

      // תמיד מסנכרנים לשרת. המנוי בדפדפן מתחלף מדי פעם, והשרת נשאר עם
      // endpoint ישן שנכשל ב-410 בשקט - וכך כל ההתראות מפסיקות להגיע.
      const userIdForSync = getUserId();
      if (subscription && userIdForSync) {
        fetch(`${API_URL}/notifications/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userIdForSync, subscription, hoursBeforeLock, silent: true, screen: screenInfo(), deviceName: readDeviceName() })
        }).catch((syncError) => console.warn('Subscription sync failed:', syncError));
      }

      if (subscription && user) {
        const response = await fetch(`${API_URL}/auth/users`);
        const users = await response.json();
        const userId = getUserId();
        const currentUser = users.find(u => u._id === userId || u.id === userId);
        if (currentUser?.pushSettings?.hoursBeforeLock) {
          setHoursBeforeLock(currentUser.pushSettings.hoursBeforeLock);
        }
        if (currentUser?.pushSettings?.exactScoreAlerts === false) {
          setExactScoreAlerts(false);
        }
        if (currentUser?.pushSettings) {
          const saved = currentUser.pushSettings;
          setEventAlerts({
            goalAlerts: !!saved.goalAlerts,
            redCardAlerts: !!saved.redCardAlerts,
            matchStartAlerts: !!saved.matchStartAlerts,
            matchEndAlerts: !!saved.matchEndAlerts
          });
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
      if (!userId) { toast.error('שגיאה: לא ניתן לזהות את המשתמש'); setLoading(false); return; }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { toast.warning('יש לאשר התראות בדפדפן'); setLoading(false); return; }

      const registration = await navigator.serviceWorker.register('/service-worker.js');
      await navigator.serviceWorker.ready;

      const response = await fetch(`${API_URL}/notifications/vapid-public-key`);
      const data = await response.json();
      if (!data.publicKey) { toast.error('שגיאה: חסר VAPID key'); setLoading(false); return; }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey)
      });

      const saveResponse = await fetch(`${API_URL}/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscription, hoursBeforeLock, screen: screenInfo(), deviceName: readDeviceName() })
      });

      if (saveResponse.ok) {
        setIsSubscribed(true);
        toast.success('התראות הופעלו בהצלחה!');
      } else {
        throw new Error('Failed to save subscription');
      }
    } catch (error) {
      toast.error('שגיאה בהפעלת התראות: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setLoading(true);
    try {
      const userId = getUserId();
      if (!userId) { toast.error('שגיאה: לא ניתן לזהות את המשתמש'); setLoading(false); return; }

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
          toast.success(`המכשיר הוסר! עוד ${result.devicesRemaining} מכשירים רשומים.`);
        } else {
          toast.success('התראות בוטלו בהצלחה!');
        }
      } else {
        throw new Error('Failed to unsubscribe');
      }
    } catch (error) {
      toast.error('שגיאה בביטול התראות: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async () => {
    try {
      const userId = getUserId();
      if (!userId) { toast.error('שגיאה: לא ניתן לזהות את המשתמש'); return; }

      // השם נשמר על רשומת המכשיר ולא על המשתמש, ולכן הוא נשלח דרך
      // /subscribe - שם יושב המנוי של המכשיר הזה
      writeDeviceName(deviceName.trim());
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await fetch(`${API_URL}/notifications/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId, subscription, hoursBeforeLock, silent: true,
              screen: screenInfo(), deviceName: deviceName.trim()
            })
          });
        }
      } catch (nameError) {
        console.warn('Device name sync failed:', nameError);
      }

      const response = await fetch(`${API_URL}/notifications/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, hoursBeforeLock, soundEnabled: true, exactScoreAlerts, ...eventAlerts })
      });

      if (response.ok) toast.success('הגדרות עודכנו בהצלחה!');
      else throw new Error('Failed to update');
    } catch (error) {
      toast.error('שגיאה בעדכון הגדרות: ' + error.message);
    }
  };

  const sendTestNotification = async () => {
    try {
      const userId = getUserId();
      if (!userId) { toast.error('שגיאה: לא ניתן לזהות את המשתמש'); return; }

      const response = await fetch(`${API_URL}/notifications/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.sent > 1 ? `התראת בדיקה נשלחה ל-${result.sent} מכשירים!` : 'התראת בדיקה נשלחה!');
      } else {
        toast.error('שגיאה בשליחת בדיקה');
      }
    } catch (error) {
      toast.error('שגיאה: ' + error.message);
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
      {/* Header - מוסתר כשהרכיב יושב בתוך דף ההגדרות, שיש לו כותרת משלו */}
      {!embedded && (
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
          <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text, #333)' }}>התראות תזכורת</span>
          {isSubscribed && (
            <span style={{
              padding: '1px 8px', borderRadius: '20px',
              fontSize: '10px', fontWeight: '700',
              background: 'var(--good-bg, #dcfce7)',
              color: 'var(--good-fg, #16a34a)', border: '1px solid #86efac'
            }}>
              פעיל
            </span>
          )}
        </div>
        <span style={{
          fontSize: '12px', color: 'var(--text-4, #aaa)',
          transition: 'transform 0.3s ease',
          transform: showSettings ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'inline-block'
        }}>
          ▼
        </span>
      </div>
      )}

      {/* Expandable settings */}
      {showSettings && (
        <div style={{
          padding: '0 0.85rem 0.75rem',
          animation: 'slideUp 0.25s ease'
        }}>
          <div style={{
            padding: '0.6rem',
            backgroundColor: 'var(--surface-2, #f8f9fc)',
            borderRadius: '10px',
            marginBottom: '0.5rem'
          }}>
            <p style={{ fontSize: '12px', color: 'var(--text-3, #888)', marginBottom: '0.5rem' }}>
              קבל התראה לנייד לפני שההימורים נסגרים
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-2, #555)', flexShrink: 0 }}>
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
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-2, #555)', display: 'block', marginBottom: '3px' }}>
                  שם המכשיר הזה
                </label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value.slice(0, 40))}
                  placeholder="למשל: אייפון 15 שלי"
                  className="input"
                  style={{ width: '100%', fontSize: '13px', padding: '0.35rem 0.5rem', borderRadius: '8px' }}
                />
                <div style={{ fontSize: '10px', color: 'var(--text-4, #aaa)', marginTop: '2px' }}>
                  עוזר לזהות איזה מכשיר זה במסך הניהול. נשמר על המכשיר הזה בלבד.
                </div>
              </div>
            )}

            <ToggleRow
              label="🎯 התראה על ניחוש מדויק"
              checked={exactScoreAlerts}
              onChange={setExactScoreAlerts}
            />

            <div style={{
              marginTop: '0.5rem', paddingTop: '0.5rem',
              borderTop: '1px solid var(--border, #eee)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-3, #888)', marginBottom: '0.2rem' }}>
                אירועים במשחק חי
              </div>
              {MATCH_EVENT_ALERTS.map(({ key, label, hint }) => (
                <ToggleRow
                  key={key}
                  label={label}
                  hint={hint}
                  checked={eventAlerts[key]}
                  onChange={(value) => setEventAlerts((prev) => ({ ...prev, [key]: value }))}
                />
              ))}
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
                  background: 'var(--good-bg, #dcfce7)',
                  color: 'var(--good-fg, #166534)', borderRadius: '10px',
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
            <span style={{ fontSize: '10px', color: 'var(--info-fg, #6366a1)' }}>
              📱 תמיכה במספר מכשירים - כולם יקבלו התראות!
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationSettings;
