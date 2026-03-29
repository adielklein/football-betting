import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import AdminView from './components/admin/AdminView';
import PlayerView from './components/player/PlayerView';
import { applyTheme } from './themes'; // 🎨 יבוא פונקציית ערכות הנושא
import './index.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inAppNotification, setInAppNotification] = useState(null);

  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  useEffect(() => {
    console.log('🎨 App.js - התחלת טעינה, מחפש משתמש שמור...');
    
    // בדוק אם יש משתמש שמור בLocalStorage
    const savedUser = localStorage.getItem('football_betting_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        console.log('✅ משתמש נטען מהזכרון:', parsedUser.name);
        console.log('🎨 ערכת הנושא שלו:', parsedUser.theme || 'default');
        
        // וודא שיש שדה theme
        if (!parsedUser.theme) {
          parsedUser.theme = 'default';
          localStorage.setItem('football_betting_user', JSON.stringify(parsedUser));
          console.log('🔧 הוספת ערכת נושא default למשתמש');
        }
        
        setCurrentUser(parsedUser);
        
        // 🎨 החל ערכת נושא מיד אחרי טעינת המשתמש
        console.log('🎨 מחיל ערכת נושא אחרי טעינה:', parsedUser.theme);
        applyTheme(parsedUser);
        
        // 🆕 בדוק עם השרת אם יש עדכונים לערכת הנושא
        checkForThemeUpdates(parsedUser);
        
      } catch (error) {
        console.error('❌ שגיאה בטעינת משתמש:', error);
        localStorage.removeItem('football_betting_user');
        // החל ערכת בסיסית במקרה של שגיאה
        applyTheme(null);
      }
    } else {
      console.log('ℹ️ אין משתמש שמור, מחיל ערכת נושא בסיסית');
      applyTheme(null); // החל ערכת בסיסית
    }
    setLoading(false);
  }, []); // 🎨 רק פעם אחת בטעינת הדף

  // בדיקת התראה in-app חדשה
  useEffect(() => {
    if (!currentUser) return;
    fetch(`${API_URL}/notifications/latest`)
      .then(r => r.ok ? r.json() : null)
      .then(notif => {
        if (!notif || !notif._id) return;
        const lastSeen = localStorage.getItem('last_seen_notification');
        if (lastSeen !== notif._id) {
          setInAppNotification(notif);
        }
      })
      .catch(() => {});
  }, [currentUser, API_URL]);

  const dismissNotification = () => {
    if (inAppNotification) {
      localStorage.setItem('last_seen_notification', inAppNotification._id);
    }
    setInAppNotification(null);
  };

  // 🆕 פונקציה לבדיקת עדכוני ערכת נושא מהשרת
  const checkForThemeUpdates = async (localUser) => {
    try {
      console.log('🔄 בודק עדכונים מהשרת למשתמש:', localUser.name);
      
      const response = await fetch(`${API_URL}/auth/users`);
      if (!response.ok) {
        console.log('🔄 לא ניתן לבדוק עדכונים מהשרת - ממשיך עם נתוני המטמון');
        return;
      }
      
      const users = await response.json();
      const serverUser = users.find(u => u._id === localUser.id);
      
      if (serverUser && serverUser.theme !== localUser.theme) {
        console.log('🎨 נמצא עדכון ערכת נושא!');
        console.log('🔄 מטמון:', localUser.theme, '→ שרת:', serverUser.theme);
        
        // עדכן את הנתונים המקומיים
        const updatedUser = {
          ...localUser,
          theme: serverUser.theme,
          name: serverUser.name || localUser.name,
          username: serverUser.username || localUser.username,
          role: serverUser.role || localUser.role
        };
        
        // שמור ב-localStorage
        localStorage.setItem('football_betting_user', JSON.stringify(updatedUser));
        
        // עדכן state
        setCurrentUser(updatedUser);
        
        // החל ערכת נושא חדשה
        console.log('🎨 מחיל ערכת נושא מעודכנת:', serverUser.theme);
        applyTheme(updatedUser);
        
        console.log('✅ ערכת נושא עודכנה בהצלחה!');
      } else {
        console.log('✅ ערכת הנושא מעודכנת');
      }
    } catch (error) {
      console.log('🔄 שגיאה בבדיקת עדכונים - ממשיך עם נתוני המטמון:', error.message);
    }
  };

  // 🎨 רענון נוסף כאשר currentUser משתנה
  useEffect(() => {
    if (currentUser) {
      console.log('🎨 משתמש השתנה, מרענן ערכת נושא:', currentUser.name, currentUser.theme);
      applyTheme(currentUser);
    }
  }, [currentUser]); // כאשר currentUser משתנה

  const handleLogin = (user) => {
    console.log('✅ התחברות מוצלחת:', user.name);
    console.log('🎨 ערכת נושא:', user.theme || 'default');
    
    // וודא שיש שדה theme
    if (!user.theme) {
      user.theme = 'default';
      console.log('🔧 הוספת ערכת נושא default למשתמש חדש');
    }
    
    setCurrentUser(user);
    localStorage.setItem('football_betting_user', JSON.stringify(user));
    
    // 🎨 החל ערכת נושא מיד אחרי התחברות
    console.log('🎨 מחיל ערכת נושא אחרי התחברות:', user.theme);
    applyTheme(user);
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 מתנתק...');
      localStorage.removeItem('football_betting_user');
      setCurrentUser(null);
      
      // 🎨 החזר לערכת בסיסית אחרי התנתקות
      console.log('🎨 מחזיר לערכת נושא בסיסית אחרי התנתקות');
      applyTheme(null);
      
      console.log('✅ התנתקות הושלמה');
    } catch (error) {
      console.error('❌ שגיאה בהתנתקות:', error);
      localStorage.removeItem('football_betting_user');
      setCurrentUser(null);
      applyTheme(null); // החזר לערכת בסיסית
    }
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid var(--theme-primary, #007bff)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem'
        }}></div>
        <h2 style={{ color: 'var(--theme-text, #666)', fontSize: '1.2rem' }}>טוען...</h2>
        
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="App">
      {!currentUser ? (
        <Login onLogin={handleLogin} />
      ) : currentUser.role === 'admin' ? (
        <AdminView user={currentUser} onLogout={handleLogout} />
      ) : (
        <PlayerView user={currentUser} onLogout={handleLogout} />
      )}

      {inAppNotification && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem'
        }} onClick={dismissNotification}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '16px', maxWidth: '400px', width: '100%',
            maxHeight: '85vh', overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            animation: 'slideUp 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>
            {inAppNotification.imageUrl && (
              <img
                src={inAppNotification.imageUrl}
                alt=""
                style={{ width: '100%', display: 'block' }}
              />
            )}
            <div style={{ padding: '1.2rem 1.5rem' }}>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '18px', color: '#333', textAlign: 'right' }}>
                {inAppNotification.title}
              </h3>
              <p style={{ margin: '0 0 1rem', fontSize: '15px', color: '#555', lineHeight: 1.5, textAlign: 'right', whiteSpace: 'pre-line' }}>
                {inAppNotification.body}
              </p>
              <button
                onClick={dismissNotification}
                style={{
                  width: '100%', padding: '10px', border: 'none', borderRadius: '10px',
                  backgroundColor: 'var(--theme-primary, #007bff)', color: '#fff',
                  fontSize: '16px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                הבנתי 👍
              </button>
            </div>
          </div>
          <style>{`
            @keyframes slideUp {
              from { transform: translateY(30px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

export default App;