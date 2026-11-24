import React from 'react';

// סיבוב תלת-ממדי אמיתי של חולצה, רק בזמן לחיצה (0.8 שניות).
//
// גוף החולצה הוא גליל אליפטי שבנוי מרצועות אנכיות: כל רצועה מציגה פרוסה
// מהציור השטוח (svg), ממוקמת על היקף האליפסה ומסובבת לפי הנורמל שלה. הגב
// הוא אותו גליל מאחור, בציור הפוך. השרוולים הם משטחים נפרדים שבולטים לצדדים,
// ולכן כשהחולצה בצד שרוול אחד פונה אלינו והשני מתרחק - כמו חולצה אמיתית.
// התאורה: כל רצועה מתכהה לפי הזווית שלה לצופה (אנימציה עם השהיה לפי הזווית).
//
// כאן יש הקשר תלת-ממדי משותף (preserve-3d). זה מה שגרם בעבר לבאג באייפון
// (שכבה שצוירה מעל חלון קופץ) - אבל שם הוא היה על המסך כל הזמן, וכאן הוא קיים
// רק בזמן הסיבוב, ולחיצה על חולצה כבר לא פותחת חלון.

const VB_W = 48;
const VB_H = 44;
const TORSO_X0 = 11.5;
const TORSO_X1 = 36.5;
const A = (TORSO_X1 - TORSO_X0) / 2; // חצי רוחב הגוף
const B = 7; // חצי העומק
const N = 24; // רצועות לכל צד
const DUR = 0.8;

const strips = Array.from({ length: N }, (_, i) => {
  const sliceW = (TORSO_X1 - TORSO_X0) / N;
  const x0 = TORSO_X0 + i * sliceW;
  const xc = x0 + sliceW / 2 - VB_W / 2;          // מרכז הפרוסה ביחס למרכז
  const clampA = (v) => Math.asin(Math.max(-1, Math.min(1, v / A)));
  const lo = clampA(xc - sliceW / 2);
  const hi = clampA(xc + sliceW / 2);
  // הרצועה ממוקמת באמצע הקשת שלה (ולא במרכז הפרוסה בציור) - אחרת הקצוות
  // ליד הצד, שבהם הקשת רחבה, נשארים פתוחים בתפר בין הפנים לגב
  const theta = (lo + hi) / 2;
  const px = A * Math.sin(theta);
  const pz = B * Math.cos(theta);
  const normal = Math.atan2(Math.sin(theta) / A, Math.cos(theta) / B); // רדיאנים
  // רוחב אמיתי על ההיקף, כדי שהרצועות ייסגרו בלי רווחים
  const arc = Math.hypot(A * Math.cos(theta), B * Math.sin(theta)) * (hi - lo);
  return { x0, sliceW, px, pz, normal, arc };
});

function Slice({ svg, scale, x0, mirror }) {
  // חלון ברוחב הפרוסה שמציג את החלק המתאים מהציור
  return (
    <span style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <span style={{
        position: 'absolute', top: 0, left: -x0 * scale, width: VB_W * scale, height: VB_H * scale,
        transform: mirror ? 'scaleX(-1)' : undefined
      }}>{svg}</span>
    </span>
  );
}

export default function ShirtSpin({ svg, crest, size }) {
  const s = size / VB_W; // פיקסלים ליחידת ציור
  const h = VB_H * s;
  const face = (side) => strips.map((st, i) => {
    const back = side === 'back';
    const angle = (st.normal * 180) / Math.PI + (back ? 180 : 0);
    const x = back ? -st.px : st.px;
    const z = back ? -st.pz : st.pz;
    const w = st.arc * s * 1.35 + 0.6; // חפיפה בין רצועות שכנות, נגד סדקים בזוויות
    // בגב: הציור הפוך, והפרוסה נלקחת מהצד הנגדי, כך שהבד ממשיך ברצף
    const x0 = back ? VB_W - st.x0 - st.sliceW : st.x0;
    // התאורה מתחילה מהזווית של הרצועה
    const lightDelay = -((((angle % 360) + 360) % 360) / 360) * DUR;
    return (
      <span key={`${side}${i}`} className="shirt3d__strip" style={{
        width: w, height: h, marginLeft: -w / 2,
        transform: `translateX(${(x * s).toFixed(2)}px) translateZ(${(z * s).toFixed(2)}px) rotateY(${angle.toFixed(1)}deg)`,
        animationDelay: `${lightDelay.toFixed(3)}s`
      }}>
        <span style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <span style={{
            position: 'absolute', top: 0, height: h, width: VB_W * s,
            left: -(x0 * s) - ((w - st.sliceW * s) / 2),
            transform: back ? 'scaleX(-1)' : undefined
          }}>{svg}</span>
        </span>
      </span>
    );
  });

  // שרוולים: הפרוסה שמחוץ לגוף בכל צד, תלויה בכתף ובולטת החוצה
  const sleeve = (left, back) => {
    const x0 = left ? 0 : TORSO_X1;
    const w = TORSO_X0 * s;
    const hingeX = (left ? -A : A) * s;
    return (
      <span key={`sl${left}${back}`} className="shirt3d__sleeve" style={{
        width: w, height: h,
        left: left ? `calc(50% + ${hingeX - w}px)` : `calc(50% + ${hingeX}px)`,
        transformOrigin: '50% 50%',
        transform: `translateZ(${back ? -0.5 : 0.5}px) ${back ? 'rotateY(180deg)' : ''}`,
      }}>
        <Slice svg={svg} scale={s} x0={back ? (left ? TORSO_X1 : 0) : x0} mirror={back} />
      </span>
    );
  };

  // הסמל: על החזה השמאלי של הלובש, על פני הגליל, לא נראה מהגב
  const crestX = VB_W * 0.63 - VB_W / 2;
  const cTheta = Math.asin(crestX / A);
  const cNormal = Math.atan2(Math.sin(cTheta) / A, Math.cos(cTheta) / B) * 180 / Math.PI;

  return (
    <span className="shirt3d" style={{ width: size, height: h }}>
      <span className="shirt3d__body">
        {face('front')}
        {face('back')}
        {sleeve(true, false)}{sleeve(false, false)}{sleeve(true, true)}{sleeve(false, true)}
        {crest && (
          <span className="shirt3d__crest" style={{
            width: size * 0.22, height: size * 0.22, marginLeft: -size * 0.11, marginTop: -size * 0.11,
            top: '33%',
            transform: `translateX(${(A * Math.sin(cTheta) * s).toFixed(2)}px) translateZ(${(B * Math.cos(cTheta) * s + 0.6).toFixed(2)}px) rotateY(${cNormal.toFixed(1)}deg)`
          }}>{crest}</span>
        )}
      </span>
    </span>
  );
}
