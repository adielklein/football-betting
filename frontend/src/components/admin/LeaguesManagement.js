import React, { useState, useEffect } from 'react';
import { toast } from '../../services/toast';

function LeaguesManagement() {
  const [leagues, setLeagues] = useState([]);
  const [editingLeague, setEditingLeague] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newLeague, setNewLeague] = useState({
    name: '', key: '', color: '#6c757d', type: 'club', region: '', active: true, order: 0, apiFootballId: ''
  });
  const [loading, setLoading] = useState(true);

  const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  useEffect(() => { loadLeagues(); }, []);

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
      toast.warning('שם ומפתח ליגה נדרשים');
      return;
    }
    try {
      const payload = {
        ...newLeague,
        apiFootballId: newLeague.apiFootballId ? parseInt(newLeague.apiFootballId, 10) : null
      };
      const response = await fetch(`${API_URL}/leagues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setNewLeague({ name: '', key: '', color: '#6c757d', type: 'club', region: '', active: true, order: 0, apiFootballId: '' });
        await loadLeagues();
        toast.success('ליגה נוצרה בהצלחה!');
      } else {
        const error = await response.json();
        toast.error('שגיאה: ' + error.message);
      }
    } catch (error) {
      toast.error('שגיאה ביצירת הליגה');
    }
  };

  const handleUpdateLeague = async () => {
    if (!editingLeague) return;
    try {
      const payload = {
        ...editForm,
        apiFootballId:
          editForm.apiFootballId === '' || editForm.apiFootballId == null
            ? null
            : parseInt(editForm.apiFootballId, 10)
      };
      const response = await fetch(`${API_URL}/leagues/${editingLeague._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setEditingLeague(null);
        setEditForm({});
        await loadLeagues();
        toast.success('ליגה עודכנה בהצלחה!');
      } else {
        const error = await response.json();
        toast.error('שגיאה: ' + error.message);
      }
    } catch (error) {
      toast.error('שגיאה בעדכון הליגה');
    }
  };

  const handleDeleteLeague = async (leagueId, leagueName) => {
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את "${leagueName}"?\n\nאם יש משחקים המשתמשים בליגה זו, המחיקה תיכשל.`)) {
      try {
        const response = await fetch(`${API_URL}/leagues/${leagueId}`, { method: 'DELETE' });
        if (response.ok) {
          await loadLeagues();
          toast.success('ליגה נמחקה בהצלחה!');
        } else {
          const error = await response.json();
          toast.error('שגיאה: ' + error.message);
        }
      } catch (error) {
        toast.error('שגיאה במחיקת הליגה');
      }
    }
  };

  const handleInitializeDefaultLeagues = async () => {
    if (window.confirm('האם אתה בטוח? פעולה זו תוסיף 3 ליגות ברירת מחדל.')) {
      try {
        const response = await fetch(`${API_URL}/leagues/initialize`, { method: 'POST' });
        if (response.ok) {
          await loadLeagues();
          toast.success('ליגות ברירת מחדל נוצרו בהצלחה!');
        } else {
          const error = await response.json();
          toast.error('שגיאה: ' + error.message);
        }
      } catch (error) {
        toast.error('שגיאה באתחול ליגות');
      }
    }
  };

  const startEditing = (league) => {
    setEditingLeague(league);
    setEditForm({
      name: league.name,
      key: league.key,
      color: league.color,
      type: league.type,
      region: league.region || '',
      order: league.order || 0,
      apiFootballId: league.apiFootballId ?? ''
    });
  };

  const labelStyle = {
    fontSize: '11px', color: 'var(--text-3, #888)', display: 'block', marginBottom: '3px', fontWeight: '600'
  };

  const inputStyle = {
    borderRadius: '10px', fontSize: '13px', padding: '0.45rem 0.6rem'
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{
          width: '44px', height: '44px',
          border: '3px solid var(--border, #f0f0f0)', borderTop: '3px solid var(--theme-primary, #007bff)',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
          margin: '0 auto 0.5rem'
        }}></div>
        <span style={{ fontSize: '13px', color: 'var(--text-3, #888)' }}>טוען ליגות...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '0.95rem', margin: 0, fontWeight: '700' }}>
            🏆 ניהול ליגות ({leagues.length})
          </h2>
          {leagues.length === 0 && (
            <button
              onClick={handleInitializeDefaultLeagues}
              style={{
                padding: '0.4rem 0.8rem',
                background: 'linear-gradient(135deg, #28a745, #20c997)',
                color: 'white', border: 'none', borderRadius: '8px',
                fontSize: '12px', fontWeight: '700', cursor: 'pointer'
              }}
            >
              🏆 אתחל ברירת מחדל
            </button>
          )}
        </div>
      </div>

      {/* Add league form */}
      <div className="card" style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem 0', fontWeight: '700' }}>
          ➕ הוסף ליגה חדשה
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.5rem',
          marginBottom: '0.5rem'
        }}>
          <div>
            <label style={labelStyle}>שם (עברית)</label>
            <input type="text" placeholder="בונדסליגה" value={newLeague.name}
              onChange={(e) => setNewLeague(prev => ({ ...prev, name: e.target.value }))}
              className="input" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>מפתח (אנגלית)</label>
            <input type="text" placeholder="bundesliga" value={newLeague.key}
              onChange={(e) => setNewLeague(prev => ({ ...prev, key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))}
              className="input" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>צבע</label>
            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
              <input type="color" value={newLeague.color}
                onChange={(e) => setNewLeague(prev => ({ ...prev, color: e.target.value }))}
                style={{ width: '36px', height: '32px', border: 'none', cursor: 'pointer', borderRadius: '6px' }} />
              <input type="text" value={newLeague.color}
                onChange={(e) => setNewLeague(prev => ({ ...prev, color: e.target.value }))}
                className="input" style={{ ...inputStyle, flex: 1 }} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>סוג</label>
            <select value={newLeague.type}
              onChange={(e) => setNewLeague(prev => ({ ...prev, type: e.target.value }))}
              className="input" style={inputStyle}>
              <option value="club">קבוצות מועדון</option>
              <option value="national">נבחרות</option>
              <option value="other">אחר</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>אזור</label>
            <input type="text" placeholder="גרמניה" value={newLeague.region}
              onChange={(e) => setNewLeague(prev => ({ ...prev, region: e.target.value }))}
              className="input" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>סדר תצוגה</label>
            <input type="number" value={newLeague.order}
              onChange={(e) => setNewLeague(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
              className="input" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>מזהה API-Football</label>
            <input type="number" placeholder="39 / 140 / 383" value={newLeague.apiFootballId}
              onChange={(e) => setNewLeague(prev => ({ ...prev, apiFootballId: e.target.value }))}
              className="input" style={inputStyle}
              title="מזהה הליגה ב-API-Football. דוגמאות: פרמייר ליג=39, לה ליגה=140, ליגת העל=383" />
          </div>
        </div>
        <button onClick={handleCreateLeague} style={{
          width: '100%', padding: '0.55rem',
          background: 'linear-gradient(135deg, #28a745, #20c997)',
          color: 'white', border: 'none', borderRadius: '10px',
          fontSize: '14px', fontWeight: '700', cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(40,167,69,0.3)',
          WebkitAppearance: 'none', touchAction: 'manipulation'
        }}>
          ➕ צור ליגה חדשה
        </button>
      </div>

      {/* Leagues list */}
      <div className="card">
        <h2 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem 0', fontWeight: '700' }}>
          📋 ליגות קיימות
        </h2>

        {leagues.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-4, #999)', padding: '2rem', fontSize: '14px' }}>
            <div style={{ fontSize: '40px', marginBottom: '0.5rem' }}>🏆</div>
            אין ליגות במערכת עדיין
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {leagues.map((league, index) => (
              <div key={league._id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem 0.6rem',
                background: index % 2 === 0 ? '#fafafa' : '#fff',
                borderRadius: '10px',
                border: '1px solid var(--border, #f0f0f0)',
                animation: `slideUp 0.25s ease ${index * 0.03}s both`,
                transition: 'all 0.2s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                  <div style={{
                    width: '28px', height: '28px',
                    backgroundColor: league.color,
                    borderRadius: '8px',
                    flexShrink: 0,
                    boxShadow: `0 2px 6px ${league.color}44`
                  }}></div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text, #333)' }}>
                      {league.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-4, #aaa)' }}>
                        {league.key}
                      </span>
                      <span style={{
                        padding: '1px 6px',
                        backgroundColor: league.type === 'club' ? '#e3f2fd' : league.type === 'national' ? '#fff3cd' : '#f8f9fa',
                        borderRadius: '10px', fontSize: '10px', fontWeight: '600',
                        color: league.type === 'club' ? '#1565c0' : league.type === 'national' ? '#f57f17' : '#666'
                      }}>
                        {league.type === 'club' ? '🏢 מועדון' : league.type === 'national' ? '🌍 נבחרות' : '📌 אחר'}
                      </span>
                      {league.region && (
                        <span style={{ fontSize: '10px', color: 'var(--text-4, #999)' }}>{league.region}</span>
                      )}
                      <span style={{
                        fontSize: '10px', color: 'var(--text-4, #bbb)', fontWeight: '600'
                      }}>
                        #{league.order}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                  <button onClick={() => startEditing(league)} style={{
                    padding: '0.3rem 0.6rem',
                    background: 'linear-gradient(135deg, #ffc107, #ffb300)',
                    color: 'white', border: 'none', borderRadius: '8px',
                    fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                  }}>
                    ✏️
                  </button>
                  <button onClick={() => handleDeleteLeague(league._id, league.name)} style={{
                    padding: '0.3rem 0.6rem',
                    background: 'linear-gradient(135deg, #dc3545, #c62828)',
                    color: 'white', border: 'none', borderRadius: '8px',
                    fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                  }}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingLeague && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem'
        }}>
          <div style={{
            width: '100%', maxWidth: '500px',
            background: 'var(--surface, #fff)', borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid var(--border, #f0f0f0)',
              background: 'linear-gradient(135deg, #f8f9fa, #fff)'
            }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700' }}>
                ✏️ עריכת ליגה: {editingLeague.name}
              </h3>
            </div>

            <div style={{ padding: '0.75rem 1rem', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div>
                  <label style={labelStyle}>שם הליגה</label>
                  <input type="text" value={editForm.name || ''} className="input" style={inputStyle}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>מפתח</label>
                  <input type="text" value={editForm.key || ''} className="input" style={inputStyle}
                    onChange={(e) => setEditForm(prev => ({ ...prev, key: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>צבע</label>
                  <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                    <input type="color" value={editForm.color || '#6c757d'}
                      onChange={(e) => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                      style={{ width: '36px', height: '32px', border: 'none', cursor: 'pointer', borderRadius: '6px' }} />
                    <input type="text" value={editForm.color || ''} className="input"
                      style={{ ...inputStyle, flex: 1 }}
                      onChange={(e) => setEditForm(prev => ({ ...prev, color: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>סוג</label>
                  <select value={editForm.type || 'club'} className="input" style={inputStyle}
                    onChange={(e) => setEditForm(prev => ({ ...prev, type: e.target.value }))}>
                    <option value="club">קבוצות מועדון</option>
                    <option value="national">נבחרות</option>
                    <option value="other">אחר</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>אזור</label>
                  <input type="text" value={editForm.region || ''} className="input" style={inputStyle}
                    onChange={(e) => setEditForm(prev => ({ ...prev, region: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>סדר תצוגה</label>
                  <input type="number" value={editForm.order || 0} className="input" style={inputStyle}
                    onChange={(e) => setEditForm(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label style={labelStyle}>מזהה API-Football (אופציונלי)</label>
                  <input type="number" placeholder="39 / 140 / 383"
                    value={editForm.apiFootballId ?? ''} className="input" style={inputStyle}
                    onChange={(e) => setEditForm(prev => ({ ...prev, apiFootballId: e.target.value }))}
                    title="פרמייר ליג=39, לה ליגה=140, ליגת העל=383" />
                </div>
              </div>
            </div>

            <div style={{
              padding: '0.75rem 1rem',
              borderTop: '1px solid var(--border, #f0f0f0)',
              display: 'flex', gap: '0.5rem',
              background: 'var(--surface-2, #fafafa)'
            }}>
              <button onClick={handleUpdateLeague} style={{
                flex: 1, padding: '0.55rem',
                background: 'linear-gradient(135deg, #28a745, #20c997)',
                color: 'white', border: 'none', borderRadius: '10px',
                fontSize: '14px', fontWeight: '700', cursor: 'pointer'
              }}>
                💾 שמור
              </button>
              <button onClick={() => { setEditingLeague(null); setEditForm({}); }} style={{
                flex: 1, padding: '0.55rem',
                backgroundColor: '#6c757d', color: 'white', border: 'none',
                borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer'
              }}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeaguesManagement;
