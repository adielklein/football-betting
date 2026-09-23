import React, { useEffect, useRef, useState } from 'react';

// בורר התחרות בייבוא: רשימה נפתחת, סגורה כברירת מחדל.
//
// רשימה שטוחה של עשרים ותשע תחרויות מחייבת לגלול על כולן כדי למצוא אחת.
// כאן נפתחות תחילה ארבע שורות בלבד - ליגות, גביעים, אירופאיות, נבחרות -
// ורק הקבוצה שנוגעים בה נפרשת. מי שיודע מה הוא רוצה מגיע בשתי לחיצות,
// ומי שלא, רואה ארבע אפשרויות ולא עשרים ותשע.
//
// הקבוצה של הבחירה הנוכחית נפרשת מעצמה בפתיחה, כדי שהמצב הקיים יהיה
// גלוי בלי לחפש אותו.

const panelStyle = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  right: 0,
  left: 0,
  zIndex: 30,
  background: 'var(--surface, #fff)',
  border: '1px solid var(--border, #e6e9ee)',
  borderRadius: '12px',
  boxShadow: '0 8px 28px rgba(0,0,0,0.14)',
  // החלון שמעליו חתוך ב-overflow: hidden, ולכן הרשימה נשארת בגובה
  // שנכנס בתוכו במקום להיחתך באמצע שורה
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

function CompetitionPicker({
  groups, allLeagues, value, onChange, disabled,
  allValue, groupPrefix, placeholder = 'בחר תחרות'
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const boxRef = useRef(null);

  // סגירה בלחיצה בחוץ וב-Escape. בלעדיהן רשימה פתוחה נשארת מרחפת מעל
  // המסך וחוסמת את מה שמתחתיה
  useEffect(() => {
    if (!open) return undefined;

    const onPointer = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };

    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const groupOfValue = () => {
    if (!value || value === allValue) return null;
    if (value.startsWith(groupPrefix)) return value.slice(groupPrefix.length);
    return groups.find((g) => g.leagues.some((l) => l._id === value))?.key || null;
  };

  const label = () => {
    if (!value) return placeholder;
    if (value === allValue) return `🌍 כל התחרויות (${allLeagues.length})`;
    if (value.startsWith(groupPrefix)) {
      const group = groups.find((g) => g.key === value.slice(groupPrefix.length));
      return group ? `${group.icon} כל ה${group.label} (${group.leagues.length})` : placeholder;
    }
    const league = allLeagues.find((l) => l._id === value);
    return league ? league.name : placeholder;
  };

  const pick = (next) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="input"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => {
          const next = !open;
          setOpen(next);
          // הקבוצה של הבחירה הנוכחית נפרשת מעצמה
          if (next) setExpanded(groupOfValue());
        }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', cursor: disabled ? 'default' : 'pointer',
          font: 'inherit', fontSize: '13px', fontWeight: 700,
          color: 'var(--text, #333)', textAlign: 'right'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label()}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-4, #aaa)', flexShrink: 0 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div style={panelStyle}>
          {allLeagues.length > 0 && (
            <button type="button" onClick={() => pick(allValue)} style={rowStyle(value === allValue)}>
              <span>🌍</span>
              <span style={{ flex: 1 }}>כל התחרויות</span>
              <span style={{ fontSize: '11px', color: 'var(--text-4, #aaa)' }}>{allLeagues.length}</span>
            </button>
          )}

          {groups.map((group) => {
            const isOpen = expanded === group.key;
            return (
              <div key={group.key}>
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : group.key)}
                  style={{ ...rowStyle(false), color: 'var(--text-2, #555)' }}
                >
                  <span>{group.icon}</span>
                  <span style={{ flex: 1 }}>{group.label}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-4, #aaa)' }}>{group.leagues.length}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-4, #aaa)' }}>{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div style={{ paddingInlineStart: '1.1rem' }}>
                    <button
                      type="button"
                      onClick={() => pick(`${groupPrefix}${group.key}`)}
                      style={rowStyle(value === `${groupPrefix}${group.key}`)}
                    >
                      <span style={{ flex: 1 }}>כל ה{group.label}</span>
                    </button>
                    {group.leagues.map((league) => (
                      <button
                        key={league._id}
                        type="button"
                        onClick={() => pick(league._id)}
                        style={rowStyle(value === league._id)}
                      >
                        <span style={{ flex: 1 }}>{league.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CompetitionPicker;
