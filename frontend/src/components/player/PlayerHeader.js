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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>שלום {user.name}!</h1>
            <p style={{ color: '#fff', opacity: 0.9 }}>
              {selectedWeek?.name || 'אין שבוע פעיל'}
              {selectedWeek?.locked && ' (נעול)'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'center', color: 'white' }}>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>הניקוד שלך</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {userScore || 0}
              </div>
            </div>
            <button onClick={onLogout} className="btn" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
              יציאה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerHeader;