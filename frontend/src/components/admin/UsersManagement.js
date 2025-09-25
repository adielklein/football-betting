import React, { useState } from 'react';
import { getThemesByCategory, getTheme } from '../../themes'; // 🎨 יבוא מקובץ הערכות

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

  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  // 🎨 קבלת ערכות נושא מקובצות לפי קטגוריות
  const themeCategories = getThemesByCategory();

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.username || !newUser.password) {
      alert('יש למלא שם, שם משתמש וסיסמה');
      return;
    }

    try {
      console.log('🔧 שולח משתמש חדש:', newUser);
      
      const response = await fetch(`${API_URL}/auth/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ משתמש חדש נוצר:', result);
        
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
        console.error('⌐ שגיאה ביצירת משתמש:', error);
        alert('שגיאה: ' + error.message);
      }
    } catch (error) {
      console.error('⌐ שגיאה בהוספת משתמש:', error);
      alert('שגיאה בהוספת המשתמש');
    }
  };

  const startEditing = (userItem) => {
    console.log('🖊️ מתחיל עריכה למשתמש:', userItem);
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

  // 🔧 פונקציית saveEdit עם תיקון localStorage ורענון נתונים
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

      console.log('🔧 שולח עדכון למשתמש:', userId, updateData);

      const response = await fetch(`${API_URL}/auth/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const updatedUser = await response.json();
        console.log('✅ משתמש עודכן בשרת:', updatedUser);
        
        // 🔧 אם זה המשתמש הנוכחי, עדכן localStorage ורענן
        if (userId === user?.id) {
          console.log('🎨 עדכון המשתמש הנוכחי - מרענן את הדף...');
          
          const currentUser = JSON.parse(localStorage.getItem('football_betting_user'));
          
          // עדכן את כל הפרטים החדשים
          currentUser.theme = editForm.theme;
          currentUser.name = editForm.name;
          currentUser.username = editForm.username;
          currentUser.role = editForm.role;
          
          localStorage.setItem('football_betting_user', JSON.stringify(currentUser));
          
          console.log('🎨 localStorage עודכן עם:', currentUser);
          
          alert('ערכת נושא עודכנה בהצלחה! הדף יתרענן תוך שניה...');
          
          // רענן את הדף כדי שערכת הנושא תיכנס לתוקף
          setTimeout(() => {
            window.location.reload();
          }, 1500);
          
          return;
        }
        
        // עבור משתמשים אחרים
        setEditingUser(null);
        setEditForm({});
        await loadData();
        alert('משתמש עודכן בהצלחה!');
      } else {
        const error = await response.json();
        console.error('⌐ שגיאה בעדכון:', error);
        alert('שגיאה: ' + error.message);
      }
    } catch (error) {
      console.error('⌐ שגיאה בעדכון משתמש:', error);
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

  // 🎨 רכיב בחירת ערכת נושא
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
              {theme.logoType === 'emoji' ? theme.logo : '🖼️'} {theme.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );

  // 🎨 תצוגת ערכת נושא נוכחית - עם תמיכה בתמונות ובאמוג'ים
  const ThemeDisplay = ({ themeName }) => {
    const theme = getTheme(themeName);
    
    return (
      <span style={{
        padding: '6px 12px',
        backgroundColor: theme.colors.primary,
        color: theme.colors.primary === '#ffffff' ? '#000' : '#fff',
        borderRadius: '6px',
        fontSize: '13px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontWeight: '500',
        border: theme.colors.primary === '#ffffff' ? '1px solid #ddd' : 'none'
      }}>
        {/* תמיכה בסמלי תמונה ואמוג'י */}
        {theme.logoType === 'image' ? (
          <img 
            src={theme.logo} 
            alt={theme.name}
            className="theme-logo-image"
            onError={(e) => {
              // אם התמונה לא נטענת, הצג אמוג'י חלופי
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'inline';
            }}
          />
        ) : (
          <span style={{ fontSize: '16px' }}>{theme.logo}</span>
        )}
        {theme.logoType === 'image' && (
          <span style={{ fontSize: '16px', display: 'none' }}>🖼️</span>
        )}
        {theme.name}
      </span>
    );
  };

  return (
    <div>
      {/* הוסף משתמש חדש */}
      <div className="card">
        <h2>הוסף משתמש חדש</h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem', 
          alignItems: 'end' 
        }}>
          <div>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>
              שם מלא:
            </label>
            <input
              type="text"
              placeholder="שם מלא"
              value={newUser.name}
              onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
              className="input"
            />
          </div>
          
          <div>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>
              שם משתמש:
            </label>
            <input
              type="text"
              placeholder="שם משתמש"
              value={newUser.username}
              onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
              className="input"
            />
          </div>
          
          <div>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>
              סיסמה:
            </label>
            <input
              type="password"
              placeholder="סיסמה"
              value={newUser.password}
              onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
              className="input"
            />
          </div>
          
          <div>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>
              ערכת נושא:
            </label>
            <ThemeSelector
              value={newUser.theme}
              onChange={(e) => setNewUser(prev => ({ ...prev, theme: e.target.value }))}
            />
          </div>
          
          <div>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>
              תפקיד:
            </label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
              className="input"
            >
              <option value="player">שחקן</option>
              <option value="admin">מנהל</option>
            </select>
          </div>
          
          <button onClick={handleAddUser} className="btn btn-success">
            ➕ הוסף משתמש
          </button>
        </div>
      </div>

      {/* רשימת משתמשים */}
      <div className="card">
        <h2>רשימת משתמשים ({users.length})</h2>
        
        {users.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
            <div style={{ fontSize: '48px', marginBottom: '1rem' }}>👥</div>
            <h3>אין משתמשים במערכת עדיין</h3>
            <p>השתמש בטופס למעלה כדי להוסיף משתמש ראשון</p>
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
                  const isCurrentUser = userItem._id === user?.id;
                  
                  return (
                    <tr key={userItem._id} style={{ 
                      borderBottom: '1px solid #eee',
                      backgroundColor: isCurrentUser ? '#e3f2fd' : 'transparent'
                    }}>
                      <td style={{ padding: '12px' }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.name || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            className="input"
                            style={{ width: '100%' }}
                            placeholder="שם מלא"
                          />
                        ) : (
                          <div style={{ fontWeight: '500' }}>
                            {userItem.name || 'ללא שם'}
                            {isCurrentUser && (
                              <div style={{ color: '#1976d2', fontSize: '11px', marginTop: '2px' }}>
                                👤 זה אתה
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '12px' }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.username || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                            className="input"
                            style={{ width: '100%' }}
                            placeholder="שם משתמש"
                          />
                        ) : (
                          <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>
                            {userItem.username || 'ללא שם משתמש'}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '12px' }}>
                        {isEditing ? (
                          <ThemeSelector
                            value={editForm.theme || 'default'}
                            onChange={(e) => setEditForm(prev => ({ ...prev, theme: e.target.value }))}
                            style={{ minWidth: '200px' }}
                          />
                        ) : (
                          <ThemeDisplay themeName={userItem.theme || 'default'} />
                        )}
                      </td>

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
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            {userItem.role === 'admin' ? '👑 מנהל' : '⚽ שחקן'}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '12px' }}>
                        {isEditing ? (
                          <input
                            type="password"
                            placeholder="סיסמה חדשה (אופציונלי)"
                            value={editForm.password || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                            className="input"
                            style={{ minWidth: '150px' }}
                          />
                        ) : (
                          <span style={{ color: '#999', fontSize: '12px' }}>🔒 ••••••</span>
                        )}
                      </td>

                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEdit(userItem._id)}
                                className="btn"
                                style={{ 
                                  fontSize: '12px', 
                                  padding: '6px 12px', 
                                  backgroundColor: '#28a745', 
                                  color: 'white' 
                                }}
                              >
                                💾 שמור
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="btn"
                                style={{ 
                                  fontSize: '12px', 
                                  padding: '6px 12px', 
                                  backgroundColor: '#6c757d', 
                                  color: 'white' 
                                }}
                              >
                                ⌐ ביטול
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(userItem)}
                                className="btn"
                                style={{ 
                                  fontSize: '12px', 
                                  padding: '6px 12px', 
                                  backgroundColor: '#ffc107', 
                                  color: 'white' 
                                }}
                              >
                                ✏️ ערוך
                              </button>
                              {!isCurrentUser && (
                                <button
                                  onClick={() => handleDeleteUser(userItem._id, userItem.name)}
                                  className="btn"
                                  style={{ 
                                    fontSize: '12px', 
                                    padding: '6px 12px', 
                                    backgroundColor: '#dc3545', 
                                    color: 'white' 
                                  }}
                                >
                                  🗑️ מחק
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