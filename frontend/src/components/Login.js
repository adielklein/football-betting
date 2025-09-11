import React, { useState } from 'react';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setMessage('יש למלא שם משתמש וסיסמה');
      return;
    }

    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      
      if (response.ok) {
        onLogin(data.user);
      } else {
        setMessage(data.message || 'שם משתמש או סיסמה שגויים');
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage('שגיאה בחיבור לשרת');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1e3a8a 0%, #059669 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            🏆 קבוצת הימורים
          </h1>
          <p style={{ color: '#666' }}>פרמייר ליג • לה ליגה • ליגת העל</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              שם משתמש:
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              style={{ width: '100%' }}
              placeholder="הכנס שם משתמש"
              required
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              סיסמה:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              style={{ width: '100%' }}
              placeholder="הכנס סיסמה"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="btn btn-primary" 
            style={{ width: '100%', padding: '1rem', fontSize: '16px' }}
          >
            {loading ? 'מתחבר...' : 'התחבר'}
          </button>
        </form>

        {message && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem', 
            backgroundColor: message.includes('שגיאה') || message.includes('שגויים') ? '#f8d7da' : '#d4edda',
            color: message.includes('שגיאה') || message.includes('שגויים') ? '#721c24' : '#155724',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            {message}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.5rem', color: '#666', fontSize: '14px' }}>
          <p>פנה למנהל המערכת לקבלת פרטי התחברות</p>
          <p>📱 נגיש מכל מכשיר • 💻 עובד בכל דפדפן</p>
        </div>
      </div>
    </div>
  );
}

export default Login;