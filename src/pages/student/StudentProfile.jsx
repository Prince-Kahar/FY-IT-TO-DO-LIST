import React, { useState } from 'react';
import { User, Lock, Save, Shield, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';

export const StudentProfile = () => {
  const { profile, updateProfile } = useAuth();
  const { addToast } = useToast();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [division, setDivision] = useState(profile?.division || 'A');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        division,
      });
      addToast('Profile updated successfully!', 'success');
    } catch (err) {
      console.error('Profile update error:', err);
      addToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) throw error;
      }
      addToast('Password changed successfully!', 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Password change error:', err);
      setPasswordError(err.message || 'Failed to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Profile & Settings</h1>
          <p className="page-description">
            View your academic enrollment details and manage your account credentials.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Profile Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Academic Credentials</h3>
          </div>

          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-control"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                value={profile?.email || ''}
                disabled
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
              />
              <div className="form-hint">Email address is managed by the academic registry.</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Roll Number</label>
                <input
                  type="text"
                  className="form-control"
                  value={profile?.roll_number || 'FYIT-001'}
                  disabled
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Class</label>
                <input
                  type="text"
                  className="form-control"
                  value={profile?.class_name || 'FY B.Sc. IT'}
                  disabled
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Division</label>
              <select
                className="form-control"
                value={division}
                onChange={(e) => setDivision(e.target.value)}
              >
                <option value="A">Division A</option>
                <option value="B">Division B</option>
                <option value="C">Division C</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isUpdatingProfile}
              style={{ marginTop: '10px' }}
            >
              {isUpdatingProfile ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Security & Password</h3>
          </div>

          <form onSubmit={handleChangePassword}>
            {passwordError && (
              <div
                style={{
                  background: 'var(--danger-bg)',
                  color: 'var(--danger-text)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.85rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{passwordError}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-secondary"
              disabled={isChangingPassword}
              style={{ marginTop: '10px' }}
            >
              {isChangingPassword ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
