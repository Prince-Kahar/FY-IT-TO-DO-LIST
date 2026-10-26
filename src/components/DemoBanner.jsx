import React from 'react';
import { Database, UserCheck, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const DemoBanner = () => {
  const { isConfigured, role, switchDemoRole } = useAuth();
  const { addToast } = useToast();

  if (isConfigured) return null;

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, #1E1B4B 0%, #312E81 100%)',
        color: '#FFFFFF',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '0.825rem',
        boxShadow: '0 2px 8px rgba(30, 27, 75, 0.2)',
        zIndex: 60,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span
          style={{
            background: '#F59E0B',
            color: '#1E1B4B',
            padding: '2px 8px',
            borderRadius: '4px',
            fontWeight: 700,
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Sparkles size={12} />
          Evaluation Mode
        </span>
        <span>
          Supabase credentials not yet placed in <code>.env</code>. You are previewing with interactive FY B.Sc. IT academic test data.
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#C7D2FE', fontSize: '0.75rem' }}>Switch Role View:</span>
        <button
          type="button"
          onClick={() => {
            switchDemoRole('student');
            addToast('Switched to Student view (Aarav Patel)', 'info');
          }}
          style={{
            background: role === 'student' ? '#4F46E5' : 'rgba(255, 255, 255, 0.1)',
            color: '#FFFFFF',
            border: `1px solid ${role === 'student' ? '#818CF8' : 'rgba(255, 255, 255, 0.2)'}`,
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
          }}
        >
          <UserCheck size={13} />
          Student View
        </button>

        <button
          type="button"
          onClick={() => {
            switchDemoRole('admin');
            addToast('Switched to Class Head / Admin view (Prof. Kulkarni)', 'info');
          }}
          style={{
            background: role === 'admin' ? '#0D9488' : 'rgba(255, 255, 255, 0.1)',
            color: '#FFFFFF',
            border: `1px solid ${role === 'admin' ? '#2DD4BF' : 'rgba(255, 255, 255, 0.2)'}`,
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
          }}
        >
          <Shield size={13} />
          Admin View
        </button>
      </div>
    </div>
  );
};
