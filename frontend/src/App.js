import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import AdminView from './components/admin/AdminView';
import PlayerView from './components/player/PlayerView';
import { applyTheme } from './themes'; // 🎨 יבוא פונקציית ערכות הנושא
import './index.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        }
        
        setCurrentUser(parsedUser);
        applyTheme(parsedUser); // 🎨 החל ערכת נושא
        
      } catch (error) {
        console.error('❌ שגיאה בטעינת משתמש:', error);
        localStorage.removeItem('football_betting_user');
        applyTheme(null); // החל ערכת בסיסית
      }
    } else {
      applyTheme(null); // החל ערכת בסיסית
    }
    setLoading(false);
  }, []);

  const handleLogin = (user) => {
    console.log('✅ התחברות מוצלחת:', user.name);
    console.log('🎨 ערכת נושא:', user.theme || 'default');
    
    // וודא שיש שדה theme
    if (!user.theme) {
      user.theme = 'default';
    }
    
    setCurrentUser(user);
    localStorage.setItem('football_betting_user', JSON.stringify(user));
    applyTheme(user); // 🎨 החל ערכת נושא
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 מתנתק...');
      localStorage.removeItem('football_betting_user');
      setCurrentUser(null);
      applyTheme(null); // החזר לערכת בסיסית
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
    </div>
  );
}

export default App;