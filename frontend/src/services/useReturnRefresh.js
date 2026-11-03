import { useEffect, useRef } from 'react';

// רענון שקט כשחוזרים למסך שנשאר טעון.
//
// הלשוניות נשארות טעונות אחרי הביקור הראשון, כדי שמעבר ביניהן יהיה מיידי
// ולא יאבד בחירות. המחיר: מסך שלא רואים לא מתעדכן. לכן, כשחוזרים אליו
// אחרי יותר מ-staleMs - או כשהאפליקציה חוזרת מהרקע - הנתונים נטענים מחדש
// ברקע, בלי ספינר, והמסך פשוט מתעדכן.

const DEFAULT_STALE_MS = 60 * 1000;

export default function useReturnRefresh(active, refresh, staleMs = DEFAULT_STALE_MS) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const leftAt = useRef(null);

  // מעבר בין לשוניות
  useEffect(() => {
    if (!active) {
      leftAt.current = Date.now();
      return;
    }
    if (leftAt.current && Date.now() - leftAt.current > staleMs) refreshRef.current();
    leftAt.current = null;
  }, [active, staleMs]);

  // חזרה מהרקע (האפליקציה נשארה פתוחה בטלפון)
  useEffect(() => {
    let hiddenAt = null;
    const onVisibility = () => {
      if (document.hidden) { hiddenAt = Date.now(); return; }
      if (active && hiddenAt && Date.now() - hiddenAt > staleMs) refreshRef.current();
      hiddenAt = null;
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [active, staleMs]);
}
