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

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
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
          });
        }, 5 * 60 * 1000); // 5 דקות

        // האזן לעדכונים
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🆕 New Service Worker found!');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('✨ New Service Worker installed, refresh to update');
              
              // אפשר להוסיף כאן התראה למשתמש שיש גרסה חדשה
              // למשל: if (confirm('יש גרסה חדשה! לרענן?')) { window.location.reload(); }
            }
          });
        });
      })
      .catch(error => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
} else {
  console.warn('⚠️ Service Workers are not supported in this browser');
}