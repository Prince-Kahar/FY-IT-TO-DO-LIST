import React, { useState } from 'react';
import { X, CheckCircle2, Loader2, AlertCircle, Plus, Trash2, Layers, CornerDownRight, Tag } from 'lucide-react';
import { dataService } from '../lib/dataService';
import { useToast } from '../context/ToastContext';
import { parseSubtopicsHierarchy, formatSubtopicsToString, parseRecursiveString } from '../utils/syllabusUtils';

// Recursive item component for arbitrary nesting depth
const SubtopicTreeItem = ({
  node,
  depth = 1,
  onTitleChange,
  onAddChild,
  onRemove,
  isOnlyItem,
}) => {
  const hasChildren = Array.isArray(node.items) && node.items.length > 0;

  // Visual styling adapted dynamically by depth level
  const levelStyles = {
    1: { bg: '#FFFFFF', border: '#E2E8F0', tagColor: '#3B82F6', badgeBg: '#EFF6FF', badgeColor: '#1D4ED8', label: 'Subtopic' },
    2: { bg: '#F8FAFC', border: '#BFDBFE', tagColor: '#2563EB', badgeBg: '#DBEAFE', badgeColor: '#1E40AF', label: 'Child Subtopic' },
    3: { bg: '#FAF5FF', border: '#DDD6FE', tagColor: '#7C3AED', badgeBg: '#EDE9FE', badgeColor: '#6D28D9', label: 'Level 3 Concept' },
    4: { bg: '#F0FDF4', border: '#A7F3D0', tagColor: '#059669', badgeBg: '#D1FAE5', badgeColor: '#047857', label: 'Level 4 Concept' },
  }[Math.min(depth, 4)];

  return (
    <div
      style={{
        background: levelStyles.bg,
        border: `1px solid ${levelStyles.border}`,
        borderRadius: '8px',
        padding: depth === 1 ? '10px 12px' : '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxShadow: depth === 1 ? '0 1px 2px rgba(0,0,0,0.03)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            background: levelStyles.badgeBg,
            color: levelStyles.badgeColor,
            padding: '2px 6px',
            borderRadius: '4px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
          }}
          title={`Depth Level ${depth}`}
        >
          {depth > 1 && <CornerDownRight size={10} />}
          L{depth}
        </span>

        <input
          type="text"
          className="form-control"
          placeholder={
            depth === 1
              ? 'Subtopic title e.g. Arithmetic mean (or use { } for sub-items)'
              : `Level ${depth} concept or subtopic...`
          }
          value={node.title}
          onChange={(e) => onTitleChange(node.id, e.target.value)}
          style={{
            background: '#FFFFFF',
            fontSize: depth === 1 ? '0.85rem' : '0.8rem',
            fontWeight: depth === 1 ? 600 : 500,
            padding: '5px 10px',
          }}
        />

        <button
          type="button"
          onClick={() => onAddChild(node.id)}
          title={`Add nested sub-level under "${node.title || 'this item'}"`}
          style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            color: '#166534',
            borderRadius: '6px',
            padding: '5px 8px',
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <CornerDownRight size={13} />
          <span>+ Sub-level</span>
        </button>

        {!isOnlyItem && (
          <button
            type="button"
            onClick={() => onRemove(node.id)}
            title="Delete this subtopic"
            style={{
              width: '30px',
              height: '30px',
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
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {hasChildren && (
        <div
          style={{
            marginLeft: '14px',
            paddingLeft: '10px',
            borderLeft: `2px dashed ${levelStyles.tagColor}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: '2px',
          }}
        >
          {node.items.map((childNode) => (
            <SubtopicTreeItem
              key={childNode.id}
              node={childNode}
              depth={depth + 1}
              onTitleChange={onTitleChange}
              onAddChild={onAddChild}
              onRemove={onRemove}
              isOnlyItem={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};

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

  // Helper to assign IDs recursively to a tree of nodes
  let nodeCounter = 0;
  const assignNodeIds = (nodes) => {
    return (nodes || []).map((n) => {
      nodeCounter++;
      return {
        id: n.id || `node-${Date.now()}-${nodeCounter}-${Math.random().toString(36).slice(2, 6)}`,
        title: typeof n === 'string' ? n : (n.title || ''),
        items: Array.isArray(n.items) ? assignNodeIds(n.items) : [],
      };
    });
  };

  // Helper to parse subtopics for editing
  const parseInitialHierarchy = (rawSub, subData) => {
    const parsed = parseSubtopicsHierarchy(rawSub, subData);
    if (parsed.length === 0) {
      return [{ id: 'node-' + Date.now() + '-1', title: '', items: [] }];
    }
    return assignNodeIds(parsed);
  };

  // State for multiple topics
  const [topics, setTopics] = useState(() => {
    if (topicToEdit) {
      return [
        {
          id: topicToEdit.id,
          name: topicToEdit.name || '',
          subtopics: parseInitialHierarchy(topicToEdit.subtopic, topicToEdit.subtopics_data),
          description: topicToEdit.description || '',
          isExisting: true,
        },
      ];
    }
    return [
      {
        id: 'new-' + Date.now(),
        name: '',
        subtopics: [{ id: 'node-' + Date.now() + '-init', title: '', items: [] }],
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
        subtopics: [{ id: 'node-' + Date.now() + '-' + prev.length, title: '', items: [] }],
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

  // Recursive tree update helpers
  const updateNodeTitleInTree = (nodes, targetId, newTitle) => {
    return nodes.map((node) => {
      if (node.id === targetId) {
        return { ...node, title: newTitle };
      }
      if (node.items && node.items.length > 0) {
        return {
          ...node,
          items: updateNodeTitleInTree(node.items, targetId, newTitle),
        };
      }
      return node;
    });
  };

  const addChildNodeInTree = (nodes, parentId) => {
    return nodes.map((node) => {
      if (node.id === parentId) {
        const newChild = {
          id: 'node-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
          title: '',
          items: [],
        };
        return {
          ...node,
          items: [...(node.items || []), newChild],
        };
      }
      if (node.items && node.items.length > 0) {
        return {
          ...node,
          items: addChildNodeInTree(node.items, parentId),
        };
      }
      return node;
    });
  };

  const removeNodeFromTree = (nodes, targetId) => {
    return nodes
      .filter((node) => node.id !== targetId)
      .map((node) => {
        if (node.items && node.items.length > 0) {
          return {
            ...node,
            items: removeNodeFromTree(node.items, targetId),
          };
        }
        return node;
      });
  };

  // Subtopic Management Actions
  const handleAddSubtopic = (tIdx) => {
    setTopics((prev) =>
      prev.map((t, idx) => {
        if (idx !== tIdx) return t;
        return {
          ...t,
          subtopics: [
            ...t.subtopics,
            {
              id: 'node-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
              title: '',
              items: [],
            },
          ],
        };
      })
    );
  };

  const handleNodeTitleChange = (tIdx, nodeId, newTitle) => {
    setTopics((prev) =>
      prev.map((t, idx) => {
        if (idx !== tIdx) return t;
        return {
          ...t,
          subtopics: updateNodeTitleInTree(t.subtopics, nodeId, newTitle),
        };
      })
    );
  };

  const handleAddChildNode = (tIdx, parentId) => {
    setTopics((prev) =>
      prev.map((t, idx) => {
        if (idx !== tIdx) return t;
        return {
          ...t,
          subtopics: addChildNodeInTree(t.subtopics, parentId),
        };
      })
    );
  };

  const handleRemoveNode = (tIdx, nodeId) => {
    setTopics((prev) =>
      prev.map((t, idx) => {
        if (idx !== tIdx) return t;
        const updated = removeNodeFromTree(t.subtopics, nodeId);
        return {
          ...t,
          subtopics:
            updated.length > 0
              ? updated
              : [{ id: 'node-' + Date.now(), title: '', items: [] }],
        };
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
      // Helper to clean and normalize a node recursively
      const cleanNode = (n) => {
        const rawTitle = (n.title || '').trim();
        if (!rawTitle) return null;

        // If user typed { } directly in the title, recursively parse it
        if (rawTitle.includes('{') && rawTitle.includes('}')) {
          const parsed = parseRecursiveString(rawTitle);
          if (parsed.length > 0) {
            const existingChildren = Array.isArray(n.items)
              ? n.items.map(cleanNode).filter(Boolean)
              : [];
            return {
              title: parsed[0].title,
              items: [...(parsed[0].items || []), ...existingChildren],
            };
          }
        }

        const childItems = Array.isArray(n.items)
          ? n.items.map(cleanNode).filter(Boolean)
          : [];

        return {
          title: rawTitle,
          items: childItems,
        };
      };

      // Build batch list of topics with cleaned subtopics
      const preparedList = topics.map((t) => {
        const cleanName = t.name.trim();
        const cleanHierarchy = [];
        (t.subtopics || []).forEach((st) => {
          const cleaned = cleanNode(st);
          if (cleaned) {
            cleanHierarchy.push(cleaned);
          }
        });

        const formattedString = formatSubtopicsToString(cleanHierarchy);
        return {
          id: t.id,
          isExisting: t.isExisting,
          name: cleanName,
          subtopic: formattedString || null,
          subtopics_data: cleanHierarchy.length > 0 ? cleanHierarchy : null,
          description: t.description?.trim() || null,
        };
      });

      // Ultra-fast batch save (instant memory update & background Supabase sync)
      const savedTopics = await dataService.saveTopicsBatch(subject.id, cleanUnit, preparedList);

      if (topics.length === 1 && isEditMode) {
        addToast(`Topic updated successfully under ${cleanUnit}.`, 'success');
      } else {
        addToast(`${savedTopics.length} topic${savedTopics.length > 1 ? 's' : ''} saved under ${cleanUnit}.`, 'success');
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
        style={{ maxWidth: '660px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
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
                placeholder="e.g. Unit 1: The Fundamentals of Communication:(Theory)"
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
                    placeholder="e.g. Communication: An Overview or Measures of Central Tendency"
                    value={topic.name}
                    onChange={(e) => handleTopicChange(tIdx, 'name', e.target.value)}
                    required
                    style={{ background: '#FFFFFF' }}
                  />
                </div>

                {/* Subtopics & Nested Concepts Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 600, margin: 0 }}>
                        Subtopics & Nested Concepts (Optional)
                      </label>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                        Tip: Click <strong>+ Sub-level</strong> or type <code>&#123; &#125;</code> for unlimited nesting depth. <code>( )</code> are preserved as normal text.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddSubtopic(tIdx)}
                      style={{
                        background: '#EEF2FF',
                        border: '1px solid #C7D2FE',
                        color: '#4338CA',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: '5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      title="Add another root subtopic"
                    >
                      <Plus size={13} />
                      <span>+ Add Subtopic</span>
                    </button>
                  </div>

                  {topic.subtopics.map((sub) => (
                    <SubtopicTreeItem
                      key={sub.id}
                      node={sub}
                      depth={1}
                      onTitleChange={(nodeId, val) => handleNodeTitleChange(tIdx, nodeId, val)}
                      onAddChild={(parentId) => handleAddChildNode(tIdx, parentId)}
                      onRemove={(nodeId) => handleRemoveNode(tIdx, nodeId)}
                      isOnlyItem={topic.subtopics.length === 1 && (!sub.items || sub.items.length === 0)}
                    />
                  ))}
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
