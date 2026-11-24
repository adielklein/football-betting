// סמל ערכת הנושא כגוף תלת-ממדי אמיתי: הצורה המדויקת של הסמל (לפי השקיפות
// של התמונה) "מוחלצת" לעומק - שכבות דקות עם alphaTest זו מאחורי זו, עם
// בדיקת עומק אמיתית (בניגוד לשכבות ה-CSS, אין כאן בעיית סדר ציור). הפנים
// בצבע מלא, הדפנות כהות ומתכתיות, והגב מסובב כך שהסמל נקרא ישר גם מאחור.

export const crestTextureSource = async (loadImage) => {
  const cs = getComputedStyle(document.documentElement);
  const imgVar = cs.getPropertyValue('--theme-icon-image').trim();
  const m = /url\(["']?(.*?)["']?\)/.exec(imgVar);
  if (m && m[1]) {
    const img = await loadImage(m[1]);
    return img ? { image: img, key: m[1] } : null;
  }
  // ערכה עם אמוג'י: מציירים אותו לקנבס
  const emoji = cs.getPropertyValue('--theme-icon').trim().replace(/^["']|["']$/g, '');
  if (!emoji) return null;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.font = '200px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 128, 140);
  return { image: c, key: emoji };
};

export const buildCrest = (THREE, source) => {
  const disposers = [];
  // מעבירים דרך קנבס: תמונת SVG בלי מידות מחזירה רוחב 0, וקנבס גם מנרמל
  // את הגודל לטקסטורה
  const sw = source.naturalWidth || source.width || 256;
  const sh = source.naturalHeight || source.height || 256;
  const aspect = sw && sh ? sw / sh : 1;
  const image = document.createElement('canvas');
  image.width = 512;
  image.height = Math.round(512 / aspect);
  image.getContext('2d').drawImage(source, 0, 0, image.width, image.height);
  const H = 40, W = H * aspect;
  const depth = Math.max(W, H) * 0.09;
  const LAYERS = 16;

  const tex = new THREE.Texture(image);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  disposers.push(() => tex.dispose());

  const geo = new THREE.PlaneGeometry(W, H);
  disposers.push(() => geo.dispose());
  const face = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, roughness: 0.45, metalness: 0.15 });
  // דופן: אותה צורה, כהה ומתכתית
  const edge = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, color: 0x5a5a5a, roughness: 0.35, metalness: 0.6 });
  disposers.push(() => { face.dispose(); edge.dispose(); });

  const group = new THREE.Group();
  for (let i = 0; i <= LAYERS; i++) {
    const z = -depth / 2 + (i / LAYERS) * depth;
    const isFront = i === LAYERS, isBack = i === 0;
    const mesh = new THREE.Mesh(geo, isFront || isBack ? face : edge);
    mesh.position.z = z;
    if (isBack) mesh.rotation.y = Math.PI; // הגב נקרא ישר
    mesh.material.side = isFront || isBack ? THREE.FrontSide : THREE.DoubleSide;
    group.add(mesh);
  }
  return { group, size: { W, H }, dispose: () => disposers.forEach((d) => d()) };
};
