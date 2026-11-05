import React, { useEffect, useRef, useState } from 'react';

// "בעיטות לשער": משחק קטן למצב בלי קליטה, במקום הדינוזאור של הדפדפן.
//
// מקישים על נקודה בשער והכדור עף אליה. השוער מגיב אחרי השהייה קצרה וקופץ -
// לפעמים לצד הנכון. ככל שהרצף עולה הוא מגיב מהר יותר ומנחש טוב יותר.
// הרצף הכי ארוך נשמר במכשיר.
//
// הכל מצויר על canvas אחד בלולאת requestAnimationFrame. הקובץ נטען רק
// כשפותחים את המשחק (React.lazy ב-OfflineBanner).

const BEST_KEY = 'penalty-best';
const readBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch (e) { return 0; } };
const writeBest = (n) => { try { localStorage.setItem(BEST_KEY, String(n)); } catch (e) { /* ignore */ } };

const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function PenaltyGame({ onClose, online }) {
  const canvasRef = useRef(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(readBest);
  const [message, setMessage] = useState(null);
  const stateRef = useRef({ streak: 0, best: readBest() });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, DPR = 1, raf = 0;
    let G = null; // מידות השער והמגרש על המסך
    let crowd = null;

    const layout = () => {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      const gw = Math.min(W * 0.88, 540);
      const gh = gw / 3;                 // יחס שער אמיתי: 7.32 על 2.44
      const gx = (W - gw) / 2;
      const gy = H * 0.24;
      G = { gw, gh, gx, gy, ground: gy + gh, ballX: W / 2, ballY: H * 0.8, rb: gw * 0.05 };
      // קהל ביציע: נבנה פעם אחת
      const c = document.createElement('canvas');
      c.width = Math.round(W * DPR); c.height = Math.round(G.ground * DPR);
      const x = c.getContext('2d');
      x.scale(DPR, DPR);
      const bg = x.createLinearGradient(0, 0, 0, G.ground);
      bg.addColorStop(0, '#03050c'); bg.addColorStop(1, '#141c33');
      x.fillStyle = bg; x.fillRect(0, 0, W, G.ground);
      const colors = ['#2b3a67', '#6b2638', '#24564f', '#7a6a32', '#4a505e', '#1f4f7a', '#8a2d3d'];
      for (let row = 0; row < 16; row++) {
        const y = G.ground * 0.12 + row * ((G.ground * 0.8) / 16);
        const s = 1 + row * 0.12;
        for (let px = 0; px < W; px += s * 3.2) {
          x.globalAlpha = 0.35 + row * 0.03;
          x.fillStyle = colors[(px * 7 + row * 13) % colors.length | 0];
          x.beginPath(); x.arc(px + (row % 2) * s, y, s, 0, Math.PI * 2); x.fill();
        }
      }
      x.globalAlpha = 1;
      crowd = c;
    };

    // ===== מצב המשחק =====
    const st = {
      phase: 'aim',          // aim | flying | result
      t0: 0,
      target: null,          // לאן בועטים
      keeper: { x: 0, dive: 0, dir: 0, from: 0, to: 0, t0: 0, delay: 0 },
      outcome: null,         // goal | save | miss
      ripple: 0,
      ball: { x: 0, y: 0, r: 0, spin: 0 }
    };

    const reset = () => {
      st.phase = 'aim';
      st.target = null;
      st.outcome = null;
      st.keeper = { x: W / 2, dive: 0, dir: 0, from: W / 2, to: W / 2, t0: 0, delay: 0 };
      st.ball = { x: G.ballX, y: G.ballY, r: G.rb, spin: 0 };
      setMessage(null);
    };

    const shoot = (tx, ty) => {
      // הקשה בזמן הצגת התוצאה מתחילה מיד את הבעיטה הבאה (אחרי רגע לקרוא אותה)
      if (st.phase === 'result' && performance.now() - st.t0 > 400) reset();
      if (st.phase !== 'aim') return;
      const s = stateRef.current.streak;
      st.phase = 'flying';
      st.t0 = performance.now();
      st.target = { x: tx, y: ty };
      // השוער: לפעמים מנחש נכון, ותמיד קצת מאחר. משתפר עם הרצף
      const guessRight = Math.random() < Math.min(0.28 + s * 0.07, 0.78);
      const goalX = guessRight ? tx : G.gx + Math.random() * G.gw;
      st.keeper.from = st.keeper.x;
      st.keeper.to = clamp(goalX, G.gx + G.gw * 0.08, G.gx + G.gw * 0.92);
      st.keeper.dir = Math.sign(st.keeper.to - st.keeper.from) || 1;
      st.keeper.t0 = st.t0;
      st.keeper.delay = Math.max(40, 150 - s * 10);
    };

    const FLIGHT = 520;

    const resolve = () => {
      const { x: tx, y: ty } = st.target;
      const inside = tx > G.gx + G.rb * 0.4 && tx < G.gx + G.gw - G.rb * 0.4 && ty > G.gy + G.rb * 0.4 && ty < G.ground;
      // טווח הידיים של השוער: אליפסה סביב מרכז הגוף אחרי הקפיצה
      const kx = st.keeper.x, ky = G.ground - G.gh * 0.5;
      const rx = G.gw * 0.15, ry = G.gh * 0.62;
      const saved = inside && ((tx - kx) ** 2) / rx ** 2 + ((ty - ky) ** 2) / ry ** 2 < 1;
      st.outcome = !inside ? 'miss' : saved ? 'save' : 'goal';
      st.phase = 'result';
      st.t0 = performance.now();
      const s = stateRef.current;
      if (st.outcome === 'goal') {
        s.streak += 1;
        if (s.streak > s.best) { s.best = s.streak; writeBest(s.best); setBest(s.best); }
        st.ripple = 1;
        try { navigator.vibrate && navigator.vibrate(25); } catch (e) { /* ignore */ }
      } else {
        s.streak = 0;
      }
      setStreak(s.streak);
      setMessage(st.outcome === 'goal' ? 'גול!' : st.outcome === 'save' ? 'הצלה!' : 'החטאה');
    };

    // ===== ציור =====
    const drawKeeper = (now) => {
      const k = st.keeper;
      if (st.phase !== 'aim') {
        const p = clamp((now - k.t0 - k.delay) / 380, 0, 1);
        k.x = k.from + (k.to - k.from) * easeOut(p);
        k.dive = easeOut(p) * Math.min(1, Math.abs(k.to - k.from) / (G.gw * 0.18));
      } else {
        k.x = W / 2 + Math.sin(now / 260) * G.gw * 0.05; // מתנדנד על הקו
        k.dive = 0;
      }
      const h = G.gh * 0.78, s = h / 1.85;
      const hipX = k.x, hipY = G.ground - h * 0.48 - k.dive * h * 0.18;
      const rot = k.dir * k.dive * 1.15;
      ctx.save();
      ctx.translate(hipX, hipY);
      ctx.rotate(rot);
      ctx.lineCap = 'round';
      const limb = (x1, y1, x2, y2, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w * s; ctx.beginPath(); ctx.moveTo(x1 * s, -y1 * s); ctx.lineTo(x2 * s, -y2 * s); ctx.stroke(); };
      const d = k.dive;
      limb(-0.1, 0, -0.22 + d * 0.1, -0.9, 0.15, '#15171c');
      limb(0.1, 0, 0.22 - d * 0.04, -0.9, 0.15, '#15171c');
      limb(0, 0, 0, 0.5, 0.36, '#c6ec2e');
      // ידיים: לצדדים בעמידה, מעל הראש בקפיצה
      const armY = 0.25 + d * 1.0, armX = 0.5 - d * 0.38;
      limb(-0.18, 0.45, -armX, armY, 0.1, '#c6ec2e');
      limb(0.18, 0.45, armX, armY, 0.1, '#c6ec2e');
      ctx.fillStyle = '#f2f4f7';
      ctx.beginPath(); ctx.arc(-armX * s, -armY * s, 0.08 * s, 0, Math.PI * 2); ctx.arc(armX * s, -armY * s, 0.08 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c98d68';
      ctx.beginPath(); ctx.arc(0, -0.72 * s, 0.12 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a120a';
      ctx.beginPath(); ctx.arc(0, -0.75 * s, 0.12 * s, Math.PI, Math.PI * 2); ctx.fill();
      ctx.restore();
    };

    const drawBall = (x, y, r, spin) => {
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#eef1f5'; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.fillStyle = '#1b1d22';
      for (let i = 0; i < 5; i++) {
        const a = spin + (i / 5) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.24, 0, Math.PI * 2); ctx.fill();
      }
      ctx.beginPath(); ctx.arc(x, y, r * 0.26, 0, Math.PI * 2); ctx.fill();
      const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,.6)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.restore();
    };

    const draw = (now) => {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const { gx, gy, gw, gh, ground } = G;
      ctx.drawImage(crowd, 0, 0, W, ground);
      // דשא: פסים שמתרחבים כלפי מטה
      for (let i = 0, y = ground; y < H; i++) {
        const hgt = 14 + i * 9;
        ctx.fillStyle = i % 2 ? '#1c6e37' : '#227d40';
        ctx.fillRect(0, y, W, hgt);
        y += hgt;
      }
      const pool = ctx.createRadialGradient(W / 2, ground + H * 0.2, 10, W / 2, ground + H * 0.2, W);
      pool.addColorStop(0, 'rgba(210,255,200,.12)'); pool.addColorStop(1, 'rgba(0,0,0,.25)');
      ctx.fillStyle = pool; ctx.fillRect(0, ground, W, H - ground);
      ctx.strokeStyle = 'rgba(240,244,240,.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, ground); ctx.lineTo(W, ground); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(G.ballX, G.ballY + G.rb, G.rb * 0.5, G.rb * 0.18, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(240,244,240,.7)'; ctx.fill();

      // רשת: דופן אחורית קטנה יותר, וקווים שמחברים אותה לקורות. גל ברשת אחרי גול
      const inset = gw * 0.07, back = { x: gx + inset, y: gy + gh * 0.12, w: gw - inset * 2, h: gh * 0.88 };
      const rip = st.ripple;
      const tgt = st.target;
      const bend = (x, y) => {
        if (!rip || !tgt) return [x, y];
        const d = Math.hypot(x - tgt.x, y - tgt.y);
        const k = Math.max(0, 1 - d / (gw * 0.25)) * rip * Math.sin(now / 40);
        return [x, y - k * 6];
      };
      ctx.strokeStyle = 'rgba(232,236,244,.45)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) {
        const x = back.x + (back.w * i) / 24;
        for (let j = 0; j <= 8; j++) { const [px, py] = bend(x, back.y + (back.h * j) / 8); if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
      }
      for (let j = 0; j <= 8; j++) {
        const y = back.y + (back.h * j) / 8;
        for (let i = 0; i <= 24; i++) { const [px, py] = bend(back.x + (back.w * i) / 24, y); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
      }
      for (let i = 0; i <= 24; i += 3) { ctx.moveTo(gx + (gw * i) / 24, gy); ctx.lineTo(back.x + (back.w * i) / 24, back.y); }
      ctx.moveTo(gx, gy); ctx.lineTo(back.x, back.y); ctx.moveTo(gx + gw, gy); ctx.lineTo(back.x + back.w, back.y);
      ctx.stroke();
      st.ripple = Math.max(0, st.ripple - 0.02);

      // כדור שכבר נכנס לרשת מצויר לפני הקורות והשוער
      const ballBehind = st.phase === 'result' && st.outcome === 'goal';
      if (ballBehind) drawBall(st.ball.x, st.ball.y, st.ball.r, st.ball.spin);

      // קורות
      ctx.strokeStyle = '#f4f6f8'; ctx.lineWidth = Math.max(4, gw * 0.016); ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(gx, ground); ctx.lineTo(gx, gy); ctx.lineTo(gx + gw, gy); ctx.lineTo(gx + gw, ground); ctx.stroke();

      drawKeeper(now);

      // הכדור
      if (st.phase === 'flying') {
        const k = clamp((now - st.t0) / FLIGHT, 0, 1);
        const e = easeOut(k);
        const curve = Math.sin(k * Math.PI) * G.gw * 0.04;
        st.ball.x = G.ballX + (st.target.x - G.ballX) * e + curve;
        st.ball.y = G.ballY + (st.target.y - G.ballY) * e;
        st.ball.r = G.rb * (1 - 0.55 * e);
        st.ball.spin += 0.35;
        if (k >= 1) resolve();
      } else if (st.phase === 'result' && st.outcome === 'save') {
        // נהדף חזרה מהכפפות
        const k = clamp((now - st.t0) / 500, 0, 1);
        st.ball.y = st.target.y + k * G.gh * 0.9;
        st.ball.x = st.target.x + (st.target.x > W / 2 ? 1 : -1) * k * G.gw * 0.25;
      }
      if (!ballBehind) drawBall(st.ball.x, st.ball.y, st.ball.r, st.ball.spin);

      if (st.phase === 'result' && now - st.t0 > 1100) reset();
    };

    const loop = (now) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };

    const onPointer = (e) => {
      if (e.target !== canvas) return;
      shoot(e.clientX, Math.min(e.clientY, G.ground - G.rb * 0.6));
    };

    layout();
    reset();
    raf = requestAnimationFrame(loop);
    canvas.addEventListener('pointerdown', onPointer);
    const onResize = () => { layout(); reset(); };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Escape סוגר
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label="משחק בעיטות לשער" style={{
      position: 'fixed', inset: 0, zIndex: 12000, background: '#03050c', touchAction: 'none', overscrollBehavior: 'contain'
    }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, display: 'block' }} />

      <div style={{
        position: 'absolute', top: 'max(12px, env(safe-area-inset-top, 0px))', left: '12px', right: '12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', color: '#fff', pointerEvents: 'none'
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 'var(--fs-md)' }}>בעיטות לשער</div>
          <div style={{ fontSize: 'var(--fs-xs)', opacity: 0.85 }}>רצף {streak} · שיא {best}</div>
        </div>
        <button type="button" onClick={onClose} aria-label="סגור את המשחק" style={{
          pointerEvents: 'auto', width: '44px', height: '44px', borderRadius: '50%', border: '1px solid rgba(255,255,255,.25)',
          background: 'rgba(255,255,255,.12)', color: '#fff', fontSize: '20px', cursor: 'pointer'
        }}>✕</button>
      </div>

      {/* אזור ההודעה תמיד קיים, כדי שקורא מסך יקריא כל תוצאה חדשה */}
      <div aria-live="polite" style={{
        position: 'absolute', left: 0, right: 0, top: '44%', textAlign: 'center', pointerEvents: 'none'
      }}>
        {message && (
          <div key={message + streak} style={{
            fontWeight: 900, fontSize: '44px', color: message === 'גול!' ? '#facc15' : '#fff',
            textShadow: '0 4px 18px rgba(0,0,0,.5)', animation: 'doneIn .35s ease-out both'
          }}>
            {message}
          </div>
        )}
      </div>

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 'max(18px, env(safe-area-inset-bottom, 0px))',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', pointerEvents: 'none'
      }}>
        {online ? (
          <button type="button" onClick={onClose} style={{
            pointerEvents: 'auto', minHeight: '44px', padding: '0 18px', borderRadius: '999px', border: 'none',
            background: '#15803d', color: '#fff', fontWeight: 700, fontSize: 'var(--fs-sm)', cursor: 'pointer'
          }}>
            החיבור חזר · חזרה לאפליקציה
          </button>
        ) : (
          <div style={{ color: 'rgba(255,255,255,.85)', fontSize: 'var(--fs-sm)' }}>הקישו על השער כדי לבעוט</div>
        )}
      </div>
    </div>
  );
}

export default PenaltyGame;
