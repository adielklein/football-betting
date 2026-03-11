import React from 'react';

function LoadingSpinner({ message = "טוען..." }) {
  return (
    <div style={{
      padding: '2rem',
      textAlign: 'center',
      minHeight: '50vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{
        width: '44px',
        height: '44px',
        border: '3px solid #f0f0f0',
        borderTop: '3px solid var(--theme-primary, #007bff)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginBottom: '1rem'
      }}></div>
      <h2 style={{ color: '#888', fontSize: '1rem', fontWeight: '500' }}>{message}</h2>
    </div>
  );
}

export default LoadingSpinner;
