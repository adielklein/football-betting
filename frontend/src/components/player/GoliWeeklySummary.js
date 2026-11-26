import React, { useEffect, useState } from 'react';
import GoliSprite from '../GoliSprite';
import { teamScarf } from '../goliScarf';
import { API_URL } from '../../config';
import { reducedMotion } from '../../services/motion';

// גולי מסכם את השבוע: אחרי שהניקוד של שבוע חושב, בכניסה הבאה הוא קופץ פעם
// אחת ומספר כמה נקודות קיבלת, כמה בולים, באיזה מקום סיימת את השבוע ואיך
// הלך מול McCannkey. ניצחון בשבוע = חגיגה; שבוע בלי נקודות = ניחום.
//
// פעם אחת לכל שבוע לכל משתמש במכשיר. רק לשבוע שחושב בשבוע האחרון, ורק
// אם הימרת בו. לא בזמן הסיור המודרך.

const KEY = (uid, weekId) => `goli_week_v1:${uid}:${weekId}`;
const seen = (uid, weekId) => { try { return localStorage.getItem(KEY(uid, weekId)) === '1'; } catch (e) { return true; } };
const markSeen = (uid, weekId) => { try { localStorage.setItem(KEY(uid, weekId), '1'); } catch (e) { /* אחסון חסום */ } };
const RECENT_MS = 8 * 24 * 3600 * 1000;
const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

const isExact = (b) => {
  const r = b.matchId && b.matchId.result;
  return b.prediction && r && r.team1Goals != null && r.team2Goals != null &&
    b.prediction.team1Goals === r.team1Goals && b.prediction.team2Goals === r.team2Goals;
};

// מה גולי אומר, לפי התוצאה
export const summarize = ({ bets, userId, weekName }) => {
  const totals = new Map();
  let bot = null;
  let mine = 0, exacts = 0, myBets = 0;
  for (const b of bets) {
    const u = b.userId;
    if (!u || u.role === 'admin') continue;
    const pts = Number(b.points) || 0;
    if (u.role === 'bot') { bot = (bot || 0) + pts; continue; }
    const id = String(u._id);
    totals.set(id, (totals.get(id) || 0) + pts);
    if (id === String(userId)) { mine += pts; myBets++; if (isExact(b)) exacts++; }
  }
  if (!myBets) return null;
  mine = round1(mine);
  const scores = [...totals.values()].map(round1);
  const rank = 1 + scores.filter((s) => s > mine).length;
  const of = scores.length;
  let mood = 'wave', title = 'סיכום השבוע';
  if (mine === 0) { mood = 'sad'; title = 'שבוע קשה...'; }
  else if (rank === 1) { mood = 'celebrate'; title = 'ניצחת את השבוע! 🏆'; }
  else if (rank <= 3) { mood = 'celebrate'; title = 'שבוע מצוין!'; }
  const lines = [
    `${weekName}: קיבלת ${mine} נקודות${exacts ? `, כולל ${exacts === 1 ? 'בול אחד' : `${exacts} בולים`}` : ''}.`,
    `מקום ${rank} מתוך ${of} השבוע.`
  ];
  if (bot != null) {
    const b = round1(bot);
    lines.push(`🐒 McCannkey קיבל ${b} - ${mine > b ? 'ניצחת את המחשב!' : mine < b ? 'הפעם המחשב ניצח.' : 'תיקו עם המחשב.'}`);
  }
  if (mine === 0) lines.push('בשבוע הבא זה מתהפך 💪');
  return { mood, title, lines, mine, rank, of, exacts };
};

export default function GoliWeeklySummary({ weeks, user, blocked, onOpenTable }) {
  const [data, setData] = useState(null);
  const uid = user?._id || user?.id;
  const still = reducedMotion();

  useEffect(() => {
    if (blocked || !uid || !Array.isArray(weeks) || data) return undefined;
    const now = Date.now();
    const week = weeks
      .filter((w) => w && w.scoresCalculatedAt && now - new Date(w.scoresCalculatedAt).getTime() < RECENT_MS)
      .sort((a, b) => new Date(b.scoresCalculatedAt) - new Date(a.scoresCalculatedAt))[0];
    if (!week || seen(uid, week._id)) return undefined;
    let alive = true;
    fetch(`${API_URL}/bets/week/${week._id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((bets) => {
        if (!alive) return;
        const s = Array.isArray(bets) ? summarize({ bets, userId: uid, weekName: week.name }) : null;
        if (!s) { markSeen(uid, week._id); return; }
        setData({ ...s, weekId: week._id });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [weeks, uid, blocked]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data || blocked) return null;
  const close = () => { markSeen(uid, data.weekId); setData(null); };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="goli-week-title"
      data-no-swipe=""
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 11500, background: 'rgba(8,12,20,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
      }}
    >
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '360px', background: 'var(--surface, #fff)', color: 'var(--text, #23272f)',
          borderRadius: '20px', padding: '1rem 1rem 0.85rem', boxShadow: '0 16px 50px rgba(0,0,0,0.35)', textAlign: 'center',
          animation: still ? 'none' : 'goliWeekIn .45s cubic-bezier(.2,1.3,.4,1) both'
        }}
      >
        <style>{'@keyframes goliWeekIn { 0% { transform: translateY(24px) scale(.94); opacity: 0 } 100% { transform: none; opacity: 1 } }'}</style>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-0.2rem' }}>
          <GoliSprite mood={data.mood} stepKey={data.weekId} size={104} still={still} crown={data.rank === 1} scarf={teamScarf()} />
        </div>
        <h3 id="goli-week-title" style={{ margin: '0.25rem 0 0.4rem', fontSize: 'var(--fs-lg)', fontWeight: 900 }}>{data.title}</h3>
        <div style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.6, color: 'var(--text-2, #3d434c)' }}>
          {data.lines.map((l, i) => <div key={i}>{l}</div>)}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.9rem' }}>
          <button
            type="button"
            onClick={close}
            style={{ flex: '0 0 auto', minHeight: '44px', padding: '0 1rem', borderRadius: '12px', border: '1px solid var(--border-2, #dde1e7)', background: 'var(--surface-2, #f7f9fc)', color: 'var(--text-2, #3d434c)', fontWeight: 700, fontSize: 'var(--fs-sm)', cursor: 'pointer' }}
          >
            סגור
          </button>
          <button
            type="button"
            onClick={() => { close(); if (onOpenTable) onOpenTable(); }}
            style={{ flex: 1, minHeight: '44px', borderRadius: '12px', border: 'none', background: 'var(--theme-tile, #2f6fd0)', color: 'var(--theme-tile-fg, #fff)', fontWeight: 800, fontSize: 'var(--fs-sm)', cursor: 'pointer' }}
          >
            🏆 לטבלה
          </button>
        </div>
      </div>
    </div>
  );
}
