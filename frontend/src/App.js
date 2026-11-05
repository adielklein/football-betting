import React, { useState, useEffect, Suspense } from 'react';
import Login from './components/Login';
import PlayerView from './components/player/PlayerView';
import { applyTheme } from './themes'; // 🎨 יבוא פונקציית ערכות הנושא
import UpdateBanner from './components/UpdateBanner';
import OfflineBanner from './components/OfflineBanner';
import { cleanUpdateParam } from './services/appVersion';

// אחרי עדכון גרסה הכתובת מגיעה עם ?v=... - מנקים אותה מיד
cleanUpdateParam();
import ToastHost from './components/ToastHost';
import ErrorBoundary from './components/ErrorBoundary';
import { HashRouter } from 'react-router-dom';
import { onSchemeChange } from './services/colorScheme';
import { getToken, setToken, clearToken, AUTH_EXPIRED_EVENT } from './services/authSession';
import { lazyWithReload } from './services/lazyWithReload';
import './index.css';

// מסכי הניהול נטענים בנפרד: שחקן לא מוריד את הקוד שלהם בכלל, וזה מקצר
// את הטעינה בטלפון. רק אדמין שנכנס מוריד אותם, פעם אחת.
const AdminView = lazyWithReload(() => import('./components/admin/AdminView'));

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inAppNotification, setInAppNotification] = useState(null);
  // למה מוצג מסך הכניסה: 'security' - חיבור ישן מלפני הטוקנים, 'expired' -
  // השרת דחה את הטוקן (פג או שהסיסמה הוחלפה). בלי הסבר זה נראה כמו תקלה
  const [loginNotice, setLoginNotice] = useState(null);

  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  useEffect(() => {
    console.log('🎨 App.js - התחלת טעינה, מחפש משתמש שמור...');
    
    // בדוק אם יש משתמש שמור בLocalStorage
    const savedUser = localStorage.getItem('football_betting_user');
    // חיבור ששמור מלפני עדכון האבטחה: יש משתמש אבל אין טוקן, והשרת כבר לא
    // מקבל זיהוי בלעדיו. התחברות מחדש חד-פעמית - הנתונים עצמם בשרת
    if (savedUser && !getToken()) {
      localStorage.removeItem('football_betting_user');
      setLoginNotice('security');
      applyTheme(null);
      setLoading(false);
      return;
    }
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
      
      const changed = serverUser && (
        serverUser.theme !== localUser.theme ||
        serverUser.name !== localUser.name ||
        serverUser.defaultTab !== localUser.defaultTab ||
        !!serverUser.nameLocked !== !!localUser.nameLocked
      );

      if (changed) {
        console.log('🎨 נמצא עדכון ערכת נושא!');
        console.log('🔄 מטמון:', localUser.theme, '→ שרת:', serverUser.theme);
        
        // עדכן את הנתונים המקומיים
        const updatedUser = {
          ...localUser,
          theme: serverUser.theme,
          name: serverUser.name || localUser.name,
          username: serverUser.username || localUser.username,
          role: serverUser.role || localUser.role,
          defaultTab: serverUser.defaultTab || localUser.defaultTab || 'betting',
          nameLocked: !!serverUser.nameLocked
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

  // השחקן שינה ערכה בהגדרות שלו. הערכה כבר הוחלה שם מיידית, וכאן היא
  // נשמרת גם במצב ובאחסון המקומי - אחרת הבדיקה התקופתית מול השרת הייתה
  // מחזירה אותה לקדמותה
  const handleThemeChange = (theme) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, theme };
      try {
        localStorage.setItem('football_betting_user', JSON.stringify(updated));
      } catch (err) {
        // אחסון חסום - הערכה עדיין שמורה בשרת
      }
      return updated;
    });
  };

  // שינוי פרופיל (שם, מסך פתיחה) מהגדרות המשתמש. נשמר מקומית מיד, כדי
  // שלא יידרס בבדיקה התקופתית מול השרת
  const handleProfileChange = (changes) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...changes };
      try {
        localStorage.setItem('football_betting_user', JSON.stringify(updated));
      } catch (err) {
        // אחסון חסום - השינוי עדיין שמור בשרת
      }
      return updated;
    });
  };

  // אנימציית כניסה עדינה לאפליקציה, רק ברגע ההתחברות (לא בכל פתיחה)
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  const handleLogin = (loggedIn) => {
    // הטוקן נשמר בנפרד מהמשתמש - ראו services/authSession
    const { token, ...user } = loggedIn;
    setToken(token);
    setLoginNotice(null);
    console.log('✅ התחברות מוצלחת:', user.name);
    console.log('🎨 ערכת נושא:', user.theme || 'default');
    
    // וודא שיש שדה theme
    if (!user.theme) {
      user.theme = 'default';
      console.log('🔧 הוספת ערכת נושא default למשתמש חדש');
    }
    
    setCurrentUser(user);
    setJustLoggedIn(true);
    localStorage.setItem('football_betting_user', JSON.stringify(user));
    
    // 🎨 החל ערכת נושא מיד אחרי התחברות
    console.log('🎨 מחיל ערכת נושא אחרי התחברות:', user.theme);
    applyTheme(user);
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 מתנתק...');
      setJustLoggedIn(false); // כדי שאנימציית הכניסה תרוץ שוב בהתחברות הבאה
      // הנתונים שנשמרו לשימוש בלי קליטה שייכים למשתמש הזה בלבד
      if ('caches' in window) caches.delete('gamball-api-v1').catch(() => {});
      clearToken();
      localStorage.removeItem('football_betting_user');
      setCurrentUser(null);
      
      // 🎨 החזר לערכת בסיסית אחרי התנתקות
      console.log('🎨 מחזיר לערכת נושא בסיסית אחרי התנתקות');
      applyTheme(null);
      
      console.log('✅ התנתקות הושלמה');
    } catch (error) {
      console.error('❌ שגיאה בהתנתקות:', error);
      clearToken();
      localStorage.removeItem('football_betting_user');
      setCurrentUser(null);
      applyTheme(null); // החזר לערכת בסיסית
    }
  };

  // השרת דחה את הטוקן באמצע שימוש - חזרה למסך הכניסה, עם הסבר.
  // כמה בקשות שנדחו בבת אחת מגיעות לכאן כמה פעמים, וזה בסדר: ההתנתקות זהה
  useEffect(() => {
    const onExpired = (e) => {
      setLoginNotice(e.detail?.reason === 'missing' ? 'security' : 'expired');
      handleLogout();
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  // הערכה כותבת רקע וטקסט בסגנון מוטבע, ולכן מעבר בהיר/כהה מחייב
  // להחיל אותה מחדש - אחרת הרקע נשאר של המצב הקודם.
  useEffect(() => onSchemeChange(() => applyTheme(currentUser)), [currentUser]);

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
        <h2 style={{ color: 'var(--theme-text, #666)', fontSize: 'var(--fs-lg)' }}>טוען...</h2>

      </div>
    );
  }

  return (
    // כתובת מסוג hash ולא נתיב רגיל: השרת הסטטי של Render לא מפנה
    // נתיבים עמוקים אל index.html, ולכן ‎/leaderboard היה מחזיר 404
    // ברענון או בפתיחת קישור. עם hash הכל עובד בלי הגדרות בשרת.
    <HashRouter>
      {/* רשת ביטחון אחרונה: גם תקלה מחוץ ללשוניות (כותרת, ניווט) לא תשאיר דף לבן */}
      <ErrorBoundary name="app" fullScreen>
      <div className="App" style={justLoggedIn ? { animation: 'appEnter .45s ease-out both' } : undefined}>
      {!currentUser ? (
        <Login onLogin={handleLogin} notice={loginNotice} />
      ) : currentUser.role === 'admin' ? (
        <Suspense fallback={<div className="loading" style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-3, #5f6670)' }}>טוען...</div>}>
          <AdminView user={currentUser} onLogout={handleLogout} />
        </Suspense>
      ) : (
        <PlayerView
          user={currentUser}
          onLogout={handleLogout}
          onThemeChange={handleThemeChange}
          onProfileChange={handleProfileChange}
        />
      )}

      <ToastHost />
      <UpdateBanner />
      <OfflineBanner />

      {inAppNotification && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem'
        }} onClick={dismissNotification}>
          <div style={{
            backgroundColor: 'var(--surface, #fff)', borderRadius: '16px', maxWidth: '400px', width: '100%',
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
              <h3 style={{ margin: '0 0 0.5rem', fontSize: 'var(--fs-lg)', color: 'var(--text, #333)', textAlign: 'right' }}>
                {inAppNotification.title}
              </h3>
              <p style={{ margin: '0 0 1rem', fontSize: 'var(--fs-md)', color: 'var(--text-2, #555)', lineHeight: 1.5, textAlign: 'right', whiteSpace: 'pre-line' }}>
                {inAppNotification.body}
              </p>
              <button
                onClick={dismissNotification}
                style={{
                  width: '100%', padding: '10px', border: 'none', borderRadius: '10px',
                  backgroundColor: 'var(--theme-primary, #007bff)', color: '#fff',
                  fontSize: 'var(--fs-md)', fontWeight: '700', cursor: 'pointer'
                }}
              >
                הבנתי 👍
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      </ErrorBoundary>
    </HashRouter>
  );
}

export default App;