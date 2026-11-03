import React, { useState, useEffect, useRef } from 'react';
import { applyTheme } from '../themes';
import { hapticError } from '../services/haptics';
import { play } from '../services/motion';

function Login({ onLogin, notice = null }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const cardRef = useRef(null);

  // שגיאה: הכרטיס רועד והטלפון רוטט פעמיים - מורגש עוד לפני שקוראים את ההודעה
  const fail = (text) => {
    setMessage(text);
    hapticError();
    play(cardRef.current, [
      { transform: 'translateX(0)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(10px)' },
      { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }
    ], { duration: 440, easing: 'ease-in-out', composite: 'add' });
  };

  const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  useEffect(() => {
    applyTheme(null);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      fail('יש למלא שם משתמש וסיסמה');
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
        if (data.user.theme) {
          applyTheme(data.user);
          setTimeout(() => { onLogin(data.user); }, 200);
        } else {
          onLogin(data.user);
        }
      } else {
        fail(data.message || 'שם משתמש או סיסמה שגויים');
      }
    } catch (error) {
      console.error('Login error:', error);
      fail('שגיאה בחיבור לשרת');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--theme-header-bg, linear-gradient(135deg, #1e3a8a 0%, #059669 100%))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div ref={cardRef} style={{
        width: '100%',
        maxWidth: '380px',
        background: 'rgba(255,255,255,0.97)',
        borderRadius: '20px',
        padding: '2rem 1.5rem',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.1)',
        animation: 'scaleIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)'
      }}>
        {/* לוגו */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img
            src="/gamball-logo.jpeg"
            alt="GAMBALL Logo"
            style={{
              width: '140px',
              height: 'auto',
              marginBottom: '0.75rem',
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
              borderRadius: '12px'
            }}
          />
          <p style={{ color: 'var(--text-3, #888)', fontSize: 'var(--fs-sm)', fontWeight: '500' }}>
            פרמיירליג • לה ליגה • ליגת העל
          </p>
        </div>

        {/* למה מבקשים להתחבר שוב - בלי הסבר זה נראה כמו תקלה */}
        {notice && (
          <div role="status" style={{
            marginBottom: '0.9rem', padding: '0.65rem 0.8rem', borderRadius: '12px',
            background: 'var(--info-bg, #eef4ff)', color: 'var(--info-fg, #1e40af)',
            border: '1px solid var(--info-border, #c7d7fe)', fontSize: 'var(--fs-sm)', lineHeight: 1.5
          }}>
            {notice === 'security' ? (
              <>
                <strong>🔒 עדכון אבטחה – צריך להתחבר מחדש פעם אחת.</strong>
                <br />ההימורים, הניקוד וההגדרות שלך שמורים. שכחת סיסמה? פנה למנהל.
              </>
            ) : (
              <>
                <strong>החיבור הסתיים – צריך להתחבר מחדש.</strong>
                <br />זה קורה למשל כשהסיסמה הוחלפה.
              </>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{
              display: 'block', marginBottom: '0.35rem',
              fontWeight: '600', fontSize: 'var(--fs-sm)', color: 'var(--text-2, #555)'
            }}>
              שם משתמש
            </label>
            {/* בלי תיקון אוטומטי: המקלדת "מתקנת" שמות בעברית למילים אחרות,
                ושם משתמש צריך להגיע בדיוק כמו שהוקלד */}
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="input"
              style={{
                width: '100%',
                padding: '0.7rem 0.85rem',
                borderRadius: '12px',
                border: '1.5px solid #e5e7eb',
                fontSize: 'var(--fs-md)',
                backgroundColor: 'var(--surface-2, #f8f9fc)',
                transition: 'all 0.25s ease'
              }}
              placeholder="הכנס שם משתמש"
              required
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block', marginBottom: '0.35rem',
              fontWeight: '600', fontSize: 'var(--fs-sm)', color: 'var(--text-2, #555)'
            }}>
              סיסמה
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="input"
              style={{
                width: '100%',
                padding: '0.7rem 0.85rem',
                borderRadius: '12px',
                border: '1.5px solid #e5e7eb',
                fontSize: 'var(--fs-md)',
                backgroundColor: 'var(--surface-2, #f8f9fc)',
                transition: 'all 0.25s ease'
              }}
              placeholder="הכנס סיסמה"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.8rem',
              fontSize: 'var(--fs-md)',
              fontWeight: '700',
              background: loading ? '#ccc' : 'linear-gradient(135deg, var(--theme-primary, #007bff), var(--theme-secondary, #6c757d))',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: loading ? 'wait' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(0,0,0,0.15)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              WebkitAppearance: 'none',
              touchAction: 'manipulation'
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span style={{
                  width: '18px', height: '18px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  display: 'inline-block'
                }}></span>
                מתחבר...
              </span>
            ) : 'התחבר'}
          </button>
        </form>

        {message && (
          <div style={{
            marginTop: '0.75rem',
            padding: '0.6rem 0.75rem',
            background: message.includes('שגיאה') || message.includes('שגויים')
              ? 'var(--bad-bg, #fee2e2)'
              : 'var(--good-bg, #dcfce7)',
            color: message.includes('שגיאה') || message.includes('שגויים') ? 'var(--bad-fg, #991b1b)' : 'var(--good-fg, #166534)',
            borderRadius: '10px',
            textAlign: 'center',
            fontSize: 'var(--fs-sm)',
            fontWeight: '600',
            animation: 'slideUp 0.3s ease'
          }}>
            {message}
          </div>
        )}

        <div style={{
          textAlign: 'center', marginTop: '1.25rem',
          color: 'var(--text-4, #aaa)', fontSize: 'var(--fs-xs)', lineHeight: 1.6
        }}>
          <p>פנה למנהל המערכת לקבלת פרטי התחברות</p>
          <p style={{ marginTop: '0.25rem' }}>📱 מכל מכשיר • 💻 כל דפדפן</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
