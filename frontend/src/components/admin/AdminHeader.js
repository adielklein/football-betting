import React from 'react';

function AdminHeader({ user, onLogout }) {
  
  return (
    <div className="header">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>פאנל ניהול - {user?.name || 'משתמש'}</h1>
            <p style={{ color: '#fff', opacity: 0.9 }}>ניהול משחקים ושחקנים</p>
          </div>
          <button 
            onClick={onLogout} 
            className="btn" 
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
          >
            יציאה
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminHeader;