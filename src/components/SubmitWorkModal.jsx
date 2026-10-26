import React, { useState } from 'react';
import { UploadCloud, X, AlertCircle, FileText, CheckCircle2, Loader2, Camera, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { dataService } from '../lib/dataService';
import { CameraDocumentScanner } from './CameraDocumentScanner';

export const SubmitWorkModal = ({ assignment, task, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { addToast, triggerConfetti } = useToast();

  const [files, setFiles] = useState([]);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const MAX_FILES = 5;
  const MAX_SIZE_MB = 5;
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const handleScannedFile = (scannedFile) => {
    if (files.length >= MAX_FILES) {
      addToast(`Max limit reached (${MAX_FILES} photos).`, 'warning');
      return;
    }
    setFiles((prev) => [...prev, scannedFile]);
    addToast('📄 Scanned notebook page added to submission!', 'success');
  };

  const handleFileSelect = (e) => {
    setErrorMsg('');
    const selected = Array.from(e.target.files);

    if (files.length + selected.length > MAX_FILES) {
      setErrorMsg(`You can upload at most ${MAX_FILES} photos per submission.`);
      return;
    }

    const validNewFiles = [];
    for (const f of selected) {
      if (!ALLOWED_TYPES.includes(f.type.toLowerCase())) {
        setErrorMsg(`"${f.name}" is not a valid format. Only JPG, PNG, and WEBP photos are allowed.`);
        return;
      }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        setErrorMsg(`"${f.name}" exceeds the ${MAX_SIZE_MB} MB file limit.`);
        return;
      }
      validNewFiles.push(f);
    }

    setFiles((prev) => [...prev, ...validNewFiles]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setErrorMsg('Please upload at least one photo of your completed handwritten work or practical.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await dataService.submitTaskWork({
        assignmentId: assignment.id,
        studentId: user.id,
        comment: comment.trim(),
        files,
        taskDueDate: task?.due_at,
      });

      triggerConfetti();
      addToast('Task submitted successfully! Proof uploaded to storage.', 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Submission failed:', err);
      setErrorMsg(err.message || 'Failed to submit work. Please check file format and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Submit Completed Task</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {task?.title} ({task?.subjects?.name || 'Academic Task'})
            </p>
          </div>
          <button className="photo-remove-btn" onClick={onClose} style={{ position: 'static' }}>
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.85rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Task Info Reminder */}
            <div
              style={{
                background: 'var(--bg-subtle)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '20px',
                fontSize: '0.85rem',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                Instructions:
              </div>
              <p style={{ color: 'var(--text-muted)' }}>
                {task?.description || 'Upload photos of your completed notes or lab practical output.'}
              </p>
            </div>

            {/* Photo Upload Zone */}
            <div className="form-group">
              <label className="form-label">
                Upload Photo Proof (Handwritten notes, assignments, journal, or code output)
              </label>

              {/* Dual Action: Camera Scanner OR File Upload */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                {/* 1. Camera Document Scanner Button */}
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  disabled={isSubmitting || files.length >= MAX_FILES}
                  style={{
                    background: 'linear-gradient(135deg, #EEF2FF 0%, #FFFFFF 100%)',
                    border: '2px solid #818CF8',
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: files.length >= MAX_FILES ? 'not-allowed' : 'pointer',
                    textAlign: 'center',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)',
                    transition: 'all 0.2s',
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #4F46E5, #0D9488)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)',
                    }}
                  >
                    <Camera size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-700)' }}>
                      In-App Camera Scanner
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Auto-whiten paper & boost handwritten ink
                    </div>
                  </div>
                </button>

                {/* 2. Standard Dropzone for Gallery Upload */}
                <label
                  className="photo-dropzone"
                  style={{
                    padding: '16px',
                    margin: 0,
                    cursor: files.length >= MAX_FILES ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    disabled={isSubmitting || files.length >= MAX_FILES}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: 'var(--bg-subtle)',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <UploadCloud size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        Choose Photos from Device
                      </div>
                      <div className="form-hint" style={{ marginTop: '2px' }}>
                        Browse gallery or file explorer
                      </div>
                    </div>
                  </div>
                </label>
              </div>

              {/* In-App Camera Scanner Modal */}
              {isScannerOpen && (
                <CameraDocumentScanner
                  onCapture={handleScannedFile}
                  onClose={() => setIsScannerOpen(false)}
                />
              )}

              {/* Photo Previews */}
              {files.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '12px', color: 'var(--text-muted)' }}>
                    Selected Photos ({files.length} / {MAX_FILES}):
                  </div>
                  <div className="photo-previews-grid">
                    {files.map((file, index) => {
                      const previewUrl = URL.createObjectURL(file);
                      return (
                        <div key={index} className="photo-preview-item">
                          <img src={previewUrl} alt={file.name} />
                          <button
                            type="button"
                            className="photo-remove-btn"
                            onClick={() => removeFile(index)}
                            title="Remove photo"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Optional Comment */}
            <div className="form-group">
              <label className="form-label">Description / Student Notes (Optional)</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Mention page numbers, practical test cases executed, or remarks for the teacher..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Footer Actions */}
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
              disabled={isSubmitting || files.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Uploading to Storage & Submitting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Submit Work</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
