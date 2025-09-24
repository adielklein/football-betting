import React, { useState } from 'react';
import { getThemesByCategory, getTheme } from '../../themes'; // 🆕 יבוא ערכות הנושא

function UsersManagement({ users, loadData, user }) {
  const [newUser, setNewUser] = useState({ 
    name: '', 
    username: '', 
    password: '', 
    role: 'player',
    theme: 'default' // 🆕 ערכת נושא בסיסית
  });
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});

  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  // 🆕 ערכות נושא מקובצות (אם אין קובץ themes.js)
  const getThemesByCategory = () => {
    return {
      'בסיסי': [
        { key: 'default', name: 'בסיסי', icon: '⚽' }
      ],
      'פרמיירליג': [
        { key: 'manchester_united', name: 'מנצ\'סטר יונייטד', icon: '👹' },
        { key: 'liverpool', name: 'ליברפול', icon: '🐦' },
        { key: 'chelsea', name: 'צ\'לסי', icon: '🦁' },
        { key: 'arsenal', name: 'ארסנל', icon: '🔴' },
        { key: 'manchester_city', name: 'מנצ\'סטר סיטי', icon: '💙' },
        { key: 'tottenham', name: 'טוטנהאם', icon: '🐓' }
      ],
      'לה ליגה': [
        { key: 'real_madrid', name: 'ריאל מדריד', icon: '👑' },
        { key: 'barcelona', name: 'ברצלונה', icon: '🔵' },
        { key: 'atletico_madrid', name: 'אתלטיקו מדריד', icon: '🔺' },
        { key: 'valencia', name: 'ולנסיה', icon: '🦇' },
        { key: 'sevilla', name: 'סביליה', icon: '⚪' }
      ],
      'נבחרות': [
        { key: 'brazil', name: 'ברזיל', icon: '🇧🇷' },
        { key: 'argentina', name: 'ארגנטינה', icon: '🇦🇷' },
        { key: 'germany', name: 'גרמניה', icon: '🇩🇪' },
        { key: 'france', name: 'צרפת', icon: '🇫🇷' },
        { key: 'italy', name: 'איטליה', icon: '🇮🇹' },
        { key: 'spain', name: 'ספרד', icon: '🇪🇸' },
        { key: 'england', name: 'אנגליה', icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
        { key: 'portugal', name: 'פורטוגל', icon: '🇵🇹' }
      ]
    };
  };

  const getTheme = (themeName) => {
    const themes = {
      default: { name: 'בסיסי', icon: '⚽', colors: { primary: '#007bff' } },
      barcelona: { name: 'ברצלונה', icon: '🔵', colors: { primary: '#A50044' } },
      real_madrid: { name: 'ריאל מדריד', icon: '👑', colors: { primary: '#ffffff' } },
      liverpool: { name: 'ליברפול', icon: '🐦', colors: { primary: '#C8102E' } },
      manchester_united: { name: 'מנצ\'סטר יונייטד', icon: '👹', colors: { primary: '#DA020E' } }
    };
    return themes[themeName] || themes.default;
  };

  // קבלת ערכות נושא מקובצות לפי קטגוריה
  const themeCategories = getThemesByCategory();

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.username || !newUser.password) {
      alert('יש למלא שם, שם משתמש וסיסמה');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser) // כולל theme
      });

      if (response.ok) {
        setNewUser({ 
          name: '', 
          username: '', 
          password: '', 
          role: 'player',
          theme: 'default' 
        });
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
      theme: userItem.theme || 'default', // 🆕 ערכת נושא נוכחית
      password: '' // סיסמה חדשה (אופציונלי)
    });
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setEditForm({});
  };

  // 🆕 פונקציית saveEdit עם תיקון localStorage
  const saveEdit = async (userId) => {
    try {
      // אם לא הוכנסה סיסמה חדשה, לא לשלוח אותה
      const updateData = {
        name: editForm.name,
        username: editForm.username,
        role: editForm.role,
        theme: editForm.theme // 🆕 ערכת נושא
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
        // 🆕 אם זה המשתמש הנוכחי, עדכן את localStorage ורענן הדף
        if (userId === user?.id) {
          const currentUser = JSON.parse(localStorage.getItem('football_betting_user'));
          currentUser.theme = editForm.theme;
          localStorage.setItem('football_betting_user', JSON.stringify(currentUser));
          
          console.log('🎨 עודכנתי ערכת נושא למשתמש הנוכחי:', editForm.theme);
          
          alert('ערכת נושא עודכנה בהצלחה! הדף יתרענן...');
          
          // רענן הדף כדי שהערכה תופעל
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          
          return;
        }
        
        // עבור משתמשים אחרים - המשך כרגיל
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

    if (window.confirm(`האם אתה בטוח שברצונך למחוק את ${userName}?`)) {
      try {
        const response = await fetch(`${API_URL}/auth/users/${userId}`, {
          method: 'DELETE'
        });

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

  // 🆕 רכיב בחירת ערכת נושא
  const ThemeSelector = ({ value, onChange, style = {} }) => (
    <select
      value={value}
      onChange={onChange}
      className="input"
      style={style}
    >
      <option value="default">בחר ערכת נושא</option>
      {Object.entries(themeCategories).map(([categoryName, themes]) => (
        <optgroup key={categoryName} label={categoryName}>
          {themes.map(theme => (
            <option key={theme.key} value={theme.key}>
              {theme.icon} {theme.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );

  // 🆕 תצוגת ערכת נושא נוכחית
  const ThemeDisplay = ({ themeName }) => {
    const theme = getTheme(themeName);
    return (
      <span style={{
        padding: '4px 8px',
        backgroundColor: theme.colors.primary,
        color: theme.colors.primary === '#ffffff' ? '#000' : '#fff',
        borderRadius: '4px',
        fontSize: '12px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        {theme.icon} {theme.name}
      </span>
    );
  };

  return (
    <div>
      {/* הוסף משתמש חדש */}
      <div className="card">
        <h2>הוסף משתמש חדש</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.5fr auto auto', gap: '1rem', alignItems: 'end' }}>
          <input
            type="text"
            placeholder="שם מלא"
            value={newUser.name}
            onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
            className="input"
          />
          <input
            type="text"
            placeholder="שם משתמש"
            value={newUser.username}
            onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
            className="input"
          />
          <input
            type="password"
            placeholder="סיסמה"
            value={newUser.password}
            onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
            className="input"
          />
          {/* 🆕 בחירת ערכת נושא */}
          <ThemeSelector
            value={newUser.theme}
            onChange={(e) => setNewUser(prev => ({ ...prev, theme: e.target.value }))}
          />
          <select
            value={newUser.role}
            onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
            className="input"
          >
            <option value="player">שחקן</option>
            <option value="admin">מנהל</option>
          </select>
          <button onClick={handleAddUser} className="btn btn-success">
            הוסף
          </button>
        </div>
      </div>

      {/* רשימת משתמשים */}
      <div className="card">
        <h2>רשימת משתמשים ({users.length})</h2>
        
        {users.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
            אין משתמשים במערכת עדיין
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>שם</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>שם משתמש</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>ערכת נושא</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>תפקיד</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>סיסמה חדשה</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {users.map(userItem => {
                  if (!userItem || !userItem._id) return null;
                  
                  const isEditing = editingUser === userItem._id;
                  
                  return (
                    <tr key={userItem._id} style={{ borderBottom: '1px solid #eee' }}>
                      {/* שם */}
                      <td style={{ padding: '12px' }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.name || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            className="input"
                            style={{ width: '100%' }}
                          />
                        ) : (
                          <span style={{ fontWeight: '500' }}>{userItem.name || 'ללא שם'}</span>
                        )}
                      </td>

                      {/* שם משתמש */}
                      <td style={{ padding: '12px' }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.username || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                            className="input"
                            style={{ width: '100%' }}
                          />
                        ) : (
                          <span>{userItem.username || 'ללא שם משתמש'}</span>
                        )}
                      </td>

                      {/* 🆕 ערכת נושא */}
                      <td style={{ padding: '12px' }}>
                        {isEditing ? (
                          <ThemeSelector
                            value={editForm.theme || 'default'}
                            onChange={(e) => setEditForm(prev => ({ ...prev, theme: e.target.value }))}
                            style={{ width: '180px' }}
                          />
                        ) : (
                          <ThemeDisplay themeName={userItem.theme || 'default'} />
                        )}
                      </td>

                      {/* תפקיד */}
                      <td style={{ padding: '12px' }}>
                        {isEditing ? (
                          <select
                            value={editForm.role || 'player'}
                            onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                            className="input"
                          >
                            <option value="player">שחקן</option>
                            <option value="admin">מנהל</option>
                          </select>
                        ) : (
                          <span style={{
                            padding: '4px 8px',
                            backgroundColor: userItem.role === 'admin' ? '#dc3545' : '#28a745',
                            color: 'white',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            {userItem.role === 'admin' ? 'מנהל' : 'שחקן'}
                          </span>
                        )}
                      </td>

                      {/* סיסמה חדשה */}
                      <td style={{ padding: '12px' }}>
                        {isEditing ? (
                          <input
                            type="password"
                            placeholder="סיסמה חדשה (אופציונלי)"
                            value={editForm.password || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                            className="input"
                            style={{ width: '140px' }}
                          />
                        ) : (
                          <span style={{ color: '#999', fontSize: '12px' }}>••••••</span>
                        )}
                      </td>

                      {/* פעולות */}
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEdit(userItem._id)}
                                className="btn"
                                style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#28a745', color: 'white' }}
                              >
                                שמור
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="btn"
                                style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#6c757d', color: 'white' }}
                              >
                                ביטול
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(userItem)}
                                className="btn"
                                style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#ffc107', color: 'white' }}
                              >
                                ערוך
                              </button>
                              {userItem._id !== user?.id && (
                                <button
                                  onClick={() => handleDeleteUser(userItem._id, userItem.name)}
                                  className="btn"
                                  style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#dc3545', color: 'white' }}
                                >
                                  מחק
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default UsersManagement;