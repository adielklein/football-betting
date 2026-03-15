import React, { useState, useEffect } from 'react';
import { getThemesByCategory, getTheme } from '../../themes';

function UsersManagement({ users, loadData, user }) {
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    password: '',
    role: 'player',
    theme: 'default'
  });
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [exclusionMonth, setExclusionMonth] = useState(null);
  const [exclusionSeason, setExclusionSeason] = useState('2025-26');
  const [excludedUserIds, setExcludedUserIds] = useState([]);
  const [loadingExclusions, setLoadingExclusions] = useState(false);
  const [exclusionsOpen, setExclusionsOpen] = useState(false);

  const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  const themeCategories = getThemesByCategory();

  const months = [
    { value: 1, label: 'ינואר' }, { value: 2, label: 'פברואר' }, { value: 3, label: 'מרץ' },
    { value: 4, label: 'אפריל' }, { value: 5, label: 'מאי' }, { value: 6, label: 'יוני' },
    { value: 7, label: 'יולי' }, { value: 8, label: 'אוגוסט' }, { value: 9, label: 'ספטמבר' },
    { value: 10, label: 'אוקטובר' }, { value: 11, label: 'נובמבר' }, { value: 12, label: 'דצמבר' }
  ];

  // Initialize exclusion month from current date on first render
  useEffect(() => {
    if (exclusionMonth === null) {
      setExclusionMonth(new Date().getMonth() + 1);
    }
  }, []);

  // Load exclusions when month/season changes
  useEffect(() => {
    if (exclusionMonth !== null) {
      loadExclusions();
    }
  }, [exclusionMonth, exclusionSeason]);

  const loadExclusions = async () => {
    setLoadingExclusions(true);
    try {
      const response = await fetch(`${API_URL}/exclusions?month=${exclusionMonth}&season=${exclusionSeason}`);
      if (response.ok) {
        const data = await response.json();
        setExcludedUserIds(data);
      }
    } catch (error) {
      console.error('Error loading exclusions:', error);
    } finally {
      setLoadingExclusions(false);
    }
  };

  const toggleExclusion = async (userId, isCurrentlyExcluded) => {
    try {
      if (isCurrentlyExcluded) {
        await fetch(`${API_URL}/exclusions`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, month: exclusionMonth, season: exclusionSeason })
        });
        setExcludedUserIds(prev => prev.filter(id => id !== userId));
      } else {
        await fetch(`${API_URL}/exclusions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, month: exclusionMonth, season: exclusionSeason })
        });
        setExcludedUserIds(prev => [...prev, userId]);
      }
    } catch (error) {
      console.error('Error toggling exclusion:', error);
      alert('שגיאה בעדכון');
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.username || !newUser.password) {
      alert('יש למלא שם, שם משתמש וסיסמה');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });

      if (response.ok) {
        setNewUser({ name: '', username: '', password: '', role: 'player', theme: 'default' });
        await loadData();
        alert('משתמש חדש נוסף בהצלחה!');
      } else {
        const error = await response.json();
        alert('שגיאה: ' + error.message);
      }
    } catch (error) {
      console.error('שגיאה בהוספת משתמש:', error);
      alert('שגיאה בהוספת המשתמש');
    }
  };

  const startEditing = (userItem) => {
    setEditingUser(userItem._id);
    setEditForm({
      name: userItem.name,
      username: userItem.username,
      role: userItem.role,
      theme: userItem.theme || 'default',
      password: ''
    });
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setEditForm({});
  };

  const saveEdit = async (userId) => {
    try {
      const updateData = {
        name: editForm.name,
        username: editForm.username,
        role: editForm.role,
        theme: editForm.theme
      };

      if (editForm.password && editForm.password.trim()) {
        updateData.password = editForm.password;
      }

      const response = await fetch(`${API_URL}/auth/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        if (userId === user?.id) {
          const currentUser = JSON.parse(localStorage.getItem('football_betting_user'));
          currentUser.theme = editForm.theme;
          currentUser.name = editForm.name;
          currentUser.username = editForm.username;
          currentUser.role = editForm.role;
          localStorage.setItem('football_betting_user', JSON.stringify(currentUser));
          alert('ערכת נושא עודכנה בהצלחה! הדף יתרענן תוך שניה...');
          setTimeout(() => { window.location.reload(); }, 1500);
          return;
        }

        setEditingUser(null);
        setEditForm({});
        await loadData();
        alert('משתמש עודכן בהצלחה!');
      } else {
        const error = await response.json();
        alert('שגיאה: ' + error.message);
      }
    } catch (error) {
      console.error('שגיאה בעדכון משתמש:', error);
      alert('שגיאה בעדכון המשתמש');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (userId === user?.id) {
      alert('לא ניתן למחוק את המשתמש הנוכחי');
      return;
    }

    if (window.confirm(`האם אתה בטוח שברצונך למחוק את ${userName}?\n\nהפעולה הזו תמחק גם את כל ההימורים והניקוד שלו.`)) {
      try {
        const response = await fetch(`${API_URL}/auth/users/${userId}`, { method: 'DELETE' });
        if (response.ok) {
          await loadData();
          alert('משתמש נמחק בהצלחה!');
        } else {
          const error = await response.json();
          alert('שגיאה: ' + error.message);
        }
      } catch (error) {
        console.error('שגיאה במחיקת משתמש:', error);
        alert('שגיאה במחיקת המשתמש');
      }
    }
  };

  const ThemeSelector = ({ value, onChange, style = {} }) => (
    <select value={value} onChange={onChange} className="input" style={{ borderRadius: '10px', ...style }}>
      <option value="default">בחר ערכת נושא</option>
      {Object.entries(themeCategories).map(([categoryName, themes]) => (
        <optgroup key={categoryName} label={categoryName}>
          {themes.map(theme => (
            <option key={theme.key} value={theme.key}>
              {theme.logoType === 'emoji' ? theme.logo : '🖼️'} {theme.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );

  const ThemeDisplay = ({ themeName }) => {
    const theme = getTheme(themeName);
    return (
      <span style={{
        padding: '4px 10px',
        backgroundColor: theme.colors.primary,
        color: theme.colors.primary === '#ffffff' ? '#000' : '#fff',
        borderRadius: '20px',
        fontSize: '12px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontWeight: '600',
        border: theme.colors.primary === '#ffffff' ? '1px solid #ddd' : 'none'
      }}>
        {theme.logoType === 'image' ? (
          <img
            src={theme.logo}
            alt={theme.name}
            className="theme-logo-image"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'inline';
            }}
          />
        ) : (
          <span style={{ fontSize: '14px' }}>{theme.logo}</span>
        )}
        {theme.logoType === 'image' && (
          <span style={{ fontSize: '14px', display: 'none' }}>🖼️</span>
        )}
        {theme.name}
      </span>
    );
  };

  const labelStyle = {
    fontSize: '11px',
    color: '#888',
    display: 'block',
    marginBottom: '3px',
    fontWeight: '600'
  };

  const inputStyle = {
    borderRadius: '10px',
    fontSize: '13px',
    padding: '0.45rem 0.6rem'
  };

  return (
    <div>
      {/* Add user form */}
      <div className="card" style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '0.95rem', margin: '0 0 0.6rem 0', fontWeight: '700' }}>
          ➕ הוסף משתמש חדש
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.5rem',
          alignItems: 'end'
        }}>
          <div>
            <label style={labelStyle}>שם מלא</label>
            <input
              type="text"
              placeholder="שם מלא"
              value={newUser.name}
              onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
              className="input"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>שם משתמש</label>
            <input
              type="text"
              placeholder="שם משתמש"
              value={newUser.username}
              onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
              className="input"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>סיסמה</label>
            <input
              type="password"
              placeholder="סיסמה"
              value={newUser.password}
              onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
              className="input"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>ערכת נושא</label>
            <ThemeSelector
              value={newUser.theme}
              onChange={(e) => setNewUser(prev => ({ ...prev, theme: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>תפקיד</label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
              className="input"
              style={inputStyle}
            >
              <option value="player">שחקן</option>
              <option value="admin">מנהל</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleAddUser}
          style={{
            width: '100%',
            marginTop: '0.6rem',
            padding: '0.55rem',
            background: 'linear-gradient(135deg, #28a745, #20c997)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(40,167,69,0.3)',
            transition: 'all 0.2s ease',
            WebkitAppearance: 'none',
            touchAction: 'manipulation'
          }}
        >
          ➕ הוסף משתמש
        </button>
      </div>

      {/* Month exclusions */}
      <div className="card" style={{ marginBottom: '0.75rem' }}>
        <div
          onClick={() => setExclusionsOpen(prev => !prev)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', userSelect: 'none'
          }}
        >
          <h2 style={{ fontSize: '0.95rem', margin: 0, fontWeight: '700' }}>
            🚫 ניהול השתתפות חודשית
          </h2>
          <span style={{
            fontSize: '18px', transition: 'transform 0.2s ease',
            transform: exclusionsOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}>▼</span>
        </div>
        {!exclusionsOpen ? null : (<div style={{ marginTop: '0.6rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
          <select
            value={exclusionMonth || ''}
            onChange={e => setExclusionMonth(parseInt(e.target.value))}
            className="input"
            style={{ flex: 1, borderRadius: '10px', fontSize: '13px', padding: '0.45rem 0.6rem' }}
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={exclusionSeason}
            onChange={e => setExclusionSeason(e.target.value)}
            className="input"
            style={{ flex: 1, borderRadius: '10px', fontSize: '13px', padding: '0.45rem 0.6rem' }}
          >
            <option value="2024-25">2024-25</option>
            <option value="2025-26">2025-26</option>
            <option value="2026-27">2026-27</option>
          </select>
        </div>
        {loadingExclusions ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: '#888', fontSize: '13px' }}>טוען...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {users.filter(u => u.role !== 'admin').map(userItem => {
              const isExcluded = excludedUserIds.includes(userItem._id);
              return (
                <div key={userItem._id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.45rem 0.6rem', borderRadius: '10px',
                  background: isExcluded ? '#fff5f5' : '#f0fff4',
                  border: isExcluded ? '1px solid #fed7d7' : '1px solid #c6f6d5',
                  transition: 'all 0.2s ease'
                }}>
                  <span style={{
                    fontSize: '13px', fontWeight: '600',
                    color: isExcluded ? '#c53030' : '#276749',
                    textDecoration: isExcluded ? 'line-through' : 'none'
                  }}>
                    {userItem.name}
                  </span>
                  <div
                    onClick={() => toggleExclusion(userItem._id, isExcluded)}
                    style={{
                      width: '44px', height: '24px', borderRadius: '12px',
                      background: isExcluded ? '#fc8181' : '#68d391',
                      position: 'relative', cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      flexShrink: 0
                    }}
                  >
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '50%',
                      background: '#fff', position: 'absolute', top: '2px',
                      transition: 'right 0.2s ease, left 0.2s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      ...(isExcluded ? { left: '2px' } : { right: '2px' })
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ marginTop: '0.5rem', fontSize: '11px', color: '#888', textAlign: 'center' }}>
          ירוק = משתתף | אדום = לא משתתף בחודש זה
        </div>
        </div>)}
      </div>

      {/* User list */}
      <div className="card">
        <h2 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem 0', fontWeight: '700' }}>
          👥 רשימת משתמשים ({users.length})
        </h2>

        {users.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', padding: '2rem', fontSize: '14px' }}>
            <div style={{ fontSize: '40px', marginBottom: '0.5rem' }}>👥</div>
            אין משתמשים במערכת עדיין
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {users.map((userItem, index) => {
              if (!userItem || !userItem._id) return null;

              const isEditing = editingUser === userItem._id;
              const isCurrentUser = userItem._id === user?.id;

              if (isEditing) {
                return (
                  <div key={userItem._id} style={{
                    padding: '0.6rem',
                    background: 'linear-gradient(135deg, #fff9c4 0%, #fff8e1 100%)',
                    borderRadius: '12px',
                    border: '1px solid #ffe082',
                    animation: `slideUp 0.25s ease ${index * 0.03}s both`
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#f57f17', marginBottom: '0.4rem' }}>
                      ✏️ עריכת {userItem.name}
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '0.4rem',
                      marginBottom: '0.5rem'
                    }}>
                      <div>
                        <label style={labelStyle}>שם מלא</label>
                        <input
                          type="text"
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          className="input"
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>שם משתמש</label>
                        <input
                          type="text"
                          value={editForm.username || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                          className="input"
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>סיסמה חדשה</label>
                        <input
                          type="password"
                          placeholder="אופציונלי"
                          value={editForm.password || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                          className="input"
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>ערכת נושא</label>
                        <ThemeSelector
                          value={editForm.theme || 'default'}
                          onChange={(e) => setEditForm(prev => ({ ...prev, theme: e.target.value }))}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>תפקיד</label>
                        <select
                          value={editForm.role || 'player'}
                          onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                          className="input"
                          style={inputStyle}
                        >
                          <option value="player">שחקן</option>
                          <option value="admin">מנהל</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => saveEdit(userItem._id)}
                        style={{
                          flex: 1,
                          padding: '0.45rem',
                          background: 'linear-gradient(135deg, #28a745, #20c997)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        💾 שמור
                      </button>
                      <button
                        onClick={cancelEditing}
                        style={{
                          flex: 1,
                          padding: '0.45rem',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={userItem._id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.6rem',
                  background: isCurrentUser
                    ? 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)'
                    : (index % 2 === 0 ? '#fafafa' : '#fff'),
                  borderRadius: '10px',
                  border: isCurrentUser ? '1.5px solid #64b5f6' : '1px solid #f0f0f0',
                  animation: `slideUp 0.25s ease ${index * 0.03}s both`,
                  transition: 'all 0.2s ease'
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '600', fontSize: '14px', color: '#333' }}>
                        {userItem.name}
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        backgroundColor: userItem.role === 'admin' ? '#dc3545' : '#28a745',
                        color: 'white',
                        borderRadius: '20px',
                        fontSize: '10px',
                        fontWeight: '700'
                      }}>
                        {userItem.role === 'admin' ? '👑 מנהל' : '⚽ שחקן'}
                      </span>
                      {isCurrentUser && (
                        <span style={{ color: '#1976d2', fontSize: '10px', fontWeight: '600' }}>(אתה)</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#888' }}>
                        @{userItem.username}
                      </span>
                      <ThemeDisplay themeName={userItem.theme || 'default'} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                    <button
                      onClick={() => startEditing(userItem)}
                      style={{
                        padding: '0.3rem 0.6rem',
                        background: 'linear-gradient(135deg, #ffc107, #ffb300)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      ✏️
                    </button>
                    {!isCurrentUser && (
                      <button
                        onClick={() => handleDeleteUser(userItem._id, userItem.name)}
                        style={{
                          padding: '0.3rem 0.6rem',
                          background: 'linear-gradient(135deg, #dc3545, #c62828)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default UsersManagement;
