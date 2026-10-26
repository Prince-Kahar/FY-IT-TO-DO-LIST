import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Calendar,
  User,
  Clock,
  Loader2,
  Award,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { dataService } from '../lib/dataService';
import { PhotoViewerModal } from './PhotoViewerModal';

export const ReviewModal = ({ submission, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [status, setStatus] = useState(
    submission.status === 'Submitted' ? 'Approved' : submission.status
  );
  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [marks, setMarks] = useState(
    submission.marks_awarded !== null && submission.marks_awarded !== undefined
      ? submission.marks_awarded
      : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const files = submission.submission_files || submission.files || [];
  const task = submission.task_assignments?.tasks;
  const student = submission.profiles;
  const isLate = submission.task_assignments?.is_late;
  const maxMarks = task?.max_marks;

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const parsedMarks = marks !== '' ? parseFloat(marks) : null;
      if (parsedMarks !== null && maxMarks && parsedMarks > maxMarks) {
        throw new Error(`Marks cannot exceed maximum marks of ${maxMarks}.`);
      }

      await dataService.reviewSubmission({
        submissionId: submission.id,
        assignmentId: submission.task_assignment_id,
        studentId: submission.student_id,
        status,
        feedback: feedback.trim(),
        marksAwarded: parsedMarks,
        adminId: user?.id,
      });

      addToast(`Submission marked as ${status} successfully.`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to submit review:', err);
      setErrorMsg(err.message || 'Error updating review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="modal-header">
            <div>
              <h3 className="modal-title">Review Student Work</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {task?.title || 'Task Submission'} • Attempt #{submission.attempt_number || 1}
              </p>
            </div>
            <button className="photo-remove-btn" onClick={onClose} style={{ position: 'static' }}>
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleReviewSubmit}>
            <div className="modal-body">
              {errorMsg && (
                <div
                  style={{
                    background: 'var(--danger-bg)',
                    color: 'var(--danger-text)',
                    border: '1px solid var(--danger-border)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '16px',
                    fontSize: '0.85rem',
                  }}
                >
                  {errorMsg}
                </div>
              )}

              {/* Student & Submission Info Banner */}
              <div
                style={{
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                  marginBottom: '20px',
                  fontSize: '0.875rem',
                }}
              >
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    Student
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                    {student?.full_name} ({student?.roll_number || 'N/A'})
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {student?.class_name} • Div {student?.division}
                  </div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    Submitted At
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                    {new Date(submission.submitted_at).toLocaleString()}
                  </div>
                  {isLate ? (
                    <span
                      style={{
                        display: 'inline-block',
                        background: 'var(--danger-bg)',
                        color: 'var(--danger-text)',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 4,
                        marginTop: 2,
                      }}
                    >
                      Late Submission
                    </span>
                  ) : (
                    <span
                      style={{
                        display: 'inline-block',
                        background: 'var(--success-bg)',
                        color: 'var(--success-text)',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 4,
                        marginTop: 2,
                      }}
                    >
                      On Time
                    </span>
                  )}
                </div>

                {maxMarks && (
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      Max Marks
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--primary-700)', marginTop: '2px' }}>
                      {maxMarks} Points
                    </div>
                  </div>
                )}
              </div>

              {/* Student Comment */}
              {submission.comment && (
                <div style={{ marginBottom: '20px' }}>
                  <div className="form-label">Student Note / Remark:</div>
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px',
                      fontSize: '0.875rem',
                      fontStyle: 'italic',
                      color: 'var(--text-main)',
                    }}
                  >
                    "{submission.comment}"
                  </div>
                </div>
              )}

              {/* Uploaded Photos Gallery */}
              <div style={{ marginBottom: '24px' }}>
                <div className="form-label" style={{ marginBottom: '8px' }}>
                  Uploaded Photo Proofs ({files.length} photos) — Click photo to zoom & verify handwriting:
                </div>

                {files.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No photos attached.
                  </div>
                ) : (
                  <div className="photo-previews-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
                    {files.map((file, idx) => {
                      const imgUrl = file.signed_url || file.storage_path;
                      return (
                        <div
                          key={file.id || idx}
                          className="photo-preview-item"
                          onClick={() => setLightboxIndex(idx)}
                          style={{ cursor: 'pointer' }}
                        >
                          <img src={imgUrl} alt={file.original_file_name} />
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(0,0,0,0.3)',
                              opacity: 0,
                              transition: 'opacity 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                          >
                            <Eye size={20} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Review Decision Controls */}
              <div
                style={{
                  borderTop: '1px solid var(--border-light)',
                  paddingTop: '20px',
                }}
              >
                <div className="form-group">
                  <label className="form-label">Review Decision</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setStatus('Approved')}
                      style={{
                        background: status === 'Approved' ? 'var(--success-bg)' : '#FFFFFF',
                        color: status === 'Approved' ? 'var(--success-text)' : 'var(--text-muted)',
                        border: `1.5px solid ${status === 'Approved' ? 'var(--success-main)' : 'var(--border-light)'}`,
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>Approve</span>
                    </button>

                    <button
                      type="button"
                      className="btn"
                      onClick={() => setStatus('Needs Correction')}
                      style={{
                        background: status === 'Needs Correction' ? '#FFEDD5' : '#FFFFFF',
                        color: status === 'Needs Correction' ? '#C2410C' : 'var(--text-muted)',
                        border: `1.5px solid ${status === 'Needs Correction' ? '#EA580C' : 'var(--border-light)'}`,
                      }}
                    >
                      <AlertTriangle size={16} />
                      <span>Needs Correction</span>
                    </button>

                    <button
                      type="button"
                      className="btn"
                      onClick={() => setStatus('Rejected')}
                      style={{
                        background: status === 'Rejected' ? 'var(--danger-bg)' : '#FFFFFF',
                        color: status === 'Rejected' ? 'var(--danger-text)' : 'var(--text-muted)',
                        border: `1.5px solid ${status === 'Rejected' ? 'var(--danger-main)' : 'var(--border-light)'}`,
                      }}
                    >
                      <XCircle size={16} />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>

                {/* Marks (if applicable) */}
                {maxMarks && (
                  <div className="form-group" style={{ maxWidth: '240px' }}>
                    <label className="form-label">Marks Awarded (Out of {maxMarks})</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={maxMarks}
                      className="form-control"
                      placeholder="e.g. 18"
                      value={marks}
                      onChange={(e) => setMarks(e.target.value)}
                    />
                  </div>
                )}

                {/* Teacher Feedback / Correction instructions */}
                <div className="form-group">
                  <label className="form-label">
                    Teacher Feedback & Correction Instructions
                  </label>
                  <textarea
                    rows={3}
                    className="form-control"
                    placeholder="Enter instructions, notes on what needs fixing, or positive remarks..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                  <div className="form-hint">
                    This feedback will be instantly delivered to the student via in-app notification.
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
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
                    <span>Saving Review...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Save & Notify Student</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Lightbox for high-res photo inspection */}
      {lightboxIndex !== null && (
        <PhotoViewerModal
          photos={files}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
};
