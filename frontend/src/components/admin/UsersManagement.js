import React, { useState } from 'react';
import { api } from '../../services/api';

function UsersManagement({ users, loadData, user }) {
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'player' });
  const [editingUser, setEditingUser] = useState(null);

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email) {
      alert('יש למלא שם ואימייל');
      return;
    }

    try {
      await api.registerUser(newUser);
      setNewUser({ name: '', email: '', role: 'player' });
      await loadData();
      alert('משתמש חדש נוסף בהצלחה!');
    } catch (error) {
      console.error('שגיאה בהוספת משתמש:', error);
      alert('שגיאה בהוספת המשתמש');
    }
  };

  const handleEditUser = async (userId, userData) => {
    if (!userId || !userData) return;
    
    try {
      await api.updateUser(userId, userData);
      setEditingUser(null);
      await loadData();
      alert('משתמש עודכן בהצלחה!');
    } catch (error) {
      console.error('שגיאה בעדכון משתמש:', error);
      alert('שגיאה בעדכון המשתמש');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!userId || !userName) return;
    
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את ${userName}?`)) {
      try {
        await api.deleteUser(userId);
        await loadData();
        alert('משתמש נמחק בהצלחה!');
      } catch (error) {
        console.error('שגיאה במחיקת משתמש:', error);
        alert('שגיאה במחיקת המשתמש');
      }
    }
  };

  return (
    <>
      {/* הוסף משתמש חדש */}
      <div className="card">
        <h2>הוסף משתמש חדש</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '1rem', alignItems: 'end' }}>
          <input
            type="text"
            placeholder="שם מלא"
            value={newUser.name}
            onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
            className="input"
          />
          <input
            type="email"
            placeholder="אימייל"
            value={newUser.email}
            onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
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
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'right' }}>שם</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>אימייל</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>תפקיד</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {users.map(userItem => {
                if (!userItem || !userItem._id) return null;
                
                return (
                  <tr key={userItem._id}>
                    <td style={{ padding: '12px' }}>
                      {editingUser === userItem._id ? (
                        <input
                          type="text"
                          defaultValue={userItem.name || ''}
                          onBlur={(e) => handleEditUser(userItem._id, { 
                            name: e.target.value, 
                            email: userItem.email, 
                            role: userItem.role 
                          })}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') e.target.blur();
                          }}
                          className="input"
                          style={{ width: '100%' }}
                          autoFocus
                        />
                      ) : (
                        <span style={{ fontWeight: '500' }}>{userItem.name || 'ללא שם'}</span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>{userItem.email || 'ללא אימייל'}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: userItem.role === 'admin' ? '#dc3545' : '#28a745',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {userItem.role === 'admin' ? 'מנהל' : 'שחקן'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => setEditingUser(editingUser === userItem._id ? null : userItem._id)}
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
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default UsersManagement;