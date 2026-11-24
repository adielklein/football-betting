// הכדור אחרי גול: כלוא בתוך השער (רשתות צד, גג ורשת אחורית) ולא מתגלגל
// החוצה. פונקציה טהורה כדי שאפשר יהיה לבדוק אותה - משמשת את goalScene.
//
// state: { netHit, sideHit } - נשמר בין צעדים. hits: קוראים לה כשהכדור
// פוגע ברשת (לתנועת הרשת). backAt(x, y): כמה הרשת האחורית נדחפה במקום הזה.
export const NET_TOP = 2.25;
export const BACK_HIT_Z = -1.7;

export function goalBoxStep(p, v, state, { half, ballR, power = 0.5, hitNet = () => {}, backAt = () => 0 }) {
  if (p.z < 0) {
    const side = half - ballR - 0.05;
    if (Math.abs(p.x) > side) {
      const sgn = Math.sign(p.x);
      p.x = sgn * side;
      if (!state.sideHit) {
        state.sideHit = true;
        hitNet(sgn * (half - 0.35), Math.min(p.y, 2.1), 4 + Math.abs(v.x) * 0.8);
      }
      v.x = -v.x * 0.2; v.z *= 0.75;
    }
    const roof = NET_TOP - ballR;
    if (p.y > roof && p.z < -0.15) { p.y = roof; v.y = -Math.abs(v.y) * 0.3; }
  }
  if (!state.netHit && p.z <= BACK_HIT_Z) {
    state.netHit = true;
    hitNet(p.x, Math.min(p.y, 2.2), 9 + power * 8);
    v.z = 0.5; v.x *= 0.3; v.y *= 0.3;
    state.justHitBack = true;
  } else {
    state.justHitBack = false;
  }
  if (state.netHit) p.z = Math.max(p.z, -1.75 + backAt(p.x, Math.min(p.y, 2.2)) * 0.5);
  if (state.netHit && p.z > -0.3) { p.z = -0.3; v.z = 0; }
}
