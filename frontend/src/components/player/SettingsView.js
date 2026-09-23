import React, { useState } from 'react';
import NotificationSettings from '../NotificationSettings';
import ThemeSettings from './ThemeSettings';
import AccountSettings from './AccountSettings';

// דף ההגדרות של השחקן.
//
// הגדרות ההתראות ישבו פעם בכרטיס מתקפל בראש מסך ההימורים וגזלו מקום בכל
// מסך גם ממי שלא נגע בהן מעולם. כאן יש להן מקום משלהן - ולצידן, בלשונית
// נפרדת, ערכת הנושא. שתיהן הגדרות של המשתמש, אבל אין שום סיבה לראות את
// שתיהן יחד: מי שבא לשנות קבוצה לא מחפש שעות התראה, ולהפך.

const TABS = [
  { key: 'notifications', label: 'התראות', icon: '🔔' },
  { key: 'theme', label: 'ערכת נושא', icon: '🎨' },
  { key: 'account', label: 'חשבון', icon: '👤' }
];

function SettingsView({ user, onThemeChange, onProfileChange }) {
  const [tab, setTab] = useState('notifications');

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
          ההגדרות נשמרות למשתמש שלך ומופיעות בכל מכשיר שתתחבר ממנו.
        </p>
      </div>

      {/* אותו סרגל לשוניות של שאר המסכים, כדי שההגדרות לא ירגישו מסך זר */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${TABS.length}, 1fr)`,
        gap: '4px',
        marginBottom: '0.75rem',
        padding: '4px',
        backgroundColor: 'var(--surface-3, #f0f2f5)',
        borderRadius: '14px',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)'
      }}>
        {TABS.map((item) => {
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              style={{
                padding: '0.5rem 0.2rem',
                border: 'none',
                borderRadius: '11px',
                backgroundColor: active ? 'var(--surface, #fff)' : 'transparent',
                color: active ? 'var(--theme-primary, #007bff)' : 'var(--text-3, #888)',
                fontWeight: active ? '700' : '500',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                WebkitAppearance: 'none',
                touchAction: 'manipulation',
                boxShadow: active ? '0 2px 8px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                lineHeight: 1.2
              }}
            >
              <span style={{ fontSize: '16px', lineHeight: 1 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="card" style={{ animation: 'scaleIn 0.2s ease' }}>
        {tab === 'notifications' && (
          isSupported ? (
            <NotificationSettings user={user} embedded />
          ) : (
            <div style={{ fontSize: '13px', color: 'var(--text-3, #888)', padding: '0.5rem 0' }}>
              הדפדפן הזה לא תומך בהתראות. באייפון צריך להוסיף את האפליקציה למסך הבית
              ולפתוח אותה משם.
            </div>
          )
        )}

        {tab === 'theme' && <ThemeSettings user={user} onThemeChange={onThemeChange} />}

        {tab === 'account' && <AccountSettings user={user} onProfileChange={onProfileChange} />}
      </div>
    </div>
  );
}

export default SettingsView;
