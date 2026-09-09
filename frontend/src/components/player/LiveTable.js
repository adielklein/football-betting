import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Score from '../Score';
import RollingNumber from '../RollingNumber';

// טבלה חיה: הדירוג השבועי כפי שהיה נראה אילו הכל היה נגמר עכשיו.
//
// מה שמעניין כאן אינו הניקוד אלא התנועה. הטבלה הרגילה מראה את מה שכבר
// סגור; כאן רואים מה המשחקים שמתנהלים ברגע זה עושים לדירוג, ולכן שער אחד
// במגרש מזיז שורות על המסך.
//
// הרכיב מציג את עצמו רק כשבאמת יש משחק שמתנהל. בשאר הזמן הוא לא מצייר
// דבר - טבלה "חיה" שזהה לרגילה היא רק רעש.

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : 'https://football-betting-backend.onrender.com/api';

const REFRESH_MS = 60 * 1000;
const SLIDE_MS = 520;

const prefersReduced = () =>
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// השורות גולשות למקום החדש במקום לקפוץ אליו.
//
// הטכניקה היא FLIP: מודדים איפה כל שורה הייתה, נותנים ל-React לצייר את
// הסדר החדש, ואז מחזירים כל שורה להיסט הישן שלה בלי מעבר - ומיד משחררים
// אותה עם מעבר. הדפדפן מנפיש מהמקום הישן אל החדש, ולכן העין רואה את
// המעקף עצמו ולא רק את התוצאה שלו.
//
// עובדים על transform ולא על top: הוא לא גורם לפריסה מחדש, ולכן שמונה
// שורות שזזות יחד לא עולות דבר.
const useSlideOnReorder = (order) => {
  const nodes = useRef(new Map());
  const offsets = useRef(new Map());
  const lastOrder = useRef(order);

  // רץ אחרי כל ציור ולא רק כשהסדר משתנה. פתיחת שורה דוחפת את כל מה
  // שמתחתיה בלי לשנות סדר, ואם לא נמדוד גם אז, המדידה השמורה תתיישן -
  // והמעקף הבא ייצא מנקודה שכבר לא נכונה.
  useLayoutEffect(() => {
    const previous = offsets.current;
    const reordered = lastOrder.current !== order;
    lastOrder.current = order;

    const current = new Map();

    nodes.current.forEach((el, id) => {
      if (el) current.set(id, el.offsetTop);
    });

    if (reordered && previous.size && !prefersReduced()) {
      current.forEach((top, id) => {
        const was = previous.get(id);
        if (was == null || was === top) return;
        const el = nodes.current.get(id);
        if (!el) return;

        el.style.transition = 'none';
        el.style.transform = `translateY(${was - top}px)`;
        // קריאה לפני השחרור, אחרת הדפדפן מאחד את שתי הכתיבות לאחת
        // ושום מעבר לא מתרחש
        void el.offsetHeight;
        el.style.transition = `transform ${SLIDE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
        el.style.transform = '';
      });
    }

    offsets.current = current;
  });

  return (id) => (el) => {
    if (el) nodes.current.set(id, el);
    else nodes.current.delete(id);
  };
};

// מספר בודד בלבד. זוג תוצאה הוא לא מספר בודד - הוא הולך ל-Score,
// שמציב את הקבוצה הראשונה מימין כמו שמה.
const Num = ({ children }) => (
  <span style={{ direction: 'ltr', unicodeBidi: 'isolate', fontVariantNumeric: 'tabular-nums' }}>
    {children}
  </span>
);

function LiveTable({ weekId, meUserId }) {
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const rowRef = useSlideOnReorder(
    (data && data.rows ? data.rows.map((r) => r.userId).join(',') : '')
  );

  useEffect(() => {
    if (!weekId) { setData(null); return undefined; }

    let cancelled = false;
    let timer = null;

    const run = async () => {
      if (cancelled) return;
      if (document.hidden) { timer = setTimeout(run, REFRESH_MS); return; }
      try {
        const res = await fetch(`${API_URL}/external/live-table/${weekId}`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        // תוספת, לא תלות - נכשל בשקט וננסה שוב
      }
      if (!cancelled) timer = setTimeout(run, REFRESH_MS);
    };

    const onVisible = () => { if (!document.hidden) run(); };
    document.addEventListener('visibilitychange', onVisible);
    run();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [weekId]);

  if (!data || data.error || !data.liveMatches) return null;

  const { rows, liveMatches, weekName } = data;

  return (
    <div style={{
      background: 'var(--surface, #fff)',
      border: '1px solid var(--bad-bg, #fdecec)',
      borderRadius: '16px',
      padding: '0.8rem',
      marginBottom: '0.7rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)',
      animation: 'scaleIn 0.25s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '0.2rem' }}>
        <span
          aria-hidden="true"
          style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#dc3545', flexShrink: 0,
            animation: 'livePulse 1.4s ease-in-out infinite'
          }}
        />
        <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text, #333)' }}>
          הטבלה עכשיו
        </span>
        <span style={{ fontSize: '11px', color: 'var(--bad-fg, #b3261e)', fontWeight: 700 }}>
          <Num>{liveMatches}</Num> {liveMatches === 1 ? 'משחק מתנהל' : 'משחקים מתנהלים'}
        </span>
      </div>

      <div style={{ fontSize: '10.5px', color: 'var(--text-4, #aaa)', marginBottom: '0.6rem', lineHeight: 1.5 }}>
        איך {weekName} היה נגמר אילו השריקה הייתה עכשיו. החץ מראה את התנועה
        מול הדירוג לפי המשחקים שכבר הסתיימו.
      </div>

      {rows.map((r, i) => {
        const me = String(r.userId) === String(meUserId);
        const up = r.rankChange > 0;
        const down = r.rankChange < 0;
        const open = expanded === r.userId;

        return (
          <div key={r.userId} ref={rowRef(r.userId)} style={{ position: 'relative' }}>
            <div
              onClick={() => setExpanded(open ? null : r.userId)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.45rem 0.5rem',
                borderTop: i === 0 ? 'none' : '1px dashed var(--border, #eef1f4)',
                background: me ? 'var(--me-bg, #dbeafe)' : 'transparent',
                borderRadius: me ? '8px' : 0,
                cursor: r.gains.length ? 'pointer' : 'default',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <span style={{
                minWidth: '18px', fontSize: '12px', fontWeight: 800,
                color: me ? 'var(--me-fg, #14508f)' : 'var(--text-4, #aaa)'
              }}>
                <Num>{r.liveRank}</Num>
              </span>

              {/* התנועה היא העיקר, ולכן היא צמודה למקום ולא בקצה השורה */}
              <span style={{
                minWidth: '26px', fontSize: '11px', fontWeight: 800,
                color: up ? 'var(--good-fg, #1a6b35)' : down ? 'var(--bad-fg, #a81f17)' : 'var(--text-4, #ccc)'
              }}>
                {up ? `▲${r.rankChange}` : down ? `▼${-r.rankChange}` : '–'}
              </span>

              <span style={{
                flex: 1, minWidth: 0, fontSize: '13px',
                fontWeight: me ? 800 : 600,
                color: me ? 'var(--me-fg, #14508f)' : 'var(--text, #333)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {r.name}
                {r.gains.some((g) => g.exact) && (
                  <span style={{ marginInlineStart: '4px' }} title="בול במשחק שמתנהל">🎯</span>
                )}
              </span>

              {r.gained > 0 && (
                <span style={{
                  fontSize: '11px', fontWeight: 800, color: 'var(--good-fg, #1a6b35)',
                  background: 'var(--good-bg, #e8f6ec)', borderRadius: '7px', padding: '1px 7px'
                }}>
                  <Num>+{r.gained}</Num>
                </span>
              )}

              <span style={{
                fontSize: '14px', fontWeight: 800, minWidth: '34px', textAlign: 'left',
                color: me ? 'var(--me-fg, #14508f)' : 'var(--text, #333)'
              }}>
                <RollingNumber value={r.liveScore} />
              </span>
            </div>

            {open && r.gains.length > 0 && (
              <div style={{
                padding: '0.35rem 0.5rem 0.55rem 2.6rem',
                fontSize: '11px', color: 'var(--text-3, #888)'
              }}>
                {r.gains.map((g) => (
                  <div key={g.matchId} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0' }}>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {g.team1} נגד {g.team2}
                    </span>
                    <span style={{ color: 'var(--text-4, #aaa)' }}><Score pair={g.score} /></span>
                    {g.minute && <span style={{ color: 'var(--bad-fg, #b3261e)', fontWeight: 700 }}>{g.minute}</span>}
                    <span style={{ fontWeight: 800, color: 'var(--good-fg, #1a6b35)', minWidth: '28px', textAlign: 'left' }}>
                      <Num>+{g.points}</Num>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ fontSize: '9.5px', color: 'var(--text-4, #c3c8d0)', marginTop: '0.5rem', textAlign: 'center' }}>
        מתעדכן כל דקה · לחצו על שורה כדי לראות ממה היא מורכבת
      </div>
    </div>
  );
}

export default LiveTable;
