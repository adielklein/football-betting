import React, { useState, useEffect, useCallback } from 'react';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : 'https://football-betting-backend.onrender.com/api';

const OUTCOME_STYLE = {
  W: { bg: '#e8f6ec', border: '#8fd6a4', color: '#1e7a3c', label: 'נ' },
  D: { bg: '#fff6e0', border: '#f0cf82', color: '#8a6100', label: 'ת' },
  L: { bg: '#fdecec', border: '#f0a3a3', color: '#b3261e', label: 'ה' }
};

const ACCENT_1 = '#2f6fd0';
const ACCENT_2 = '#d06a2f';

const shortDate = (iso) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}` : '');

function Section({ title, hint, children }) {
  return (
    <div style={{ marginBottom: '0.9rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.45rem' }}>
        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#333' }}>{title}</h4>
        {hint && <span style={{ fontSize: '10px', color: '#aaa', fontWeight: 600 }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// פס השוואה דו-צדדי בין שתי הקבוצות
function CompareRow({ label, a, b, lowerIsBetter = false }) {
  const total = (a == null ? 0 : Math.max(a, 0)) + (b == null ? 0 : Math.max(b, 0));
  const aPct = total > 0 ? (Math.max(a || 0, 0) / total) * 100 : 50;
  const comparable = a != null && b != null && a !== b;
  const aBetter = comparable && (lowerIsBetter ? a < b : a > b);
  const bBetter = comparable && (lowerIsBetter ? b < a : b > a);

  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
        <span style={{ fontSize: '13px', fontWeight: 800, color: aBetter ? '#1e7a3c' : '#666', minWidth: '34px' }}>
          {a == null ? '—' : a}
        </span>
        <span style={{ fontSize: '10.5px', color: '#999', fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: 800, color: bBetter ? '#1e7a3c' : '#666', minWidth: '34px', textAlign: 'left' }}>
          {b == null ? '—' : b}
        </span>
      </div>
      <div style={{ display: 'flex', height: '5px', borderRadius: '3px', overflow: 'hidden', background: '#eef1f5' }}>
        <div style={{ width: `${aPct}%`, background: aBetter ? '#4caf7d' : ACCENT_1, transition: 'width .4s ease' }} />
        <div style={{ width: `${100 - aPct}%`, background: bBetter ? '#4caf7d' : '#d8dee8', transition: 'width .4s ease' }} />
      </div>
    </div>
  );
}

// שורת כושר: צ'יפים של נ/ת/ה שאפשר להרחיב לפירוט המשחקים
function FormRow({ team, accent, expanded, onToggle }) {
  const form = team.form || [];
  const hasForm = form.length > 0;

  return (
    <div style={{
      padding: '0.5rem 0.55rem',
      borderRadius: '10px',
      background: '#fafbfc',
      border: '1px solid #eef1f4',
      marginBottom: '0.35rem'
    }}>
      <div
        onClick={hasForm ? onToggle : undefined}
        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: hasForm ? 'pointer' : 'default' }}
      >
        <span style={{ width: '6px', height: '20px', borderRadius: '3px', background: accent, flexShrink: 0 }} />
        <span style={{
          fontSize: '12px', fontWeight: 700, color: '#333', flex: 1, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>
          {team.name}
        </span>
        <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
          {!hasForm && <span style={{ fontSize: '11px', color: '#bbb' }}>אין נתונים</span>}
          {form.map((f, i) => {
            const s = OUTCOME_STYLE[f.outcome];
            return (
              <span key={i} style={{
                width: '19px', height: '19px', borderRadius: '5px',
                background: s.bg, border: `1px solid ${s.border}`, color: s.color,
                fontSize: '10px', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>{s.label}</span>
            );
          })}
        </div>
        {hasForm && (
          <span style={{
            fontSize: '11px', fontWeight: 800, color: '#555',
            background: '#eef1f5', borderRadius: '6px', padding: '1px 6px', flexShrink: 0
          }}>{team.formPoints}/{team.formMax}</span>
        )}
        {hasForm && <span style={{ fontSize: '9px', color: '#bbb', flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>}
      </div>

      {expanded && hasForm && (
        <div style={{ marginTop: '0.45rem', paddingTop: '0.4rem', borderTop: '1px dashed #e5e9ee' }}>
          {form.map((f, i) => {
            const s = OUTCOME_STYLE[f.outcome];
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                fontSize: '11px', padding: '2.5px 0', color: '#666'
              }}>
                <span style={{ color: '#bbb', fontSize: '10px', minWidth: '34px' }}>{shortDate(f.date)}</span>
                <span style={{
                  fontSize: '9px', fontWeight: 700, color: '#999',
                  background: '#f0f2f5', borderRadius: '4px', padding: '1px 4px', flexShrink: 0
                }}>{f.isHome ? 'בית' : 'חוץ'}</span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.opponent}
                </span>
                <span style={{ fontWeight: 800, color: s.color, fontVariantNumeric: 'tabular-nums' }}>
                  {f.goalsFor}-{f.goalsAgainst}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TeamHeader({ team, accent, focused }) {
  return (
    <div style={{
      flex: '1 1 0', minWidth: 0, textAlign: 'center',
      padding: '0.5rem 0.3rem', borderRadius: '12px',
      background: focused ? `${accent}14` : 'transparent',
      border: `2px solid ${focused ? accent : 'transparent'}`,
      transition: 'all .25s ease'
    }}>
      {team.logo && (
        <img
          src={team.logo}
          alt=""
          style={{ width: '42px', height: '42px', objectFit: 'contain' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      )}
      <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#2c3038', lineHeight: 1.2, marginTop: '2px' }}>
        {team.name}
      </div>
      {team.table ? (
        <div style={{ fontSize: '10.5px', color: '#8b93a1', fontWeight: 600, marginTop: '2px' }}>
          מקום {team.table.position} · {team.table.points} נק'
        </div>
      ) : (
        <div style={{ fontSize: '10.5px', color: '#c3c8d0', marginTop: '2px' }}>אין טבלה</div>
      )}
    </div>
  );
}

function MatchInsightsModal({ match, focusTeam, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedForm, setExpandedForm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/external/insights/${match._id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.reason || json.message || 'שגיאה בטעינת הנתונים');
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [match._id]);

  useEffect(() => { load(); }, [load]);

  // נעילת גלילת הרקע כל עוד המודל פתוח
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // סגירה ב-Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 365 מחזירים תמיד בית/חוץ שלהם. אם הסדר אצלנו הפוך - מיישרים הכל
  // כדי שהצד הימני במודל יהיה אותה קבוצה שמופיעה ראשונה בשורת ההימור.
  const flipped = data?.flipped;
  const t1 = data ? (flipped ? data.away : data.home) : null;
  const t2 = data ? (flipped ? data.home : data.away) : null;

  const { odds, impliedProbabilities: probs, prediction: pred, h2hSummary: h2hSum } = data || {};
  const pick = (homeVal, awayVal) => (flipped ? awayVal : homeVal);
  const oddsT1 = pick(odds?.homeWin, odds?.awayWin);
  const oddsT2 = pick(odds?.awayWin, odds?.homeWin);
  const probT1 = pick(probs?.home, probs?.away);
  const probT2 = pick(probs?.away, probs?.home);
  const predT1 = pick(pred?.suggestedHome, pred?.suggestedAway);
  const predT2 = pick(pred?.suggestedAway, pred?.suggestedHome);
  const expT1 = pick(pred?.expectedHome, pred?.expectedAway);
  const expT2 = pick(pred?.expectedAway, pred?.expectedHome);
  const h2hT1Wins = pick(h2hSum?.homeWins, h2hSum?.awayWins);
  const h2hT2Wins = pick(h2hSum?.awayWins, h2hSum?.homeWins);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 11000,
        background: 'rgba(16,20,28,0.55)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'overlayIn .2s ease'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '460px', maxHeight: '92vh',
          background: '#fff', borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column',
          animation: 'sheetUp .28s cubic-bezier(0.2,0.9,0.3,1)'
        }}
      >
        <div style={{ padding: '0.5rem 0.9rem 0.3rem', flexShrink: 0 }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#dde1e7', margin: '0 auto 0.5rem' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: '#9aa2ae', fontWeight: 700 }}>
              {data?.competition || 'נתוני משחק'}
            </span>
            <button
              onClick={onClose}
              aria-label="סגור"
              style={{
                border: 'none', background: '#f2f4f7', color: '#6b7280',
                width: '26px', height: '26px', borderRadius: '50%',
                fontSize: '15px', lineHeight: 1, cursor: 'pointer', fontWeight: 700
              }}
            >×</button>
          </div>
        </div>

        <div style={{ overflowY: 'auto', padding: '0.3rem 0.9rem 1.2rem', WebkitOverflowScrolling: 'touch' }}>
          {loading && (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '26px', marginBottom: '0.5rem', animation: 'pulse 1s ease infinite' }}>📊</div>
              <div style={{ color: '#9aa2ae', fontSize: '13px' }}>טוען נתונים מ-365scores...</div>
            </div>
          )}

          {error && !loading && (
            <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '26px', marginBottom: '0.5rem' }}>🔍</div>
              <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '0.9rem' }}>{error}</div>
              <button
                onClick={load}
                style={{
                  border: 'none', borderRadius: '10px', padding: '0.5rem 1.1rem',
                  background: '#eef2f8', color: '#3b6fd4', fontWeight: 700, fontSize: '13px', cursor: 'pointer'
                }}
              >נסה שוב</button>
            </div>
          )}

          {data && !loading && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.7rem' }}>
                <TeamHeader team={t1} accent={ACCENT_1} focused={focusTeam === 1} />
                <div style={{ flexShrink: 0, color: '#c3c8d0', fontWeight: 800, fontSize: '12px' }}>VS</div>
                <TeamHeader team={t2} accent={ACCENT_2} focused={focusTeam === 2} />
              </div>

              {pred && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.55rem',
                  padding: '0.6rem', borderRadius: '14px', marginBottom: '0.9rem',
                  background: 'linear-gradient(135deg,#f3f8ff,#eef4ff)',
                  border: '1px solid #dbe7fb'
                }}>
                  <span style={{ fontSize: '15px' }}>⚡</span>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#8b93a1' }}>תחזית לפי כושר</div>
                    <div style={{
                      fontSize: '19px', fontWeight: 900, color: '#2f4f86',
                      fontVariantNumeric: 'tabular-nums', lineHeight: 1.15
                    }}>
                      {predT1} - {predT2}
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#9aa2ae' }}>צפי שערים {expT1} - {expT2}</div>
                  </div>
                </div>
              )}

              <Section title="יחסי ווינר" hint={odds ? 'הסתברות משתמעת' : undefined}>
                {odds ? (
                  <>
                    <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.4rem' }}>
                      {[
                        { k: '1', v: oddsT1, p: probT1, c: ACCENT_1 },
                        { k: 'X', v: odds.draw, p: probs?.draw, c: '#c67e00' },
                        { k: '2', v: oddsT2, p: probT2, c: ACCENT_2 }
                      ].map((o) => (
                        <div key={o.k} style={{
                          flex: 1, textAlign: 'center', padding: '0.4rem 0.2rem',
                          borderRadius: '10px', background: '#f7f9fc', border: '1px solid #e8edf4'
                        }}>
                          <div style={{ fontSize: '10px', color: '#9aa2ae', fontWeight: 700 }}>{o.k}</div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: o.c }}>{o.v ?? '—'}</div>
                          {o.p != null && <div style={{ fontSize: '10px', color: '#8b93a1', fontWeight: 600 }}>{o.p}%</div>}
                        </div>
                      ))}
                    </div>
                    {probs && (
                      <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${probT1}%`, background: ACCENT_1 }} />
                        <div style={{ width: `${probs.draw}%`, background: '#e0a83c' }} />
                        <div style={{ width: `${probT2}%`, background: ACCENT_2 }} />
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{
                    padding: '0.6rem', borderRadius: '10px', background: '#fffaf0',
                    border: '1px solid #f5e3c0', fontSize: '11.5px', color: '#9a7b3f', textAlign: 'center'
                  }}>
                    ווינר עדיין לא פרסמו יחסים למשחק הזה — הם מתפרסמים בדרך כלל כשבוע לפני
                  </div>
                )}
              </Section>

              <Section title="כושר אחרון" hint="לחצו להרחבה">
                <FormRow
                  team={t1}
                  accent={ACCENT_1}
                  expanded={expandedForm === 1}
                  onToggle={() => setExpandedForm(expandedForm === 1 ? null : 1)}
                />
                <FormRow
                  team={t2}
                  accent={ACCENT_2}
                  expanded={expandedForm === 2}
                  onToggle={() => setExpandedForm(expandedForm === 2 ? null : 2)}
                />
              </Section>

              <Section title="השוואה" hint="ירוק = טוב יותר">
                <CompareRow label="ממוצע כבישה" a={t1.avgScored} b={t2.avgScored} />
                <CompareRow label="ממוצע ספיגה" a={t1.avgConceded} b={t2.avgConceded} lowerIsBetter />
                <CompareRow label="שער נקי" a={t1.cleanSheets} b={t2.cleanSheets} />
                {t1.table && t2.table && (
                  <>
                    <CompareRow label="נקודות" a={t1.table.points} b={t2.table.points} />
                    <CompareRow label="הפרש שערים" a={t1.table.goalDiff} b={t2.table.goalDiff} />
                  </>
                )}
              </Section>

              {data.h2h?.length > 0 && (
                <Section
                  title="ראש בראש"
                  hint={`${data.h2h.length} מפגשים אחרונים · בית/חוץ לפי ${t1?.name || 'הקבוצה הראשונה'}`}
                >
                  <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.45rem' }}>
                    {[
                      { n: h2hT1Wins, l: t1?.name || 'נצחונות', c: ACCENT_1 },
                      { n: h2hSum?.draws, l: 'תיקו', c: '#c67e00' },
                      { n: h2hT2Wins, l: t2?.name || 'נצחונות', c: ACCENT_2 }
                    ].map((x, i) => (
                      <div key={i} style={{
                        flex: 1, textAlign: 'center', padding: '0.35rem',
                        borderRadius: '10px', background: '#f7f9fc', border: '1px solid #e8edf4'
                      }}>
                        <div style={{ fontSize: '16px', fontWeight: 900, color: x.c }}>{x.n ?? 0}</div>
                        <div style={{ fontSize: '9.5px', color: '#9aa2ae', fontWeight: 600 }}>{x.l}</div>
                      </div>
                    ))}
                  </div>
                  {data.h2h.map((m, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      fontSize: '11px', color: '#666', padding: '3px 0.3rem',
                      borderBottom: i < data.h2h.length - 1 ? '1px dashed #eef1f4' : 'none'
                    }}>
                      <span style={{ color: '#bbb', minWidth: '34px', fontSize: '10px' }}>{shortDate(m.date)}</span>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.competition}
                      </span>
                      {/* המספרים נצבעים בצבע הקבוצה שלהם, באותם צבעים שבהם
                          מסומנות הקבוצות לאורך כל החלון. כך אי אפשר לקרוא
                          תוצאה לצד הלא נכון גם בלי לספור מי רשום ראשון. */}
                      <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', direction: 'ltr', unicodeBidi: 'isolate' }}>
                        <span style={{ color: ACCENT_1 }}>{flipped ? m.awayGoals : m.homeGoals}</span>
                        <span style={{ color: '#bbb' }}>-</span>
                        <span style={{ color: ACCENT_2 }}>{flipped ? m.homeGoals : m.awayGoals}</span>
                      </span>
                      <span style={{ fontSize: '9px', color: '#b6bcc6', minWidth: '26px', textAlign: 'center' }}>
                        {(flipped ? !m.homeTeamWasHome : m.homeTeamWasHome) ? 'בית' : 'חוץ'}
                      </span>
                    </div>
                  ))}
                </Section>
              )}

              <div style={{ textAlign: 'center', fontSize: '9.5px', color: '#c3c8d0', marginTop: '0.6rem' }}>
                נתונים: 365scores{data.venue ? ` · ${data.venue}` : ''}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MatchInsightsModal;
