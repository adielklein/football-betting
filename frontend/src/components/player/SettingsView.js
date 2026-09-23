import React from 'react';
import NotificationSettings from '../NotificationSettings';
import ThemeSettings from './ThemeSettings';

// דף ההגדרות של השחקן.
//
// עד עכשיו הגדרות ההתראות ישבו בכרטיס מתקפל בראש מסך ההימורים, מעל הלשוניות,
// וגזלו מקום בכל מסך גם ממי שלא נגע בהן מעולם. כאן יש להן מקום משלהן, וזה
// גם המקום שאליו יתווספו הגדרות נוספות בעתיד.
function SettingsView({ user, onThemeChange }) {
  const isSupported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  return (
    <div>
      <div className="card" style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '0.95rem', margin: 0, fontWeight: '700' }}>⚙️ הגדרות</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-3, #888)', margin: '0.35rem 0 0' }}>
          ההגדרות נשמרות למשתמש שלך ומשפיעות על כל המכשירים שרשומים להתראות.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.5rem 0', fontWeight: '700' }}>🎨 ערכת נושא</h3>
        <ThemeSettings user={user} onThemeChange={onThemeChange} />
      </div>

      <div className="card">
        <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.5rem 0', fontWeight: '700' }}>🔔 התראות</h3>

        {isSupported ? (
          <NotificationSettings user={user} embedded />
        ) : (
          <div style={{ fontSize: '13px', color: 'var(--text-3, #888)', padding: '0.5rem 0' }}>
            הדפדפן הזה לא תומך בהתראות. באייפון צריך להוסיף את האפליקציה למסך הבית
            ולפתוח אותה משם.
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsView;
