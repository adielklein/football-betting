import React, { useMemo, useState } from 'react';
import GroupedPicker from '../GroupedPicker';
import { getThemesByCategory, getTheme, applyTheme } from '../../themes';
import { toast } from '../../services/toast';

// בחירת ערכת נושא על ידי השחקן עצמו.
//
// עד עכשיו זה היה שדה שרק אדמין יכול היה לשנות, במסך ניהול המשתמשים -
// כלומר העדפה אישית לגמרי, איזו קבוצה אני אוהד, הצריכה לבקש ממנהל.
//
// והבחירה נעשית לפי מראה ולא לפי שם: כל שורה נושאת את הגרדיאנט האמיתי
// של הכותרת ואת סמל הקבוצה, כך שרואים מה מקבלים לפני שבוחרים.

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : 'https://football-betting-backend.onrender.com/api';

const Swatch = ({ themeKey }) => {
  const theme = getTheme(themeKey);
  return (
    <span
      aria-hidden="true"
      style={{
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        flexShrink: 0,
        background: theme.colors.headerBg,
        border: '1px solid var(--border, #e6e9ee)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
      }}
    />
  );
};

function ThemeSettings({ user, onThemeChange }) {
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState(user?.theme || 'default');

  const groups = useMemo(() => {
    const categories = getThemesByCategory();
    return Object.entries(categories).map(([categoryName, themes]) => ({
      key: categoryName,
      label: categoryName,
      items: themes.map((t) => ({
        id: t.key,
        name: t.name,
        preview: <Swatch themeKey={t.key} />
      }))
    }));
  }, []);

  const save = async (nextTheme) => {
    const userId = user?._id || user?.id;
    if (!userId || nextTheme === theme) return;

    const previous = theme;
    setTheme(nextTheme);
    // מחילים מיד: מי שבוחר רוצה לראות, לא לחכות לשרת
    applyTheme({ ...user, theme: nextTheme });
    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/auth/users/${userId}/theme`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: nextTheme })
      });
      if (!response.ok) throw new Error('failed');

      if (onThemeChange) onThemeChange(nextTheme);
      toast.success(`הערכה שונתה ל${getTheme(nextTheme).name}`);
    } catch (error) {
      // חזרה למצב הקודם, כולל הצבעים: ערכה שנראית שמורה ואינה שמורה
      // תחזור לקדמותה בפתיחה הבאה ותיראה כמו באג
      setTheme(previous);
      applyTheme({ ...user, theme: previous });
      toast.error('שמירת הערכה נכשלה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <Swatch themeKey={theme} />
        <span style={{ fontSize: '13px', fontWeight: 700 }}>{getTheme(theme).name}</span>
        {saving && <span style={{ fontSize: '11px', color: 'var(--text-4, #aaa)' }}>שומר…</span>}
      </div>

      <GroupedPicker
        groups={groups}
        value={theme}
        onChange={save}
        disabled={saving}
        placeholder="בחר ערכת נושא"
      />

      <div style={{ fontSize: '11px', color: 'var(--text-4, #aaa)', marginTop: '0.5rem', lineHeight: 1.5 }}>
        הערכה נשמרת למשתמש שלך ומופיעה בכל מכשיר שתתחבר ממנו.
      </div>
    </div>
  );
}

export default ThemeSettings;
