import React, { useEffect, useRef, useState } from 'react';
import { formatScore } from '../services/liveNumbers';

// מספר שמתגלגל אל הערך החדש במקום להתחלף בו.
//
// בטבלה החיה זה לא קישוט. ההפרש בין 5 ל-6.4 הוא מה שקרה עכשיו במגרש,
// והחלפה מיידית מוחקת אותו: המסך מתרענן כל דקה, ומי שלא הסתכל בדיוק
// באותו רגע רואה מספר אחר בלי לדעת שהוא זז.
//
// זהו גם רכיב וגם שכבת נגישות: המספר המדויק נמצא תמיד ב-aria-label, כדי
// שקורא מסך לא יקריא ערכי ביניים משתנים.

const DURATION_MS = 700;

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function RollingNumber({ value, style }) {
  const target = Number(value);
  const [shown, setShown] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = Number(value);

    if (!Number.isFinite(to) || from === to || prefersReduced()) {
      fromRef.current = Number.isFinite(to) ? to : from;
      setShown(fromRef.current);
      return undefined;
    }

    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      // האטה לקראת הסוף, כך שהמספר "נוחת" ולא נעצר בחתך
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return (
    <span
      aria-label={formatScore(target)}
      style={{ direction: 'ltr', unicodeBidi: 'isolate', fontVariantNumeric: 'tabular-nums', ...style }}
    >
      <span aria-hidden="true">{formatScore(shown)}</span>
    </span>
  );
}

export default RollingNumber;
