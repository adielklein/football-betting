import React from 'react';
import { BallLoader } from '../Motifs';

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
      <div style={{ marginBottom: '1rem' }}><BallLoader size={48} /></div>
      <h2 style={{ color: 'var(--text-3, #888)', fontSize: 'var(--fs-md)', fontWeight: '500' }}>{message}</h2>
    </div>
  );
}

export default LoadingSpinner;
