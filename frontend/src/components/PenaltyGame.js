import React, { useEffect, useRef, useState } from 'react';
import { createGoalScene } from './goalScene';
import { shotFromGesture, isGoal, OUTCOME_TEXT } from '../services/penalty';
import { reducedMotion } from '../services/motion';

// "בעיטות לשער": משחק פנדלים באצטדיון של מסך הכניסה.
//
// מחליקים מהכדור לשער: הנקודה שבה עוזבים את המסך היא הכיוון, המהירות היא
// הכוח, וקשת באצבע מסובבת את הכדור. בעיטה חזקה מהירה אבל פחות מדויקת.
// הקשה על השער היא בעיטה מדויקת ואיטית. הפיזיקה והשוער ב-services/penalty.js.
//
// גרירה למטה מרעננת את הדף, כמו בכל מקום אחר באפליקציה.
//
// scene: הסצנה של מסך הכניסה, כשנכנסים משם - המשחק ממשיך באותו מגרש.
// בלי scene (מהפס "אין חיבור") נוצר מגרש משלו.

const BEST_KEY = 'penalty-best';
const readBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch (e) { return 0; } };
const writeBest = (n) => { try { localStorage.setItem(BEST_KEY, String(n)); } catch (e) { /* ignore */ } };

const PULL_READY = 90;

function PenaltyGame({ onClose, online = false, scene: sharedScene = null }) {
  const canvasRef = useRef(null);
  const sceneRef = useRef(sharedScene);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(readBest);
  const [message, setMessage] = useState(null);
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const streakRef = useRef(0);
  const msgTimer = useRef(0);

  useEffect(() => {
    let own = null;
    if (!sharedScene) {
      own = createGoalScene(canvasRef.current, { reduced: reducedMotion() });
      sceneRef.current = own;
    }
    const scene = sceneRef.current;
    scene.enterGame({
      instant: !sharedScene,
      onResult: (outcome) => {
        const s = streakRef;
        if (isGoal(outcome)) {
          s.current += 1;
          if (s.current > readBest()) { writeBest(s.current); setBest(s.current); }
          try { navigator.vibrate && navigator.vibrate(25); } catch (e) { /* ignore */ }
        } else {
          s.current = 0;
        }
        setStreak(s.current);
        setMessage({ text: OUTCOME_TEXT[outcome], good: isGoal(outcome), key: Date.now() });
        clearTimeout(msgTimer.current);
        msgTimer.current = setTimeout(() => setMessage(null), 1300);
      }
    });
    return () => {
      clearTimeout(msgTimer.current);
      if (own) own.destroy(); else scene.exitGame();
    };
  }, [sharedScene]);

  // Escape סוגר
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ===== מחוות =====
  // אצבע: אירועי מגע (touch). בטלפון אמיתי הדפדפן מבטל לפעמים אירועי
  // pointer באמצע תנועה, ו"משוך לרענון" נעלם. touchend מגיע תמיד.
  // עכבר: אירועי pointer.
  const gesture = useRef(null);
  const begin = (id, x, y, t) => {
    gesture.current = { id, path: [{ x, y, t }], pulling: false };
  };
  const move = (id, x, y, t) => {
    const g = gesture.current;
    if (!g || g.id !== id) return;
    g.path.push({ x, y, t });
    const S = g.path[0];
    const dy = y - S.y, dx = x - S.x;
    // גרירה למטה = משוך לרענון
    if (!g.pulling && dy > 10 && dy > Math.abs(dx) * 1.2) { g.pulling = true; setDragging(true); }
    if (g.pulling) { g.pull = Math.max(0, dy); setPull(g.pull); }
  };
  const end = (id, x, y, t, cancelled = false) => {
    const g = gesture.current;
    if (!g || g.id !== id) return;
    gesture.current = null;
    setDragging(false);
    if (g.pulling) {
      // גם מגע שבוטל באמצע נחשב שחרור: מי שמשך מספיק - מרענן
      if ((g.pull || 0) >= PULL_READY) {
        setPull(PULL_READY + 10);
        setTimeout(() => window.location.reload(), 120);
      } else setPull(0);
      return;
    }
    if (cancelled) return;
    g.path.push({ x, y, t });
    const scene = sceneRef.current;
    if (!scene) return;
    const L = scene.layout();
    const shot = shotFromGesture(g.path, {
      goalPt: (px, py) => scene.goalPoint(px, py),
      groundY: L.goal.ground,
      ball: L.ball
    });
    if (shot && scene.shoot(shot, streakRef.current)) setMessage(null);
  };
  const touchOf = (e) => e.changedTouches && e.changedTouches[0];
  const handlers = {
    onTouchStart: (e) => { const t = touchOf(e); if (t && e.touches.length === 1) begin('t' + t.identifier, t.clientX, t.clientY, e.timeStamp); else gesture.current = null; },
    onTouchMove: (e) => { const t = touchOf(e); if (t) move('t' + t.identifier, t.clientX, t.clientY, e.timeStamp); },
    onTouchEnd: (e) => { const t = touchOf(e); if (t) end('t' + t.identifier, t.clientX, t.clientY, e.timeStamp); },
    onTouchCancel: (e) => { const t = touchOf(e); if (t) end('t' + t.identifier, t.clientX, t.clientY, e.timeStamp, true); },
    onPointerDown: (e) => {
      if (e.pointerType === 'touch' || (e.button !== undefined && e.button !== 0)) return;
      begin('p' + e.pointerId, e.clientX, e.clientY, e.timeStamp);
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    },
    onPointerMove: (e) => { if (e.pointerType !== 'touch') move('p' + e.pointerId, e.clientX, e.clientY, e.timeStamp); },
    onPointerUp: (e) => { if (e.pointerType !== 'touch') end('p' + e.pointerId, e.clientX, e.clientY, e.timeStamp); },
    onPointerCancel: (e) => { if (e.pointerType !== 'touch') end('p' + e.pointerId, e.clientX, e.clientY, e.timeStamp, true); }
  };

  const pullShown = Math.min(pull * 0.8, 96);
  const ready = pull >= PULL_READY;

  return (
    <div role="dialog" aria-modal="true" aria-label="משחק בעיטות לשער" data-no-swipe style={{
      position: 'fixed', inset: 0, zIndex: 12000, background: sharedScene ? 'transparent' : '#02040a',
      touchAction: 'none', overscrollBehavior: 'contain', userSelect: 'none', WebkitUserSelect: 'none',
      animation: sharedScene ? 'gameHudIn .45s .3s ease-out both' : undefined
    }}>
      {!sharedScene && <canvas ref={canvasRef} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />}

      {/* שכבת המגע: כל המסך */}
      <div data-game-touch {...handlers} style={{ position: 'absolute', inset: 0, touchAction: 'none' }} />

      {/* משוך לרענון */}
      <div aria-hidden="true" style={{
        position: 'absolute', left: '50%', top: 0, width: '40px', height: '40px', marginLeft: '-20px',
        borderRadius: '50%', background: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,.35)',
        display: 'grid', placeItems: 'center', color: ready ? '#15803d' : '#4b5563', fontSize: '20px', fontWeight: 700,
        transform: `translateY(${pullShown - 44}px) rotate(${pull * 2}deg) scale(${ready ? 1.1 : 1})`,
        opacity: Math.min(1, pull / 40), pointerEvents: 'none',
        transition: dragging ? 'none' : 'transform .25s ease, opacity .25s ease'
      }}>
        ↻
      </div>
      {ready && (
        <div aria-hidden="true" style={{
          position: 'absolute', left: 0, right: 0, top: `${pullShown + 6}px`, textAlign: 'center', pointerEvents: 'none',
          color: '#fff', fontSize: 'var(--fs-xs)', fontWeight: 700, textShadow: '0 2px 8px rgba(0,0,0,.7)'
        }}>
          שחררו לרענון
        </div>
      )}

      <div style={{
        position: 'absolute', top: 'max(12px, env(safe-area-inset-top, 0px))', left: '12px', right: '12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', color: '#fff', pointerEvents: 'none',
        textShadow: '0 2px 8px rgba(0,0,0,.6)'
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 'var(--fs-md)' }}>בעיטות לשער</div>
          <div style={{ fontSize: 'var(--fs-xs)', opacity: 0.9 }}>רצף {streak} · שיא {best}</div>
        </div>
        <button type="button" onClick={onClose} aria-label="סגור את המשחק" style={{
          pointerEvents: 'auto', width: '44px', height: '44px', borderRadius: '50%', border: '1px solid rgba(255,255,255,.25)',
          background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: '20px', cursor: 'pointer',
          WebkitBackdropFilter: 'blur(6px)', backdropFilter: 'blur(6px)'
        }}>✕</button>
      </div>

      {/* אזור ההודעה תמיד קיים, כדי שקורא מסך יקריא כל תוצאה חדשה */}
      <div aria-live="polite" style={{
        position: 'absolute', left: 0, right: 0, top: '50%', textAlign: 'center', pointerEvents: 'none'
      }}>
        {message && (
          <div key={message.key} style={{
            fontWeight: 900, fontSize: '40px', color: message.good ? '#facc15' : '#fff',
            textShadow: '0 4px 18px rgba(0,0,0,.6)', animation: 'doneIn .35s ease-out both'
          }}>
            {message.text}
          </div>
        )}
      </div>

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 'max(18px, env(safe-area-inset-bottom, 0px))',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', pointerEvents: 'none', padding: '0 16px'
      }}>
        {online ? (
          <button type="button" onClick={onClose} style={{
            pointerEvents: 'auto', minHeight: '44px', padding: '0 18px', borderRadius: '999px', border: 'none',
            background: '#15803d', color: '#fff', fontWeight: 700, fontSize: 'var(--fs-sm)', cursor: 'pointer'
          }}>
            החיבור חזר · חזרה לאפליקציה
          </button>
        ) : (
          <div style={{ color: 'rgba(255,255,255,.85)', fontSize: 'var(--fs-xs)', textAlign: 'center', textShadow: '0 2px 8px rgba(0,0,0,.6)' }}>
            החליקו מהכדור לשער · מהר = חזק, קשת = סיבוב
          </div>
        )}
      </div>
    </div>
  );
}

export default PenaltyGame;
