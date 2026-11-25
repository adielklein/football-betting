// גולי קופץ לרגע בתחתית המסך עם הודעה קצרה (חגיגות). הרכיב שמציג אותו:
// components/GoliPop.js, מורכב פעם אחת במסך השחקן.
export const goliPop = (detail) => {
  try { window.dispatchEvent(new CustomEvent('goli-pop', { detail })); } catch (e) { /* בלי חגיגה */ }
};
