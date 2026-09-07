import React from 'react';

// "כמה קרוב היית" - הניקוד שברח בגלל שער בודד.
//
// הטבלה מראה כמה צברת. מה שהיא לא מראה זה שרוב ההפרש בין המקום שלך למקום
// שמעליך נבנה מהחמצות של שער אחד, ושהן לא מתחלקות שווה בשווה בין השחקנים.
// המסך הזה מראה בדיוק את זה.

const ACCENT = '#c2410c';       // הצבע של "כמעט" - חם, לא אדום של שגיאה
const ACCENT_SOFT = '#fff5ed';
const GOOD = '#1e7a3c';

const Card = ({ children, title, icon, style = {} }) => (
  <div style={{
    background: '#fff', borderRadius: '16px',
    padding: '0.85rem', marginBottom: '0.6rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)',
    border: '1px solid rgba(0,0,0,0.05)',
    ...style
  }}>
    {title && (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.7rem' }}>
        {icon && <span style={{ fontSize: '16px' }}>{icon}</span>}
        <span style={{ fontWeight: 700, fontSize: '14px', color: '#333' }}>{title}</span>
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
    <span style={{ display: 'block', fontSize: '8.5px', color: '#aab1bb', marginTop: '1px' }}>{label}</span>
  </span>
);

function NearMissView({ nearMisses }) {
  const data = nearMisses;

  if (!data || data.nearCount === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: '#8b93a0' }}>
          <div style={{ fontSize: '32px', marginBottom: '0.5rem' }}>🎯</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#555', marginBottom: '0.3rem' }}>
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
          <div style={{ flex: 1, textAlign: 'center', padding: '0.5rem 0.3rem', background: '#f8f9fc', borderRadius: '12px' }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#333' }}><Num>{nearCount}</Num></div>
            <div style={{ fontSize: '10px', color: '#888', fontWeight: 600 }}>פעמים שער אחד</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center', padding: '0.5rem 0.3rem', background: '#f8f9fc', borderRadius: '12px' }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#333' }}><Num>{totalMisses}</Num></div>
            <div style={{ fontSize: '10px', color: '#888', fontWeight: 600 }}>החמצות בסך הכל</div>
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
                fontSize: '12px', fontWeight: 700, color: '#333',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {m.team1} נגד {m.team2}
              </div>
              {m.weekName && (
                <div style={{ fontSize: '9.5px', color: '#aab1bb', marginTop: '1px' }}>{m.weekName}</div>
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

      {/* מה זה היה עושה לטבלה, שבוע אחרי שבוע */}
      {weeks.length > 0 && (
        <Card title="מה זה היה עושה לטבלה" icon="📈">
          <div style={{ fontSize: '10.5px', color: '#9aa2ae', marginBottom: '0.5rem', lineHeight: 1.5 }}>
            תרחיש נדיב: המקום שהיית מסיים בו אילו <em>כל</em> החמצה של שער אחד
            הייתה נופלת לטובתך, בעוד כולם נשארים עם הניקוד האמיתי שלהם.
          </div>

          {weeks.map((w) => (
            <div
              key={w.weekId}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.45rem 0.2rem', borderTop: '1px dashed #eef1f4'
              }}
            >
              <div style={{
                flex: 1, minWidth: 0, fontSize: '12px', fontWeight: 600, color: '#444',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {w.weekName || 'שבוע'}
              </div>

              <span style={{ fontSize: '11px', color: '#8b93a0' }}>
                <Num>{w.actual}</Num> נק׳
              </span>

              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '3px',
                fontSize: '11.5px', fontWeight: 700, minWidth: '74px', justifyContent: 'flex-end'
              }}>
                <span style={{ color: '#8b93a0' }}>מקום <Num>{w.actualRank}</Num></span>
                {w.potentialRank < w.actualRank ? (
                  <>
                    <span style={{ color: '#c9ced6' }}>←</span>
                    <span style={{ color: GOOD }}><Num>{w.potentialRank}</Num></span>
                  </>
                ) : (
                  <span style={{ color: '#c9ced6', fontSize: '10px' }}>—</span>
                )}
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

export default NearMissView;
