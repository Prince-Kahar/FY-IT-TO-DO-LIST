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
  RotateCcw,
  Loader2,
  X,
} from 'lucide-react';
import { dataService } from '../../lib/dataService';
import { useToast } from '../../context/ToastContext';
import { SubjectModal } from '../../components/SubjectModal';
import { TopicModal } from '../../components/TopicModal';

export const AdminSubjects = () => {
  const { addToast } = useToast();

  const [subjects, setSubjects] = useState(() => {
    const cached = dataService.getCachedSubjects();
    return Array.isArray(cached) && cached.length > 0 ? cached : [];
  });
  const [loading, setLoading] = useState(() => subjects.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSubjectId, setExpandedSubjectId] = useState(() => subjects[0]?.id || null);
  const [streamFilter, setStreamFilter] = useState('ALL'); // 'ALL' | 'IT' | 'DS'
  const [semesterFilter, setSemesterFilter] = useState('ALL'); // 'ALL' | 'Sem 1' | 'Sem 2'

  // Modals
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState(null);
  const [topicModalConfig, setTopicModalConfig] = useState(null); // { subject, defaultUnit, topicToEdit }
  const [unitModal, setUnitModal] = useState(null); // { subject, oldUnitName, isNew }
  const [unitModalName, setUnitModalName] = useState('');

  const loadSubjects = async (isBackground = false) => {
    if (!isBackground && subjects.length === 0) setLoading(true);
    if (!isBackground) setRefreshing(true);
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
      setRefreshing(false);
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

    // 4. Instant custom event & cross-tab sync
    const handleSync = () => loadSubjects(true);
    window.addEventListener('fy_data_change', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('fy_data_change', handleSync);
      window.removeEventListener('storage', handleSync);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleSubjectSuccess = (savedSubject) => {
    if (savedSubject) {
      setSubjects((prev) => {
        const list = Array.isArray(prev) ? [...prev] : [];
        const idx = list.findIndex((s) => s.id === savedSubject.id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...savedSubject };
          return list;
        }
        return [...list, savedSubject];
      });
    }
    loadSubjects(true);
  };

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

  const handleOpenAddTopic = (subject, defaultUnit = '') => {
    setTopicModalConfig({
      subject,
      defaultUnit,
      topicToEdit: null,
    });
  };

  const handleOpenEditTopic = (subject, topic) => {
    setTopicModalConfig({
      subject,
      defaultUnit: topic.unit_name || '',
      topicToEdit: topic,
    });
  };

  const handleOpenAddUnit = (subject) => {
    const existing = Array.from(new Set((subject.topics || []).map((t) => (t.unit_name || '').trim()).filter(Boolean)));
    const nextNum = existing.length + 1;
    setUnitModal({
      subject,
      oldUnitName: '',
      isNew: true,
    });
    setUnitModalName(`Unit ${nextNum}: `);
  };

  const handleOpenEditUnit = (subject, oldUnitName) => {
    setUnitModal({
      subject,
      oldUnitName,
      isNew: false,
    });
    setUnitModalName(oldUnitName);
  };

  const handleSaveUnit = async (e) => {
    e.preventDefault();
    if (!unitModal || !unitModalName.trim()) return;
    const cleanName = unitModalName.trim();
    try {
      if (unitModal.isNew) {
        // Open topic modal directly for this newly created unit
        const targetSub = unitModal.subject;
        setUnitModal(null);
        setTopicModalConfig({
          subject: targetSub,
          defaultUnit: cleanName,
          topicToEdit: null,
        });
      } else {
        await dataService.renameUnit(unitModal.subject.id, unitModal.oldUnitName, cleanName);
        addToast(`Unit renamed to "${cleanName}"`, 'success');
        setUnitModal(null);
        loadSubjects(true);
      }
    } catch (err) {
      addToast(err.message || 'Error updating unit.', 'error');
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => loadSubjects(false)}
            disabled={refreshing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Sync live subjects"
          >
            <RotateCcw size={15} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Sync Live'}</span>
          </button>
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
        {loading && subjects.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
            <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--primary-600)' }} />
            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>
              Loading academic subjects & curriculum...
            </p>
          </div>
        ) : filteredSubjects.length === 0 ? (
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
                    onClick={() => handleOpenAddUnit(sub)}
                    title="Add Unit to Subject"
                    style={{ borderColor: 'var(--primary-300)', color: 'var(--primary-700)', fontWeight: 600 }}
                  >
                    <Plus size={14} />
                    <span>Add Unit</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenAddTopic(sub)}
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

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Curriculum Units & Topics ({topics.length} Total Topics)
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenAddUnit(sub)}
                        style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                      >
                        <Plus size={12} />
                        <span>Add Unit</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleOpenAddTopic(sub)}
                        style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                      >
                        <Plus size={12} />
                        <span>Add Topic</span>
                      </button>
                    </div>
                  </div>

                  {(() => {
                    const unitsMap = {};
                    topics.forEach((tp) => {
                      const u = (tp.unit_name || 'Unit 1: General Topics').trim();
                      if (!unitsMap[u]) unitsMap[u] = [];
                      unitsMap[u].push(tp);
                    });
                    const unitKeys = Object.keys(unitsMap);

                    if (unitKeys.length === 0) {
                      return (
                        <div
                          style={{
                            background: 'var(--bg-subtle)',
                            borderRadius: 'var(--radius-md)',
                            padding: '24px',
                            textAlign: 'center',
                            fontSize: '0.85rem',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <p style={{ margin: '0 0 12px', fontWeight: 600 }}>
                            No units or topics added yet for this subject.
                          </p>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenAddUnit(sub)}
                            >
                              <Plus size={14} />
                              <span>Add First Unit</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => handleOpenAddTopic(sub)}
                            >
                              <Plus size={14} />
                              <span>Add Topic</span>
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {unitKeys.map((uName) => {
                          const unitTopics = unitsMap[uName];
                          return (
                            <div
                              key={uName}
                              style={{
                                border: '1px solid var(--border-light)',
                                borderRadius: 'var(--radius-md)',
                                overflow: 'hidden',
                                background: '#FFFFFF',
                              }}
                            >
                              {/* Unit Header Bar */}
                              <div
                                style={{
                                  padding: '10px 14px',
                                  background: '#F8FAFC',
                                  borderBottom: '1px solid var(--border-light)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '8px',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '1rem' }}>📑</span>
                                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                    {uName}
                                  </strong>
                                  <span
                                    style={{
                                      background: 'var(--primary-100)',
                                      color: 'var(--primary-700)',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      padding: '2px 8px',
                                      borderRadius: '10px',
                                    }}
                                  >
                                    {unitTopics.length} {unitTopics.length === 1 ? 'topic' : 'topics'}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleOpenEditUnit(sub, uName)}
                                    title="Edit Unit Name"
                                    style={{ padding: '3px 8px', fontSize: '0.75rem', fontWeight: 600 }}
                                  >
                                    <Edit size={12} />
                                    <span>Edit Unit</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleOpenAddTopic(sub, uName)}
                                    title="Add Topic to this Unit"
                                    style={{ padding: '3px 8px', fontSize: '0.75rem', fontWeight: 600 }}
                                  >
                                    <Plus size={12} />
                                    <span>Add Topic</span>
                                  </button>
                                </div>
                              </div>

                              {/* Topics in this Unit */}
                              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {unitTopics.map((tp, idx) => (
                                  <div
                                    key={tp.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '10px 12px',
                                      background: 'var(--bg-subtle)',
                                      borderRadius: '6px',
                                      border: '1px solid var(--border-light)',
                                    }}
                                  >
                                    <div style={{ flex: 1, paddingRight: '12px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                                          {idx + 1}. {tp.name}
                                        </span>
                                        {tp.subtopic && (
                                          <span
                                            style={{
                                              background: '#EFF6FF',
                                              color: '#1D4ED8',
                                              border: '1px solid #BFDBFE',
                                              fontSize: '0.72rem',
                                              fontWeight: 600,
                                              padding: '1px 7px',
                                              borderRadius: '4px',
                                            }}
                                          >
                                            Subtopic: {tp.subtopic}
                                          </span>
                                        )}
                                      </div>
                                      {tp.description && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                          {tp.description}
                                        </div>
                                      )}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditTopic(sub, tp)}
                                        style={{
                                          background: 'transparent',
                                          border: 'none',
                                          color: 'var(--primary-600)',
                                          cursor: 'pointer',
                                          padding: '4px',
                                        }}
                                        title="Edit Topic & Subtopic"
                                      >
                                        <Edit size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteTopic(tp.id, tp.name)}
                                        style={{
                                          background: 'transparent',
                                          border: 'none',
                                          color: 'var(--danger-main)',
                                          cursor: 'pointer',
                                          padding: '4px',
                                        }}
                                        title="Delete Topic"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
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
          onSuccess={handleSubjectSuccess}
        />
      )}

      {/* Topic & Unit Modal */}
      {topicModalConfig && (
        <TopicModal
          subject={topicModalConfig.subject}
          defaultUnit={topicModalConfig.defaultUnit}
          topicToEdit={topicModalConfig.topicToEdit}
          onClose={() => setTopicModalConfig(null)}
          onSuccess={handleSubjectSuccess}
        />
      )}

      {/* Add / Edit Unit Modal */}
      {unitModal && (
        <div className="modal-overlay" onClick={() => setUnitModal(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '440px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  {unitModal.isNew ? 'Add Curriculum Unit' : 'Edit Unit Name'}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Subject: <strong>{unitModal.subject?.name}</strong>
                </p>
              </div>
              <button
                className="photo-remove-btn"
                onClick={() => setUnitModal(null)}
                style={{ position: 'static' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveUnit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Unit Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Unit 1: Introduction to Algorithms"
                    value={unitModalName}
                    onChange={(e) => setUnitModalName(e.target.value)}
                    required
                    autoFocus
                  />
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    {unitModal.isNew
                      ? 'Enter the unit title. You can immediately add topics inside it.'
                      : 'This will update the unit name across all existing topics in this subject.'}
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setUnitModal(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {unitModal.isNew ? 'Next: Add Topic' : 'Save Unit Name'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
