import React, { useState } from 'react';
import { panelStyle, rowStyle, triggerStyle, useDismiss } from './pickerUi';

// בורר התחרות בייבוא: רשימה נפתחת, סגורה כברירת מחדל.
//
// רשימה שטוחה של עשרים ותשע תחרויות מחייבת לגלול על כולן כדי למצוא אחת.
// כאן נפתחות תחילה ארבע שורות בלבד - ליגות, גביעים, אירופאיות, נבחרות -
// ורק הקבוצה שנוגעים בה נפרשת. מי שיודע מה הוא רוצה מגיע בשתי לחיצות,
// ומי שלא, רואה ארבע אפשרויות ולא עשרים ותשע.
//
// הקבוצה של הבחירה הנוכחית נפרשת מעצמה בפתיחה, כדי שהמצב הקיים יהיה
// גלוי בלי לחפש אותו.

function CompetitionPicker({
  groups, allLeagues, value, onChange, disabled,
  allValue, groupPrefix, placeholder = 'בחר תחרות'
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const boxRef = useDismiss(open, () => setOpen(false));

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
        style={triggerStyle(disabled)}
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
