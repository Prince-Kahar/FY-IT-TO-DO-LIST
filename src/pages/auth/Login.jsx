import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Shield,
  User,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Loader2,
  Sparkles,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const Login = () => {
  const { login, isConfigured } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('student'); // 'student' | 'admin'
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const executeLogin = async (loginEmail, loginPassword) => {
    if (!loginEmail.trim() || !loginPassword) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const { user, profile } = await login(loginEmail, loginPassword);
      addToast(`Welcome back, ${profile?.full_name || 'User'}!`, 'success');

      if (profile?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    executeLogin(email, password);
  };

  const handleQuickLogin = (role) => {
    if (role === 'admin') {
      setEmail('admin@college.edu');
      setPassword('admin123');
      setActiveTab('admin');
      executeLogin('admin@college.edu', 'admin123');
    } else {
      setEmail('student@college.edu');
      setPassword('student123');
      setActiveTab('student');
      executeLogin('student@college.edu', 'student123');
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
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, var(--primary-600), var(--teal-600))',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
              marginBottom: '14px',
            }}
          >
            <GraduationCap size={30} />
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>FY IT Task Manager</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            First Year B.Sc. IT Academic Work & Submission Portal
          </p>
        </div>

        {/* Ready Credentials Notice Box */}
        <div
          style={{
            background: '#F0FDFA',
            border: '1px solid #99F6E4',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            marginBottom: '20px',
            fontSize: '0.825rem',
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: '#0F766E',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '8px',
            }}
          >
            <KeyRound size={15} />
            <span>Ready-to-Use Login Credentials:</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginTop: '6px',
            }}
          >
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #CCFBF1',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--primary-700)', fontSize: '0.75rem' }}>
                👤 Student Account
              </div>
              <div style={{ color: 'var(--text-main)', fontSize: '0.75rem', marginTop: '2px' }}>
                <code>student@college.edu</code>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Pass: <code>student123</code>
              </div>
              <button
                type="button"
                onClick={() => handleQuickLogin('student')}
                disabled={isLoading}
                style={{
                  marginTop: '6px',
                  width: '100%',
                  background: 'var(--primary-50)',
                  color: 'var(--primary-700)',
                  border: '1px solid var(--primary-200)',
                  padding: '4px',
                  borderRadius: '4px',
                  fontSize: '0.725rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ⚡ 1-Click Student Login
              </button>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #CCFBF1',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--teal-700)', fontSize: '0.75rem' }}>
                🛡️ Admin / Faculty
              </div>
              <div style={{ color: 'var(--text-main)', fontSize: '0.75rem', marginTop: '2px' }}>
                <code>admin@college.edu</code>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Pass: <code>admin123</code>
              </div>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                disabled={isLoading}
                style={{
                  marginTop: '6px',
                  width: '100%',
                  background: 'var(--teal-50)',
                  color: 'var(--teal-700)',
                  border: '1px solid var(--teal-200)',
                  padding: '4px',
                  borderRadius: '4px',
                  fontSize: '0.725rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ⚡ 1-Click Admin Login
              </button>
            </div>
          </div>
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
            onClick={() => {
              setActiveTab('student');
              setErrorMsg('');
              setEmail('student@college.edu');
              setPassword('student123');
            }}
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
            }}
          >
            <User size={15} />
            <span>Student Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setErrorMsg('');
              setEmail('admin@college.edu');
              setPassword('admin123');
            }}
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
            }}
          >
            <Shield size={15} />
            <span>Admin / Faculty</span>
          </button>
        </div>

        {/* Error message */}
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
              {activeTab === 'admin' ? 'Faculty / Admin Email' : 'Student Email'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-control"
                placeholder={
                  activeTab === 'admin' ? 'admin@college.edu' : 'student@college.edu'
                }
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            style={{ width: '100%', padding: '12px', marginTop: '8px' }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="spin" />
                <span>Verifying & Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In as {activeTab === 'admin' ? 'Class Head' : 'Student'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer Registration Link */}
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
