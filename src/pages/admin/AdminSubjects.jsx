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
  const [streamFilter, setStreamFilter] = useState('ALL'); // 'ALL' | 'IT' | 'DS'
  const [semesterFilter, setSemesterFilter] = useState('ALL'); // 'ALL' | 'Sem 1' | 'Sem 2'

  // Modals
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState(null);
  const [topicModalSubject, setTopicModalSubject] = useState(null);

  const loadSubjects = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const data = await dataService.getSubjects();
      setSubjects(data);
      if (data.length > 0 && !expandedSubjectId) {
        setExpandedSubjectId(data[0].id);
      }
    } catch (err) {
      console.error('Error loading subjects:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();

    // 1. Continuous Live Polling every 1 second
    const pollInterval = setInterval(() => {
      loadSubjects(true);
    }, 1000);

    // 2. Auto refetch on focus / visibility change
    const handleFocus = () => loadSubjects(true);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // 3. Supabase Realtime & mutation event bus
    const unsubscribe = dataService.subscribeRealtime(() => {
      loadSubjects(true);
    });

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      if (unsubscribe) unsubscribe();
    };
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

  const itCount = (subjects || []).filter((s) => (s.stream === 'IT' || s.subject_code?.toUpperCase().startsWith('IT')) && s.stream !== 'Both').length;
  const dsCount = (subjects || []).filter((s) => (s.stream === 'DS' || s.subject_code?.toUpperCase().startsWith('DS')) && s.stream !== 'Both').length;

  const filteredSubjects = (subjects || []).filter((sub) => {
    if (streamFilter !== 'ALL') {
      const sStream = sub.stream || (sub.subject_code?.toUpperCase().startsWith('DS') ? 'DS' : 'IT');
      if (sStream !== streamFilter && sub.stream !== 'Both') return false;
    }
    if (semesterFilter !== 'ALL') {
      const sSem = sub.semester || 'Sem 1';
      if (sSem !== semesterFilter && sSem !== 'ALL') return false;
    }
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage Subjects & Topics</h1>
          <p className="page-description">
            Dynamically configure academic curriculum, faculty assignments, and subject topics for IT & DS streams.
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

      {/* Stream & Semester Filter Pills */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          background: '#FFFFFF',
          padding: '10px 14px',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
        }}
      >
        {/* Stream Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginRight: '4px' }}>
            Stream:
          </span>
          <button
            type="button"
            onClick={() => setStreamFilter('ALL')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: streamFilter === 'ALL' ? '1px solid var(--primary-600)' : '1px solid #E2E8F0',
              background: streamFilter === 'ALL' ? 'var(--primary-50)' : 'transparent',
              color: streamFilter === 'ALL' ? 'var(--primary-700)' : 'var(--text-muted)',
              fontWeight: streamFilter === 'ALL' ? 700 : 500,
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            All Streams ({subjects.length})
          </button>
          <button
            type="button"
            onClick={() => setStreamFilter('IT')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: streamFilter === 'IT' ? '1px solid #2563EB' : '1px solid #E2E8F0',
              background: streamFilter === 'IT' ? '#EFF6FF' : 'transparent',
              color: streamFilter === 'IT' ? '#1D4ED8' : 'var(--text-muted)',
              fontWeight: streamFilter === 'IT' ? 700 : 500,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>💻 IT Stream</span>
            <span style={{ background: '#DBEAFE', color: '#1E40AF', padding: '1px 6px', borderRadius: '10px', fontSize: '0.725rem' }}>
              {itCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setStreamFilter('DS')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: streamFilter === 'DS' ? '1px solid #7C3AED' : '1px solid #E2E8F0',
              background: streamFilter === 'DS' ? '#FAF5FF' : 'transparent',
              color: streamFilter === 'DS' ? '#6D28D9' : 'var(--text-muted)',
              fontWeight: streamFilter === 'DS' ? 700 : 500,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>📊 DS Stream</span>
            <span style={{ background: '#EDE9FE', color: '#5B21B6', padding: '1px 6px', borderRadius: '10px', fontSize: '0.725rem' }}>
              {dsCount}
            </span>
          </button>
        </div>

        {/* Semester Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginRight: '4px' }}>
            Semester:
          </span>
          <button
            type="button"
            onClick={() => setSemesterFilter('ALL')}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: semesterFilter === 'ALL' ? '1px solid #4F46E5' : '1px solid #E2E8F0',
              background: semesterFilter === 'ALL' ? '#EEF2FF' : 'transparent',
              color: semesterFilter === 'ALL' ? '#4338CA' : 'var(--text-muted)',
              fontWeight: semesterFilter === 'ALL' ? 700 : 500,
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            All Semesters
          </button>
          <button
            type="button"
            onClick={() => setSemesterFilter('Sem 1')}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: semesterFilter === 'Sem 1' ? '1px solid #4F46E5' : '1px solid #E2E8F0',
              background: semesterFilter === 'Sem 1' ? '#EEF2FF' : 'transparent',
              color: semesterFilter === 'Sem 1' ? '#4338CA' : 'var(--text-muted)',
              fontWeight: semesterFilter === 'Sem 1' ? 700 : 500,
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            📘 Sem 1
          </button>
          <button
            type="button"
            onClick={() => setSemesterFilter('Sem 2')}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: semesterFilter === 'Sem 2' ? '1px solid #4F46E5' : '1px solid #E2E8F0',
              background: semesterFilter === 'Sem 2' ? '#EEF2FF' : 'transparent',
              color: semesterFilter === 'Sem 2' ? '#4338CA' : 'var(--text-muted)',
              fontWeight: semesterFilter === 'Sem 2' ? 700 : 500,
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            📙 Sem 2
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredSubjects.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <BookOpen size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No subjects found for {streamFilter === 'ALL' ? 'the selected filter' : `${streamFilter} stream`}.</p>
          </div>
        ) : (
          filteredSubjects.map((sub) => {
            const isExpanded = expandedSubjectId === sub.id;
            const topics = sub.topics || [];
            const subStream = sub.stream || (sub.subject_code?.toUpperCase().startsWith('DS') ? 'DS' : 'IT');

            return (
              <div
                key={sub.id}
                className="card"
                style={{
                  opacity: sub.is_active ? 1 : 0.7,
                  borderLeft: `4px solid ${
                    !sub.is_active
                      ? 'var(--text-subtle)'
                      : subStream === 'DS'
                      ? '#7C3AED'
                      : subStream === 'Both'
                      ? '#059669'
                      : '#2563EB'
                  }`,
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
                        background: subStream === 'DS' ? '#FAF5FF' : 'var(--primary-50)',
                        color: subStream === 'DS' ? '#7C3AED' : 'var(--primary-600)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <BookOpen size={20} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Stream Badge */}
                        <span
                          style={{
                            background: subStream === 'DS' ? '#FAF5FF' : subStream === 'Both' ? '#ECFDF5' : '#EFF6FF',
                            color: subStream === 'DS' ? '#6D28D9' : subStream === 'Both' ? '#047857' : '#1D4ED8',
                            border: `1px solid ${subStream === 'DS' ? '#DDD6FE' : subStream === 'Both' ? '#A7F3D0' : '#BFDBFE'}`,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {subStream === 'DS' ? '📊 DS Stream' : subStream === 'Both' ? '🌐 IT & DS' : '💻 IT Stream'}
                        </span>

                        {/* Semester Badge */}
                        <span
                          style={{
                            background: '#EEF2FF',
                            color: '#4338CA',
                            border: '1px solid #C7D2FE',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          📘 {sub.semester || 'Sem 1'}
                        </span>

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
        })
      )}
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
