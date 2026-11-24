import React from 'react';

// "נתונים מורחבים" בחלון הנתונים (הגדרה אישית, כבויה כברירת מחדל):
// פצועים ומושעים, הרכבים, שחקני מפתח, הצבעת קהל 365, טרנדים, שופט ואצטדיון.
// הנתונים מגיעים מ-/external/insights/:id/extended, כבר מיושרים לצד שלנו
// (t1 = הקבוצה הראשונה בשורת ההימור).

const ACCENT_1 = '#2f6fd0';
const ACCENT_2 = '#d06a2f';

const box = {
  borderRadius: '12px', background: 'var(--surface-2, #f7f9fc)', border: '1px solid var(--border, #e8edf4)',
  padding: '0.5rem 0.6rem'
};
const small = { fontSize: 'var(--fs-xs)', color: 'var(--text-3, #6b7280)' };

function Section({ title, hint, children }) {
  return (
    <div style={{ marginBottom: '0.9rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.45rem' }}>
        <h4 style={{ margin: 0, fontSize: 'var(--fs-sm)', fontWeight: 800, color: 'var(--text, #333)' }}>{title}</h4>
        {hint && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4, #aaa)', fontWeight: 600 }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// extra - טקסט משמאל לשם (מערך), ב-ltr: "3-4-2-1" בתוך טקסט עברי מתהפך
const TeamTitle = ({ name, color, extra }) => (
  <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 800, color, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
    <span style={{ width: 4, height: 12, borderRadius: 2, background: color, display: 'inline-block', flexShrink: 0 }} />
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
    {extra && <bdi dir="ltr" style={{ color: 'var(--text-4, #9aa2ae)', fontWeight: 700, flexShrink: 0 }}>{extra}</bdi>}
  </div>
);

// סדר לפי הצד שלנו
export const orient = (ext) => {
  if (!ext) return null;
  const f = ext.flipped;
  return {
    t1: f ? ext.away : ext.home,
    t2: f ? ext.home : ext.away,
    side: (s) => (s === 'both' || !s ? s : (f ? (s === 'home' ? 2 : 1) : (s === 'home' ? 1 : 2))),
    votes: ext.votes ? { t1: f ? ext.votes.away : ext.votes.home, draw: ext.votes.draw, t2: f ? ext.votes.home : ext.votes.away, total: ext.votes.total } : null,
    perf: (c) => ({ t1: f ? c.away : c.home, t2: f ? c.home : c.away })
  };
};

// פצועים ומושעים - מוצג גבוה בחלון, זה הנתון שהכי משנה הימור
export function MissingSection({ ext, t1Name, t2Name }) {
  const o = orient(ext);
  if (!o) return null;
  const teams = [{ t: o.t1, name: t1Name || o.t1?.name, c: ACCENT_1 }, { t: o.t2, name: t2Name || o.t2?.name, c: ACCENT_2 }];
  if (teams.every((x) => !x.t?.missing?.length)) {
    return (
      <Section title="🚑 חסרים">
        <div style={{ ...small, textAlign: 'center', padding: '0.3rem' }}>אין דיווח על פצועים או מושעים</div>
      </Section>
    );
  }
  return (
    <Section title="🚑 חסרים" hint="פצועים, מושעים ובספק">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {teams.map(({ t, name, c }) => (
          <div key={name} style={box}>
            <TeamTitle name={name} color={c} />
            {!t?.missing?.length ? (
              <div style={small}>אין חסרים</div>
            ) : t.missing.map((p, i) => (
              <div key={i} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: '0.4rem', padding: '3px 0', fontSize: 'var(--fs-xs)', borderTop: i ? '1px dashed var(--border, #e8edf4)' : 'none' }}>
                <span style={{ fontWeight: 800, color: 'var(--text, #2c3038)', whiteSpace: 'nowrap' }}>{p.name}</span>
                {p.position && <span style={{ color: 'var(--text-4, #9aa2ae)', whiteSpace: 'nowrap' }}>{p.position}</span>}
                <span style={{
                  marginInlineStart: 'auto', whiteSpace: 'nowrap', fontWeight: 700,
                  color: p.doubtful ? 'var(--warn-fg, #9a6400)' : 'var(--bad-fg, #b42318)'
                }}>
                  {p.doubtful ? '❓ בספק' : '❌ בחוץ'}
                </span>
                {(p.reason || (p.expectedReturn && !p.doubtful)) && (
                  <span style={{ flexBasis: '100%', color: 'var(--text-3, #7a828e)' }}>
                    {[p.reason, !p.doubtful && p.expectedReturn ? `חוזר: ${p.expectedReturn}` : null].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </Section>
  );
}

// שאר הנתונים המורחבים - בסוף החלון
export function ExtendedRest({ ext, t1Name, t2Name }) {
  const o = orient(ext);
  if (!o) return null;
  const n1 = t1Name || o.t1?.name, n2 = t2Name || o.t2?.name;
  const hasLineup = (o.t1?.starters?.length || 0) + (o.t2?.starters?.length || 0) > 0;
  const probable = o.t1?.lineupProbable || o.t2?.lineupProbable;

  return (
    <>
      {o.votes && o.votes.total > 0 && (
        <Section title="🗳️ מי תנצח? קהל 365" hint={`${o.votes.total.toLocaleString('he-IL')} הצביעו`}>
          <div style={{ display: 'flex', height: '26px', borderRadius: '8px', overflow: 'hidden', fontSize: 'var(--fs-xs)', fontWeight: 800, color: '#fff' }}>
            {[{ v: o.votes.t1, c: ACCENT_1, l: '1' }, { v: o.votes.draw, c: '#c67e00', l: 'X' }, { v: o.votes.t2, c: ACCENT_2, l: '2' }].map((x) => (
              <div key={x.l} style={{ width: `${Math.max(x.v || 0, 0)}%`, minWidth: x.v ? '30px' : 0, background: x.c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {x.v ? `${x.l} ${x.v}%` : ''}
              </div>
            ))}
          </div>
          {ext.overUnder && ext.overUnder.total > 0 && (
            <div style={{ ...small, marginTop: '0.35rem', textAlign: 'center' }}>
              {ext.overUnderTitle || 'מעל/מתחת'}: {ext.overUnder.options.map((x) => `${x.name} ${x.percent ?? 0}%`).join(' · ')}
            </div>
          )}
        </Section>
      )}

      {ext.trends && ext.trends.length > 0 && (
        <Section title="📈 טרנדים">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {ext.trends.map((t, i) => {
              const s = o.side(t.side);
              const c = s === 1 ? ACCENT_1 : s === 2 ? ACCENT_2 : 'var(--text-4, #9aa2ae)';
              return (
                <div key={i} style={{ ...box, padding: '0.35rem 0.55rem', fontSize: 'var(--fs-xs)', color: 'var(--text-2, #3d434c)', borderInlineStart: `3px solid ${c}` }}>
                  {t.text}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {ext.topPerformers && ext.topPerformers.length > 0 && (
        <Section title="⭐ שחקני מפתח" hint="העונה">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {ext.topPerformers.map((c) => {
              const p = o.perf(c);
              const cell = (pl, color, left = false) => (
                <div style={{ flex: 1, minWidth: 0, textAlign: left ? 'left' : 'right' }}>
                  {pl ? (
                    <>
                      <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 800, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl.name}</div>
                      <div style={{ ...small, fontSize: '0.68rem' }}>{pl.stats.map((x) => `${x.name} ${x.value}`).join(' · ')}</div>
                    </>
                  ) : <div style={small}>—</div>}
                </div>
              );
              return (
                <div key={c.category} style={{ ...box, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {cell(p.t1, ACCENT_1)}
                  <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 800, color: 'var(--text-4, #a3aab5)', flexShrink: 0 }}>{c.category}</span>
                  {cell(p.t2, ACCENT_2, true)}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {hasLineup && (
        <Section title="👕 הרכבים" hint={probable ? 'משוער - ההרכב הרשמי מתפרסם כשעה לפני' : 'רשמי'}>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {[{ t: o.t1, n: n1, c: ACCENT_1 }, { t: o.t2, n: n2, c: ACCENT_2 }].map(({ t, n, c }) => (
              <div key={n} style={{ ...box, flex: 1, minWidth: 0 }}>
                <TeamTitle name={n} color={c} extra={t?.formation} />
                {(t?.starters || []).map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.3rem', fontSize: 'var(--fs-xs)', padding: '1px 0', color: 'var(--text-2, #3d434c)' }}>
                    <span style={{ minWidth: '16px', color: 'var(--text-4, #a3aab5)', fontWeight: 700, textAlign: 'center' }}>{p.number ?? ''}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Section>
      )}

      {(ext.referee || ext.venue?.name) && (
        <Section title="🏟️ שופט ואצטדיון">
          <div style={{ ...box, fontSize: 'var(--fs-xs)', color: 'var(--text-2, #3d434c)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {ext.referee && <span>🧑‍⚖️ שופט: <strong>{ext.referee}</strong></span>}
            {ext.venue?.name && <span>📍 {ext.venue.name}{ext.venue.capacity ? ` · ${ext.venue.capacity.toLocaleString('he-IL')} מקומות` : ''}</span>}
          </div>
        </Section>
      )}
    </>
  );
}
