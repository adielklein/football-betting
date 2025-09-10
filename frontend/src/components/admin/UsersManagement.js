import React, { useState } from 'react';

function UsersManagement({ users, loadData, user }) {
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'player' });
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.username || !newUser.password) {
      alert('יש למלא שם, שם משתמש וסיסמה');
      return;
    }

    try {
      const response = await fetch('https://football-betting-backend.onrender.com/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });

      if (response.ok) {
        setNewUser({ name: '', username: '', password: '', role: 'player' });
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
      password: '' // סיסמה חדשה (אופציונלי)
    });
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setEditForm({});
  };

  const saveEdit = async (userId) => {
    try {
      // אם לא הוכנסה סיסמה חדשה, לא לשלוח אותה
      const updateData = {
        name: editForm.name,
        username: editForm.username,
        role: editForm.role
      };

      if (editForm.password && editForm.password.trim()) {
        updateData.password = editForm.password;
      }

      const response = await fetch(`https://football-betting-backend.onrender.com/api/auth/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
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
        const response = await fetch(`https://football-betting-backend.onrender.com/api/auth/users/${userId}`, {
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

  return (
    <div>
      {/* הוסף משתמש חדש */}
      <div className="card">
        <h2>הוסף משתמש חדש</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: '1rem', alignItems: 'end' }}>
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