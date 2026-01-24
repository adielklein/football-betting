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
    body: ''
  });
  const [notificationImage, setNotificationImage] = useState(null); // ✅ הוספה: תמונה
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

  // ✅ פונקציה להעלאת תמונה דרך ImgBB
  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log('📁 File selected:', file.name, file.size);

    // בדיקת גודל (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('התמונה גדולה מדי! מקסימום 5MB');
      e.target.value = '';
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Starting upload...');

      // המרה ל-Base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          console.log('✅ Base64 conversion complete');
          resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      console.log('📤 Uploading to server...');

      // שליחה לשרת (שמעלה ל-ImgBB)
      const response = await fetch(`${API_URL}/upload/notification-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 })
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error:', errorText);
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      console.log('✅ Upload response:', data);

      if (data.success) {
        console.log('🖼️ Setting image URL:', data.url);
        setNotificationImage(data.url); // ✅ שמור את ה-URL מ-ImgBB
        alert('✅ התמונה הועלתה בהצלחה!');
      } else {
        throw new Error(data.message || 'Upload failed');
      }

    } catch (error) {
      console.error('❌ Error uploading image:', error);
      alert('שגיאה בהעלאת התמונה: ' + error.message);
      e.target.value = '';
    } finally {
      setLoading(false);
      console.log('✔️ Upload process complete');
    }
  };

  // 🔧 FIX: בדיקה מדויקת של subscriptions - מערך ולא אובייקט!
  const isUserSubscribed = (user) => {
    return !!(
      user.pushSettings?.enabled && 
      user.pushSettings?.subscriptions &&  // ✅ subscriptions (מערך)
      Array.isArray(user.pushSettings.subscriptions) &&
      user.pushSettings.subscriptions.length > 0
    );
  };

  const handleSelectAll = () => {
    const subscribedUsers = users.filter(isUserSubscribed);
    if (selectedUsers.length === subscribedUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(subscribedUsers.map(u => u._id));
    }
  };

  const handleUserToggle = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // 🔧 FIX: שליחה לכולם - עם תמונה
  const sendToAll = async () => {
    if (!notificationForm.title || !notificationForm.body) {
      alert('נא למלא כותרת ותוכן ההתראה');
      return;
    }

    if (!window.confirm('האם לשלוח התראה לכל המשתמשים?')) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/notifications/send-to-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: notificationForm.title,
          body: notificationForm.body,
          imageUrl: notificationImage || undefined, // ✅ הוספה: תמונה
          data: { type: 'admin_message' }
        })
      });

      if (!response.ok) throw new Error('Failed to send notification');

      const result = await response.json();
      
      alert(`✅ התראה נשלחה בהצלחה!\nנשלח ל-${result.sent} מכשירים\n${result.users} משתמשים\n${result.failed > 0 ? `נכשל: ${result.failed}` : ''}`);

      // אפס את הטופס
      setNotificationForm({
        title: '',
        body: ''
      });
      setNotificationImage(null); // ✅ הוספה: איפוס תמונה

      await loadStats();
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('שגיאה בשליחת ההתראה');
    } finally {
      setLoading(false);
    }
  };

  // 🔧 FIX: שליחה סלקטיבית - עם תמונה
  const sendToSelected = async () => {
    if (!notificationForm.title || !notificationForm.body) {
      alert('נא למלא כותרת ותוכן ההתראה');
      return;
    }

    if (selectedUsers.length === 0) {
      alert('נא לבחור לפחות משתמש אחד');
      return;
    }

    // 🔧 FIX: בדיקה נכונה - שואל לפי מספר המשתמשים הנבחרים!
    if (!window.confirm(`האם לשלוח התראה ל-${selectedUsers.length} משתמשים נבחרים?`)) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/notifications/send-to-users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUsers,
          title: notificationForm.title,
          body: notificationForm.body,
          imageUrl: notificationImage || undefined, // ✅ הוספה: תמונה
          data: { type: 'admin_message' }
        })
      });

      if (!response.ok) throw new Error('Failed to send notification');

      const result = await response.json();
      
      alert(`✅ התראה נשלחה בהצלחה!\nנשלח ל-${result.sent} מכשירים\n${result.users} משתמשים\n${result.failed > 0 ? `נכשל: ${result.failed}` : ''}`);

      // אפס את הטופס
      setNotificationForm({
        title: '',
        body: ''
      });
      setSelectedUsers([]);
      setNotificationImage(null); // ✅ הוספה: איפוס תמונה

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

      const result = await response.json();
      
      alert(`✅ התראת בדיקה נשלחה!\nנשלח ל-${result.sent || 1} מכשירים`);
    } catch (error) {
      console.error('Error sending test:', error);
      alert('שגיאה בשליחת התראת בדיקה');
    }
  };

  // 🔧 FIX: שימוש בפונקציה המדויקת לבדיקת subscription
  const getSubscribedUsers = () => users.filter(isUserSubscribed);
  const getUnsubscribedUsers = () => users.filter(u => !isUserSubscribed(u));

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
          🎯 שליחה בררנית
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
              placeholder="לדוגמה: תזכורת חשובה"
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

          {/* ✅ הוספה: העלאת תמונה */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              🖼️ תמונה (אופציונלי):
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="input"
              style={{ width: '100%', padding: '0.5rem' }}
            />
            <div style={{ fontSize: '11px', color: '#666', marginTop: '0.25rem' }}>
              מקסימום 5MB • JPG, PNG, GIF
            </div>

            {notificationImage && (
              <div style={{ marginTop: '1rem' }}>
                <img
                  src={notificationImage}
                  alt="תצוגה מקדימה"
                  style={{
                    width: '100%',
                    maxHeight: '200px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '2px solid #28a745'
                  }}
                />
                <button
                  onClick={() => setNotificationImage(null)}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.25rem 0.75rem',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  🗑️ הסר תמונה
                </button>
              </div>
            )}
          </div>

          <button
            onClick={sendToAll}
            className="btn btn-success"
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

          {/* ✅ הוספה: העלאת תמונה */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              🖼️ תמונה (אופציונלי):
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="input"
              style={{ width: '100%', padding: '0.5rem' }}
            />
            <div style={{ fontSize: '11px', color: '#666', marginTop: '0.25rem' }}>
              מקסימום 5MB • JPG, PNG, GIF
            </div>

            {notificationImage && (
              <div style={{ marginTop: '1rem' }}>
                <img
                  src={notificationImage}
                  alt="תצוגה מקדימה"
                  style={{
                    width: '100%',
                    maxHeight: '200px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '2px solid #28a745'
                  }}
                />
                <button
                  onClick={() => setNotificationImage(null)}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.25rem 0.75rem',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  🗑️ הסר תמונה
                </button>
              </div>
            )}
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
            onClick={sendToSelected}
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
                        @{user.username} • {user.pushSettings?.subscriptions?.length || 0} מכשירים • {user.pushSettings?.hoursBeforeLock || 2} שעות לפני נעילה
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
          <li>תמיכה במספר מכשירים - כל המכשירים של המשתמש יקבלו את ההתראה</li>
          <li>אפשר לשלוח התראות בכל עת, ללא תלות בסטטוס השבוע</li>
          <li>השתמש בשליחה בררנית כדי להזכיר למשתמשים ספציפיים שלא הימרו</li>
          <li>התראות מופיעות גם כשהאפליקציה סגורה (אם המשתמש התקין את ה-PWA)</li>
          <li><strong>🖼️ ניתן להוסיף תמונה להתראה - תופיע בהתראה במכשיר!</strong></li>
        </ul>
      </div>
    </div>
  );
}

export default PushManagement;