import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Clock, CheckCircle2, Megaphone, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { dataService } from '../../lib/dataService';

export const StudentNotifications = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await dataService.getNotifications(user.id);
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
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

        {notifications.some((n) => !n.is_read) && (
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

      {notifications.length === 0 ? (
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
          {notifications.map((notif) => (
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
