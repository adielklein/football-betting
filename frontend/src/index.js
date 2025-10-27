import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();

// ========================================
// 🔔 רישום Service Worker להתראות Push
// ========================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(registration => {
        console.log('✅ Service Worker registered successfully!');
        console.log('📍 Scope:', registration.scope);

        // בדוק עדכונים כל 5 דקות
        setInterval(() => {
          registration.update().then(() => {
            console.log('🔄 Service Worker checked for updates');
          }).catch(err => {
            // אל תדפיס שגיאות של update - זה לא קריטי
            console.debug('Update check:', err.message);
          });
        }, 5 * 60 * 1000);

        // האזן לעדכונים
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            console.log('🆕 New Service Worker found!');
            
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('✨ New Service Worker installed, refresh to update');
              }
            });
          }
        });
      })
      .catch(error => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
} else {
  console.warn('⚠️ Service Workers are not supported in this browser');
}