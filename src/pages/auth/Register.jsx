import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowRight, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const Register = () => {
  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [className, setClassName] = useState('FY B.Sc. IT');
  const [division, setDivision] = useState('A');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim() || !rollNumber.trim() || !email.trim() || !password) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        fullName: fullName.trim(),
        rollNumber: rollNumber.trim().toUpperCase(),
        className,
        division,
        email: email.trim().toLowerCase(),
        password,
      });

      addToast('Student registration successful! Welcome to FY IT Portal.', 'success');
      navigate('/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
      setErrorMsg(err.message || 'Registration failed. Email or Roll number may already exist.');
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
          maxWidth: '520px',
          width: '100%',
          boxShadow: 'var(--shadow-xl)',
          padding: '36px 32px',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img
            src="/college-logo.png"
            alt="STERS College Logo"
            style={{
              width: 76,
              height: 76,
              borderRadius: '50%',
              objectFit: 'contain',
              background: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.2)',
              border: '2px solid #E0E7FF',
              margin: '0 auto 12px',
              display: 'block',
            }}
          />

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

          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '4px' }}>
            Student Registration
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Create your FY B.Sc. IT & BCA student account
          </p>
        </div>

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

        <form onSubmit={handleSubmit}>
          {/* Full Name */}
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Aarav Patel"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          {/* Roll Number & Division */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Roll Number *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. FYIT-021"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Division *</label>
              <select
                className="form-control"
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                required
              >
                <option value="A">Division A</option>
                <option value="B">Division B</option>
                <option value="C">Division C</option>
              </select>
            </div>
          </div>

          {/* Class (Fixed) & Email */}
          <div className="form-group">
            <label className="form-label">Academic Program</label>
            <input
              type="text"
              className="form-control"
              value={className}
              disabled
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Student Email Address *</label>
            <input
              type="email"
              className="form-control"
              placeholder="aarav.patel@student.college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Passwords */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input
                type="password"
                className="form-control"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <input
                type="password"
                className="form-control"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
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
                <span>Creating Student Account...</span>
              </>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: '16px',
            fontSize: '0.75rem',
            color: 'var(--text-subtle)',
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          🔒 Security Notice: Admin accounts cannot be self-registered. Faculty & Class Head accounts are provisioned securely via database scripts.
        </div>

        <div
          style={{
            marginTop: '20px',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            borderTop: '1px solid var(--border-light)',
            paddingTop: '16px',
          }}
        >
          <span>Already have an account? </span>
          <Link to="/login" style={{ fontWeight: 600, color: 'var(--primary-600)' }}>
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
};
