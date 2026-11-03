import React, { useState } from 'react';
import { X, CheckCircle2, Loader2, AlertCircle, Plus, Trash2, Layers, BookOpen } from 'lucide-react';
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

  const initialUnitName =
    topicToEdit?.unit_name ||
    defaultUnit ||
    (existingUnits.length > 0 ? existingUnits[0] : 'Unit 1: Introduction');

  const [unitName, setUnitName] = useState(initialUnitName);

  // Parse existing subtopics into an array of strings
  const parseInitialSubtopics = (rawSub) => {
    if (!rawSub) return [''];
    if (Array.isArray(rawSub)) return rawSub.length > 0 ? rawSub : [''];
    const parts = String(rawSub)
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : [''];
  };

  // State for multiple topics
  const [topics, setTopics] = useState(() => {
    if (topicToEdit) {
      return [
        {
          id: topicToEdit.id,
          name: topicToEdit.name || '',
          subtopics: parseInitialSubtopics(topicToEdit.subtopic),
          description: topicToEdit.description || '',
          isExisting: true,
        },
      ];
    }
    return [
      {
        id: 'new-' + Date.now(),
        name: '',
        subtopics: [''],
        description: '',
        isExisting: false,
      },
    ];
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isEditMode = !!topicToEdit && topics.length === 1;

  // Add another Topic card
  const handleAddTopic = () => {
    setTopics((prev) => [
      ...prev,
      {
        id: 'new-' + Date.now() + '-' + prev.length,
        name: '',
        subtopics: [''],
        description: '',
        isExisting: false,
      },
    ]);
  };

  // Remove a Topic card (only if more than 1)
  const handleRemoveTopic = (tIdx) => {
    if (topics.length <= 1) return;
    setTopics((prev) => prev.filter((_, idx) => idx !== tIdx));
  };

  // Update specific field on a Topic
  const handleTopicChange = (tIdx, field, value) => {
    setTopics((prev) =>
      prev.map((t, idx) => (idx === tIdx ? { ...t, [field]: value } : t))
    );
    if (errorMsg) setErrorMsg('');
  };

  // Add a Subtopic line to a Topic
  const handleAddSubtopic = (tIdx) => {
    setTopics((prev) =>
      prev.map((t, idx) => {
        if (idx !== tIdx) return t;
        return {
          ...t,
          subtopics: [...t.subtopics, ''],
        };
      })
    );
  };

  // Remove a Subtopic line from a Topic
  const handleRemoveSubtopic = (tIdx, sIdx) => {
    setTopics((prev) =>
      prev.map((t, idx) => {
        if (idx !== tIdx) return t;
        const filtered = t.subtopics.filter((_, sIndex) => sIndex !== sIdx);
        return {
          ...t,
          subtopics: filtered.length > 0 ? filtered : [''],
        };
      })
    );
  };

  // Update specific Subtopic string
  const handleSubtopicChange = (tIdx, sIdx, value) => {
    setTopics((prev) =>
      prev.map((t, idx) => {
        if (idx !== tIdx) return t;
        const updated = [...t.subtopics];
        updated[sIdx] = value;
        return { ...t, subtopics: updated };
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUnit = unitName.trim() || 'Unit 1: General Topics';

    // 1. Validate every topic
    for (let i = 0; i < topics.length; i++) {
      const t = topics[i];
      if (!t.name || !t.name.trim()) {
        const msg = `Please enter Topic Title for Topic #${i + 1}.`;
        setErrorMsg(msg);
        addToast(msg, 'warning');
        return;
      }
    }

    // 2. Duplicate checks within current modal
    const lowerNames = topics.map((t) => t.name.trim().toLowerCase());
    const uniqueNames = new Set(lowerNames);
    if (uniqueNames.size !== lowerNames.length) {
      const msg = 'Duplicate topic titles detected in the form. Please use unique topic names.';
      setErrorMsg(msg);
      addToast(msg, 'warning');
      return;
    }

    // 3. Duplicate checks against existing topics in subject
    const existingTopics = Array.isArray(subject?.topics) ? subject.topics : [];
    for (const t of topics) {
      const cleanName = t.name.trim();
      const isDup = existingTopics.some(
        (ext) =>
          ext.id !== t.id &&
          (ext.name || '').trim().toLowerCase() === cleanName.toLowerCase() &&
          (ext.unit_name || 'Unit 1: General Topics').trim().toLowerCase() === cleanUnit.toLowerCase()
      );
      if (isDup) {
        const msg = `⚠️ Topic "${cleanName}" already exists in ${cleanUnit}!`;
        setErrorMsg(msg);
        addToast(msg, 'warning');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let savedCount = 0;

      for (const t of topics) {
        const cleanName = t.name.trim();
        // Clean subtopics: filter out empty, split any comma-separated inputs
        const flatSubtopics = (t.subtopics || [])
          .flatMap((s) => s.split(/[,;\n]+/))
          .map((s) => s.trim())
          .filter(Boolean);
        const joinedSubtopics = flatSubtopics.join(', ');

        if (t.isExisting && t.id) {
          // Update existing topic
          await dataService.updateTopic(t.id, {
            name: cleanName,
            unit_name: cleanUnit,
            subtopic: joinedSubtopics || null,
            description: t.description?.trim() || null,
          });
          savedCount++;
        } else {
          // Create new topic
          await dataService.createTopic({
            subject_id: subject.id,
            name: cleanName,
            unit_name: cleanUnit,
            subtopic: joinedSubtopics || null,
            description: t.description?.trim() || null,
          });
          savedCount++;
        }
      }

      if (topics.length === 1 && isEditMode) {
        addToast(`Topic updated successfully under ${cleanUnit}.`, 'success');
      } else {
        addToast(`${savedCount} topic${savedCount > 1 ? 's' : ''} added under ${cleanUnit}.`, 'success');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Topic save error:', err);
      const msg = err.message || 'Failed to save topics.';
      setErrorMsg(msg);
      addToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ paddingBottom: '12px' }}>
          <div>
            <h3 className="modal-title" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
              {isEditMode ? 'Edit Topic & Unit' : 'Add Topics & Unit'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Subject: <strong style={{ color: 'var(--text-main)' }}>{subject?.name}</strong>
            </p>
          </div>
          <button className="photo-remove-btn" onClick={onClose} style={{ position: 'static' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
          <div
            className="modal-body"
            style={{
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              paddingRight: '6px',
            }}
          >
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

            {/* Unit Name (Applies to all topics in this batch) */}
            <div className="form-group" style={{ marginBottom: '4px' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Unit Name *</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  (Select existing or type new)
                </span>
              </label>
              <input
                type="text"
                list="subject-units-list"
                className="form-control"
                placeholder="e.g. Unit 1: The Fundamentals of Communication"
                value={unitName}
                onChange={(e) => {
                  setUnitName(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                required
                style={{ fontWeight: 600, borderColor: '#CBD5E1' }}
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

            {/* Section Divider & Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '8px',
                borderTop: '1px solid var(--border-light)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} style={{ color: 'var(--primary-600)' }} />
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  Topics ({topics.length})
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddTopic}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--primary-700)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  borderColor: 'var(--primary-200)',
                  background: 'var(--primary-50, #EEF2FF)',
                }}
              >
                <Plus size={14} />
                <span>+ Add Topic</span>
              </button>
            </div>

            {/* List of Topics */}
            {topics.map((topic, tIdx) => (
              <div
                key={topic.id}
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '16px',
                  background: '#F8FAFC',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  position: 'relative',
                }}
              >
                {/* Topic Card Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'var(--primary-600)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      {tIdx + 1}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                      Topic #{tIdx + 1} {topic.isExisting && <span style={{ fontSize: '0.75rem', color: 'var(--primary-600)', fontWeight: 600 }}>(Editing)</span>}
                    </span>
                  </div>

                  {topics.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTopic(tIdx)}
                      title="Remove this topic"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#EF4444',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '4px',
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* Topic Title */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                    Topic Title *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Communication: An Overview"
                    value={topic.name}
                    onChange={(e) => handleTopicChange(tIdx, 'name', e.target.value)}
                    required
                    style={{ background: '#FFFFFF' }}
                  />
                </div>

                {/* Subtopics with + options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 600, margin: 0 }}>
                      Subtopics (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAddSubtopic(tIdx)}
                      style={{
                        background: '#EEF2FF',
                        border: '1px solid #C7D2FE',
                        color: '#4338CA',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                      }}
                      title="Add another subtopic input"
                    >
                      <Plus size={12} />
                      <span>+ Add Subtopic</span>
                    </button>
                  </div>

                  {topic.subtopics.map((sub, sIdx) => (
                    <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. while loop, do-while, break, continue"
                        value={sub}
                        onChange={(e) => handleSubtopicChange(tIdx, sIdx, e.target.value)}
                        style={{ background: '#FFFFFF', fontSize: '0.85rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddSubtopic(tIdx)}
                        title="Add next subtopic"
                        style={{
                          width: '32px',
                          height: '34px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          color: 'var(--primary-600)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        <Plus size={15} />
                      </button>
                      {topic.subtopics.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtopic(tIdx, sIdx)}
                          title="Remove subtopic"
                          style={{
                            width: '32px',
                            height: '34px',
                            borderRadius: '6px',
                            border: '1px solid #FECACA',
                            background: '#FEF2F2',
                            color: '#DC2626',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    Tip: Click <strong>+</strong> to add more subtopics, or type comma-separated values.
                  </span>
                </div>

                {/* Description (Optional) */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                    Description / Syllabus Notes (Optional)
                  </label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Brief description or textbook references..."
                    value={topic.description}
                    onChange={(e) => handleTopicChange(tIdx, 'description', e.target.value)}
                    style={{ background: '#FFFFFF', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            ))}

            {/* Full-width Add Another Topic button */}
            <button
              type="button"
              onClick={handleAddTopic}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '2px dashed #818CF8',
                background: 'rgba(99, 102, 241, 0.04)',
                color: '#4F46E5',
                fontWeight: 700,
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.04)';
              }}
            >
              <Plus size={18} />
              <span>+ Add Another Topic to this Unit</span>
            </button>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
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
                  <span>
                    {isEditMode ? 'Update Topic' : `Save ${topics.length > 1 ? `${topics.length} Topics` : 'Topic'}`}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
