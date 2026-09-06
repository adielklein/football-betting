import { useEffect, useState } from 'react';

// מצב חי לשבוע: תוצאה ודקת משחק, מתעדכן כל עוד יש משחק שמתנהל.
//
// הקצב לא קבוע בכוונה. כשמשחק באמת רץ מרעננים כל דקה, וכשאין כלום בודקים
// לעיתים רחוקות - אין טעם להעיר את השרת בשביל מסך שאין בו מה להזיז.
// כשהאפליקציה ברקע לא מרעננים בכלל, ומרעננים מיד עם החזרה אליה.

const LIVE_INTERVAL_MS = 60 * 1000;
const IDLE_INTERVAL_MS = 10 * 60 * 1000;

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : 'https://football-betting-backend.onrender.com/api';

export default function useLiveScores(weekId) {
  const [byMatchId, setByMatchId] = useState({});
  const [anyLive, setAnyLive] = useState(false);

  useEffect(() => {
    if (!weekId) {
      setByMatchId({});
      setAnyLive(false);
      return undefined;
    }

    let cancelled = false;
    let timer = null;

    const schedule = (live) => {
      clearTimeout(timer);
      timer = setTimeout(run, live ? LIVE_INTERVAL_MS : IDLE_INTERVAL_MS);
    };

    const run = async () => {
      if (cancelled) return;
      if (document.hidden) { schedule(false); return; }

      try {
        const res = await fetch(`${API_URL}/external/live/${weekId}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (cancelled) return;

        const map = {};
        (data.games || []).forEach((g) => { map[g.matchId] = g; });
        setByMatchId(map);
        setAnyLive(!!data.live);
        schedule(!!data.live);
      } catch (err) {
        // מצב חי הוא תוספת ולא תלות - נכשל בשקט וננסה שוב
        if (!cancelled) schedule(false);
      }
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

  return { liveByMatchId: byMatchId, anyLive };
}
