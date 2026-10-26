import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Layers,
  Power,
} from 'lucide-react';
import { dataService } from '../../lib/dataService';
import { useToast } from '../../context/ToastContext';
import { SubjectModal } from '../../components/SubjectModal';
import { TopicModal } from '../../components/TopicModal';

export const AdminSubjects = () => {
  const { addToast } = useToast();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubjectId, setExpandedSubjectId] = useState(null);

  // Modals
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState(null);
  const [topicModalSubject, setTopicModalSubject] = useState(null);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const data = await dataService.getSubjects();
      setSubjects(data);
      if (data.length > 0 && !expandedSubjectId) {
        setExpandedSubjectId(data[0].id);
      }
    } catch (err) {
      console.error('Error loading subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const handleToggleActive = async (sub) => {
    try {
      await dataService.updateSubject(sub.id, { is_active: !sub.is_active });
      addToast(
        `Subject "${sub.name}" marked as ${!sub.is_active ? 'Active' : 'Inactive'}.`,
        'info'
      );
      loadSubjects();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleDeleteSubject = async (sub) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${sub.name}" and all its topics? This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await dataService.deleteSubject(sub.id);
      addToast(`Subject "${sub.name}" deleted.`, 'info');
      loadSubjects();
    } catch (err) {
      console.error('Failed to delete subject:', err);
      addToast(err.message || 'Error deleting subject.', 'error');
    }
  };

  const handleDeleteTopic = async (topicId, topicName) => {
    if (!window.confirm(`Delete topic "${topicName}"?`)) return;
    try {
      await dataService.deleteTopic(topicId);
      addToast(`Topic "${topicName}" removed.`, 'info');
      loadSubjects();
    } catch (err) {
      console.error('Error deleting topic:', err);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage Subjects & Topics</h1>
          <p className="page-description">
            Dynamically configure FY B.Sc. IT academic curriculum, faculty assignments, and subject topics without modifying code.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setSubjectToEdit(null);
            setIsSubjectModalOpen(true);
          }}
        >
          <Plus size={16} />
          <span>Add New Subject</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {subjects.map((sub) => {
          const isExpanded = expandedSubjectId === sub.id;
          const topics = sub.topics || [];

          return (
            <div
              key={sub.id}
              className="card"
              style={{
                opacity: sub.is_active ? 1 : 0.7,
                borderLeft: `4px solid ${sub.is_active ? 'var(--primary-600)' : 'var(--text-subtle)'}`,
              }}
            >
              {/* Subject Top Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    cursor: 'pointer',
                    flex: 1,
                  }}
                  onClick={() =>
                    setExpandedSubjectId((prev) => (prev === sub.id ? null : sub.id))
                  }
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--primary-50)',
                      color: 'var(--primary-600)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <BookOpen size={20} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          background: 'var(--primary-100)',
                          color: 'var(--primary-700)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}
                      >
                        {sub.subject_code || 'IT'}
                      </span>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{sub.name}</h3>
                      {!sub.is_active && (
                        <span
                          style={{
                            background: '#F1F5F9',
                            color: 'var(--text-muted)',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}
                        >
                          Inactive
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Faculty: <strong>{sub.teacher_name || 'N/A'}</strong> • {topics.length} Topics
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setTopicModalSubject(sub)}
                    title="Add Topic"
                  >
                    <Plus size={14} />
                    <span>Add Topic</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setSubjectToEdit(sub);
                      setIsSubjectModalOpen(true);
                    }}
                    title="Edit Subject"
                  >
                    <Edit size={14} />
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleToggleActive(sub)}
                    title={sub.is_active ? 'Deactivate Subject' : 'Activate Subject'}
                    style={{
                      color: sub.is_active ? 'var(--success-main)' : 'var(--text-muted)',
                    }}
                  >
                    <Power size={14} />
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleDeleteSubject(sub)}
                    title="Delete Subject"
                    style={{ color: 'var(--danger-main)' }}
                  >
                    <Trash2 size={14} />
                  </button>

                  <button
                    type="button"
                    style={{ color: 'var(--text-muted)', padding: '6px' }}
                    onClick={() =>
                      setExpandedSubjectId((prev) => (prev === sub.id ? null : sub.id))
                    }
                  >
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                </div>
              </div>

              {/* Topics Panel */}
              {isExpanded && (
                <div
                  style={{
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--border-light)',
                  }}
                >
                  {sub.description && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                      {sub.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Topics Curriculum ({topics.length})
                    </div>
                  </div>

                  {topics.length === 0 ? (
                    <div
                      style={{
                        background: 'var(--bg-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                        textAlign: 'center',
                        fontSize: '0.85rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      No topics added yet for this subject. Click "Add Topic" to create curriculum topics.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {topics.map((tp, idx) => (
                        <div
                          key={tp.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            background: 'var(--bg-subtle)',
                            borderRadius: 'var(--radius-md)',
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                              {idx + 1}. {tp.name}
                            </span>
                            {tp.description && (
                              <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginLeft: '10px' }}>
                                ({tp.description})
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteTopic(tp.id, tp.name)}
                            style={{ color: 'var(--text-subtle)', cursor: 'pointer' }}
                            title="Remove Topic"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Subject Modal */}
      {isSubjectModalOpen && (
        <SubjectModal
          subjectToEdit={subjectToEdit}
          onClose={() => {
            setIsSubjectModalOpen(false);
            setSubjectToEdit(null);
          }}
          onSuccess={loadSubjects}
        />
      )}

      {/* Topic Modal */}
      {topicModalSubject && (
        <TopicModal
          subject={topicModalSubject}
          onClose={() => setTopicModalSubject(null)}
          onSuccess={loadSubjects}
        />
      )}
    </div>
  );
};
