import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Trash2, Calendar, CheckCircle2 } from 'lucide-react';
import { dataService } from '../../lib/dataService';
import { useToast } from '../../context/ToastContext';
import { AnnouncementModal } from '../../components/AnnouncementModal';

export const AdminAnnouncements = () => {
  const { addToast } = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await dataService.getAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error('Error loading announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete announcement "${title}"?`)) return;
    try {
      await dataService.deleteAnnouncement(id);
      addToast('Announcement removed.', 'info');
      loadAnnouncements();
    } catch (err) {
      console.error('Error deleting announcement:', err);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Class Announcements</h1>
          <p className="page-description">
            Broadcast urgent notices, unit test schedules, and submission guidelines to all FY B.Sc. IT students.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={16} />
          <span>New Announcement</span>
        </button>
      </div>

      {announcements.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">
            <Megaphone size={28} />
          </div>
          <h3 className="empty-state-title">No announcements posted</h3>
          <p className="empty-state-desc">
            Post your first announcement to notify students about upcoming practical schedules and exams.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="card"
              style={{ borderLeft: '4px solid var(--primary-600)' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {ann.title}
                  </h3>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      marginTop: '4px',
                    }}
                  >
                    <Calendar size={13} />
                    <span>Published on {new Date(ann.published_at).toLocaleString()}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ color: 'var(--danger-main)' }}
                  onClick={() => handleDelete(ann.id, ann.title)}
                  title="Delete Announcement"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <p
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-main)',
                  marginTop: '14px',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-line',
                }}
              >
                {ann.message}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* New Announcement Modal */}
      {isModalOpen && (
        <AnnouncementModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={loadAnnouncements}
        />
      )}
    </div>
  );
};
