import React, { useMemo, useState } from 'react';
import GroupedPicker from '../GroupedPicker';
import { getThemesByCategory, getTheme, applyTheme } from '../../themes';
import ThemeIcon from '../ThemeIcon';
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
        preview: <ThemeIcon themeKey={t.key} />
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
      {/* הבחירה הנוכחית מופיעה בבורר עצמו - שורה נוספת מעליו רק חוזרת
          על אותו דבר */}
      <GroupedPicker
        groups={groups}
        value={theme}
        onChange={save}
        disabled={saving}
        placeholder="בחר ערכת נושא"
      />

      <div style={{ fontSize: '11px', color: 'var(--text-4, #aaa)', marginTop: '0.5rem', lineHeight: 1.5 }}>
        {saving ? 'שומר…' : 'הערכה נשמרת למשתמש שלך ומופיעה בכל מכשיר שתתחבר ממנו.'}
      </div>
    </div>
  );
}

export default ThemeSettings;
