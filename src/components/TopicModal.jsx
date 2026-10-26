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
    if (!name.trim()) {
      setErrorMsg('Topic name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await dataService.createTopic({
        subject_id: subject.id,
        name: name.trim(),
        description: description.trim() || null,
      });

      addToast(`Topic added under ${subject.name}`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Topic creation error:', err);
      setErrorMsg(err.message || 'Failed to add topic.');
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
              <label className="form-label">Topic Title *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Relational Calculus & Normalization"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
