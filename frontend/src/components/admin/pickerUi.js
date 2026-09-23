import { useEffect, useRef } from 'react';

// החלקים המשותפים לבוררים הנפתחים של מסך הניהול: מראה הרשימה, מראה
// השורה, והסגירה. שני הבוררים - תחרות ושבוע - חולקים אותם כדי שיישארו
// אותו דבר גם אחרי שישתנו.

const panelStyle = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  right: 0,
  left: 0,
  zIndex: 10000,
  background: 'var(--surface, #fff)',
  border: '1px solid var(--border, #e6e9ee)',
  borderRadius: '12px',
  boxShadow: '0 8px 28px rgba(0,0,0,0.14)',
  maxHeight: '260px',
  overflowY: 'auto',
  padding: '0.25rem'
};

const rowStyle = (selected) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  width: '100%',
  padding: '0.5rem 0.6rem',
  border: 'none',
  borderRadius: '8px',
  background: selected ? 'var(--me-bg, #dbeafe)' : 'transparent',
  color: selected ? 'var(--me-fg, #14508f)' : 'var(--text, #333)',
  fontWeight: selected ? 800 : 600,
  fontSize: '13px',
  textAlign: 'right',
  cursor: 'pointer',
  font: 'inherit',
  WebkitTapHighlightColor: 'transparent'
});

const triggerStyle = (disabled) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  cursor: disabled ? 'default' : 'pointer',
  font: 'inherit',
  fontSize: '13px',
  fontWeight: 700,
  color: 'var(--text, #333)',
  textAlign: 'right'
});

/**
 * סגירה בלחיצה בחוץ וב-Escape. בלעדיהן רשימה פתוחה נשארת מרחפת מעל
 * המסך וחוסמת את מה שמתחתיה. מחזיר ref לעטיפה.
 */
const useDismiss = (open, close) => {
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onPointer = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) close();
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };

    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  return boxRef;
};

export { panelStyle, rowStyle, triggerStyle, useDismiss };
