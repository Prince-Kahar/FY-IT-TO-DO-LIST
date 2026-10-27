import React, { useState, useEffect } from 'react';
import { BookOpen, User, CheckCircle2, ChevronDown, ChevronRight, Layers, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../lib/dataService';
import { StatusBadge } from '../../components/StatusBadge';

export const StudentSubjects = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState(() => dataService.getCachedSubjects());
  const [assignments, setAssignments] = useState(() => dataService.getCachedStudentAssignments(user?.id));
  const [expandedSubjectId, setExpandedSubjectId] = useState(() => {
    const cached = dataService.getCachedSubjects();
    return cached.length > 0 ? cached[0].id : null;
  });
  const [loading, setLoading] = useState(false);

  const loadCurriculum = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const [subList, asgList] = await Promise.all([
        dataService.getSubjects(),
        user ? dataService.getStudentAssignments(user.id) : [],
      ]);
      setSubjects(subList || []);
      setAssignments(asgList || []);
      if (subList?.length > 0 && !expandedSubjectId) {
        setExpandedSubjectId(subList[0].id);
      }
    } catch (err) {
      console.error('Error loading subjects:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadCurriculum();

    // 1. Polling every 1 second
    const interval = setInterval(() => {
      loadCurriculum(true);
    }, 1000);

    // 2. Window focus refetch
    const handleFocus = () => loadCurriculum(true);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // 3. Supabase Realtime subscription
    const unsubscribe = dataService.subscribeRealtime(() => {
      loadCurriculum(true);
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const toggleSubject = (id) => {
    setExpandedSubjectId((prev) => (prev === id ? null : id));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Subjects & Academic Curriculum</h1>
          <p className="page-description">
            Explore First Year B.Sc. IT course subjects, syllabus topics, and your completion status.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {(subjects || []).map((sub) => {
          const isExpanded = expandedSubjectId === sub.id;
          const subAssignments = (assignments || []).filter((a) => a?.tasks?.subject_id === sub.id);
          const approvedCount = subAssignments.filter((a) => a.status === 'Approved').length;
          const pct = subAssignments.length > 0 ? Math.round((approvedCount / subAssignments.length) * 100) : 0;
          const topics = sub.topics || [];

          return (
            <div key={sub.id} className="card" style={{ padding: '20px' }}>
              {/* Subject Title Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => toggleSubject(sub.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--primary-50)',
                      color: 'var(--primary-600)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                    }}
                  >
                    <BookOpen size={22} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          background: 'var(--primary-100)',
                          color: 'var(--primary-700)',
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}
                      >
                        {sub.subject_code || 'IT'}
                      </span>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{sub.name}</h3>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Faculty: <strong>{sub.teacher_name || 'Department Faculty'}</strong> •{' '}
                      {topics.length} Topics • {subAssignments.length} Tasks
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right', display: 'none', '@media (min-width: 640px)': { display: 'block' } }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary-600)' }}>
                      {pct}% Completed
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {approvedCount}/{subAssignments.length} Approved
                    </div>
                  </div>

                  <div style={{ color: 'var(--text-muted)' }}>
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                </div>
              </div>

              {/* Collapsible Subject Details */}
              {isExpanded && (
                <div
                  style={{
                    marginTop: '20px',
                    paddingTop: '20px',
                    borderTop: '1px solid var(--border-light)',
                  }}
                >
                  {sub.description && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
                      {sub.description}
                    </p>
                  )}

                  <h4
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                      letterSpacing: '0.05em',
                      marginBottom: '12px',
                    }}
                  >
                    Curriculum Topics & Tasks
                  </h4>

                  {topics.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No topics added yet by the faculty.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {topics.map((tp, idx) => {
                        const topicTasks = subAssignments.filter((a) => a.tasks?.topic_id === tp.id);

                        return (
                          <div
                            key={tp.id}
                            style={{
                              background: 'var(--bg-subtle)',
                              borderRadius: 'var(--radius-md)',
                              padding: '14px 16px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                  {idx + 1}. {tp.name}
                                </div>
                                {tp.description && (
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {tp.description}
                                  </div>
                                )}
                              </div>
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  color: 'var(--text-muted)',
                                  background: '#FFFFFF',
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-full)',
                                  border: '1px solid var(--border-light)',
                                }}
                              >
                                {topicTasks.length} {topicTasks.length === 1 ? 'task' : 'tasks'}
                              </span>
                            </div>

                            {/* Tasks under this topic */}
                            {topicTasks.length > 0 && (
                              <div
                                style={{
                                  marginTop: '10px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                  paddingLeft: '12px',
                                  borderLeft: '2px solid var(--primary-200)',
                                }}
                              >
                                {topicTasks.map((asg) => (
                                  <div
                                    key={asg.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      background: '#FFFFFF',
                                      padding: '8px 12px',
                                      borderRadius: 'var(--radius-sm)',
                                      border: '1px solid var(--border-light)',
                                    }}
                                  >
                                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                      {asg.tasks?.title}
                                    </span>
                                    <StatusBadge status={asg.status} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
