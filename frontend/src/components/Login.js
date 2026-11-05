import React, { Suspense, useState, useEffect, useRef } from 'react';
import PenaltyGame, { loadGame } from './LazyPenaltyGame';
import { applyTheme } from '../themes';
import { hapticError } from '../services/haptics';
import { play, reducedMotion } from '../services/motion';
import { createGoalScene } from './goalScene';

function Login({ onLogin, notice = null }) {
  const [usernameState, setUsername] = useState('');
  const [passwordState, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
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

  // פתיחה: פנדל באצטדיון (goalScene.js). כרטיס הכניסה עולה מיד אחרי הגול,
  // "דלג" או לחיצה על המסך מביאים אותו מיד, והשדות פעילים כל הזמן
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const [cardUp, setCardUp] = useState(false);
  useEffect(() => {
    if (!canvasRef.current) return undefined;
    const scene = createGoalScene(canvasRef.current, {
      reduced: reducedMotion(),
      onDone: () => setCardUp(true)
    });
    sceneRef.current = scene;
    scene.play();
    return () => scene.destroy();
  }, []);
  const skipIntro = () => sceneRef.current && sceneRef.current.skip();

  // סוד: גוררים את כרטיס הכניסה למטה (או את המגרש), הוא יורד מהמסך, והשוער
  // קם לעוד סיבוב - משחק הבעיטות, באותו אצטדיון. אין לזה שום רמז על המסך.
  // אירועי מגע ולא pointer: הדפדפן מבטל pointer ברגע שהוא מחליט לגלול,
  // ו-touchmove/touchend מגיעים תמיד
  const [playing, setPlaying] = useState(false);
  const [settled, setSettled] = useState(false);
  const drag = useRef(null);

  // במסך הכניסה אין מה לרענן, ו"משוך לרענון" של הדפדפן היה חוטף את הגרירה
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.overscrollBehaviorY;
    root.style.overscrollBehaviorY = 'none';
    return () => { root.style.overscrollBehaviorY = prev; };
  }, []);
  // קובץ המשחק נטען ברקע אחרי שהכרטיס עלה, כדי שהמעבר יהיה מיידי
  useEffect(() => {
    if (!cardUp) return undefined;
    const id = setTimeout(() => { loadGame().catch(() => {}); }, 1500);
    return () => clearTimeout(id);
  }, [cardUp]);

  const setCard = (transform, transition) => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transition = transition;
    card.style.transform = transform;
  };
  const dragStart = (x, y, target) => {
    drag.current = null;
    if (!cardUp || success || playing) return;
    if (target.closest && target.closest('input, button, a, select, textarea, label')) return;
    // מקלדת פתוחה: גרירה היא גלילה, לא משחק
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
    const now = performance.now();
    drag.current = { x, y, dy: 0, active: false, lastY: y, lastT: now, v: 0 };
  };
  const dragMove = (x, y) => {
    const d = drag.current;
    if (!d) return;
    const dy = y - d.y, dx = x - d.x;
    if (!d.active) {
      if (dy > 8 && dy > Math.abs(dx)) d.active = true;
      else if (Math.abs(dx) > 14 || dy < -14) { drag.current = null; return; }
      else return;
    }
    const now = performance.now();
    d.v = (y - d.lastY) / Math.max(1, now - d.lastT);
    d.lastY = y; d.lastT = now;
    d.dy = Math.max(0, dy);
    setCard(`translateY(${d.dy}px)`, 'none');
  };
  const dragEnd = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.active) return;
    if (d.dy > 110 || (d.v > 0.6 && d.dy > 70)) openGame();
    else setCard('translateY(0)', reducedMotion() ? 'none' : 'transform .45s cubic-bezier(.2,1.35,.4,1)');
  };
  const openGame = () => {
    const card = cardRef.current;
    // עד שהכרטיס יוצא כולו מתחתית המסך, מכל מקום שבו הוא עומד
    // offsetTop: המקום של הכרטיס בלי הגרירה (transform לא משפיע עליו)
    const off = window.innerHeight - (card ? card.offsetTop - window.scrollY : 0) + 40;
    setCard(`translateY(${off}px)`, reducedMotion() ? 'none' : 'transform .42s cubic-bezier(.4,0,.2,1)');
    setPlaying(true);
  };
  const closeGame = () => {
    setPlaying(false);
    setCard('translateY(0)', reducedMotion() ? 'none' : 'transform .6s cubic-bezier(.16,1,.3,1)');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // ערכים שהדפדפן מילא לבד (סיסמה שמורה) לא תמיד מגיעים ל-state - בחלק
    // מהדפדפנים אין אירוע שינוי עד שנוגעים בדף. לכן קוראים מהשדות עצמם
    const form = e.currentTarget;
    const username = (form.elements.username?.value ?? '').trim() || usernameState;
    const password = form.elements.password?.value || passwordState;
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
        // הצלחה: הכפתור הופך ל-✓, הכרטיס נעלם, ורק אז נכנסים. פחות משנייה
        if (data.user.theme) applyTheme(data.user);
        if (reducedMotion()) { onLogin(data.user); return; }
        setSuccess(true);
        sceneRef.current && sceneRef.current.skip();
        setTimeout(() => play(cardRef.current, [
          { opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(12px) scale(.94)' }
        ], { duration: 300, easing: 'ease-in', fill: 'forwards', composite: 'add' }), 480);
        setTimeout(() => onLogin(data.user), 780);
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
    <div
      className="login-stage"
      onPointerDown={(e) => {
        if (playing) return; // מגע בתוך המשחק מגיע לכאן דרך העץ של React
        if (!cardRef.current || !cardRef.current.contains(e.target)) skipIntro();
        if (e.pointerType === 'mouse') dragStart(e.clientX, e.clientY, e.target);
      }}
      onPointerMove={(e) => { if (e.pointerType === 'mouse' && e.buttons) dragMove(e.clientX, e.clientY); }}
      onPointerUp={(e) => { if (e.pointerType === 'mouse') dragEnd(); }}
      onTouchStart={(e) => { if (e.touches.length === 1) dragStart(e.touches[0].clientX, e.touches[0].clientY, e.target); else drag.current = null; }}
      onTouchMove={(e) => { const t = e.touches[0]; if (t) dragMove(t.clientX, t.clientY); }}
      onTouchEnd={dragEnd}
      onTouchCancel={dragEnd}
      style={{
        minHeight: '100dvh',
        background: '#02040a',
        display: 'flex',
        flexDirection: 'column',
        // הכרטיס באמצע המסך, כמו שהיה לפני האצטדיון
        justifyContent: 'center',
        alignItems: 'center',
        padding: '16px 16px max(18px, env(safe-area-inset-bottom, 0px))',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* האצטדיון. קבוע למסך, כך שהמקלדת יכולה לגלול את הכרטיס בלי להזיז אותו */}
      {/* touchAction none: גרירה שמתחילה על המגרש שייכת למשחק. בלי זה כרום
          תופס גרירה למטה כ"משוך לרענון", מבטל את המגע, והמשחק לא נפתח */}
      <canvas ref={canvasRef} aria-hidden="true" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'block', touchAction: 'none' }} />

      {!cardUp && (
        <button type="button" onClick={skipIntro} style={{
          position: 'fixed', zIndex: 2,
          top: 'max(14px, env(safe-area-inset-top, 0px))', left: '14px',
          font: 'inherit', fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'rgba(255,255,255,.9)',
          background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)',
          WebkitBackdropFilter: 'blur(6px)', backdropFilter: 'blur(6px)',
          padding: '6px 14px', minHeight: '32px', borderRadius: '999px', cursor: 'pointer'
        }}>
          דלג
        </button>
      )}

      <div ref={cardRef} className={`login-card${cardUp ? ' up' : ''}${settled ? ' settled' : ''}`}
        onAnimationEnd={(e) => { if (e.target === cardRef.current && e.animationName === 'loginCardUp') setSettled(true); }}
        style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '400px',
        borderRadius: '26px',
        padding: '1.25rem 1.15rem 1.1rem',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.35)'
      }}>
        {/* לוגו */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
          <img
            src="/gamball-logo.jpeg"
            alt=""
            style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '13px', boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: 'var(--fs-lg)', fontWeight: 800, letterSpacing: '0.5px', color: 'var(--text, #1f2430)' }}>GAMBALL</h1>
            <p style={{ margin: 0, color: 'var(--text-2, #4a505c)', fontSize: 'var(--fs-xs)', fontWeight: 500 }}>
              פרמיירליג • לה ליגה • ליגת העל
            </p>
          </div>
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
              name="username"
              value={usernameState}
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

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block', marginBottom: '0.35rem',
              fontWeight: '600', fontSize: 'var(--fs-sm)', color: 'var(--text-2, #555)'
            }}>
              סיסמה
            </label>
            <input
              type="password"
              name="password"
              value={passwordState}
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
            disabled={loading || success}
            aria-label={success ? 'מחובר' : undefined}
            style={{
              display: 'grid',
              placeItems: 'center',
              width: success ? '52px' : '100%',
              height: '52px',
              margin: '0 auto',
              fontSize: 'var(--fs-md)',
              fontWeight: '700',
              background: success
                ? '#15803d'
                : (loading ? '#9aa3af' : 'linear-gradient(135deg, var(--theme-primary, #007bff), var(--theme-secondary, #6c757d))'),
              color: 'white',
              border: 'none',
              borderRadius: success ? '50%' : '14px',
              cursor: loading ? 'wait' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(0,0,0,0.15)',
              transition: 'width .35s cubic-bezier(.4,0,.2,1), border-radius .35s, background .3s',
              WebkitAppearance: 'none',
              touchAction: 'manipulation'
            }}
          >
            {success ? (
              <svg width="24" height="24" viewBox="0 0 14 14" aria-hidden="true" className="draw-check">
                <path d="M2 7.5 L5.5 11 L12 3.5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : loading ? (
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

        <p style={{
          textAlign: 'center', margin: '0.85rem 0 0',
          color: 'var(--text-2, #4a505c)', fontSize: 'var(--fs-xs)', lineHeight: 1.6
        }}>
          פנה למנהל המערכת לקבלת פרטי התחברות
        </p>
      </div>

      {playing && (
        <Suspense fallback={null}>
          <PenaltyGame scene={sceneRef.current} onClose={closeGame} />
        </Suspense>
      )}
    </div>
  );
}

export default Login;
