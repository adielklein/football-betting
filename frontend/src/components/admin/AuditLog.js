import React, { useState, useEffect } from 'react';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : 'https://football-betting-backend.onrender.com/api';

function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pushStatus, setPushStatus] = useState('checking'); // checking, off, on, unsupported

  const loadLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/audit?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error('Error loading audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 15000);
    return () => clearInterval(interval);
  }, []);

  // בדוק סטטוס push
  useEffect(() => {
    (async () => {
      try {
        if (!('serviceWorker' in navigator) || !('Notification' in window)) {
          setPushStatus('unsupported');
          return;
        }
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.pushManager) {
          const sub = await reg.pushManager.getSubscription();
          setPushStatus(sub ? 'on' : 'off');
        } else {
          setPushStatus('off');
        }
      } catch (e) {
        setPushStatus('off');
      }
    })();
  }, []);

  const enablePush = async () => {
    try {
      setPushStatus('checking');

      // בקש הרשאה
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('צריך לאשר התראות בהגדרות הדפדפן');
        setPushStatus('off');
        return;
      }

      // רשום SW אם צריך
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js');
        // חכה שירשם
        await new Promise(resolve => setTimeout(resolve, 1000));
        reg = await navigator.serviceWorker.ready;
      }

      // קבל VAPID key
      const keyRes = await fetch(`${API_URL}/notifications/vapid-public-key`);
      const { publicKey } = await keyRes.json();

      // Subscribe
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey
      });

      // שמור בשרת
      const savedUser = localStorage.getItem('football_betting_user');
      const userId = savedUser ? JSON.parse(savedUser).id : null;

      if (!userId) {
        alert('שגיאה: לא נמצא משתמש מחובר');
        setPushStatus('off');
        return;
      }

      const saveRes = await fetch(`${API_URL}/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscription: sub, hoursBeforeLock: 2 })
      });

      if (saveRes.ok) {
        setPushStatus('on');
        alert('התראות הופעלו בהצלחה! תקבל עדכון כשאדמין אחר יבצע פעולה.');
      } else {
        setPushStatus('off');
        alert('שגיאה בשמירת ההתראות');
      }
    } catch (e) {
      console.error('Push error:', e);
      setPushStatus('off');
      alert('שגיאה: ' + e.message);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString('he-IL', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>טוען...</div>;
  }

  return (
    <div>
      {/* Push notification status */}
      <div style={{
        backgroundColor: pushStatus === 'on' ? '#e8f5e9' : '#fff3e0',
        border: `1px solid ${pushStatus === 'on' ? '#c8e6c9' : '#ffe0b2'}`,
        borderRadius: '12px',
        padding: '0.7rem 1rem',
        marginBottom: '0.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#333' }}>
            {pushStatus === 'on' ? '🟢 התראות פעילות' : pushStatus === 'unsupported' ? '⚠️ הדפדפן לא תומך בהתראות' : '🔴 התראות כבויות'}
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
            {pushStatus === 'on' ? 'תקבל push כשאדמין אחר יבצע פעולה' : pushStatus === 'unsupported' ? 'השתמש בטאב המעקב לצפייה בפעולות' : 'הפעל כדי לקבל עדכונים מיידיים'}
          </div>
        </div>
        {pushStatus === 'off' && (
          <button onClick={enablePush} style={{
            padding: '0.4rem 0.8rem',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            flexShrink: 0
          }}>
            הפעל התראות
          </button>
        )}
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '0.75rem'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>מעקב פעולות אדמין</h3>
        <button onClick={loadLogs} style={{
          padding: '0.3rem 0.6rem', border: 'none', borderRadius: '8px',
          backgroundColor: '#f0f2f5', fontSize: '12px', cursor: 'pointer'
        }}>רענן</button>
      </div>

      {logs.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '2rem', color: '#888',
          backgroundColor: '#f9f9f9', borderRadius: '12px'
        }}>
          אין פעולות מתועדות
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {logs.map(log => (
            <div key={log._id} style={{
              backgroundColor: '#fff',
              border: '1px solid #e8e8e8',
              borderRadius: '10px',
              padding: '0.6rem 0.8rem',
              borderRight: log.adminName !== 'עדיאל קליין' ? '3px solid #ff3b30' : '3px solid #ccc'
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '4px'
              }}>
                <span style={{
                  fontWeight: '700', fontSize: '13px',
                  color: log.adminName !== 'עדיאל קליין' ? '#ff3b30' : '#333'
                }}>
                  {log.adminName}
                </span>
                <span style={{ fontSize: '11px', color: '#999' }}>
                  {formatDate(log.createdAt)}
                </span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>
                {log.action}
              </div>
              {log.details && (
                <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                  {log.details}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AuditLog;
