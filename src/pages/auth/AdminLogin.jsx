import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  UserCheck,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const AdminLogin = () => {
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
      setErrorMsg('Please enter both your Admin username / email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const { profile } = await login(identifier, password, 'admin');
      addToast(`Welcome back, ${profile?.full_name || 'Admin'}!`, 'success');
      navigate('/admin');
    } catch (err) {
      console.error('Admin login error:', err);
      setErrorMsg(err.message || 'Invalid admin credentials. Please verify and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #042F2E 100%)',
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
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          padding: '36px 32px',
          borderRadius: 'var(--radius-xl)',
          background: '#1E293B',
          border: '1px solid #334155',
          color: '#F8FAFC',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-block', position: 'relative', marginBottom: '14px' }}>
            <img
              src="/college-logo.png"
              alt="STERS College Logo"
              style={{
                width: 82,
                height: 82,
                borderRadius: '50%',
                objectFit: 'contain',
                background: '#FFFFFF',
                boxShadow: '0 0 24px rgba(99, 102, 241, 0.4)',
                border: '3px solid #6366F1',
                display: 'block',
              }}
            />
          </div>

          <div
            style={{
              fontSize: '0.725rem',
              fontWeight: 700,
              color: '#38BDF8',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            The Surat Technical Education & Research Society
          </div>

          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#FFFFFF',
              marginTop: '4px',
              lineHeight: 1.25,
            }}
          >
            Faculty & Admin Portal
          </h2>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#A5B4FC',
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: 700,
              marginTop: '10px',
              border: '1px solid rgba(99, 102, 241, 0.3)',
            }}
          >
            <Shield size={15} />
            <span>Authorized Faculty & Class Head Access</span>
          </div>

          <p style={{ fontSize: '0.825rem', color: '#94A3B8', marginTop: '6px' }}>
            Publish syllabus tasks, track student attendance, and evaluate handwritten practical journals.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#FCA5A5',
              border: '1px solid rgba(239, 68, 68, 0.3)',
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

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" style={{ color: '#E2E8F0' }}>
              Admin Username or Official Email
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Enter your Admin Username or Official Email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                required
                style={{
                  background: '#0F172A',
                  border: '1px solid #334155',
                  color: '#FFFFFF',
                }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: '#E2E8F0' }}>
              Admin Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={{
                  background: '#0F172A',
                  border: '1px solid #334155',
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
                  color: '#94A3B8',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  display: 'flex',
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
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
              marginTop: '10px',
              background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
              borderColor: '#6366F1',
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="spin" />
                <span>Authenticating Admin...</span>
              </>
            ) : (
              <>
                <span>Sign In to Admin Dashboard</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Back to Student Portal Link */}
        <div
          style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '0.825rem',
            color: '#94A3B8',
            borderTop: '1px solid #334155',
            paddingTop: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <GraduationCap size={15} color="#38BDF8" />
          <span>Student? </span>
          <Link to="/login" style={{ fontWeight: 600, color: '#38BDF8' }}>
            Return to Student Portal (/login)
          </Link>
        </div>
      </div>
    </div>
  );
};
