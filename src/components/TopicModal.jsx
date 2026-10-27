import React, { useState } from 'react';
import { X, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { dataService } from '../lib/dataService';
import { useToast } from '../context/ToastContext';

export const TopicModal = ({ subject, onClose, onSuccess }) => {
  const { addToast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg('Topic name is required.');
      return;
    }

    // 1. Client-side fast check against currently loaded topics for this subject
    const existingTopics = Array.isArray(subject?.topics) ? subject.topics : [];
    const isDuplicate = existingTopics.some(
      (t) => (t.name || '').trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (isDuplicate) {
      const msg = `⚠️ Topic "${cleanName}" already exists for ${subject?.name || 'this subject'}!`;
      setErrorMsg(msg);
      addToast(msg, 'warning');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // 2. Fresh asynchronous check from database/cache
      if (subject?.id) {
        const freshTopics = await dataService.getTopicsBySubject(subject.id);
        const isDuplicateDb = (freshTopics || []).some(
          (t) => (t.name || '').trim().toLowerCase() === cleanName.toLowerCase()
        );
        if (isDuplicateDb) {
          const msg = `⚠️ Topic "${cleanName}" already exists for ${subject?.name || 'this subject'}!`;
          setErrorMsg(msg);
          addToast(msg, 'warning');
          setIsSubmitting(false);
          return;
        }
      }

      await dataService.createTopic({
        subject_id: subject.id,
        name: cleanName,
        description: description.trim() || null,
      });

      addToast(`Topic "${cleanName}" added under ${subject.name}`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Topic creation error:', err);
      const msg = err.message || 'Failed to add topic.';
      setErrorMsg(msg);
      addToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Add Topic</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Under Subject: <strong>{subject?.name}</strong>
            </p>
          </div>
          <button className="photo-remove-btn" onClick={onClose} style={{ position: 'static' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errorMsg && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, color: '#DC2626' }} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Topic Title *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Relational Calculus & Normalization"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Topic Description (Optional)</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Key concepts or textbook chapters covered..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Add Topic</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
