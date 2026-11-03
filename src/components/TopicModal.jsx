import React, { useState } from 'react';
import { X, CheckCircle2, Loader2, AlertCircle, Layers, BookOpen } from 'lucide-react';
import { dataService } from '../lib/dataService';
import { useToast } from '../context/ToastContext';

export const TopicModal = ({ subject, topicToEdit = null, defaultUnit = '', onClose, onSuccess }) => {
  const { addToast } = useToast();

  // Extract unique existing units for this subject
  const existingUnits = Array.from(
    new Set(
      (subject?.topics || [])
        .map((t) => (t.unit_name || '').trim())
        .filter((u) => u.length > 0)
    )
  );

  const initialUnitName = topicToEdit?.unit_name || defaultUnit || (existingUnits.length > 0 ? existingUnits[0] : 'Unit 1: Introduction');

  const [unitName, setUnitName] = useState(initialUnitName);
  const [name, setName] = useState(topicToEdit?.name || '');
  const [subtopic, setSubtopic] = useState(topicToEdit?.subtopic || '');
  const [description, setDescription] = useState(topicToEdit?.description || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isEditMode = !!topicToEdit;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanUnit = (unitName.trim() || 'Unit 1: General Topics');

    if (!cleanName) {
      setErrorMsg('Topic name is required.');
      return;
    }

    // Client-side duplicate check (exclude current topic if editing)
    const existingTopics = Array.isArray(subject?.topics) ? subject.topics : [];
    const isDuplicate = existingTopics.some(
      (t) =>
        t.id !== topicToEdit?.id &&
        (t.name || '').trim().toLowerCase() === cleanName.toLowerCase() &&
        (t.unit_name || 'Unit 1: General Topics').trim().toLowerCase() === cleanUnit.toLowerCase()
    );

    if (isDuplicate) {
      const msg = `⚠️ Topic "${cleanName}" already exists in ${cleanUnit}!`;
      setErrorMsg(msg);
      addToast(msg, 'warning');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      if (isEditMode) {
        await dataService.updateTopic(topicToEdit.id, {
          name: cleanName,
          unit_name: cleanUnit,
          subtopic: subtopic.trim() || null,
          description: description.trim() || null,
        });
        addToast(`Topic "${cleanName}" updated successfully.`, 'success');
      } else {
        await dataService.createTopic({
          subject_id: subject.id,
          name: cleanName,
          unit_name: cleanUnit,
          subtopic: subtopic.trim() || null,
          description: description.trim() || null,
        });
        addToast(`Topic "${cleanName}" added under ${cleanUnit}.`, 'success');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Topic save error:', err);
      const msg = err.message || 'Failed to save topic.';
      setErrorMsg(msg);
      addToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{isEditMode ? 'Edit Topic & Unit' : 'Add Topic to Unit'}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Subject: <strong>{subject?.name}</strong>
            </p>
          </div>
          <button className="photo-remove-btn" onClick={onClose} style={{ position: 'static' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {errorMsg && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, color: '#DC2626' }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Unit Name (with suggestions) */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Unit Name *</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  (Select existing or type new)
                </span>
              </label>
              <input
                type="text"
                list="subject-units-list"
                className="form-control"
                placeholder="e.g. Unit 1: Basics & Fundamentals"
                value={unitName}
                onChange={(e) => {
                  setUnitName(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                required
              />
              <datalist id="subject-units-list">
                {existingUnits.map((u) => (
                  <option key={u} value={u} />
                ))}
                {!existingUnits.includes('Unit 1: Introduction') && <option value="Unit 1: Introduction" />}
                {!existingUnits.includes('Unit 2: Core Concepts') && <option value="Unit 2: Core Concepts" />}
                {!existingUnits.includes('Unit 3: Advanced Topics') && <option value="Unit 3: Advanced Topics" />}
                {!existingUnits.includes('Unit 4: Applications & Practice') && <option value="Unit 4: Applications & Practice" />}
              </datalist>
            </div>

            {/* Topic Title */}
            <div className="form-group">
              <label className="form-label">Topic Title *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Control Structures & Loops"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                required
              />
            </div>

            {/* Subtopic (Optional) */}
            <div className="form-group">
              <label className="form-label">
                Subtopic (Optional)
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. for loop, while loop, do-while, break, continue"
                value={subtopic}
                onChange={(e) => setSubtopic(e.target.value)}
              />
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '3px', display: 'block' }}>
                Mention specific sub-concepts, sections, or practical items.
              </span>
            </div>

            {/* Topic Description (Optional) */}
            <div className="form-group">
              <label className="form-label">Description / Syllabus Notes (Optional)</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Brief description or textbook references..."
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
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>{isEditMode ? 'Update Topic' : 'Add Topic'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
