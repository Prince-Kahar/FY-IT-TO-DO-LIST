import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  User,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
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
  const [activeTab, setActiveTab] = useState('student'); // 'student' | 'admin'
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMsg('Please enter both your login credential and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const { profile } = await login(identifier, password);
      addToast(`Welcome back, ${profile?.full_name || 'User'}!`, 'success');

      if (profile?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg(err.message || 'Invalid credentials. Please verify and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setErrorMsg('');
    setIdentifier('');
    setPassword('');
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
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
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
              fontSize: '1.35rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              marginTop: '4px',
              lineHeight: 1.25,
            }}
          >
            Smt. U.J. Bodawala BCA College & SASCMA BBA / Commerce
          </h2>

          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            FY B.Sc. IT & BCA Daily Academic Task & Submission Portal
          </p>
        </div>

        {/* Role Toggle Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: 'var(--bg-subtle)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
          }}
        >
          <button
            type="button"
            onClick={() => handleTabChange('student')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '9px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: activeTab === 'student' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'student' ? 'var(--primary-700)' : 'var(--text-muted)',
              boxShadow: activeTab === 'student' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            <User size={15} />
            <span>Student Login</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('admin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '9px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: activeTab === 'admin' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'admin' ? 'var(--teal-700)' : 'var(--text-muted)',
              boxShadow: activeTab === 'admin' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            <Shield size={15} />
            <span>Admin / Faculty</span>
          </button>
        </div>

        {/* Error alert */}
        {errorMsg && (
          <div
            style={{
              background: 'var(--danger-bg)',
              color: 'var(--danger-text)',
              border: '1px solid var(--danger-border)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.85rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              {activeTab === 'admin' ? 'Admin Username' : 'Student Email or Roll Number'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                placeholder={
                  activeTab === 'admin'
                    ? `Enter admin username (${import.meta.env.VITE_ADMIN_USERNAME || 'hemang'})`
                    : 'Enter email (e.g. rahul@student.com) or Roll Number'
                }
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
                placeholder="Enter password"
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
                <span>Verifying credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In as {activeTab === 'admin' ? 'Class Head' : 'Student'}</span>
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
          <span>New FY B.Sc. IT Student? </span>
          <Link to="/register" style={{ fontWeight: 600, color: 'var(--primary-600)' }}>
            Register Your Account Here
          </Link>
        </div>
      </div>
    </div>
  );
};
