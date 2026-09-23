import React, { useState } from 'react';
import GroupedPicker from '../GroupedPicker';
import { toast } from '../../services/toast';

// החשבון של המשתמש: שם תצוגה, מסך פתיחה, וסיסמה.
//
// שלושתם היו עד עכשיו מאחורי נתיב ניהולי - כלומר כדי לתקן ניקוד בשם,
// להיכנס ישר לטבלה או להחליף סיסמה היה צריך לבקש ממנהל. שם נעול נשאר
// בשליטת המנהל, ואז השדה מוצג אך אינו ניתן לעריכה, עם הסבר למה.

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : 'https://football-betting-backend.onrender.com/api';

// חייב להתאים לרשימת הלשוניות של מסך השחקן
const TAB_OPTIONS = [
  { id: 'betting', name: '⚽ הימורים' },
  { id: 'allbets', name: '👥 כל ההימורים' },
  { id: 'leaderboard', name: '🏆 טבלה' },
  { id: 'history', name: '📋 היסטוריה' },
  { id: 'stats', name: '📊 סטטיסטיקה' }
];

const label = { fontSize: '12px', color: 'var(--text-3, #888)', display: 'block', marginBottom: '0.2rem' };
const section = { paddingTop: '0.75rem', marginTop: '0.75rem', borderTop: '1px solid var(--border, #eef1f4)' };

function AccountSettings({ user, onProfileChange }) {
  const userId = user?._id || user?.id;

  const [name, setName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);

  const [tab, setTab] = useState(user?.defaultTab || 'betting');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const nameLocked = !!user?.nameLocked;

  const patch = async (path, body) => {
    const response = await fetch(`${API_URL}/auth/users/${userId}/${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'הפעולה נכשלה');
    return data;
  };

  const saveName = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === user?.name) return;

    setSavingName(true);
    try {
      await patch('profile', { name: trimmed });
      if (onProfileChange) onProfileChange({ name: trimmed });
      toast.success('השם עודכן');
    } catch (error) {
      setName(user?.name || '');
      toast.error(error.message);
    } finally {
      setSavingName(false);
    }
  };

  const saveTab = async (nextTab) => {
    const previous = tab;
    setTab(nextTab);
    try {
      await patch('profile', { defaultTab: nextTab });
      if (onProfileChange) onProfileChange({ defaultTab: nextTab });
      toast.success('מסך הפתיחה עודכן');
    } catch (error) {
      setTab(previous);
      toast.error(error.message);
    }
  };

  const savePassword = async () => {
    if (!currentPassword || !newPassword) return;

    setSavingPassword(true);
    try {
      await patch('password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      toast.success('הסיסמה עודכנה');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div>
      <div>
        <label style={label}>שם התצוגה</label>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <input
            className="input"
            value={name}
            disabled={nameLocked || savingName}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            maxLength={40}
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-primary"
            onClick={saveName}
            disabled={nameLocked || savingName || !name.trim() || name.trim() === user?.name}
            style={{ flexShrink: 0 }}
          >
            שמור
          </button>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-4, #aaa)', marginTop: '0.3rem' }}>
          {nameLocked
            ? '🔒 השם שלך נעול לשינוי. אפשר לבקש ממנהל.'
            : 'זה השם שמופיע בטבלאות ובכל ההימורים.'}
        </div>
      </div>

      <div style={section}>
        <label style={label}>מסך פתיחה</label>
        <GroupedPicker
          groups={[{ key: 'tabs', label: 'מסכים', items: TAB_OPTIONS }]}
          value={tab}
          onChange={saveTab}
          placeholder="בחר מסך"
        />
        <div style={{ fontSize: '11px', color: 'var(--text-4, #aaa)', marginTop: '0.3rem' }}>
          המסך שייפתח בכל כניסה לאפליקציה.
        </div>
      </div>

      <div style={section}>
        <label style={label}>החלפת סיסמה</label>
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          placeholder="הסיסמה הנוכחית"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          style={{ marginBottom: '0.4rem' }}
        />
        <input
          className="input"
          type="password"
          autoComplete="new-password"
          placeholder="סיסמה חדשה"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={{ marginBottom: '0.4rem' }}
        />
        <button
          className="btn btn-primary"
          onClick={savePassword}
          disabled={savingPassword || !currentPassword || !newPassword}
          style={{ width: '100%' }}
        >
          {savingPassword ? 'מעדכן…' : '🔑 עדכן סיסמה'}
        </button>
        <div style={{ fontSize: '11px', color: 'var(--text-4, #aaa)', marginTop: '0.3rem' }}>
          מנהל יכול לאפס את הסיסמה אם שכחת.
        </div>
      </div>
    </div>
  );
}

export default AccountSettings;
