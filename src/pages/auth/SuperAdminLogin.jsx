import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  KeyRound,
  ShieldAlert,
  ArrowRight,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const SuperAdminLogin = () => {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMsg('Please enter both Super Admin Username and Master Password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const { profile } = await login(identifier, password, 'superadmin');
      addToast(`Super Admin Master Session Activated. Welcome, ${profile?.full_name || 'Admin'}!`, 'success');
      navigate('/superadmin');
    } catch (err) {
      console.error('Super Admin login error:', err);
      setErrorMsg(err.message || 'Master access denied. Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at center, #1E1B4B 0%, #0F0A1C 60%, #02010A 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '460px',
          width: '100%',
          boxShadow: '0 25px 60px -15px rgba(124, 58, 237, 0.4)',
          padding: '40px 32px',
          borderRadius: 'var(--radius-xl)',
          background: 'rgba(23, 15, 38, 0.95)',
          border: '1px solid rgba(139, 92, 246, 0.4)',
          color: '#F8FAFC',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7C3AED 0%, #4338CA 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              boxShadow: '0 0 30px rgba(139, 92, 246, 0.6)',
              border: '2px solid #C4B5FD',
            }}
          >
            <KeyRound size={34} color="#FFFFFF" />
          </div>

          <div
            style={{
              fontSize: '0.725rem',
              fontWeight: 800,
              color: '#A78BFA',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            STERS System Administration
          </div>

          <h2
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: '#FFFFFF',
              marginTop: '4px',
              letterSpacing: '-0.02em',
            }}
          >
            Super Administrator Control
          </h2>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(124, 58, 237, 0.2)',
              color: '#DDD6FE',
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '0.775rem',
              fontWeight: 700,
              marginTop: '10px',
              border: '1px solid rgba(124, 58, 237, 0.4)',
            }}
          >
            <ShieldAlert size={14} color="#C4B5FD" />
            <span>Master Console • Admin Management</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#FCA5A5',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              padding: '11px 14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.85rem',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" style={{ color: '#E2E8F0', fontSize: '0.825rem' }}>
              Super Admin Username
            </label>
            <input
              type="text"
              className="form-control"
              placeholder={`e.g. ${import.meta.env.VITE_SUPERADMIN_USERNAME || 'superadmin'}`}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
              style={{
                background: '#0B0616',
                border: '1px solid #4C1D95',
                color: '#FFFFFF',
              }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: '#E2E8F0', fontSize: '0.825rem' }}>
              Master Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="Enter master security key"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={{
                  background: '#0B0616',
                  border: '1px solid #4C1D95',
                  color: '#FFFFFF',
                  paddingRight: '40px',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#A78BFA',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  display: 'flex',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '12px',
              marginTop: '12px',
              background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
              borderColor: '#8B5CF6',
              boxShadow: '0 6px 20px rgba(124, 58, 237, 0.4)',
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="spin" />
                <span>Verifying Master Access...</span>
              </>
            ) : (
              <>
                <span>Access Master Console</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '0.8rem',
            color: '#6B7280',
            borderTop: '1px solid #2E1065',
            paddingTop: '16px',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <Link to="/login" style={{ color: '#9CA3AF' }}>
            ← Student Portal
          </Link>
          <Link to="/admin" style={{ color: '#A78BFA' }}>
            Admin Portal →
          </Link>
        </div>
      </div>
    </div>
  );
};
