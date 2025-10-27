import React, { useState, useEffect } from 'react';

const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000/api'
  : 'https://football-betting-backend.onrender.com/api';

function PushManagement() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    body: '',
    sendToAll: true
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('broadcast'); // broadcast, selective, stats

  useEffect(() => {
    loadStats();
    loadUsers();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_URL}/notifications/stats`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
      alert('שגיאה בטעינת סטטיסטיקות');
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/users`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('שגיאה בטעינת משתמשים');
    }
  };

  const handleSelectAll = () => {
    // 🔧 FIX: בדיקה גם של enabled וגם של subscription
    if (selectedUsers.length === users.filter(u => u.pushSettings?.enabled && u.pushSettings?.subscription).length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.filter(u => u.pushSettings?.enabled && u.pushSettings?.subscription).map(u => u._id));
    }
  };

  const handleUserToggle = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const sendNotification = async () => {
    if (!notificationForm.title || !notificationForm.body) {
      alert('נא למלא כותרת ותוכן ההתראה');
      return;
    }

    if (!notificationForm.sendToAll && selectedUsers.length === 0) {
      alert('נא לבחור לפחות משתמש אחד');
      return;
    }

    if (!window.confirm(`האם לשלוח התראה ל-${notificationForm.sendToAll ? 'כל המשתמשים' : `${selectedUsers.length} משתמשים`}?`)) {
      return;
    }

    setLoading(true);

    try {
      const endpoint = notificationForm.sendToAll 
        ? `${API_URL}/notifications/send-to-all`
        : `${API_URL}/notifications/send-to-users`;

      const body = notificationForm.sendToAll
        ? {
            title: notificationForm.title,
            body: notificationForm.body,
            data: { type: 'admin_message' }
          }
        : {
            userIds: selectedUsers,
            title: notificationForm.title,
            body: notificationForm.body,
            data: { type: 'admin_message' }
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error('Failed to send notification');

      const result = await response.json();
      
      alert(`✅ התראה נשלחה בהצלחה!\nנשלח ל-${result.sent} משתמשים\n${result.failed > 0 ? `נכשל: ${result.failed}` : ''}`);

      // אפס את הטופס
      setNotificationForm({
        title: '',
        body: '',
        sendToAll: true
      });
      setSelectedUsers([]);

      await loadStats();
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('שגיאה בשליחת ההתראה');
    } finally {
      setLoading(false);
    }
  };

  const sendTestToUser = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/notifications/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) throw new Error('Failed to send test');

      alert('✅ התראת בדיקה נשלחה!');
    } catch (error) {
      console.error('Error sending test:', error);
      alert('שגיאה בשליחת התראת בדיקה');
    }
  };

  // 🔧 FIX: בדיקה גם של enabled וגם של subscription!
  // לפני: const getSubscribedUsers = () => users.filter(u => u.pushSettings?.enabled);
  // אחרי: בודק גם enabled וגם subscription
  const getSubscribedUsers = () => users.filter(u => 
    u.pushSettings?.enabled && u.pushSettings?.subscription
  );
  
  // 🔧 FIX: בדיקה גם של enabled וגם של subscription!
  // לפני: const getUnsubscribedUsers = () => users.filter(u => !u.pushSettings?.enabled);
  // אחרי: בודק שחסר enabled או subscription
  const getUnsubscribedUsers = () => users.filter(u => 
    !u.pushSettings?.enabled || !u.pushSettings?.subscription
  );

  return (
    <div style={{ padding: '1rem' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>📢 ניהול התראות Push</h2>

      {/* סטטיסטיקות */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#28a745' }}>
              {stats.enabledUsers}
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '0.5rem' }}>
              משתמשים מנויים
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#dc3545' }}>
              {stats.disabledUsers}
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '0.5rem' }}>
              משתמשים לא מנויים
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#007bff' }}>
              {stats.percentage}%
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '0.5rem' }}>
              אחוז מנויים
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        borderBottom: '2px solid #e0e0e0',
        marginBottom: '1rem'
      }}>
        <button
          onClick={() => setActiveTab('broadcast')}
          className="btn"
          style={{
            backgroundColor: activeTab === 'broadcast' ? '#007bff' : 'transparent',
            color: activeTab === 'broadcast' ? 'white' : '#666',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            padding: '0.75rem 1.5rem'
          }}
        >
          📢 שליחה לכולם
        </button>
        <button
          onClick={() => setActiveTab('selective')}
          className="btn"
          style={{
            backgroundColor: activeTab === 'selective' ? '#007bff' : 'transparent',
            color: activeTab === 'selective' ? 'white' : '#666',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            padding: '0.75rem 1.5rem'
          }}
        >
          👥 שליחה בררנית
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className="btn"
          style={{
            backgroundColor: activeTab === 'stats' ? '#007bff' : 'transparent',
            color: activeTab === 'stats' ? 'white' : '#666',
            border: 'none',
            borderRadius: '4px 4px 0 0',
            padding: '0.75rem 1.5rem'
          }}
        >
          📊 רשימת משתמשים
        </button>
      </div>

      {/* שליחה לכולם */}
      {activeTab === 'broadcast' && (
        <div className="card">
          <h3>📢 שלח התראה לכל המשתמשים</h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              כותרת ההתראה:
            </label>
            <input
              type="text"
              value={notificationForm.title}
              onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
              placeholder="לדוגמה: שבוע חדש נפתח!"
              className="input"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              תוכן ההתראה:
            </label>
            <textarea
              value={notificationForm.body}
              onChange={(e) => setNotificationForm({ ...notificationForm, body: e.target.value })}
              placeholder="לדוגמה: שבוע 10 נפתח! היכנסו להמר עד יום שישי בשעה 20:00"
              className="input"
              style={{ width: '100%', minHeight: '100px', resize: 'vertical' }}
            />
          </div>

          <button
            onClick={() => {
              setNotificationForm({ ...notificationForm, sendToAll: true });
              sendNotification();
            }}
            className="btn btn-primary"
            disabled={loading || !notificationForm.title || !notificationForm.body}
            style={{ width: '100%', padding: '0.75rem', fontSize: '16px', fontWeight: 'bold' }}
          >
            {loading ? '⏳ שולח...' : '📢 שלח לכל המשתמשים'}
          </button>
        </div>
      )}

      {/* שליחה בררנית */}
      {activeTab === 'selective' && (
        <div className="card">
          <h3>👥 שלח התראה למשתמשים נבחרים</h3>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              כותרת ההתראה:
            </label>
            <input
              type="text"
              value={notificationForm.title}
              onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
              placeholder="לדוגמה: תזכורת אישית"
              className="input"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              תוכן ההתראה:
            </label>
            <textarea
              value={notificationForm.body}
              onChange={(e) => setNotificationForm({ ...notificationForm, body: e.target.value })}
              placeholder="לדוגמה: עוד שעה עד נעילת השבוע!"
              className="input"
              style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}>
              <label style={{ fontWeight: 'bold' }}>
                בחר משתמשים ({selectedUsers.length} נבחרו):
              </label>
              <button
                onClick={handleSelectAll}
                className="btn"
                style={{ fontSize: '12px', padding: '4px 12px' }}
              >
                {selectedUsers.length === getSubscribedUsers().length ? 'בטל הכל' : 'בחר הכל'}
              </button>
            </div>

            <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto',
              border: '1px solid #ddd',
              borderRadius: '4px',
              padding: '0.5rem'
            }}>
              {getSubscribedUsers().length === 0 ? (
                <p style={{ textAlign: 'center', color: '#999', padding: '1rem' }}>
                  אין משתמשים מנויים להתראות
                </p>
              ) : (
                getSubscribedUsers().map(user => (
                  <div
                    key={user._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.5rem',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer',
                      backgroundColor: selectedUsers.includes(user._id) ? '#e3f2fd' : 'transparent'
                    }}
                    onClick={() => handleUserToggle(user._id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user._id)}
                      onChange={() => handleUserToggle(user._id)}
                      style={{ marginLeft: '0.5rem' }}
                    />
                    <span style={{ flex: 1, fontWeight: selectedUsers.includes(user._id) ? 'bold' : 'normal' }}>
                      {user.name}
                    </span>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      ({user.username})
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => {
              setNotificationForm({ ...notificationForm, sendToAll: false });
              sendNotification();
            }}
            className="btn btn-success"
            disabled={loading || !notificationForm.title || !notificationForm.body || selectedUsers.length === 0}
            style={{ width: '100%', padding: '0.75rem', fontSize: '16px', fontWeight: 'bold' }}
          >
            {loading ? '⏳ שולח...' : `📤 שלח ל-${selectedUsers.length} משתמשים`}
          </button>
        </div>
      )}

      {/* רשימת משתמשים */}
      {activeTab === 'stats' && (
        <div>
          {/* משתמשים מנויים */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ color: '#28a745' }}>✅ משתמשים מנויים ({getSubscribedUsers().length})</h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {getSubscribedUsers().length === 0 ? (
                <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
                  אין משתמשים מנויים
                </p>
              ) : (
                getSubscribedUsers().map(user => (
                  <div
                    key={user._id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      borderBottom: '1px solid #f0f0f0'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{user.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        @{user.username} • {user.pushSettings?.hoursBeforeLock || 2} שעות לפני נעילה
                      </div>
                    </div>
                    <button
                      onClick={() => sendTestToUser(user._id)}
                      className="btn"
                      style={{
                        fontSize: '12px',
                        padding: '4px 12px',
                        backgroundColor: '#17a2b8',
                        color: 'white'
                      }}
                    >
                      🔔 בדיקה
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* משתמשים לא מנויים */}
          <div className="card">
            <h3 style={{ color: '#dc3545' }}>❌ משתמשים לא מנויים ({getUnsubscribedUsers().length})</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {getUnsubscribedUsers().length === 0 ? (
                <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
                  כל המשתמשים מנויים! 🎉
                </p>
              ) : (
                getUnsubscribedUsers().map(user => (
                  <div
                    key={user._id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      borderBottom: '1px solid #f0f0f0',
                      opacity: 0.6
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{user.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        @{user.username}
                      </div>
                    </div>
                    <span style={{ 
                      fontSize: '12px',
                      padding: '4px 8px',
                      backgroundColor: '#f8d7da',
                      color: '#721c24',
                      borderRadius: '4px'
                    }}>
                      לא מנוי
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* הערות שימושיות */}
      <div className="card" style={{ marginTop: '1.5rem', backgroundColor: '#fff3cd', border: '1px solid #ffc107' }}>
        <h4 style={{ marginBottom: '0.5rem' }}>💡 טיפים לשימוש</h4>
        <ul style={{ margin: 0, paddingRight: '20px', fontSize: '14px' }}>
          <li>התראות יישלחו רק למשתמשים שהפעילו התראות בהגדרות שלהם</li>
          <li>אפשר לשלוח התראות בכל עת, ללא תלות בסטטוס השבוע</li>
          <li>השתמש בשליחה בררנית כדי להזכיר למשתמשים ספציפיים שלא הימרו</li>
          <li>התראות מופיעות גם כשהאפליקציה סגורה (אם המשתמש התקין את ה-PWA)</li>
        </ul>
      </div>
    </div>
  );
}

export default PushManagement;