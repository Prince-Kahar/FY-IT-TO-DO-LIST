import React, { useState } from 'react';
import { X, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { dataService } from '../lib/dataService';
import { useToast } from '../context/ToastContext';

export const SubjectModal = ({ subjectToEdit = null, onClose, onSuccess }) => {
  const { addToast } = useToast();

  const [name, setName] = useState(subjectToEdit?.name || '');
  const [subjectCode, setSubjectCode] = useState(subjectToEdit?.subject_code || '');
  const [teacherName, setTeacherName] = useState(subjectToEdit?.teacher_name || '');
  const [description, setDescription] = useState(subjectToEdit?.description || '');
  const [isActive, setIsActive] = useState(
    subjectToEdit?.is_active !== undefined ? subjectToEdit.is_active : true
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Subject name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        name: name.trim(),
        subject_code: subjectCode.trim() || null,
        teacher_name: teacherName.trim() || null,
        description: description.trim() || null,
        is_active: isActive,
      };

      if (subjectToEdit) {
        await dataService.updateSubject(subjectToEdit.id, payload);
        addToast('Subject updated successfully.', 'success');
      } else {
        await dataService.createSubject(payload);
        addToast('New subject added to FY B.Sc. IT curriculum!', 'success');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Subject error:', err);
      setErrorMsg(err.message || 'Failed to save subject.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {subjectToEdit ? 'Edit Subject' : 'Add New Subject'}
          </h3>
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
              <label className="form-label">Subject Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. C Programming or Database Systems"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Subject Code</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. IT101"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Teacher / Faculty</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Prof. Sharma"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description / Syllabus Overview</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Brief description of the course content and learning outcomes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  Active Subject (Visible to students for assignments and submissions)
                </span>
              </label>
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
                  <span>{subjectToEdit ? 'Save Changes' : 'Create Subject'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
