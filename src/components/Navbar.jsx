import React, { useState, useEffect } from 'react';
import { Menu, Bell, BellRing, Shield, User, GraduationCap, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { dataService } from '../lib/dataService';
import { pushService } from '../lib/pushNotificationService';

export const Navbar = ({ onMenuClick }) => {
  const { user, profile, isAdmin } = useAuth();
  const { addToast } = useToast();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPushActive, setIsPushActive] = useState(pushService.isEnabled());

  const handleTogglePush = async () => {
    if (!isPushActive) {
      const res = await pushService.requestPermission();
      if (res.success) {
        setIsPushActive(true);
        addToast('🔔 Desktop Push Notifications turned ON!', 'success');
      } else {
        addToast('Notification permission was blocked in browser settings.', 'warning');
      }
    } else {
      addToast('Push notifications are already active on this browser.', 'info');
    }
  };

  useEffect(() => {
    if (!user) return;
    const fetchNotifs = async () => {
      try {
        const notifs = await dataService.getNotifications(user.id);
        const unread = notifs.filter((n) => !n.is_read).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error('Navbar notification fetch error:', err);
      }
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 1000); // Check every 1s
    const unsub = dataService.subscribeRealtime(fetchNotifs);
    return () => {
      clearInterval(interval);
      if (unsub) unsub();
    };
  }, [user]);

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onMenuClick}
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src="/college-logo.png"
            alt="STERS Logo"
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              objectFit: 'contain',
              border: '1px solid var(--border-light)',
              flexShrink: 0,
            }}
          />
          <span className="navbar-brand-text">
            <span className="navbar-title-full">STERS • FY B.Sc. IT & BCA</span>
            <span className="navbar-title-short">STERS FYIT</span>
          </span>
        </div>
      </div>

      <div className="navbar-right">
        {/* Role Badge */}
        <span className={`role-badge ${isAdmin ? 'admin' : 'student'}`}>
          {isAdmin ? (
            <>
              <Shield size={12} />
              <span className="role-text-full">Class Head / Admin</span>
              <span className="role-text-short">Admin</span>
            </>
          ) : (
            <>
              <User size={12} />
              <span className="role-text-full">Student ({profile?.roll_number || 'FYIT'})</span>
              <span className="role-text-short">{profile?.roll_number || 'Student'}</span>
            </>
          )}
        </span>

        {/* Push Notification Toggle Button */}
        <button
          type="button"
          onClick={handleTogglePush}
          style={{
            position: 'relative',
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${isPushActive ? '#86EFAC' : 'var(--border-light)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isPushActive ? 'var(--success-main)' : 'var(--text-muted)',
            background: isPushActive ? '#F0FDF4' : '#FFFFFF',
            cursor: 'pointer',
          }}
          title={isPushActive ? 'Push Notifications: Active (Click to check)' : 'Click to Enable Browser Push Notifications'}
        >
          {isPushActive ? <BellRing size={17} /> : <Bell size={17} />}
          {isPushActive && (
            <span
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--success-main)',
              }}
            />
          )}
        </button>

        {/* Notification Bell */}
        <Link
          to={isAdmin ? '/admin' : '/notifications'}
          style={{
            position: 'relative',
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            background: '#FFFFFF',
          }}
          title="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                background: 'var(--danger-main)',
                color: '#fff',
                borderRadius: '50%',
                width: 18,
                height: 18,
                fontSize: '0.65rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(220, 38, 38, 0.4)',
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
};
