import React, { useEffect } from 'react';
import { applyTheme } from '../../themes';

function PlayerHeader({ user, selectedWeek, userScore, onLogout }) {

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
          gap: '0.5rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ minWidth: 0, flex: '1 1 auto' }}>
            <h1 style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '-0.3px'
            }}>
              שלום {user.name}!
            </h1>
            <p style={{
              color: '#fff',
              opacity: 0.85,
              fontSize: '0.8rem',
              marginTop: '2px',
              letterSpacing: '0.2px'
            }}>
              {selectedWeek?.name || 'אין שבוע פעיל'}
              {selectedWeek?.locked && ' (נעול)'}
            </p>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            flexShrink: 0
          }}>
            <div style={{
              textAlign: 'center',
              color: 'white',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.08) 100%)',
              padding: '0.35rem 0.7rem',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)'
            }}>
              <div style={{ fontSize: '9px', opacity: 0.8, lineHeight: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ניקוד</div>
              <div style={{ fontSize: '18px', fontWeight: '700', lineHeight: 1.2 }}>
                {userScore || 0}
              </div>
            </div>
            <button onClick={onLogout} className="btn" style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.08) 100%)',
              color: 'white',
              padding: '0.4rem 0.7rem',
              fontSize: '13px',
              margin: 0,
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.15)',
              fontWeight: '500'
            }}>
              יציאה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerHeader;
