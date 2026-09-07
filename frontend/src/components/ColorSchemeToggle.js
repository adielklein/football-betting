import React, { useEffect, useState } from 'react';
import { getMode, setMode, onSchemeChange } from '../services/colorScheme';

// מעבר בין לפי-המכשיר, בהיר וכהה.
//
// לחיצה מקדמת למצב הבא. אין תפריט בכוונה: הכפתור יושב בכותרת צפופה,
// והמצבים מובנים מאליהם ברגע שמתנסים בהם פעם אחת.

const NEXT = { system: 'light', light: 'dark', dark: 'system' };
const ICON = { system: '🌗', light: '☀️', dark: '🌙' };
const LABEL = { system: 'לפי המכשיר', light: 'מצב בהיר', dark: 'מצב כהה' };

function ColorSchemeToggle() {
  const [mode, setLocalMode] = useState(getMode());

  useEffect(() => onSchemeChange(() => setLocalMode(getMode())), []);

  const cycle = () => {
    const next = NEXT[mode] || 'system';
    setMode(next);
    setLocalMode(next);
  };

  return (
    <button
      onClick={cycle}
      title={LABEL[mode]}
      aria-label={`תצוגה: ${LABEL[mode]}. לחצו להחלפה`}
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.08) 100%)',
        color: 'white',
        padding: '0.4rem 0.6rem',
        fontSize: '14px',
        lineHeight: 1,
        margin: 0,
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.15)',
        cursor: 'pointer',
        flexShrink: 0,
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation'
      }}
    >
      {ICON[mode]}
    </button>
  );
}

export default ColorSchemeToggle;
