import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  UserCheck,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const Login = () => {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAdminDetected, setIsAdminDetected] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMsg('Please enter both your Roll Number / Mobile / Email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setIsAdminDetected(false);

    try {
      const { profile } = await login(identifier, password, 'student');
      addToast(`Welcome back, ${profile?.full_name || 'Student'}!`, 'success');
      navigate('/dashboard');
    } catch (err) {
      console.error('Student login error:', err);
      const msg = err.message || 'Invalid credentials. Please verify and try again.';
      setErrorMsg(msg);
      if (msg.includes('Admin credentials detected')) {
        setIsAdminDetected(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #EEF2FF 0%, #F8FAFC 50%, #F0FDFA 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '480px',
          width: '100%',
          boxShadow: 'var(--shadow-xl)',
          padding: '36px 32px',
          borderRadius: 'var(--radius-xl)',
        }}
      >
        {/* College Logo & Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{ display: 'inline-block', position: 'relative', marginBottom: '12px' }}>
            <img
              src="/college-logo.png"
              alt="STERS College Logo"
              style={{
                width: 86,
                height: 86,
                borderRadius: '50%',
                objectFit: 'contain',
                background: '#FFFFFF',
                boxShadow: '0 6px 18px rgba(79, 70, 229, 0.2)',
                border: '3px solid #E0E7FF',
                display: 'block',
              }}
            />
          </div>

          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#0D9488',
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
              color: 'var(--text-main)',
              marginTop: '4px',
              lineHeight: 1.25,
            }}
          >
            Smt. U.J. Bodawala BCA College & SASCMA BBA
          </h2>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#EEF2FF',
              color: 'var(--primary-700)',
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: 700,
              marginTop: '10px',
              border: '1px solid #C7D2FE',
            }}
          >
            <GraduationCap size={16} />
            <span>FY B.Sc. IT & BCA Student Portal</span>
          </div>

          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Sign in to submit handwritten practicals, view teacher feedback, and manage your daily study list.
          </p>
        </div>

        {/* Error alert */}
        {errorMsg && (
          <div
            style={{
              background: isAdminDetected ? '#FEF3C7' : 'var(--danger-bg)',
              color: isAdminDetected ? '#92400E' : 'var(--danger-text)',
              border: `1px solid ${isAdminDetected ? '#FDE68A' : 'var(--danger-border)'}`,
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
            {isAdminDetected && (
              <Link
                to="/admin"
                className="btn btn-secondary btn-sm"
                style={{
                  alignSelf: 'flex-start',
                  marginTop: '4px',
                  background: '#FFFFFF',
                  fontWeight: 600,
                }}
              >
                <Shield size={14} />
                <span>Go to Teacher & Admin Portal (/admin)</span>
              </Link>
            )}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Student Roll Number, Mobile, or Email</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Roll No (FYIT-001) or Mobile or Email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">Password</label>
              <Link
                to="/forgot-password"
                style={{ fontSize: '0.775rem', fontWeight: 500, color: 'var(--primary-600)' }}
              >
                Forgot password?
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="Enter your student account password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
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
            style={{ width: '100%', padding: '12px', marginTop: '10px' }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="spin" />
                <span>Verifying Student Account...</span>
              </>
            ) : (
              <>
                <span>Sign In to Student Portal</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer Registration Link for Students */}
        <div
          style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            borderTop: '1px solid var(--border-light)',
            paddingTop: '18px',
          }}
        >
          <span>New FY B.Sc. IT / BCA Student? </span>
          <Link to="/register" style={{ fontWeight: 600, color: 'var(--primary-600)' }}>
            Register Your Account Here
          </Link>
        </div>

        {/* Subtle Admin Link */}
        <div style={{ textAlign: 'center', marginTop: '14px' }}>
          <Link
            to="/admin"
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-subtle)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Shield size={12} />
            <span>Faculty & Admin Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
