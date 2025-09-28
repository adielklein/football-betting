import React, { useEffect } from 'react';
import { applyTheme } from '../../themes'; // 🎨 יבוא פונקציית ערכות הנושא

function AdminHeader({ user, onLogout }) {
  
  // 🔧 החל ערכת נושא אחרי שהקומפוננטה נטענה
  useEffect(() => {
    if (user) {
      console.log('🎨 AdminHeader: מחיל ערכת נושא למשתמש:', user.name, user.theme);
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
            <h1>פאנל ניהול - {user?.name || 'משתמש'}</h1>
            <p style={{ color: '#fff', opacity: 0.9 }}>ניהול משחקים ושחקנים</p>
          </div>
          <button 
            onClick={onLogout} 
            className="btn" 
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
          >
            יציאה
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminHeader;