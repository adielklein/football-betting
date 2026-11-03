import { lazy } from 'react';

const FLAG = 'lazy_chunk_reloaded';

/**
 * React.lazy שמתאושש מגרסה ישנה.
 *
 * אחרי עדכון באתר, קבצי הקוד מקבלים שמות חדשים והישנים נמחקים. מי שהדף
 * שלו נפתח לפני העדכון ינסה להוריד קובץ שכבר לא קיים, והטעינה תיכשל.
 * במקרה כזה טוענים את הדף מחדש פעם אחת, כדי לקבל את הגרסה החדשה. הסימון
 * ב-sessionStorage מונע לולאת רענונים אם התקלה היא משהו אחר.
 */
export const lazyWithReload = (load) =>
  lazy(async () => {
    try {
      const mod = await load();
      try { sessionStorage.removeItem(FLAG); } catch (e) { /* ignore */ }
      return mod;
    } catch (err) {
      let already = false;
      try { already = sessionStorage.getItem(FLAG) === '1'; } catch (e) { /* ignore */ }
      if (!already) {
        try { sessionStorage.setItem(FLAG, '1'); } catch (e) { /* ignore */ }
        window.location.reload();
        return new Promise(() => {}); // הדף מתרענן, אין מה להציג בינתיים
      }
      throw err;
    }
  });
