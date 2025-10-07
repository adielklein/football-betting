import React, { useState, useEffect } from 'react';

function LeaguesManagement() {
  const [leagues, setLeagues] = useState([]);
  const [editingLeague, setEditingLeague] = useState(null);
  const [newLeague, setNewLeague] = useState({
    name: '',
    key: '',
    color: '#6c757d',
    type: 'club',
    region: '',
    active: true,
    order: 0
  });
  const [loading, setLoading] = useState(true);

  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  useEffect(() => {
    loadLeagues();
  }, []);

  const loadLeagues = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/leagues`);
      const data = await response.json();
      setLeagues(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading leagues:', error);
      setLeagues([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLeague = async () => {
    if (!newLeague.name || !newLeague.key) {
      alert('שם ומפתח ליגה נדרשים');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/leagues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLeague)
      });

      if (response.ok) {
        setNewLeague({
          name: '',
          key: '',
          color: '#6c757d',
          type: 'club',
          region: '',
          active: true,
          order: 0
        });
        await loadLeagues();
        alert('✅ ליגה נוצרה בהצלחה!');
      } else {
        const error = await response.json();
        alert('❌ שגיאה: ' + error.message);
      }
    } catch (error) {
      console.error('Error creating league:', error);
      alert('❌ שגיאה ביצירת הליגה');
    }
  };

  const handleUpdateLeague = async (leagueId, updatedData) => {
    try {
      const response = await fetch(`${API_URL}/leagues/${leagueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });

      if (response.ok) {
        setEditingLeague(null);
        await loadLeagues();
        alert('✅ ליגה עודכנה בהצלחה!');
      } else {
        const error = await response.json();
        alert('❌ שגיאה: ' + error.message);
      }
    } catch (error) {
      console.error('Error updating league:', error);
      alert('❌ שגיאה בעדכון הליגה');
    }
  };

  const handleDeleteLeague = async (leagueId, leagueName) => {
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את "${leagueName}"?\n\nאם יש משחקים המשתמשים בליגה זו, המחיקה תיכשל.`)) {
      try {
        const response = await fetch(`${API_URL}/leagues/${leagueId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          await loadLeagues();
          alert('✅ ליגה נמחקה בהצלחה!');
        } else {
          const error = await response.json();
          alert('❌ שגיאה: ' + error.message);
        }
      } catch (error) {
        console.error('Error deleting league:', error);
        alert('❌ שגיאה במחיקת הליגה');
      }
    }
  };

  const handleInitializeDefaultLeagues = async () => {
    if (window.confirm('האם אתה בטוח? פעולה זו תוסיף 3 ליגות ברירת מחדל.')) {
      try {
        const response = await fetch(`${API_URL}/leagues/initialize`, {
          method: 'POST'
        });

        if (response.ok) {
          await loadLeagues();
          alert('✅ ליגות ברירת מחדל נוצרו בהצלחה!');
        } else {
          const error = await response.json();
          alert('❌ שגיאה: ' + error.message);
        }
      } catch (error) {
        console.error('Error initializing leagues:', error);
        alert('❌ שגיאה באתחול ליגות');
      }
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto'
        }}></div>
        <p>טוען ליגות...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      {/* כותרת + כפתור אתחול */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>ניהול ליגות ({leagues.length})</h2>
          {leagues.length === 0 && (
            <button
              onClick={handleInitializeDefaultLeagues}
              className="btn"
              style={{ backgroundColor: '#28a745', color: 'white' }}
            >
              🏆 אתחל ליגות ברירת מחדל
            </button>
          )}
        </div>
      </div>

      {/* הוספת ליגה חדשה */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3>➕ הוסף ליגה חדשה</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          <div>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>
              שם הליגה (עברית):
            </label>
            <input
              type="text"
              placeholder="לדוגמה: בונדסליגה"
              value={newLeague.name}
              onChange={(e) => setNewLeague(prev => ({ ...prev, name: e.target.value }))}
              className="input"
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>
              מפתח (אנגלית, קטן):
            </label>
            <input
              type="text"
              placeholder="bundesliga"
              value={newLeague.key}
              onChange={(e) => setNewLeague(prev => ({ 
                ...prev, 
                key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') 
              }))}
              className="input"
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>
              צבע (HEX):
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="color"
                value={newLeague.color}
                onChange={(e) => setNewLeague(prev => ({ ...prev, color: e.target.value }))}
                style={{ width: '50px', height: '38px', border: 'none', cursor: 'pointer' }}
              />
              <input
                type="text"
                value={newLeague.color}
                onChange={(e) => setNewLeague(prev => ({ ...prev, color: e.target.value }))}
                className="input"
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>
              סוג:
            </label>
            <select
              value={newLeague.type}
              onChange={(e) => setNewLeague(prev => ({ ...prev, type: e.target.value }))}
              className="input"
            >
              <option value="club">קבוצות מועדון</option>
              <option value="national">נבחרות</option>
              <option value="other">אחר</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>
              אזור:
            </label>
            <input
              type="text"
              placeholder="גרמניה"
              value={newLeague.region}
              onChange={(e) => setNewLeague(prev => ({ ...prev, region: e.target.value }))}
              className="input"
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>
              סדר תצוגה:
            </label>
            <input
              type="number"
              value={newLeague.order}
              onChange={(e) => setNewLeague(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
              className="input"
            />
          </div>
        </div>

        <button
          onClick={handleCreateLeague}
          className="btn btn-success"
          style={{ width: '100%' }}
        >
          ➕ צור ליגה חדשה
        </button>
      </div>

      {/* רשימת ליגות */}
      <div className="card">
        <h3>📋 ליגות קיימות</h3>
        {leagues.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
            <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🏆</div>
            <h3>אין ליגות במערכת עדיין</h3>
            <p>השתמש בכפתור למעלה כדי ליצור ליגות</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>שם</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>מפתח</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>צבע</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>סוג</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>אזור</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>סדר</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {leagues.map(league => (
                  <tr key={league._id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{league.name}</td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px' }}>{league.key}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ 
                        width: '40px', 
                        height: '20px', 
                        backgroundColor: league.color,
                        borderRadius: '4px',
                        margin: '0 auto',
                        border: '1px solid #ddd'
                      }}></div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: league.type === 'club' ? '#e3f2fd' : league.type === 'national' ? '#fff3cd' : '#f8f9fa',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {league.type === 'club' ? '🏢 קבוצות' : league.type === 'national' ? '🌍 נבחרות' : '📌 אחר'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#666' }}>{league.region || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>{league.order}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => setEditingLeague(league)}
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
                        <button
                          onClick={() => handleDeleteLeague(league._id, league.name)}
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* חלון עריכת ליגה */}
      {editingLeague && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ 
            width: '90%', 
            maxWidth: '600px', 
            maxHeight: '90vh', 
            overflow: 'auto' 
          }}>
            <h3>✏️ עריכת ליגה: {editingLeague.name}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label>שם הליגה:</label>
                <input
                  type="text"
                  defaultValue={editingLeague.name}
                  id="edit-name"
                  className="input"
                />
              </div>

              <div>
                <label>מפתח:</label>
                <input
                  type="text"
                  defaultValue={editingLeague.key}
                  id="edit-key"
                  className="input"
                />
              </div>

              <div>
                <label>צבע:</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="color"
                    defaultValue={editingLeague.color}
                    id="edit-color"
                    style={{ width: '50px', height: '38px' }}
                  />
                  <input
                    type="text"
                    defaultValue={editingLeague.color}
                    id="edit-color-text"
                    className="input"
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              <div>
                <label>סוג:</label>
                <select defaultValue={editingLeague.type} id="edit-type" className="input">
                  <option value="club">קבוצות מועדון</option>
                  <option value="national">נבחרות</option>
                  <option value="other">אחר</option>
                </select>
              </div>

              <div>
                <label>אזור:</label>
                <input
                  type="text"
                  defaultValue={editingLeague.region}
                  id="edit-region"
                  className="input"
                />
              </div>

              <div>
                <label>סדר תצוגה:</label>
                <input
                  type="number"
                  defaultValue={editingLeague.order}
                  id="edit-order"
                  className="input"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => {
                  handleUpdateLeague(editingLeague._id, {
                    name: document.getElementById('edit-name').value,
                    key: document.getElementById('edit-key').value,
                    color: document.getElementById('edit-color').value,
                    type: document.getElementById('edit-type').value,
                    region: document.getElementById('edit-region').value,
                    order: parseInt(document.getElementById('edit-order').value) || 0
                  });
                }}
                className="btn btn-success"
                style={{ flex: 1 }}
              >
                💾 שמור
              </button>
              <button
                onClick={() => setEditingLeague(null)}
                className="btn"
                style={{ flex: 1, backgroundColor: '#6c757d', color: 'white' }}
              >
                ❌ ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeaguesManagement;