import React, { useEffect } from 'react';
import { applyTheme } from '../../themes';

function AdminHeader({ user, onLogout }) {
  useEffect(() => {
    if (user) {
      setTimeout(() => {
        applyTheme(user);
      }, 100);
    }
  }, [user, user?.theme]);

  return (
    <div className="header">
      <div className="container">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.15rem 0'
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{
              fontSize: '1.1rem',
              margin: 0,
              fontWeight: '700',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              פאנל ניהול
            </h1>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '0.15rem'
            }}>
              <span style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.08) 100%)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                padding: '2px 10px',
                borderRadius: '20px',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.95)',
                border: '1px solid rgba(255,255,255,0.15)',
                fontWeight: '600'
              }}>
                👑 {user?.name || 'מנהל'}
              </span>
            </div>
          </div>
          <button
            onClick={onLogout}
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '10px',
              padding: '0.4rem 0.9rem',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              WebkitAppearance: 'none',
              touchAction: 'manipulation',
              flexShrink: 0
            }}
          >
            יציאה
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminHeader;
