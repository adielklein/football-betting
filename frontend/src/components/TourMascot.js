import React, { useEffect, useState } from 'react';

// "גולי" - הכדור שמנחה את הסיור. SVG מצויר עם תנועה ב-CSS:
//   idle      - מקפץ בעדינות (מתכווץ בנחיתה), ממצמץ מדי פעם
//   talk      - הפה נפתח ונסגר כשמתחיל שלב חדש
//   wave      - קפיצת שלום עם סיבוב קטן (שלב הפתיחה)
//   celebrate - קפיצה גבוהה וסיבוב מלא, עם כוכבים (שלב הסיום)
// lookX / lookY (‎-1..1) - לאן העיניים מסתכלות: אל האלמנט המואר.
// מי שביקש פחות תנועה מקבל את הדמות בלי קפיצות.

const CSS = `
@keyframes goli-bob { 0%,100% { transform: translateY(0) scale(1,1) } 45% { transform: translateY(-7px) scale(.98,1.03) } 88% { transform: translateY(0) scale(1.06,.93) } }
@keyframes goli-shadow { 0%,100% { transform: scaleX(1); opacity: .28 } 45% { transform: scaleX(.75); opacity: .16 } }
@keyframes goli-blink { 0%,92%,100% { transform: scaleY(1) } 95% { transform: scaleY(.1) } }
@keyframes goli-talk { 0%,100% { transform: scaleY(.35) } 50% { transform: scaleY(1) } }
@keyframes goli-wave { 0% { transform: translateY(0) rotate(0) } 25% { transform: translateY(-14px) rotate(-14deg) } 50% { transform: translateY(0) rotate(10deg) } 70% { transform: translateY(-6px) rotate(-6deg) } 100% { transform: translateY(0) rotate(0) } }
@keyframes goli-party { 0% { transform: translateY(0) rotate(0) scale(1) } 35% { transform: translateY(-26px) rotate(200deg) scale(1.05) } 60% { transform: translateY(0) rotate(360deg) scale(1.1,.88) } 75% { transform: translateY(-8px) rotate(360deg) scale(1) } 100% { transform: translateY(0) rotate(360deg) } }
@keyframes goli-hop { 0% { transform: translateY(0) } 40% { transform: translateY(-12px) } 100% { transform: translateY(0) } }
@keyframes goli-star { 0% { transform: translate(0,0) scale(.2); opacity: 0 } 20% { opacity: 1 } 100% { transform: translate(var(--dx), var(--dy)) scale(1); opacity: 0 } }
.goli-still * { animation: none !important }
`;

export default function TourMascot({ mood = 'idle', stepKey, lookX = 0, lookY = 0, size = 64, still = false, talk = true }) {
  // "מדבר" לרגע בכל שלב חדש
  const canTalk = talk && mood !== 'sleep';
  const [talking, setTalking] = useState(canTalk);
  useEffect(() => {
    if (!canTalk) { setTalking(false); return undefined; }
    setTalking(true);
    const t = setTimeout(() => setTalking(false), 1300);
    return () => clearTimeout(t);
  }, [stepKey]);

  const px = Math.max(-1, Math.min(1, lookX)) * 2.6;
  const py = Math.max(-1, Math.min(1, lookY)) * 2.2;
  const body = mood === 'celebrate' ? 'goli-party 1.1s cubic-bezier(.3,.7,.3,1) 2'
    : mood === 'wave' ? 'goli-wave 1.1s ease-in-out 2'
    : mood === 'loading' ? 'goli-bob .5s ease-in-out infinite'
    : mood === 'sleep' ? 'none'
    : mood === 'sad' ? 'goli-bob 3.4s ease-in-out infinite'
    : 'goli-bob 2.2s ease-in-out infinite';

  return (
    <div className={still ? 'goli-still' : undefined} aria-hidden="true" style={{ width: size, height: size * 1.15, position: 'relative' }}>
      <style>{CSS}</style>
      {/* צל על הקרקע */}
      <span style={{
        position: 'absolute', left: '18%', right: '18%', bottom: 0, height: size * 0.1, borderRadius: '50%',
        background: '#000', opacity: 0.28, animation: mood === 'idle' ? 'goli-shadow 2.2s ease-in-out infinite' : 'none'
      }} />
      {/* קפיצה קטנה בכל מעבר שלב */}
      <div key={stepKey} style={{ position: 'absolute', inset: 0, animation: 'goli-hop .45s ease-out' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, transformOrigin: '50% 90%', animation: body }}>
          <svg viewBox="0 0 64 64" width={size} height={size} style={{ display: 'block', overflow: 'visible' }}>
            <defs>
              <radialGradient id="goli-shade" cx="38%" cy="32%" r="70%">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="0.7" stopColor="#eef1f5" />
                <stop offset="1" stopColor="#c9d0da" />
              </radialGradient>
              <clipPath id="goli-clip"><circle cx="32" cy="32" r="29" /></clipPath>
            </defs>
            <circle cx="32" cy="32" r="29" fill="url(#goli-shade)" stroke="#2b2f36" strokeWidth="2" />
            {/* תפרי הכדור: מחומש עליון ושברי מחומשים בצדדים */}
            <g clipPath="url(#goli-clip)" fill="#2b2f36">
              <polygon points="32,5 38,9.5 36,16 28,16 26,9.5" />
              <polygon points="4,24 10,22 13,28 9,34 3,32" />
              <polygon points="60,24 54,22 51,28 55,34 61,32" />
              <polygon points="14,52 20,49 25,54 22,61 15,60" />
              <polygon points="50,52 44,49 39,54 42,61 49,60" />
            </g>
            <g stroke="#2b2f36" strokeWidth="1.2" fill="none" opacity="0.55" clipPath="url(#goli-clip)">
              <path d="M28 16 L13 28 M36 16 L51 28 M9 34 L20 49 M55 34 L44 49 M25 54 L39 54" />
            </g>
            {/* לחיים */}
            <ellipse cx="17" cy="38" rx="4.5" ry="2.6" fill="#ff8fa3" opacity="0.55" />
            <ellipse cx="47" cy="38" rx="4.5" ry="2.6" fill="#ff8fa3" opacity="0.55" />
            {/* עיניים: ממצמצות, והאישונים מסתכלים אל המטרה */}
            {mood === 'sleep' ? (
              <g stroke="#2b2f36" strokeWidth="2" fill="none" strokeLinecap="round">
                <path d="M18.5 30 Q23.5 33.5 28.5 30" />
                <path d="M35.5 30 Q40.5 33.5 45.5 30" />
              </g>
            ) : (
            <g style={{ transformOrigin: '32px 29px', animation: 'goli-blink 4.2s infinite' }}>
              <ellipse cx="23.5" cy="29" rx="6" ry="7" fill="#fff" stroke="#2b2f36" strokeWidth="1.6" />
              <ellipse cx="40.5" cy="29" rx="6" ry="7" fill="#fff" stroke="#2b2f36" strokeWidth="1.6" />
              <g style={{ transform: `translate(${px}px, ${py}px)`, transition: 'transform .35s ease' }}>
                <circle cx="23.5" cy="30" r="3.6" fill="#1d2230" />
                <circle cx="40.5" cy="30" r="3.6" fill="#1d2230" />
                <circle cx="24.8" cy="28.4" r="1.2" fill="#fff" />
                <circle cx="41.8" cy="28.4" r="1.2" fill="#fff" />
              </g>
            </g>
            )}
            {/* פה: חיוך, ובזמן דיבור פה פתוח שזז */}
            {talking && !still ? (
              <g style={{ transformOrigin: '32px 42px', animation: 'goli-talk .22s ease-in-out infinite' }}>
                <ellipse cx="32" cy="42.5" rx="4.6" ry="3.6" fill="#7a2230" stroke="#2b2f36" strokeWidth="1.2" />
                <ellipse cx="32" cy="44.3" rx="2.6" ry="1.4" fill="#ff8fa3" />
              </g>
            ) : (
              <path
                d={mood === 'celebrate' ? 'M25 40 Q32 49 39 40 Z' : mood === 'sad' ? 'M26.5 45 Q32 40 37.5 45' : mood === 'sleep' ? 'M29.5 42 Q32 44 34.5 42' : 'M26.5 40.5 Q32 46 37.5 40.5'}
                fill={mood === 'celebrate' ? '#7a2230' : 'none'} stroke="#2b2f36" strokeWidth="1.8" strokeLinecap="round"
              />
            )}
          </svg>
        </div>
      </div>
      {/* כוכבים בחגיגה */}
      {mood === 'celebrate' && !still && ['-34px,-30px', '30px,-36px', '-40px,6px', '38px,2px', '0px,-46px'].map((d, i) => {
        const [dx, dy] = d.split(',');
        return (
          <span key={i} style={{
            position: 'absolute', left: size / 2 - 7, top: size / 2 - 7, fontSize: 14,
            '--dx': dx, '--dy': dy, animation: `goli-star .9s ease-out ${i * 0.12}s infinite`
          }}>{['⭐', '✨', '🎉', '⭐', '✨'][i]}</span>
        );
      })}
    </div>
  );
}
