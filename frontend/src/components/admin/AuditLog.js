import React, { useState, useEffect } from 'react';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : 'https://football-betting-backend.onrender.com/api';

function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/audit?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error('Error loading audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 15000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString('he-IL', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>טוען...</div>;
  }

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '0.75rem'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>מעקב פעולות אדמין</h3>
        <button onClick={loadLogs} style={{
          padding: '0.3rem 0.6rem', border: 'none', borderRadius: '8px',
          backgroundColor: '#f0f2f5', fontSize: '12px', cursor: 'pointer'
        }}>רענן</button>
      </div>

      {logs.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '2rem', color: '#888',
          backgroundColor: '#f9f9f9', borderRadius: '12px'
        }}>
          אין פעולות מתועדות
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {logs.map(log => (
            <div key={log._id} style={{
              backgroundColor: '#fff',
              border: '1px solid #e8e8e8',
              borderRadius: '10px',
              padding: '0.6rem 0.8rem',
              borderRight: log.adminName !== 'עדיאל קליין' ? '3px solid #ff3b30' : '3px solid #ccc'
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '4px'
              }}>
                <span style={{
                  fontWeight: '700', fontSize: '13px',
                  color: log.adminName !== 'עדיאל קליין' ? '#ff3b30' : '#333'
                }}>
                  {log.adminName}
                </span>
                <span style={{ fontSize: '11px', color: '#999' }}>
                  {formatDate(log.createdAt)}
                </span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>
                {log.action}
              </div>
              {log.details && (
                <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                  {log.details}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AuditLog;
