import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const NotFound = () => {
  const { isAdmin } = useAuth();
  const homePath = isAdmin ? '/admin' : '/dashboard';

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '24px',
      }}
    >
      <div className="card" style={{ maxWidth: '440px', padding: '40px 32px' }}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'var(--danger-bg)',
            color: 'var(--danger-main)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <AlertCircle size={32} />
        </div>

        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '8px' }}>
          Page Not Found (404)
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
          The requested academic page or resource could not be found or you may not have permission to view it.
        </p>

        <Link to={homePath} className="btn btn-primary" style={{ width: '100%' }}>
          <Home size={16} />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
};
