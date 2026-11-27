import { useEffect, useRef } from 'react';
import { SCORES_UPDATED } from './scoresVersion';

// רענון שקט כשחוזרים למסך שנשאר טעון.
//
// הלשוניות נשארות טעונות אחרי הביקור הראשון, כדי שמעבר ביניהן יהיה מיידי
// ולא יאבד בחירות. המחיר: מסך שלא רואים לא מתעדכן. לכן, כשחוזרים אליו
// אחרי יותר מ-staleMs - או כשהאפליקציה חוזרת מהרקע - הנתונים נטענים מחדש
// ברקע, בלי ספינר, והמסך פשוט מתעדכן.
// בנוסף: כשהניקוד מתעדכן בשרת (משחק הסתיים - services/scoresVersion.js),
// מסך גלוי מתרענן מיד, ומסך מוסתר מסומן כישן ומתרענן ברגע שחוזרים אליו.

const DEFAULT_STALE_MS = 60 * 1000;

export default function useReturnRefresh(active, refresh, staleMs = DEFAULT_STALE_MS) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const leftAt = useRef(null);
  const dirty = useRef(false);

  // מעבר בין לשוניות
  useEffect(() => {
    if (!active) {
      leftAt.current = Date.now();
      return;
    }
    if (dirty.current || (leftAt.current && Date.now() - leftAt.current > staleMs)) refreshRef.current();
    dirty.current = false;
    leftAt.current = null;
  }, [active, staleMs]);

  // הניקוד השתנה בשרת
  const activeRef = useRef(active);
  activeRef.current = active;
  useEffect(() => {
    const onScores = () => {
      if (activeRef.current && !document.hidden) refreshRef.current();
      else dirty.current = true;
    };
    window.addEventListener(SCORES_UPDATED, onScores);
    return () => window.removeEventListener(SCORES_UPDATED, onScores);
  }, []);

  // חזרה מהרקע (האפליקציה נשארה פתוחה בטלפון)
  useEffect(() => {
    let hiddenAt = null;
    const onVisibility = () => {
      if (document.hidden) { hiddenAt = Date.now(); return; }
      if (active && (dirty.current || (hiddenAt && Date.now() - hiddenAt > staleMs))) { dirty.current = false; refreshRef.current(); }
      hiddenAt = null;
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [active, staleMs]);
}
