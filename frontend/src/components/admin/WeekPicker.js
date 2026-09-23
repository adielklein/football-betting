import React, { useState } from 'react';
import { panelStyle, rowStyle, triggerStyle, useDismiss } from '../pickerUi';

// בורר השבוע במסך ניהול השבועות: עונה ← חודש ← שבוע, בקיפול.
//
// קודם זה היה תפריט מרחף שנפתח בריחוף: העונה פותחת חלון לצדה, החודש
// פותח עוד אחד לצדו. בעכבר זה עובד; בטלפון אין ריחוף בכלל, ולכן צריך
// היה לקוות שנגיעה תיתפס כריחוף ולא לגלוש בטעות. כאן הכל בלחיצות,
// באותו סגנון של בורר התחרות, ובתוך רשימה אחת שאינה בורחת מהמסך.
//
// המסלול אל השבוע שנבחר נפרש מעצמו בפתיחה.

const monthLabelOf = (months, monthNum) =>
  months.find((m) => m.value === parseInt(monthNum, 10))?.label || monthNum;

function WeekPicker({ organizedWeeks, months, selectedWeek, onSelect, label }) {
  const [open, setOpen] = useState(false);
  const [openSeason, setOpenSeason] = useState(null);
  const [openMonth, setOpenMonth] = useState(null);
  const boxRef = useDismiss(open, () => setOpen(false));

  const seasons = Object.keys(organizedWeeks).sort().reverse();

  // איפה יושב השבוע הנבחר, כדי לפרוש אליו את הדרך
  const pathToSelected = () => {
    if (!selectedWeek) return { season: null, month: null };
    for (const season of seasons) {
      for (const monthNum of Object.keys(organizedWeeks[season])) {
        if (organizedWeeks[season][monthNum].some((w) => w._id === selectedWeek._id)) {
          return { season, month: `${season}-${monthNum}` };
        }
      }
    }
    return { season: null, month: null };
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      const path = pathToSelected();
      setOpenSeason(path.season);
      setOpenMonth(path.month);
    }
  };

  const pick = (week) => {
    onSelect(week);
    setOpen(false);
  };

  return (
    <div ref={boxRef} style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
      <button
        type="button"
        className="input"
        aria-expanded={open}
        onClick={toggle}
        style={triggerStyle(false)}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-4, #aaa)', flexShrink: 0 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div style={panelStyle}>
          {seasons.length === 0 && (
            <div style={{ padding: '0.6rem', fontSize: '12px', color: 'var(--text-4, #aaa)', textAlign: 'center' }}>
              אין שבועות עדיין
            </div>
          )}

          {seasons.map((season) => {
            const seasonOpen = openSeason === season;
            const monthNums = Object.keys(organizedWeeks[season]).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
            const weeksInSeason = monthNums.reduce((sum, m) => sum + organizedWeeks[season][m].length, 0);

            return (
              <div key={season}>
                <button
                  type="button"
                  onClick={() => setOpenSeason(seasonOpen ? null : season)}
                  style={{ ...rowStyle(false), color: 'var(--text-2, #555)' }}
                >
                  <span>📅</span>
                  <span style={{ flex: 1 }}>עונה {season}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-4, #aaa)' }}>{weeksInSeason}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-4, #aaa)' }}>{seasonOpen ? '▲' : '▼'}</span>
                </button>

                {seasonOpen && monthNums.map((monthNum) => {
                  const monthKey = `${season}-${monthNum}`;
                  const monthOpen = openMonth === monthKey;
                  const weeks = organizedWeeks[season][monthNum];

                  return (
                    <div key={monthKey} style={{ paddingInlineStart: '0.9rem' }}>
                      <button
                        type="button"
                        onClick={() => setOpenMonth(monthOpen ? null : monthKey)}
                        style={{ ...rowStyle(false), color: 'var(--text-3, #888)' }}
                      >
                        <span style={{ flex: 1 }}>{monthLabelOf(months, monthNum)}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-4, #aaa)' }}>{weeks.length}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-4, #aaa)' }}>{monthOpen ? '▲' : '▼'}</span>
                      </button>

                      {monthOpen && (
                        <div style={{ paddingInlineStart: '0.9rem' }}>
                          {weeks.map((week) => (
                            <button
                              key={week._id}
                              type="button"
                              onClick={() => pick(week)}
                              style={rowStyle(selectedWeek?._id === week._id)}
                            >
                              <span style={{ flex: 1 }}>{week.name}</span>
                              {week.locked && <span style={{ fontSize: '11px' }}>🔒</span>}
                              {week.active && !week.locked && <span style={{ fontSize: '11px' }}>🟢</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default WeekPicker;
