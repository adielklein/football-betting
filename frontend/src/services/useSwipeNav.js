import { useRef } from 'react';
import { swipeIntent } from './swipeNav';

// חיבור ההחלקה לאלמנט. מחזיר props להדבקה על המכל של תוכן הלשונית.
//
// המחווה נגמרת בלי preventDefault ובלי מעקב תוך כדי תנועה: מודדים רק
// מאיפה לאיפה. כך הגלילה האנכית נשארת מקורית לגמרי, וההחלקה היא תוספת
// שלא לוקחת שום דבר מהדפדפן.

// אלמנט שאפשר לגלול בו לרוחב אוכל את המחווה בעצמו - טבלה רחבה, רצועת
// לשוניות. מי שמחליק שם מנסה לגלול אותו, לא להחליף מסך.
const insideHorizontalScroller = (node, stopAt) => {
  let el = node;
  while (el && el !== stopAt && el.nodeType === 1) {
    if (el.scrollWidth > el.clientWidth + 2) {
      const overflow = window.getComputedStyle(el).overflowX;
      if (overflow === 'auto' || overflow === 'scroll') return true;
    }
    el = el.parentElement;
  }
  return false;
};

export default function useSwipeNav(onSwipe) {
  const start = useRef(null);
  const host = useRef(null);

  const onTouchStart = (e) => {
    start.current = null;
    if (e.touches.length !== 1) return;

    const target = e.target;
    // חלון שנפתח מעל המסך הוא עולם משל עצמו, ומחווה בתוכו לא אמורה
    // להחליף את מה שמתחתיו
    if (target.closest && target.closest('[data-no-swipe]')) return;
    if (insideHorizontalScroller(target, host.current)) return;

    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY, at: Date.now() };
  };

  const onTouchEnd = (e) => {
    const from = start.current;
    start.current = null;
    if (!from || !e.changedTouches.length) return;

    const t = e.changedTouches[0];
    const intent = swipeIntent({
      dx: t.clientX - from.x,
      dy: t.clientY - from.y,
      dt: Date.now() - from.at
    });
    if (intent) onSwipe(intent);
  };

  // מגע שנקטע - שיחה נכנסת, מחווה של המערכת - לא נחשב החלקה
  const onTouchCancel = () => { start.current = null; };

  return {
    ref: host,
    onTouchStart,
    onTouchEnd,
    onTouchCancel
  };
}
