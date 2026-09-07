import React, { useEffect, useState } from 'react';

// "כמה קרוב היית" - הניקוד שברח בגלל שער בודד.
//
// הטבלה מראה כמה צברת. מה שהיא לא מראה זה שרוב ההפרש בין המקום שלך למקום
// שמעליך נבנה מהחמצות של שער אחד, ושהן לא מתחלקות שווה בשווה בין השחקנים.
// המסך הזה מראה בדיוק את זה.

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : 'https://football-betting-backend.onrender.com/api';

const ACCENT = '#c2410c';       // הצבע של "כמעט" - חם, לא אדום של שגיאה
const ACCENT_SOFT = '#fff5ed';
const GOOD = '#1e7a3c';

const Card = ({ children, title, icon, style = {} }) => (
  <div style={{
    background: 'var(--surface, #fff)', borderRadius: '16px',
    padding: '0.85rem', marginBottom: '0.6rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)',
    border: '1px solid rgba(0,0,0,0.05)',
    ...style
  }}>
    {title && (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.7rem' }}>
        {icon && <span style={{ fontSize: '16px' }}>{icon}</span>}
        <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text, #333)' }}>{title}</span>
      </div>
    )}
    {children}
  </div>
);

// מספרים בתוך טקסט עברי מתהפכים בלי בידוד מפורש
const Num = ({ children, ...rest }) => (
  <span style={{ direction: 'ltr', unicodeBidi: 'isolate', fontVariantNumeric: 'tabular-nums' }} {...rest}>
    {children}
  </span>
);

const ScoreChip = ({ score, color, bg, label }) => (
  <span style={{ textAlign: 'center', minWidth: '46px' }}>
    <span style={{
      display: 'block', padding: '2px 7px', borderRadius: '7px',
      background: bg, color, fontWeight: 800, fontSize: '12px'
    }}>
      <Num>{score}</Num>
    </span>
    <span style={{ display: 'block', fontSize: '8.5px', color: 'var(--text-4, #aab1bb)', marginTop: '1px' }}>{label}</span>
  </span>
);

// טבלת חוסר המזל.
//
// זו הגרסה שהחליפה את "מה זה היה עושה לטבלה". שם התרחיש נתן לשחקן את כל
// ההחמצות שלו בעוד כל היריבים קפאו על הניקוד האמיתי, וכך כמעט כל אחד יצא
// "היה מסיים ראשון" - טענה שנכונה לכולם ולכן לא אומרת כלום.
//
// כאן כולם מקבלים בדיוק את אותו יחס, ולכן יש מקום אחד אמיתי לכל שחקן.
// הדירוג לפי קצב ולא לפי סכום, כי מספר ההימורים נע בין 52 ל-348 ודירוג
// לפי סכום היה בעיקר מדרג ותק.
function LuckTable({ meUserId }) {
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/stats/luck-table`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (!cancelled) setRows(Array.isArray(d) ? d : []); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  if (failed || (rows && rows.length === 0)) return null;

  return (
    <Card title="מי הכי חסר מזל" icon="🍀">
      <div style={{ fontSize: '10.5px', color: 'var(--text-3, #9aa2ae)', marginBottom: '0.6rem', lineHeight: 1.5 }}>
        נקודות שאבדו לשער בודד, ביחס למספר ההימורים. כולם נמדדים באותה דרך.
      </div>

      {!rows ? (
        <div style={{ padding: '0.8rem', textAlign: 'center', fontSize: '11px', color: 'var(--text-4, #b6bcc6)' }}>
          טוען…
        </div>
      ) : (
        rows.map((r) => {
          const me = String(r.userId) === String(meUserId);
          return (
            <div
              key={r.userId}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.45rem 0.4rem',
                borderTop: '1px dashed var(--border, #eef1f4)',
                background: me ? ACCENT_SOFT : 'transparent',
                borderRadius: me ? '8px' : 0
              }}
            >
              <span style={{
                minWidth: '18px', fontSize: '11px', fontWeight: 800,
                color: r.rank === 1 ? ACCENT : '#b6bcc6'
              }}>
                {r.rank ? <Num>{r.rank}</Num> : '–'}
              </span>

              <span style={{
                flex: 1, minWidth: 0, fontSize: '12px',
                fontWeight: me ? 800 : 600, color: me ? '#5a3722' : '#444',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {r.name}
              </span>

              <span style={{ fontSize: '10px', color: 'var(--text-4, #aab1bb)', minWidth: '52px', textAlign: 'left' }}>
                <Num>{r.nearRate}%</Num> מההימורים
              </span>

              <span style={{ fontSize: '10.5px', color: 'var(--text-3, #8b93a0)', minWidth: '46px', textAlign: 'left' }}>
                <Num>{r.lost}</Num> נק׳
              </span>

              <span style={{
                fontSize: '13px', fontWeight: 800, color: me ? ACCENT : '#5a6472',
                minWidth: '34px', textAlign: 'left'
              }}>
                <Num>{r.lostPerBet}</Num>
              </span>
            </div>
          );
        })
      )}

      <div style={{ fontSize: '9px', color: 'var(--text-4, #c3c8d0)', marginTop: '0.5rem', textAlign: 'center' }}>
        המספר הימני: נקודות שאבדו לכל הימור
      </div>
    </Card>
  );
}

function NearMissView({ nearMisses, userId }) {
  const data = nearMisses;

  if (!data || data.nearCount === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: 'var(--text-3, #8b93a0)' }}>
          <div style={{ fontSize: '32px', marginBottom: '0.5rem' }}>🎯</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-2, #555)', marginBottom: '0.3rem' }}>
            אין עדיין החמצות קרובות
          </div>
          <div style={{ fontSize: '12px' }}>
            כאן יופיעו ההימורים שהיו שער אחד מבול, וכמה הם עלו לך.
          </div>
        </div>
      </Card>
    );
  }

  const { lostToOneGoal, nearCount, totalMisses, biggest, weeks, biggestRankMiss } = data;

  return (
    <div style={{ animation: 'scaleIn 0.2s ease' }}>
      {/* הכותרת: הנקודות שברחו */}
      <Card>
        <div style={{
          textAlign: 'center', padding: '0.6rem 0.4rem 0.4rem',
          background: ACCENT_SOFT, borderRadius: '12px', marginBottom: '0.6rem'
        }}>
          <div style={{ fontSize: '11px', color: '#a1613c', fontWeight: 600 }}>
            שער אחד הפריד בינך לבין
          </div>
          <div style={{ fontSize: '38px', fontWeight: 900, color: ACCENT, lineHeight: 1.15 }}>
            <Num>{lostToOneGoal}</Num>
          </div>
          <div style={{ fontSize: '11px', color: '#a1613c', fontWeight: 600 }}>נקודות נוספות</div>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <div style={{ flex: 1, textAlign: 'center', padding: '0.5rem 0.3rem', background: 'var(--surface-2, #f8f9fc)', borderRadius: '12px' }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text, #333)' }}><Num>{nearCount}</Num></div>
            <div style={{ fontSize: '10px', color: 'var(--text-3, #888)', fontWeight: 600 }}>פעמים שער אחד</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center', padding: '0.5rem 0.3rem', background: 'var(--surface-2, #f8f9fc)', borderRadius: '12px' }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text, #333)' }}><Num>{totalMisses}</Num></div>
            <div style={{ fontSize: '10px', color: 'var(--text-3, #888)', fontWeight: 600 }}>החמצות בסך הכל</div>
          </div>
        </div>
      </Card>

      {/* השבוע שבו זה כאב הכי הרבה */}
      {biggestRankMiss && biggestRankMiss.rankGain > 0 && (
        <Card>
          <div style={{
            padding: '0.7rem', borderRadius: '12px',
            background: 'linear-gradient(135deg, #fff5ed, #fdeadd)',
            border: '1px solid #f6d5bd'
          }}>
            <div style={{ fontSize: '11px', color: '#a1613c', fontWeight: 700, marginBottom: '0.35rem' }}>
              💔 השער שעלה הכי הרבה
            </div>
            <div style={{ fontSize: '13.5px', color: '#5a3722', fontWeight: 700, marginBottom: '0.3rem' }}>
              {biggestRankMiss.team1} נגד {biggestRankMiss.team2}
            </div>
            <div style={{ fontSize: '12.5px', color: '#5a3722', fontWeight: 500, lineHeight: 1.6 }}>
              ניחשת <Num style={{ fontWeight: 800 }}>{biggestRankMiss.predicted}</Num>,
              {' '}יצא <Num style={{ fontWeight: 800 }}>{biggestRankMiss.actual}</Num>.
              {' '}המשחק הזה לבדו היה מקפיץ אותך ב{biggestRankMiss.weekName ? `${biggestRankMiss.weekName} ` : ''}
              {' '}ממקום <Num style={{ fontWeight: 900 }}>{biggestRankMiss.rankBefore}</Num>
              {' '}למקום <Num style={{ fontWeight: 900, color: GOOD }}>{biggestRankMiss.rankIfLanded}</Num>.
            </div>
          </div>
        </Card>
      )}

      {/* ההחמצות שעלו הכי הרבה */}
      <Card title="ההחמצות היקרות ביותר" icon="😤">
        {biggest.map((m, i) => (
          <div
            key={`${m.matchId}-${i}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 0.2rem',
              borderBottom: i < biggest.length - 1 ? '1px dashed #eef1f4' : 'none'
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '12px', fontWeight: 700, color: 'var(--text, #333)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {m.team1} נגד {m.team2}
              </div>
              {m.weekName && (
                <div style={{ fontSize: '9.5px', color: 'var(--text-4, #aab1bb)', marginTop: '1px' }}>{m.weekName}</div>
              )}
            </div>

            <ScoreChip score={m.predicted} color="#5a6472" bg="#f1f3f7" label="ניחשת" />
            <ScoreChip score={m.actual} color={GOOD} bg="#e8f6ec" label="יצא" />

            <span style={{
              minWidth: '42px', textAlign: 'center',
              fontSize: '12px', fontWeight: 800, color: ACCENT
            }}>
              <Num>-{m.lost}</Num>
            </span>
          </div>
        ))}
      </Card>

      {/* טבלת חוסר המזל: כולם מקבלים את אותו יחס, ולכן יש מקום אחד אמיתי */}
      <LuckTable meUserId={userId} />

      {/* השבועות שבהם הכי הרבה ברח - בלי טענות על מקומות */}
      {weeks.length > 0 && (
        <Card title="השבועות שהכי ברחו" icon="📉">
          <div style={{ fontSize: '10.5px', color: 'var(--text-3, #9aa2ae)', marginBottom: '0.5rem', lineHeight: 1.5 }}>
            כמה נקודות עלו לך שערים בודדים, שבוע אחרי שבוע.
          </div>

          {weeks.map((w) => {
            const max = Math.max(...weeks.map((x) => x.lost), 1);
            return (
              <div
                key={w.weekId}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.45rem 0.2rem', borderTop: '1px dashed var(--border, #eef1f4)'
                }}
              >
                <div style={{
                  flex: 1, minWidth: 0, fontSize: '12px', fontWeight: 600, color: 'var(--text-2, #444)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {w.weekName || 'שבוע'}
                </div>

                <span style={{ fontSize: '10.5px', color: 'var(--text-4, #aab1bb)', minWidth: '58px', textAlign: 'left' }}>
                  <Num>{w.nearCount}</Num> החמצות
                </span>

                {/* פס באורך יחסי, כדי שאפשר יהיה לראות את השבועות הכואבים בסריקה */}
                <span style={{ width: '64px', height: '6px', borderRadius: '3px', background: 'var(--surface-3, #f1f3f7)', flexShrink: 0 }}>
                  <span style={{
                    display: 'block', height: '100%', borderRadius: '3px',
                    width: `${Math.max(6, (w.lost / max) * 100)}%`, background: ACCENT
                  }} />
                </span>

                <span style={{ fontSize: '12px', fontWeight: 800, color: ACCENT, minWidth: '38px', textAlign: 'left' }}>
                  <Num>-{w.lost}</Num>
                </span>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

export default NearMissView;
