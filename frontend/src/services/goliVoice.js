// הקול של גולי: ג'יבריש חמוד - צליל קצר וגבוה בכל הברה, כמו דמויות
// במשחקים. מסונכרן לצורות הפה (GoliSprite): פה פתוח = צליל גבוה ובהיר,
// "או" = עגול ונמוך יותר, חצי פתוח = באמצע, סגור = שקט.
// בלי קבצים ובלי רשת - הצליל נוצר בדפדפן (Web Audio).
//
// דפדפנים לא משמיעים קול לפני שנגעו בדף. לכן הקול "מתעורר" בנגיעה
// הראשונה (unlockVoice), ועד אז ההברות פשוט שקטות.
// השתקה נשמרת במכשיר (goli_voice_muted).

const MUTE_KEY = 'goli_voice_muted';
let ctx = null;
let master = null;

const ensure = () => {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);
  } catch (e) { ctx = null; }
  return ctx;
};

export const unlockVoice = () => {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
};

// מאזין חד-פעמי לנגיעה הראשונה בדף
let armed = false;
export const armVoiceUnlock = () => {
  if (armed || typeof window === 'undefined') return;
  armed = true;
  const on = () => { unlockVoice(); window.removeEventListener('pointerdown', on, true); window.removeEventListener('keydown', on, true); };
  window.addEventListener('pointerdown', on, true);
  window.addEventListener('keydown', on, true);
};

export const isVoiceMuted = () => {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { return false; }
};
export const setVoiceMuted = (m) => {
  try { if (m) localStorage.setItem(MUTE_KEY, '1'); else localStorage.removeItem(MUTE_KEY); } catch (e) { /* בלי שמירה */ }
};

const PITCH = { wide: 640, mid: 560, o: 470 };

// הברה אחת: צליל משולש קצר עם החלקה קלה בגובה, דרך מסנן שמרכך אותו.
// synth מקבל הקשר קול, יעד וזמן - כך אפשר גם להקליט מראש (OfflineAudioContext)
export const synth = (c, dest, t, shape, ms = 100) => {
  if (!PITCH[shape]) return;
  const dur = Math.min(0.13, Math.max(0.06, ms / 1000 * 0.85));
  const f = PITCH[shape] * (0.92 + Math.random() * 0.16);
  const osc = c.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(f * 1.12, t);
  osc.frequency.exponentialRampToValueAtTime(f, t + dur * 0.5);
  const sub = c.createOscillator(); // צבע: אוקטבה מעל, חלש
  sub.type = 'sine';
  sub.frequency.setValueAtTime(f * 2, t);
  const subGain = c.createGain(); subGain.gain.value = 0.18;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = shape === 'o' ? 1400 : 2600;
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(1, t + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(lp); sub.connect(subGain); subGain.connect(lp);
  lp.connect(env); env.connect(dest);
  osc.start(t); sub.start(t);
  osc.stop(t + dur + 0.02); sub.stop(t + dur + 0.02);
};

export const blip = (shape, ms = 100) => {
  if (!PITCH[shape] || isVoiceMuted()) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  const c = ensure();
  if (!c || c.state !== 'running') return;
  try { synth(c, master, c.currentTime, shape, ms); } catch (e) { /* בלי קול */ }
};
