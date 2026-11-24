// מדליה תלת-ממדית: מטבע מתכת (גליל) עם מספר חרוט בשני הצדדים והשתקפויות
// אמיתיות (מפת סביבה). זהב, כסף וארד.

const METALS = {
  1: { base: '#e9b923', light: '#fff1a8', dark: '#8a6100', text: '#6b4b00', edge: 0xc9971a },
  2: { base: '#c3c9d0', light: '#ffffff', dark: '#6d757e', text: '#3b434c', edge: 0xa4abb3 },
  3: { base: '#c97a35', light: '#ffd2a3', dark: '#6e3a10', text: '#4a2306', edge: 0xa9622a },
};

const faceCanvas = (place) => {
  const m = METALS[place];
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S * 0.36, S * 0.32, S * 0.05, S / 2, S / 2, S * 0.55);
  g.addColorStop(0, m.light);
  g.addColorStop(0.5, m.base);
  g.addColorStop(1, m.dark);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  // טבעת חרוטה
  ctx.lineWidth = S * 0.035;
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.arc(S / 2, S / 2, S * 0.4, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = S * 0.015;
  ctx.beginPath(); ctx.arc(S / 2, S / 2 - 2, S * 0.4, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  // המספר, עם הבלטה (צל בהיר מעל וכהה מתחת)
  ctx.font = `900 ${S * 0.46}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText(String(place), S / 2 - 2, S / 2 + 2);
  ctx.fillStyle = m.text;
  ctx.fillText(String(place), S / 2, S / 2 + 6);
  return c;
};

export const buildMedal = (THREE, place, envMap) => {
  const m = METALS[place];
  const disposers = [];
  const tex = new THREE.CanvasTexture(faceCanvas(place));
  tex.colorSpace = THREE.SRGBColorSpace;
  // מיפוי המכסה של הגליל מסובב ברבע; מיישרים כדי שהמספר יעמוד
  tex.center.set(0.5, 0.5);
  tex.rotation = Math.PI / 2;
  const face = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.85, roughness: 0.32, envMap, envMapIntensity: 1.1 });
  const edge = new THREE.MeshStandardMaterial({ color: m.edge, metalness: 1, roughness: 0.28, envMap, envMapIntensity: 1.2 });
  const geo = new THREE.CylinderGeometry(10, 10, 2.6, 48, 1, false);
  geo.rotateX(Math.PI / 2); // הפנים אל המצלמה
  disposers.push(() => { tex.dispose(); face.dispose(); edge.dispose(); geo.dispose(); });
  // חומרי גליל: [דופן, מכסה עליון, מכסה תחתון]
  const coin = new THREE.Mesh(geo, [edge, face, face]);
  return { coin, dispose: () => disposers.forEach((d) => d()) };
};
