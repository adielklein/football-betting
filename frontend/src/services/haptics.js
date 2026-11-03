// רטט קצר. באנדרואיד: Vibration API. באייפון (Safari 18 ומעלה) אין API
// לאתרים, אבל לחיצה על מתג מערכת (input type=checkbox switch) מפעילה את
// הטיק של המערכת - זו הדרך היחידה שקיימת היום, ובגרסאות ישנות היא פשוט
// לא עושה כלום.

export function haptic(pattern = [40]) {
  try {
    if (navigator.vibrate && navigator.vibrate(pattern)) return;
  } catch (e) { /* ignore */ }
  const taps = Array.isArray(pattern) ? Math.ceil(pattern.length / 2) : 1;
  for (let i = 0; i < taps; i++) setTimeout(iosTick, i * 130);
}

function iosTick() {
  try {
    const label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
    label.click();
    setTimeout(() => label.remove(), 50);
  } catch (e) { /* ignore */ }
}

/** רטט של שגיאה: שתי פעימות */
export const hapticError = () => haptic([45, 60, 45]);
