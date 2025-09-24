import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import AdminView from './components/admin/AdminView';
import PlayerView from './components/player/PlayerView';
import './index.css';

// 🔧 DEBUG: נסה לייבא themes
let getTheme = null;
try {
  const themesModule = require('./themes');
  getTheme = themesModule.getTheme;
  console.log('✅ themes.js נטען בהצלחה');
} catch (error) {
  console.error('❌ שגיאה בטעינת themes.js:', error);
  console.log('🔧 ודא שקובץ src/themes.js קיים');
}

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔧 DEBUG: פונקציה לטעינת ערכת נושא
  const applyTheme = (user) => {
    console.log('🎨 מנסה להחיל ערכת נושא עבור:', user);
    
    if (!user || !user.theme) {
      console.log('⚠️ אין משתמש או ערכת נושא, משתמש בבסיסית');
      return;
    }

    try {
      // יבוא דינמי
      const { getTheme } = require('./themes');
      const theme = getTheme(user.theme);
      
      console.log('🎨 ערכת נושא נמצאה:', user.theme, theme);
      
      // החל CSS variables
      const root = document.documentElement;
      
      root.style.setProperty('--theme-primary', theme.colors.primary);
      root.style.setProperty('--theme-secondary', theme.colors.secondary);
      root.style.setProperty('--theme-accent', theme.colors.accent);
      root.style.setProperty('--theme-background', theme.colors.background);
      root.style.setProperty('--theme-header-bg', theme.colors.headerBg);
      root.style.setProperty('--theme-icon', `"${theme.icon}"`);
      root.style.setProperty('--theme-text', theme.colors.primary === '#ffffff' ? '#000000' : '#333333');
      root.style.setProperty('--theme-text-light', '#666666');
      
      console.log('✅ ערכת נושא הוחלה בהצלחה!');
      
    } catch (error) {
      console.error('❌ שגיאה בהחלת ערכת נושא:', error);
    }
  };

  useEffect(() => {
    // בדוק אם יש משתמש שמור בLocalStorage
    const savedUser = localStorage.getItem('football_betting_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        console.log('✅ משתמש נטען מהזכרון:', parsedUser);
        console.log('🎨 ערכת הנושא שלו:', parsedUser.theme);
        
        setCurrentUser(parsedUser);
        applyTheme(parsedUser); // 🔧 החל ערכת נושא
        
      } catch (error) {
        console.error('❌ שגיאה בטעינת משתמש:', error);
        localStorage.removeItem('football_betting_user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (user) => {
    console.log('✅ התחברות מוצלחת:', user);
    console.log('🎨 ערכת נושא בהתחברות:', user.theme);
    
    setCurrentUser(user);
    
    // שמור משתמש בLocalStorage
    localStorage.setItem('football_betting_user', JSON.stringify(user));
    
    // החל ערכת נושא
    applyTheme(user);
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 מתנתק...');
      
      // נקה את המשתמש מהזכרון המקומי
      localStorage.removeItem('football_betting_user');
      setCurrentUser(null);
      
      // החזר לערכת נושא בסיסית
      applyTheme(null);
      
      console.log('✅ התנתקות הושלמה');
    } catch (error) {
      console.error('❌ שגיאה בהתנתקות:', error);
      localStorage.removeItem('football_betting_user');
      setCurrentUser(null);
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
    </div>
  );
}

export default App;