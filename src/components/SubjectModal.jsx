import React, { useState } from 'react';
import { X, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { dataService } from '../lib/dataService';
import { useToast } from '../context/ToastContext';

export const SubjectModal = ({ subjectToEdit = null, onClose, onSuccess }) => {
  const { addToast } = useToast();

  const initialStream = subjectToEdit?.stream || (
    subjectToEdit?.subject_code?.toUpperCase().startsWith('DS') ? 'DS' : 'IT'
  );
  const initialSemester = subjectToEdit?.semester || 'Sem 1';

  const [stream, setStream] = useState(initialStream);
  const [semester, setSemester] = useState(initialSemester);
  const [name, setName] = useState(subjectToEdit?.name || '');
  const [subjectCode, setSubjectCode] = useState(() => {
    if (subjectToEdit?.subject_code) return subjectToEdit.subject_code;
    return initialStream === 'DS' ? 'DS-' : 'IT-';
  });
  const [teacherName, setTeacherName] = useState(subjectToEdit?.teacher_name || '');
  const [description, setDescription] = useState(subjectToEdit?.description || '');
  const [isActive, setIsActive] = useState(
    subjectToEdit?.is_active !== undefined ? subjectToEdit.is_active : true
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle stream change and automatically prefix IT- or DS-
  const handleStreamChange = (newStream) => {
    setStream(newStream);
    if (!subjectCode.trim() || subjectCode === 'IT-' || subjectCode === 'DS-') {
      if (newStream === 'IT') setSubjectCode('IT-');
      else if (newStream === 'DS') setSubjectCode('DS-');
      else setSubjectCode('GEN-');
      return;
    }

    if (newStream === 'DS') {
      if (subjectCode.toUpperCase().startsWith('IT-')) {
        setSubjectCode(subjectCode.replace(/^IT-/i, 'DS-'));
      } else if (subjectCode.toUpperCase().startsWith('IT')) {
        setSubjectCode(subjectCode.replace(/^IT/i, 'DS-'));
      } else if (!subjectCode.toUpperCase().startsWith('DS')) {
        setSubjectCode(`DS-${subjectCode.replace(/^[A-Za-z]+-?/, '')}`);
      }
    } else if (newStream === 'IT') {
      if (subjectCode.toUpperCase().startsWith('DS-')) {
        setSubjectCode(subjectCode.replace(/^DS-/i, 'IT-'));
      } else if (subjectCode.toUpperCase().startsWith('DS')) {
        setSubjectCode(subjectCode.replace(/^DS/i, 'IT-'));
      } else if (!subjectCode.toUpperCase().startsWith('IT')) {
        setSubjectCode(`IT-${subjectCode.replace(/^[A-Za-z]+-?/, '')}`);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Subject name is required.');
      return;
    }

    // Ensure subject code has proper IT- or DS- prefix
    let cleanCode = subjectCode.trim();
    if (stream === 'IT') {
      if (!cleanCode.toUpperCase().startsWith('IT')) {
        cleanCode = `IT-${cleanCode.replace(/^DS-?/i, '')}`;
      } else if (!cleanCode.toUpperCase().startsWith('IT-')) {
        cleanCode = cleanCode.replace(/^IT/i, 'IT-');
      }
    } else if (stream === 'DS') {
      if (!cleanCode.toUpperCase().startsWith('DS')) {
        cleanCode = `DS-${cleanCode.replace(/^IT-?/i, '')}`;
      } else if (!cleanCode.toUpperCase().startsWith('DS-')) {
        cleanCode = cleanCode.replace(/^DS/i, 'DS-');
      }
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        name: name.trim(),
        stream,
        semester,
        subject_code: cleanCode || (stream === 'DS' ? 'DS-101' : 'IT-101'),
        teacher_name: teacherName.trim() || null,
        description: description.trim() || null,
        is_active: isActive,
      };

      if (subjectToEdit) {
        await dataService.updateSubject(subjectToEdit.id, payload);
        addToast(`Subject "${name.trim()}" (${stream} • ${semester}) updated successfully.`, 'success');
      } else {
        await dataService.createSubject(payload);
        addToast(`New subject "${name.trim()}" (${stream} • ${semester}) created successfully!`, 'success');
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
          <div>
            <h3 className="modal-title">
              {subjectToEdit ? 'Edit Academic Subject' : 'Add New Academic Subject'}
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Configure stream (IT / DS), syllabus title, and subject code.
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
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Stream Selector (IT vs DS vs Both) */}
            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Select Academic Stream *</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: stream === 'IT' ? '#2563EB' : stream === 'DS' ? '#7C3AED' : '#059669' }}>
                  {stream === 'IT' ? 'Information Technology (IT)' : stream === 'DS' ? 'Data Science (DS)' : 'Both Streams (Common)'}
                </span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleStreamChange('IT')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: stream === 'IT' ? '2px solid #2563EB' : '1px solid #E2E8F0',
                    background: stream === 'IT' ? '#EFF6FF' : '#FFFFFF',
                    color: stream === 'IT' ? '#1D4ED8' : '#64748B',
                    fontWeight: stream === 'IT' ? 700 : 500,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>💻 IT Stream</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStreamChange('DS')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: stream === 'DS' ? '2px solid #7C3AED' : '1px solid #E2E8F0',
                    background: stream === 'DS' ? '#FAF5FF' : '#FFFFFF',
                    color: stream === 'DS' ? '#6D28D9' : '#64748B',
                    fontWeight: stream === 'DS' ? 700 : 500,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>📊 DS Stream</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStreamChange('Both')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: stream === 'Both' ? '2px solid #059669' : '1px solid #E2E8F0',
                    background: stream === 'Both' ? '#ECFDF5' : '#FFFFFF',
                    color: stream === 'Both' ? '#047857' : '#64748B',
                    fontWeight: stream === 'Both' ? 700 : 500,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>🌐 Both (All)</span>
                </button>
              </div>
            </div>

            {/* Semester Selector (Sem 1 vs Sem 2) */}
            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Academic Semester *</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4F46E5' }}>
                  {semester === 'Sem 1' ? 'First Semester (Sem 1)' : 'Second Semester (Sem 2)'}
                </span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setSemester('Sem 1')}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: semester === 'Sem 1' ? '2px solid #4F46E5' : '1px solid #E2E8F0',
                    background: semester === 'Sem 1' ? '#EEF2FF' : '#FFFFFF',
                    color: semester === 'Sem 1' ? '#4338CA' : '#64748B',
                    fontWeight: semester === 'Sem 1' ? 700 : 500,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>📘 Semester 1 (Sem 1)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSemester('Sem 2')}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: semester === 'Sem 2' ? '2px solid #4F46E5' : '1px solid #E2E8F0',
                    background: semester === 'Sem 2' ? '#EEF2FF' : '#FFFFFF',
                    color: semester === 'Sem 2' ? '#4338CA' : '#64748B',
                    fontWeight: semester === 'Sem 2' ? 700 : 500,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>📙 Semester 2 (Sem 2)</span>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Subject Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder={stream === 'DS' ? 'e.g. Machine Learning or Data Analytics' : 'e.g. C Programming or Database Systems'}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">
                  Subject Code *{' '}
                  <span style={{ fontSize: '0.72rem', color: stream === 'DS' ? '#7C3AED' : '#2563EB', fontWeight: 600 }}>
                    ({stream === 'DS' ? 'Auto DS- prefix' : stream === 'IT' ? 'Auto IT- prefix' : 'Code'})
                  </span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={stream === 'DS' ? 'e.g. DS-101' : 'e.g. IT-101'}
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  required
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
