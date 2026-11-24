import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

// סמל התחרות מ-365.
//
// אין מה לשמור ואין מה לסנכרן: הכתובת נגזרת ממזהה התחרות שכבר שמור על
// הליגה, ולכן אם המזהה נכון - הסמל נכון, וגם מתעדכן מעצמו כש-365 מחליפים
// אותו. ליגה בלי מזהה 365 פשוט לא מציגה סמל, והצבע והשם ממשיכים לזהות
// אותה כמו קודם.
//
// גודל כפול מהמבוקש בכתובת עצמה, כדי שיהיה חד במסכי רטינה.

const competitionImage = (id, px) =>
  `https://imagecache.365scores.com/image/upload/f_png,w_${px},h_${px},c_limit,q_auto:eco,dpr_2/v9/Competitions/${id}`;

// הליגה מגיעה למסכים בשתי צורות: אובייקט מאוכלס, או מזהה בלבד
const competitionIdOf = (league) =>
  league && typeof league === 'object' ? league.scores365CompetitionId || null : null;

// סמל לבן (ליגת האלופות, למשל - 365 מציירים אותו לרקע כהה) נעלם על כרטיס
// לבן. בודקים פעם אחת לכל תחרות אם הסמל בהיר; אם כן הוא מוצג על עיגול בצבע
// הליגה. בכל מקרה יש לו קו מתאר דק, כך שגם בלי הבדיקה (שרת שלא מאפשר לקרוא
// את התמונה) הוא לא נבלע ברקע.
const lightCache = new Map(); // id -> true/false

const isLightImage = (img) => {
  try {
    const c = document.createElement('canvas');
    c.width = 24; c.height = 24;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, 24, 24);
    const d = ctx.getImageData(0, 0, 24, 24).data;
    let n = 0, lum = 0, sat = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 128) continue;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      lum += 0.299 * r + 0.587 * g + 0.114 * b;
      sat += Math.max(r, g, b) - Math.min(r, g, b);
      n++;
    }
    if (!n) return false;
    return lum / n > 200 && sat / n < 40;
  } catch (e) {
    return false; // התמונה לא ניתנת לקריאה (CORS) - נשארים עם קו המתאר
  }
};

// בדיקת הבהירות על עותק נפרד של התמונה, לא על זו שמוצגת: crossOrigin על
// התמונה המוצגת היה מעלים אותה לגמרי אם השרת לא מרשה. קודם ישירות, ואם
// נחסם - דרך המעבר בשרת שלנו (כמו three/stage.js)
const probe = (src) => new Promise((resolve) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 2;
      c.getContext('2d').drawImage(img, 0, 0, 2, 2);
      c.getContext('2d').getImageData(0, 0, 1, 1);
      resolve(img);
    } catch (e) { resolve(null); }
  };
  img.onerror = () => resolve(null);
  img.src = src;
});
const checkLight = async (id, src) => {
  if (lightCache.has(id)) return lightCache.get(id);
  const img = (await probe(src)) || (await probe(`${API_URL}/image-proxy?u=${encodeURIComponent(src)}`));
  const v = img ? isLightImage(img) : false;
  lightCache.set(id, v);
  return v;
};

const OUTLINE = 'drop-shadow(0 0 0.5px rgba(0,0,0,0.55)) drop-shadow(0 0 0.5px rgba(0,0,0,0.35))';

function LeagueLogo({ league, size = 16 }) {
  const [failed, setFailed] = useState(false);
  const id = competitionIdOf(league);
  const [light, setLight] = useState(() => (id ? lightCache.get(id) === true : false));

  useEffect(() => {
    if (!id) return undefined;
    let alive = true;
    checkLight(id, competitionImage(id, 48)).then((v) => { if (alive) setLight(v); });
    return () => { alive = false; };
  }, [id]);

  // null ולא מציין מקום: התג הצבעוני עם שם הליגה כבר עונה על השאלה,
  // וריבוע אפור לידו רק מוסיף רעש
  if (!id || failed) return null;

  const img = (
    <img
      src={competitionImage(id, size * 2)}
      alt=""
      aria-hidden="true"
      width={light ? Math.round(size * 0.78) : size}
      height={light ? Math.round(size * 0.78) : size}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ objectFit: 'contain', flexShrink: 0, display: 'block', filter: light ? undefined : OUTLINE }}
    />
  );
  if (!light) return img;
  return (
    <span aria-hidden="true" style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: (league && league.color) || '#1b2a4a',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
    }}>{img}</span>
  );
}

export default LeagueLogo;
export { competitionImage, competitionIdOf };
