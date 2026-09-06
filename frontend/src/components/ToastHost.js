import React, { useEffect, useState } from 'react';
import { subscribeToToasts } from '../services/toast';

// ערימת ההודעות. יושבת פעם אחת ב-App ומקשיבה ל-toast מכל מקום באפליקציה.
const STYLES = {
  success: { bg: 'linear-gradient(135deg, #28a745, #20c997)', icon: '✓' },
  error:   { bg: 'linear-gradient(135deg, #dc3545, #e4606d)', icon: '!' },
  warning: { bg: 'linear-gradient(135deg, #f0ad4e, #ec971f)', icon: '!' },
  info:    { bg: 'linear-gradient(135deg, #0d6efd, #4f8cff)', icon: 'i' }
};

function ToastHost() {
  const [items, setItems] = useState([]);

  useEffect(() => subscribeToToasts((item) => {
    setItems((prev) => [...prev, item]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== item.id));
    }, item.duration);
  }), []);

  if (items.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(16px + env(safe-area-inset-top, 0px))',
        left: '12px',
        right: '12px',
        zIndex: 10001,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        pointerEvents: 'none',
        direction: 'rtl'
      }}
    >
      {items.map((item) => {
        const style = STYLES[item.type] || STYLES.info;
        return (
          <div
            key={item.id}
            role={item.type === 'error' ? 'alert' : 'status'}
            onClick={() => setItems((prev) => prev.filter((t) => t.id !== item.id))}
            style={{
              pointerEvents: 'auto',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              maxWidth: '440px',
              width: 'fit-content',
              padding: '11px 16px',
              borderRadius: '12px',
              background: style.bg,
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              lineHeight: 1.4,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
              animation: 'toastHostIn 0.25s ease-out'
            }}
          >
            <span
              aria-hidden="true"
              style={{
                flexShrink: 0,
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700
              }}
            >
              {style.icon}
            </span>
            {/* ההודעות עשויות להכיל מספר שורות (סיכומי סנכרון למשל) */}
            <span style={{ whiteSpace: 'pre-line' }}>{item.text}</span>
          </div>
        );
      })}
    </div>
  );
}

export default ToastHost;
