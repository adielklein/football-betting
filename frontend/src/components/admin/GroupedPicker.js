import React, { useState } from 'react';
import { panelStyle, rowStyle, triggerStyle, useDismiss } from './pickerUi';

// רשימה נפתחת מקובצת, סגורה כברירת מחדל.
//
// רשימה שטוחה של עשרות פריטים מחייבת לגלול על כולם כדי למצוא אחד. כאן
// נפתחות תחילה הקבוצות בלבד, ורק זו שנוגעים בה נפרשת - מי שיודע מה הוא
// רוצה מגיע בשתי לחיצות, ומי שלא, רואה ארבע אפשרויות ולא עשרים ותשע.
//
// הקבוצה של הבחירה הנוכחית נפרשת מעצמה בפתיחה, כדי שהמצב הקיים יהיה
// גלוי בלי לחפש אותו.
//
// groups: [{ key, label, icon, items: [{ id, name }] }]
// allOption: { value, label } - שורה אחת מעל הכל, או null כשאין
// groupAllPrefix: קידומת לערך "כל ה<קבוצה>", או null כשבחירת קבוצה
//   שלמה אינה אפשרות (למשל בבחירת ליגה למשחק אחד)

function GroupedPicker({
  groups,
  value,
  onChange,
  disabled = false,
  placeholder = 'בחר',
  allOption = null,
  groupAllPrefix = null
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const boxRef = useDismiss(open, () => setOpen(false));

  const groupOfValue = () => {
    if (!value || (allOption && value === allOption.value)) return null;
    if (groupAllPrefix && String(value).startsWith(groupAllPrefix)) {
      return String(value).slice(groupAllPrefix.length);
    }
    return groups.find((g) => g.items.some((i) => i.id === value))?.key || null;
  };

  const label = () => {
    if (allOption && value === allOption.value) return allOption.label;
    if (groupAllPrefix && value && String(value).startsWith(groupAllPrefix)) {
      const group = groups.find((g) => g.key === String(value).slice(groupAllPrefix.length));
      return group ? `${group.icon || ''} כל ה${group.label} (${group.items.length})`.trim() : placeholder;
    }
    for (const group of groups) {
      const item = group.items.find((i) => i.id === value);
      if (item) return item.name;
    }
    return placeholder;
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
          {allOption && (
            <button type="button" onClick={() => pick(allOption.value)} style={rowStyle(value === allOption.value)}>
              <span style={{ flex: 1 }}>{allOption.label}</span>
            </button>
          )}

          {groups.length === 0 && (
            <div style={{ padding: '0.6rem', fontSize: '12px', color: 'var(--text-4, #aaa)', textAlign: 'center' }}>
              אין אפשרויות
            </div>
          )}

          {groups.map((group) => {
            const isOpen = expanded === group.key;
            const groupAllValue = groupAllPrefix ? `${groupAllPrefix}${group.key}` : null;

            return (
              <div key={group.key}>
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : group.key)}
                  style={{ ...rowStyle(false), color: 'var(--text-2, #555)' }}
                >
                  {group.icon && <span>{group.icon}</span>}
                  <span style={{ flex: 1 }}>{group.label}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-4, #aaa)' }}>{group.items.length}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-4, #aaa)' }}>{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div style={{ paddingInlineStart: '1.1rem' }}>
                    {groupAllValue && (
                      <button
                        type="button"
                        onClick={() => pick(groupAllValue)}
                        style={rowStyle(value === groupAllValue)}
                      >
                        <span style={{ flex: 1 }}>כל ה{group.label}</span>
                      </button>
                    )}
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => pick(item.id)}
                        style={rowStyle(value === item.id)}
                      >
                        <span style={{ flex: 1 }}>{item.name}</span>
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

export default GroupedPicker;
