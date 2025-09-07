import React, { useState, useEffect } from 'react';

function Login({ onLogin }) {
  const [step, setStep] = useState('email'); // 'email' או 'code'
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // בדוק אם המשתמש חזר מהתחברות מוצלחת
    const urlParams = new URLSearchParams(window.location.search);
    const loginSuccess = urlParams.get('login');
    const userData = urlParams.get('user');

    if (loginSuccess === 'success' && userData) {
      try {
        const user = JSON.parse(decodeURIComponent(userData));
        onLogin(user);
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, [onLogin]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email || !name) {
      setMessage('יש למלא שם ואימייל');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://football-betting-backend.onrender.com/api/auth/request-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name })
      });

      const data = await response.json();
      
      if (response.ok) {
        setStep('code');
        setMessage(`קוד נשלח ל-${email}`);
      } else {
        setMessage(data.message || 'שגיאה בשליחת הקוד');
      }
    } catch (error) {
      setMessage('שגיאה בחיבור לשרת');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    if (!code) {
      setMessage('יש להכניס קוד');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://football-betting-backend.onrender.com/api/auth/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });

      const data = await response.json();
      
      if (response.ok) {
        onLogin(data.user);
      } else {
        setMessage(data.message || 'קוד שגוי');
      }
    } catch (error) {
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

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                שם מלא:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                style={{ width: '100%' }}
                placeholder="הכנס את השם שלך"
                required
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                אימייל:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                style={{ width: '100%' }}
                placeholder="הכנס את האימייל שלך"
                required
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="btn btn-primary" 
              style={{ width: '100%', padding: '1rem', fontSize: '16px' }}
            >
              {loading ? 'שולח קוד...' : 'שלח קוד התחברות'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit}>
            <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
              <p style={{ color: '#666', marginBottom: '1rem' }}>
                שלחנו קוד בן 4 ספרות ל:
              </p>
              <p style={{ fontWeight: 'bold' }}>{email}</p>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                קוד התחברות:
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="input"
                style={{ 
                  width: '100%', 
                  textAlign: 'center', 
                  fontSize: '24px', 
                  letterSpacing: '8px',
                  padding: '1rem'
                }}
                placeholder="0000"
                maxLength="4"
                required
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="btn btn-primary" 
              style={{ width: '100%', padding: '1rem', fontSize: '16px', marginBottom: '1rem' }}
            >
              {loading ? 'מתחבר...' : 'התחבר'}
            </button>

            <button 
              type="button"
              onClick={() => {
                setStep('email');
                setCode('');
                setMessage('');
              }}
              className="btn" 
              style={{ 
                width: '100%', 
                padding: '0.5rem', 
                backgroundColor: '#f8f9fa', 
                color: '#666' 
              }}
            >
              חזור לשלוח קוד חדש
            </button>
          </form>
        )}

        {message && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem', 
            backgroundColor: message.includes('שגיאה') ? '#f8d7da' : '#d4edda',
            color: message.includes('שגיאה') ? '#721c24' : '#155724',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            {message}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.5rem', color: '#666', fontSize: '14px' }}>
          <p>התחברות מאובטחת עם קוד חד-פעמי</p>
          <p>📱 נגיש מכל מכשיר • 💻 עובד בכל דפדפן</p>
        </div>
      </div>
    </div>
  );
}

export default Login;