import React, { useEffect, useRef, useState } from 'react';
import Goli3D from './Goli3D';
import { teamScarf } from './goliScarf';
import { reducedMotion } from '../services/motion';

// גולי קופץ מלמטה, חוגג ואומר משפט קצר, ונעלם אחרי כמה שניות (או בנגיעה).
// מופעל מכל מקום עם goliPop({ mood, text }) - services/goliPop.js
const SHOW_MS = 3200;

export default function GoliPop() {
  const [pop, setPop] = useState(null);
  const timer = useRef(0);
  const still = reducedMotion();

  useEffect(() => {
    const on = (e) => {
      clearTimeout(timer.current);
      setPop({ ...e.detail, key: Date.now() });
      timer.current = setTimeout(() => setPop(null), e.detail?.ms || SHOW_MS);
    };
    window.addEventListener('goli-pop', on);
    return () => { window.removeEventListener('goli-pop', on); clearTimeout(timer.current); };
  }, []);

  if (!pop) return null;
  return (
    <div
      key={pop.key}
      role="status"
      onClick={() => setPop(null)}
      style={{
        position: 'fixed', zIndex: 10500, left: 0, right: 0, margin: '0 auto', width: 'max-content', maxWidth: 'calc(100vw - 32px)',
        bottom: 'calc(14px + var(--bottom-nav-h, 0px) + env(safe-area-inset-bottom, 0px))',
        display: 'flex', alignItems: 'center', gap: '0.4rem', direction: 'rtl', cursor: 'pointer',
        animation: still ? 'none' : 'goliPopIn .45s cubic-bezier(.2,1.4,.4,1) both'
      }}
    >
      <style>{'@keyframes goliPopIn { 0% { transform: translateY(120%) scale(.6); opacity: 0 } 100% { transform: none; opacity: 1 } }'}</style>
      <Goli3D mood={pop.mood || 'celebrate'} stepKey={pop.key} size={78} still={still} scarf={teamScarf()} />
      <div style={{
        background: 'var(--surface, #fff)', color: 'var(--text, #23272f)', borderRadius: '16px', padding: '0.55rem 0.85rem',
        fontWeight: 800, fontSize: 'var(--fs-sm)', boxShadow: '0 8px 26px rgba(0,0,0,0.25)', maxWidth: '230px', lineHeight: 1.35
      }}>
        {pop.text}
      </div>
    </div>
  );
}
