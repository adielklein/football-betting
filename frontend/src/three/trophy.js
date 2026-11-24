// גביע זהב תלת-ממדי: גוף מסובב (LatheGeometry) - בסיס, רגל וגביע - ושתי
// ידיות (חצאי טבעת). מתכת עם השתקפויות.
export const buildTrophy = (THREE, envMap) => {
  const disposers = [];
  const track = (x) => { disposers.push(() => x.dispose()); return x; };
  const gold = track(new THREE.MeshStandardMaterial({ color: 0xf2c230, metalness: 1, roughness: 0.22, envMap, envMapIntensity: 1.3 }));
  const dark = track(new THREE.MeshStandardMaterial({ color: 0x3a2a12, metalness: 0.3, roughness: 0.6 }));
  const profile = [
    [0, 0], [3.2, 0], [3.2, 0.5], [2.4, 0.9], [0.7, 1.4], [0.6, 3.6], [1.2, 4.2],
    [2.6, 5.2], [3.4, 6.8], [3.7, 8.6], [3.4, 8.7], [3.0, 7.2], [2.2, 5.8], [0, 5.5],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const group = new THREE.Group();
  const body = new THREE.Mesh(track(new THREE.LatheGeometry(profile, 40)), gold);
  group.add(body);
  const plinth = new THREE.Mesh(track(new THREE.CylinderGeometry(3.6, 3.9, 1.3, 32)), dark);
  plinth.position.y = -0.6;
  group.add(plinth);
  const handleGeo = track(new THREE.TorusGeometry(1.4, 0.32, 10, 24, Math.PI));
  for (const side of [-1, 1]) {
    const h = new THREE.Mesh(handleGeo, gold);
    h.rotation.z = side * Math.PI / 2;
    h.position.set(side * 3.4, 7.0, 0);
    group.add(h);
  }
  group.position.y = -4;
  return { group, dispose: () => disposers.forEach((d) => d()) };
};
