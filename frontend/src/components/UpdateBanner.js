import React, { useEffect, useState } from 'react';
import { watchForUpdates, applyUpdate } from '../services/appVersion';

// רצועה קטנה בתחתית המסך כשיצאה גרסה חדשה. לא חוסמת כלום - אפשר להתעלם
// ולהמשיך להמר, ואפשר לסגור. מופיעה מחדש רק בטעינה הבאה של האפליקציה.
function UpdateBanner() {
  const [available, setAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => watchForUpdates(() => setAvailable(true)), []);

  if (!available || dismissed) return null;

  const handleUpdate = () => {
    setUpdating(true);
    applyUpdate();
  };

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        // מעל אזור המחוות של iOS, ומעל כל שאר התוכן
        bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        left: '12px',
        right: '12px',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 14px',
        borderRadius: '14px',
        background: 'var(--theme-primary, #007bff)',
        color: '#ffffff',
        boxShadow: '0 6px 24px rgba(0, 0, 0, 0.28)',
        direction: 'rtl',
        animation: 'updateBannerIn 0.25s ease-out',
        maxWidth: '520px',
        margin: '0 auto'
      }}
    >
      <span style={{ fontSize: '20px', lineHeight: 1 }} aria-hidden="true">✨</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '14px' }}>גרסה חדשה זמינה</div>
        <div style={{ fontSize: '12px', opacity: 0.9 }}>לחץ לעדכון</div>
      </div>

      <button
        onClick={handleUpdate}
        disabled={updating}
        style={{
          flexShrink: 0,
          padding: '8px 16px',
          borderRadius: '10px',
          border: 'none',
          background: 'var(--surface, #ffffff)',
          color: 'var(--theme-primary, #007bff)',
          fontWeight: 700,
          fontSize: '14px',
          cursor: updating ? 'default' : 'pointer',
          opacity: updating ? 0.7 : 1
        }}
      >
        {updating ? 'מעדכן…' : 'עדכן'}
      </button>

      <button
        onClick={() => setDismissed(true)}
        aria-label="סגור"
        style={{
          flexShrink: 0,
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(255, 255, 255, 0.2)',
          color: '#ffffff',
          fontSize: '16px',
          lineHeight: 1,
          cursor: 'pointer'
        }}
      >
        ✕
      </button>
    </div>
  );
}

export default UpdateBanner;
