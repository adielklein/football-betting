import React, { useState, useEffect } from 'react';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : 'https://football-betting-backend.onrender.com/api';

function PushManagement() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [notificationForm, setNotificationForm] = useState({ title: '', body: '' });
  const [notificationImage, setNotificationImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('broadcast');

  useEffect(() => { loadStats(); loadUsers(); }, []);

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_URL}/notifications/stats`);
      if (!response.ok) throw new Error('Failed');
      setStats(await response.json());
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/users`);
      if (!response.ok) throw new Error('Failed');
      setUsers(await response.json());
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('התמונה גדולה מדי! מקסימום 10MB'); e.target.value = ''; return; }

    try {
      setLoading(true);
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await fetch(`${API_URL}/upload/notification-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 })
      });

      if (!response.ok) throw new Error('Failed to upload');
      const data = await response.json();
      if (data.success) { setNotificationImage(data.url); alert('התמונה הועלתה בהצלחה!'); }
      else throw new Error(data.message || 'Upload failed');
    } catch (error) {
      alert('שגיאה בהעלאת התמונה: ' + error.message);
      e.target.value = '';
    } finally {
      setLoading(false);
    }
  };

  const isUserSubscribed = (user) => {
    return !!(user.pushSettings?.enabled && user.pushSettings?.subscriptions &&
      Array.isArray(user.pushSettings.subscriptions) && user.pushSettings.subscriptions.length > 0);
  };

  const handleSelectAll = () => {
    const subscribed = users.filter(isUserSubscribed);
    setSelectedUsers(selectedUsers.length === subscribed.length ? [] : subscribed.map(u => u._id));
  };

  const handleUserToggle = (userId) => {
    setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const sendToAll = async () => {
    if (!notificationForm.title || !notificationForm.body) { alert('נא למלא כותרת ותוכן'); return; }
    if (!window.confirm('שלח התראה לכל המשתמשים?')) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/notifications/send-to-all`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: notificationForm.title, body: notificationForm.body, imageUrl: notificationImage || undefined, data: { type: 'admin_message' } })
      });
      if (!response.ok) throw new Error('Failed');
      const result = await response.json();
      let msg = `התראה נשלחה ל-${result.users} משתמשים`;
      if (result.usersFailed > 0) msg += `\nנכשלה ל-${result.usersFailed} משתמשים`;
      alert(msg);
      setNotificationForm({ title: '', body: '' });
      setNotificationImage(null);
      await loadStats();
    } catch (error) { alert('שגיאה בשליחת ההתראה'); } finally { setLoading(false); }
  };

  const sendToSelected = async () => {
    if (!notificationForm.title || !notificationForm.body) { alert('נא למלא כותרת ותוכן'); return; }
    if (selectedUsers.length === 0) { alert('נא לבחור לפחות משתמש אחד'); return; }
    if (!window.confirm(`שלח התראה ל-${selectedUsers.length} משתמשים?`)) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/notifications/send-to-users`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedUsers, title: notificationForm.title, body: notificationForm.body, imageUrl: notificationImage || undefined, data: { type: 'admin_message' } })
      });
      if (!response.ok) throw new Error('Failed');
      const result = await response.json();
      let msg = `התראה נשלחה ל-${result.users} משתמשים`;
      if (result.usersFailed > 0) msg += `\nנכשלה ל-${result.usersFailed} משתמשים`;
      alert(msg);
      setNotificationForm({ title: '', body: '' });
      setSelectedUsers([]);
      setNotificationImage(null);
      await loadStats();
    } catch (error) { alert('שגיאה בשליחת ההתראה'); } finally { setLoading(false); }
  };

  const sendTestToUser = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/notifications/test`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!response.ok) throw new Error('Failed');
      const result = await response.json();
      alert(`התראת בדיקה נשלחה! ${result.sent || 1} מכשירים`);
    } catch (error) { alert('שגיאה בשליחת בדיקה'); }
  };

  const getSubscribedUsers = () => users.filter(isUserSubscribed);
  const getUnsubscribedUsers = () => users.filter(u => !isUserSubscribed(u));

  const labelStyle = { display: 'block', marginBottom: '4px', fontWeight: '700', fontSize: '12px', color: '#555' };
  const inputStyle = { borderRadius: '10px', fontSize: '13px', padding: '0.5rem 0.6rem' };

  const subTabs = [
    { key: 'broadcast', label: 'לכולם', icon: '📢' },
    { key: 'selective', label: 'בררנית', icon: '🎯' },
    { key: 'stats', label: 'משתמשים', icon: '📊' }
  ];

  const notificationFormFields = (
    <>
      <div style={{ marginBottom: '0.5rem' }}>
        <label style={labelStyle}>כותרת ההתראה</label>
        <input type="text" value={notificationForm.title}
          onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
          placeholder="לדוגמה: תזכורת חשובה"
          className="input" style={{ ...inputStyle, width: '100%' }} />
      </div>
      <div style={{ marginBottom: '0.5rem' }}>
        <label style={labelStyle}>תוכן ההתראה</label>
        <textarea value={notificationForm.body}
          onChange={(e) => setNotificationForm({ ...notificationForm, body: e.target.value })}
          placeholder="לדוגמה: עוד שעה עד נעילת השבוע!"
          className="input" style={{ ...inputStyle, width: '100%', minHeight: '70px', resize: 'vertical' }} />
      </div>
      <div style={{ marginBottom: '0.6rem' }}>
        <label style={labelStyle}>תמונה (אופציונלי - אנדרואיד בלבד)</label>
        <input type="file" accept="image/*" onChange={handleImageSelect}
          className="input" style={{ ...inputStyle, width: '100%' }} />
        <div style={{ fontSize: '10px', color: '#aaa', marginTop: '2px' }}>מקסימום 10MB • אייפון לא תומך בתמונות בהתראות</div>
        {notificationImage && (
          <div style={{ marginTop: '0.4rem' }}>
            <img src={notificationImage} alt="תצוגה מקדימה" style={{
              width: '100%', maxHeight: '150px', objectFit: 'cover',
              borderRadius: '10px', border: '2px solid #86efac'
            }} />
            <button onClick={() => setNotificationImage(null)} style={{
              marginTop: '0.3rem', padding: '0.25rem 0.6rem',
              background: 'linear-gradient(135deg, #dc3545, #c62828)',
              color: 'white', border: 'none', borderRadius: '8px',
              fontSize: '11px', fontWeight: '700', cursor: 'pointer'
            }}>
              🗑️ הסר תמונה
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div>
      <h2 style={{ fontSize: '0.95rem', margin: '0 0 0.6rem 0', fontWeight: '700' }}>
        📢 ניהול התראות Push
      </h2>

      {/* Stats cards */}
      {stats && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.4rem', marginBottom: '0.75rem'
        }}>
          {[
            { value: stats.enabledUsers, label: 'מנויים', color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
            { value: stats.disabledUsers, label: 'לא מנויים', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
            { value: `${stats.percentage}%`, label: 'אחוז מנויים', color: '#2563eb', bg: '#dbeafe', border: '#93c5fd' }
          ].map(stat => (
            <div key={stat.label} style={{
              textAlign: 'center', padding: '0.6rem 0.3rem',
              borderRadius: '12px', backgroundColor: stat.bg,
              border: `1px solid ${stat.border}`,
              animation: 'slideUp 0.3s ease both'
            }}>
              <div style={{ fontSize: '22px', fontWeight: '800', color: stat.color }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '10px', color: stat.color, fontWeight: '600', marginTop: '1px' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sub-tabs */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '3px', marginBottom: '0.6rem', padding: '3px',
        backgroundColor: '#f0f2f5', borderRadius: '12px',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)'
      }}>
        {subTabs.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '0.4rem 0.1rem', border: 'none', borderRadius: '10px',
              backgroundColor: isActive ? '#fff' : 'transparent',
              color: isActive ? 'var(--theme-primary, #007bff)' : '#888',
              fontWeight: isActive ? '700' : '500', fontSize: '11px',
              cursor: 'pointer', transition: 'all 0.2s ease',
              boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px',
              WebkitAppearance: 'none', touchAction: 'manipulation'
            }}>
              <span style={{ fontSize: '14px' }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Broadcast tab */}
      {activeTab === 'broadcast' && (
        <div className="card" style={{ animation: 'scaleIn 0.2s ease' }}>
          <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.5rem 0', fontWeight: '700' }}>
            📢 שלח התראה לכולם
          </h3>
          {notificationFormFields}
          <button onClick={sendToAll}
            disabled={loading || !notificationForm.title || !notificationForm.body}
            style={{
              width: '100%', padding: '0.6rem',
              background: loading ? '#ccc' : 'linear-gradient(135deg, #28a745, #20c997)',
              color: 'white', border: 'none', borderRadius: '10px',
              fontSize: '14px', fontWeight: '700', cursor: loading ? 'wait' : 'pointer',
              boxShadow: loading ? 'none' : '0 2px 8px rgba(40,167,69,0.3)',
              WebkitAppearance: 'none', touchAction: 'manipulation'
            }}>
            {loading ? '⏳ שולח...' : '📢 שלח לכל המשתמשים'}
          </button>
        </div>
      )}

      {/* Selective tab */}
      {activeTab === 'selective' && (
        <div className="card" style={{ animation: 'scaleIn 0.2s ease' }}>
          <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.5rem 0', fontWeight: '700' }}>
            🎯 שלח התראה למשתמשים נבחרים
          </h3>
          {notificationFormFields}

          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <label style={labelStyle}>בחר משתמשים ({selectedUsers.length} נבחרו)</label>
              <button onClick={handleSelectAll} style={{
                padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700',
                background: '#f0f2f5', color: '#666', border: '1px solid #e0e0e0', cursor: 'pointer'
              }}>
                {selectedUsers.length === getSubscribedUsers().length ? 'בטל הכל' : 'בחר הכל'}
              </button>
            </div>

            <div style={{
              maxHeight: '200px', overflowY: 'auto',
              borderRadius: '10px', border: '1px solid #f0f0f0'
            }}>
              {getSubscribedUsers().length === 0 ? (
                <p style={{ textAlign: 'center', color: '#999', padding: '1rem', fontSize: '13px' }}>
                  אין משתמשים מנויים
                </p>
              ) : (
                getSubscribedUsers().map((u, i) => (
                  <div key={u._id} onClick={() => handleUserToggle(u._id)} style={{
                    display: 'flex', alignItems: 'center', padding: '0.4rem 0.5rem',
                    cursor: 'pointer',
                    backgroundColor: selectedUsers.includes(u._id) ? '#e3f2fd' : (i % 2 === 0 ? '#fafafa' : '#fff'),
                    borderBottom: '1px solid #f5f5f5',
                    transition: 'background-color 0.15s ease'
                  }}>
                    <input type="checkbox" checked={selectedUsers.includes(u._id)}
                      onChange={() => handleUserToggle(u._id)}
                      style={{ marginLeft: '0.4rem', accentColor: 'var(--theme-primary, #007bff)' }} />
                    <span style={{
                      flex: 1, fontWeight: selectedUsers.includes(u._id) ? '700' : '500',
                      fontSize: '13px', color: '#333'
                    }}>
                      {u.name}
                    </span>
                    <span style={{ fontSize: '10px', color: '#aaa' }}>@{u.username}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <button onClick={sendToSelected}
            disabled={loading || !notificationForm.title || !notificationForm.body || selectedUsers.length === 0}
            style={{
              width: '100%', padding: '0.6rem',
              background: loading ? '#ccc' : 'linear-gradient(135deg, #007bff, #0056d2)',
              color: 'white', border: 'none', borderRadius: '10px',
              fontSize: '14px', fontWeight: '700', cursor: loading ? 'wait' : 'pointer',
              boxShadow: loading ? 'none' : '0 2px 8px rgba(0,123,255,0.3)',
              WebkitAppearance: 'none', touchAction: 'manipulation'
            }}>
            {loading ? '⏳ שולח...' : `📤 שלח ל-${selectedUsers.length} משתמשים`}
          </button>
        </div>
      )}

      {/* Stats tab */}
      {activeTab === 'stats' && (
        <div style={{ animation: 'scaleIn 0.2s ease' }}>
          {/* Subscribed */}
          <div className="card" style={{ marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.4rem 0', fontWeight: '700', color: '#16a34a' }}>
              ✅ מנויים ({getSubscribedUsers().length})
            </h3>
            {getSubscribedUsers().length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999', padding: '1rem', fontSize: '13px' }}>אין משתמשים מנויים</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {getSubscribedUsers().map((u, i) => (
                  <div key={u._id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.4rem 0.5rem', borderRadius: '8px',
                    background: i % 2 === 0 ? '#fafafa' : '#fff',
                    animation: `slideUp 0.2s ease ${i * 0.03}s both`
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: '600', fontSize: '13px', color: '#333' }}>{u.name}</div>
                      <div style={{ fontSize: '10px', color: '#aaa' }}>
                        @{u.username} • {u.pushSettings?.subscriptions?.length || 0} מכשירים • {u.pushSettings?.hoursBeforeLock || 2}שע לפני נעילה
                      </div>
                    </div>
                    <button onClick={() => sendTestToUser(u._id)} style={{
                      padding: '0.25rem 0.5rem',
                      background: 'linear-gradient(135deg, #17a2b8, #138496)',
                      color: 'white', border: 'none', borderRadius: '8px',
                      fontSize: '10px', fontWeight: '700', cursor: 'pointer', flexShrink: 0
                    }}>
                      🔔 בדיקה
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unsubscribed */}
          <div className="card">
            <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.4rem 0', fontWeight: '700', color: '#dc2626' }}>
              ❌ לא מנויים ({getUnsubscribedUsers().length})
            </h3>
            {getUnsubscribedUsers().length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999', padding: '1rem', fontSize: '13px' }}>
                כל המשתמשים מנויים! 🎉
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {getUnsubscribedUsers().map((u, i) => (
                  <div key={u._id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.4rem 0.5rem', borderRadius: '8px',
                    background: i % 2 === 0 ? '#fafafa' : '#fff',
                    opacity: 0.6,
                    animation: `slideUp 0.2s ease ${i * 0.03}s both`
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>{u.name}</div>
                      <div style={{ fontSize: '10px', color: '#aaa' }}>@{u.username}</div>
                    </div>
                    <span style={{
                      padding: '2px 8px', borderRadius: '20px',
                      fontSize: '10px', fontWeight: '700',
                      backgroundColor: '#fee2e2', color: '#dc2626',
                      border: '1px solid #fca5a5'
                    }}>
                      לא מנוי
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tips */}
      <div style={{
        marginTop: '0.75rem', padding: '0.6rem 0.7rem',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #fff9c4, #fff8e1)',
        border: '1px solid #fde68a',
        fontSize: '12px', color: '#92400e'
      }}>
        <div style={{ fontWeight: '700', marginBottom: '0.3rem' }}>💡 טיפים</div>
        <ul style={{ margin: 0, paddingRight: '16px', lineHeight: 1.6 }}>
          <li>התראות נשלחות רק למנויים</li>
          <li>תמיכה במספר מכשירים למשתמש</li>
          <li>ניתן להוסיף תמונה להתראה</li>
        </ul>
      </div>
    </div>
  );
}

export default PushManagement;
