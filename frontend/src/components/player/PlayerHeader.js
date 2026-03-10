import React, { useEffect } from 'react';
import { applyTheme } from '../../themes'; // 🎨 יבוא פונקציית ערכות הנושא

function PlayerHeader({ user, selectedWeek, userScore, onLogout }) {

  // 🔧 החל ערכת נושא אחרי שהקומפוננטה נטענה
  useEffect(() => {
    if (user) {
      console.log('🎨 PlayerHeader: מחיל ערכת נושא למשתמש:', user.name, user.theme);
      // חכה רגע קטן שה-DOM יתרענן ואז החל ערכת נושא
      setTimeout(() => {
        applyTheme(user);
      }, 100);
    }
  }, [user, user?.theme]); // רק כש-user או ה-theme שלו משתנים

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
            <h1 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              שלום {user.name}!
            </h1>
            <p style={{ color: '#fff', opacity: 0.9, fontSize: '0.85rem' }}>
              {selectedWeek?.name || 'אין שבוע פעיל'}
              {selectedWeek?.locked && ' (נעול)'}
            </p>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexShrink: 0
          }}>
            <div style={{
              textAlign: 'center',
              color: 'white',
              backgroundColor: 'rgba(255,255,255,0.15)',
              padding: '0.3rem 0.6rem',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '10px', opacity: 0.85, lineHeight: 1 }}>ניקוד</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: 1.3 }}>
                {userScore || 0}
              </div>
            </div>
            <button onClick={onLogout} className="btn" style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              padding: '0.4rem 0.7rem',
              fontSize: '13px',
              margin: 0
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
