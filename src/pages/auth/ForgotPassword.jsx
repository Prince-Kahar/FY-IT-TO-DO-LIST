import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ArrowLeft, Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const ForgotPassword = () => {
  const { resetPassword } = useAuth();
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      await resetPassword(email);
      setIsSuccess(true);
      addToast('Password reset link sent to your email!', 'success');
    } catch (err) {
      console.error('Password reset error:', err);
      setErrorMsg(err.message || 'Failed to send reset link.');
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
        padding: '24px 16px',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '440px',
          width: '100%',
          boxShadow: 'var(--shadow-xl)',
          padding: '36px 32px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, var(--primary-600), var(--teal-600))',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
              marginBottom: '12px',
            }}
          >
            <GraduationCap size={26} />
          </div>

          <h2 style={{ fontSize: '1.45rem', fontWeight: 700 }}>Reset Password</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Enter your college registered email to receive a recovery link
          </p>
        </div>

        {isSuccess ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <CheckCircle2 size={44} color="var(--success-main)" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontWeight: 600, marginBottom: '6px' }}>Recovery Link Sent</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              We've dispatched password reset instructions to <strong>{email}</strong>. Check your inbox and spam folder.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ width: '100%' }}>
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
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

            <div className="form-group">
              <label className="form-label">Registered Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="student@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
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
                  <span>Sending Link...</span>
                </>
              ) : (
                <span>Send Reset Link</span>
              )}
            </button>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <Link
                to="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                }}
              >
                <ArrowLeft size={14} />
                <span>Return to Login</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
