import React, { useState } from 'react';
import { X, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { dataService } from '../lib/dataService';
import { useToast } from '../context/ToastContext';

export const AnnouncementModal = ({ onClose, onSuccess }) => {
  const { addToast } = useToast();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setErrorMsg('Both title and message are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await dataService.createAnnouncement({
        title: title.trim(),
        message: message.trim(),
      });

      addToast('Class announcement broadcasted to all students!', 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Announcement creation error:', err);
      setErrorMsg(err.message || 'Failed to post announcement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Broadcast Class Announcement</h3>
          <button className="photo-remove-btn" onClick={onClose} style={{ position: 'static' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errorMsg && (
              <div
                style={{
                  background: 'var(--danger-bg)',
                  color: 'var(--danger-text)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  fontSize: '0.85rem',
                }}
              >
                <AlertCircle size={16} style={{ display: 'inline', marginRight: 6 }} />
                {errorMsg}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Announcement Title *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Unit Test 1 Schedule / Lab Journal Deadline"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notice Message *</label>
              <textarea
                className="form-control"
                rows={5}
                placeholder="Write the full notice content, instructions, or dates for the students..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Post Announcement</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
