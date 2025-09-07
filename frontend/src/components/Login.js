import React, { useState, useEffect } from 'react';

function Login({ onLogin }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // בדוק אם חזרנו מ-Google OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const loginStatus = urlParams.get('login');
    const userData = urlParams.get('user');

    if (loginStatus === 'success' && userData) {
      try {
        const user = JSON.parse(decodeURIComponent(userData));
        onLogin(user);
        // נקה את ה-URL
        window.history.replaceState({}, document.title, '/');
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, [onLogin]);

  const handleGoogleLogin = () => {
    setLoading(true);
    // הפנייה לGoogle OAuth
    window.location.href = 'https://football-betting-backend.onrender.com/api/auth/google';
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

        {/* התחברות עם Google בלבד */}
        <button 
          onClick={handleGoogleLogin} 
          disabled={loading}
          className="btn btn-primary" 
          style={{ 
            width: '100%', 
            backgroundColor: '#4285f4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '1rem',
            fontSize: '16px'
          }}
        >
          {loading ? '...' : '🔗'} 
          {loading ? 'מתחבר...' : 'התחבר עם Google'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', color: '#666', fontSize: '14px' }}>
          <p>התחברות מאובטחת דרך חשבון Google שלך</p>
          <p>📱 נגיש מכל מכשיר • 💻 עובד בכל דפדפן</p>
        </div>
      </div>
    </div>
  );
}

export default Login;