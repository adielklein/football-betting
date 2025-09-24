import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import AdminView from './components/admin/AdminView';
import PlayerView from './components/player/PlayerView';
import './index.css';

// 🎨 ערכות נושא מובנות
const THEMES = {
  default: {
    name: 'בסיסי',
    colors: {
      primary: '#007bff',
      secondary: '#6c757d', 
      accent: '#28a745',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #1e3a8a 0%, #059669 100%)'
    },
    icon: '⚽'
  },
  barcelona: {
    name: 'ברצלונה',
    colors: {
      primary: '#A50044',
      secondary: '#004D98',
      accent: '#EDBB00',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #A50044 0%, #004D98 100%)'
    },
    icon: '🔵'
  },
  real_madrid: {
    name: 'ריאל מדריד',
    colors: {
      primary: '#ffffff',
      secondary: '#FEBE10',
      accent: '#00529F',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #ffffff 0%, #FEBE10 100%)'
    },
    icon: '👑'
  },
  liverpool: {
    name: 'ליברפול',
    colors: {
      primary: '#C8102E',
      secondary: '#F6EB61',
      accent: '#00B2A9',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #C8102E 0%, #F6EB61 100%)'
    },
    icon: '🐦'
  },
  manchester_united: {
    name: 'מנצ\'סטר יונייטד',
    colors: {
      primary: '#DA020E',
      secondary: '#FFE500',
      accent: '#DA020E',
      background: '#ffffff',
      headerBg: 'linear-gradient(135deg, #DA020E 0%, #FFE500 100%)'
    },
    icon: '👹'
  }
};

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // החל ערכת נושא
  const applyTheme = (user) => {
    const themeName = user?.theme || 'default';
    const theme = THEMES[themeName] || THEMES.default;
    
    console.log('🎨 מחיל ערכת נושא:', themeName, theme.name);
    
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', theme.colors.primary);
    root.style.setProperty('--theme-secondary', theme.colors.secondary);
    root.style.setProperty('--theme-accent', theme.colors.accent);
    root.style.setProperty('--theme-background', theme.colors.background);
    root.style.setProperty('--theme-header-bg', theme.colors.headerBg);
    root.style.setProperty('--theme-icon', `"${theme.icon}"`);
    root.style.setProperty('--theme-text', theme.colors.primary === '#ffffff' ? '#000000' : '#333333');
    root.style.setProperty('--theme-text-light', '#666666');
  };

  useEffect(() => {
    // בדוק אם יש משתמש שמור בLocalStorage
    const savedUser = localStorage.getItem('football_betting_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        console.log('✅ משתמש נטען מהזכרון:', parsedUser.name);
        console.log('🎨 ערכת הנושא שלו:', parsedUser.theme);
        
        setCurrentUser(parsedUser);
        applyTheme(parsedUser);
        
      } catch (error) {
        console.error('❌ שגיאה בטעינת משתמש:', error);
        localStorage.removeItem('football_betting_user');
      }
    } else {
      applyTheme(null); // החל ערכת בסיסית
    }
    setLoading(false);
  }, []);

  const handleLogin = (user) => {
    console.log('✅ התחברות מוצלחת:', user.name);
    console.log('🎨 ערכת נושא:', user.theme);
    
    setCurrentUser(user);
    localStorage.setItem('football_betting_user', JSON.stringify(user));
    applyTheme(user);
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 מתנתק...');
      localStorage.removeItem('football_betting_user');
      setCurrentUser(null);
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