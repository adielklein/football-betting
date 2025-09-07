import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import AdminView from './components/admin/AdminView';
import PlayerView from './components/player/PlayerView';
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
        console.log('משתמש נטען מהזכרון:', parsedUser.name);
        setCurrentUser(parsedUser);
      } catch (error) {
        console.error('שגיאה בטעינת משתמש:', error);
        localStorage.removeItem('football_betting_user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (user) => {
    console.log('התחברות מוצלחת:', user.name, user.role);
    setCurrentUser(user);
    
    // שמור משתמש בLocalStorage
    localStorage.setItem('football_betting_user', JSON.stringify(user));
  };

  const handleLogout = async () => {
    try {
      console.log('מתנתק...');
      
      // נקה את המשתמש מהזכרון המקומי
      localStorage.removeItem('football_betting_user');
      setCurrentUser(null);
      
      console.log('התנתקות הושלמה');
    } catch (error) {
      console.error('שגיאה בהתנתקות:', error);
      // גם במקרה של שגיאה, נקה את המשתמש
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
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem'
        }}></div>
        <h2 style={{ color: '#666', fontSize: '1.2rem' }}>טוען...</h2>
        
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  if (currentUser.role === 'admin') {
    return <AdminView user={currentUser} onLogout={handleLogout} />;
  }

  return <PlayerView user={currentUser} onLogout={handleLogout} />;
}

export default App;