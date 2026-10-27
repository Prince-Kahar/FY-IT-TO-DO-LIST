import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  CheckCheck,
  Clock,
  CheckCircle2,
  Megaphone,
  FileText,
  Sparkles,
  Send,
  Paperclip,
  Download,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { dataService } from '../../lib/dataService';
import { pushService } from '../../lib/pushNotificationService';

export const StudentNotifications = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [notifications, setNotifications] = useState(() => {
    const cached = dataService.getCachedAnnouncements();
    return cached.map((a) => {
      const hasEmoji = a.title?.startsWith('📝') || a.title?.startsWith('📢') || a.title?.startsWith('🚨') || a.title?.startsWith('⚠️');
      return {
        id: 'ann-' + a.id,
        title: hasEmoji ? a.title : `📢 ${a.title}`,
        message: a.message || a.content || '',
        attachment: a.attachment || null,
        notification_type: a.title?.includes('Task') ? 'task_assigned' : 'announcement',
        priority: a.priority || 'Normal',
        is_read: false,
        created_at: a.published_at || a.created_at || new Date().toISOString(),
      };
    });
  });
  const [loading, setLoading] = useState(false);
  const [pushStatus, setPushStatus] = useState(pushService.getPermission());
  const [isPushEnabled, setIsPushEnabled] = useState(pushService.isEnabled());

  const handleEnablePush = async () => {
    const res = await pushService.requestPermission();
    setPushStatus(pushService.getPermission());
    setIsPushEnabled(pushService.isEnabled());
    if (res.success) {
      addToast('🔔 Browser Push Notifications Enabled!', 'success');
    } else if (res.permission === 'denied') {
      addToast('Push notifications were blocked in browser settings. Please enable them in browser site settings.', 'warning');
    }
  };

  const handleSendTestPush = () => {
    if (!pushService.isEnabled()) {
      handleEnablePush();
      return;
    }
    const sent = pushService.sendNotification('🎓 FY IT Portal Test Notification', {
      body: 'Push notifications are working perfectly on your device!',
      tag: 'test_notification',
    });
    if (sent) {
      addToast('Test push notification sent! Check your desktop notifications.', 'success');
    } else {
      addToast('Unable to send push. Please check browser permissions.', 'warning');
    }
  };

  const loadNotifications = async (isBackground = false) => {
    if (!user) return;
    if (!isBackground) setLoading(true);
    try {
      const data = await dataService.getNotifications(user.id);
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    // 1. Continuous live polling every 1 second
    const pollInterval = setInterval(() => {
      loadNotifications(true);
    }, 1000);

    // 2. Realtime listener
    const unsub = dataService.subscribeRealtime(() => {
      loadNotifications(true);
    });

    return () => {
      clearInterval(pollInterval);
      if (unsub) unsub();
    };
  }, [user]);

  const handleMarkAsRead = async (id) => {
    try {
      await dataService.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await dataService.markAllNotificationsRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      addToast('All notifications marked as read.', 'info');
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'submission_reviewed':
        return <CheckCircle2 size={18} color="var(--success-main)" />;
      case 'deadline_approaching':
        return <Clock size={18} color="var(--warning-main)" />;
      case 'announcement':
        return <Megaphone size={18} color="var(--teal-600)" />;
      case 'task_assigned':
      default:
        return <FileText size={18} color="var(--primary-600)" />;
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-description">
            Stay updated with new task assignments, teacher review feedback, and approaching deadlines.
          </p>
        </div>

        {(notifications || []).some((n) => !n?.is_read) && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleMarkAllRead}
          >
            <CheckCheck size={16} />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Push Notifications Status & Controls Card */}
      <div
        className="card"
        style={{
          background: isPushEnabled
            ? 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)'
            : 'linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%)',
          border: `1px solid ${isPushEnabled ? '#86EFAC' : '#BFDBFE'}`,
          marginBottom: '20px',
          padding: '16px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-md)',
                background: isPushEnabled ? 'var(--success-main)' : 'var(--primary-600)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isPushEnabled
                  ? '0 3px 8px rgba(22, 163, 74, 0.3)'
                  : '0 3px 8px rgba(79, 70, 229, 0.3)',
              }}
            >
              {isPushEnabled ? <BellRing size={20} /> : <Bell size={20} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '0.975rem', fontWeight: 700, margin: 0 }}>
                  Browser Push Notifications
                </h3>
                <span
                  style={{
                    background: isPushEnabled ? '#DCFCE7' : '#FEF3C7',
                    color: isPushEnabled ? '#166534' : '#B45309',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 999,
                  }}
                >
                  {isPushEnabled ? '● ACTIVE & READY' : '○ NOT ACTIVATED'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px', margin: 0 }}>
                Receive instant desktop alerts when practicals are assigned, reviews are published, or Pomodoro study ends.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {!isPushEnabled ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleEnablePush}
              >
                <BellRing size={15} />
                <span>Turn ON Push Notifications</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleSendTestPush}
                title="Send a sample push notification to your screen"
              >
                <Send size={14} />
                <span>Test Notification</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {(!notifications || notifications.length === 0) ? (
        <div className="card empty-state">
          <div className="empty-state-icon">
            <Bell size={28} />
          </div>
          <h3 className="empty-state-title">No notifications yet</h3>
          <p className="empty-state-desc">
            You're all caught up! New assignment notices and grade reviews will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(notifications || []).map((notif) => (
            <div
              key={notif.id}
              className="card"
              style={{
                padding: '16px 20px',
                background: notif.is_read ? '#FFFFFF' : 'var(--primary-50)',
                borderLeft: `4px solid ${notif.is_read ? 'var(--border-light)' : 'var(--primary-600)'}`,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1 }}>
                <div style={{ marginTop: '2px' }}>{getIcon(notif.notification_type)}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.925rem', color: 'var(--text-main)' }}>
                    {notif.title}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {notif.message}
                  </p>

                  {notif.attachment && (
                    <div style={{ marginTop: '10px' }}>
                      <a
                        href={notif.attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        download={notif.attachment.name}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: '#F0F9FF',
                          border: '1px solid #BAE6FD',
                          color: '#0369A1',
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          textDecoration: 'none',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        }}
                      >
                        <Paperclip size={14} color="#0284C7" />
                        <span>📎 {notif.attachment.name}</span>
                        {notif.attachment.size && (
                          <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                            ({(notif.attachment.size / 1024).toFixed(0)} KB)
                          </span>
                        )}
                        <Download size={13} style={{ marginLeft: 4 }} />
                      </a>
                    </div>
                  )}

                  <div style={{ fontSize: '0.725rem', color: 'var(--text-subtle)', marginTop: '6px' }}>
                    {new Date(notif.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {!notif.is_read && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleMarkAsRead(notif.id)}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Mark Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
